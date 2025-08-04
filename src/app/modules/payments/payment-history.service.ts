import { PaymentStatus } from "../../../shared/enums/payment.enums";
import { Leases } from "../leases/leases.schema";
import { Properties } from "../properties/properties.schema";
import { Spots } from "../spots/spots.schema";
import { createPaymentLink } from "../stripe/stripe.service";
import { Users } from "../users/users.schema";
import { IRentSummaryResponse } from "./payments.interface";
import { Payments } from "./payments.schema";

export const getPaymentHistory = async (tenantId: string) => {
  const user = await Users.findById(tenantId);

  if (!user) {
    return {
      payments: [],
      summary: {
        totalPaid: 0,
        totalPayments: 0,
        successRate: 0,
        overdueAmount: 0,
      },
    };
  }

  // Get payments from database
  const dbPayments = await Payments.find({
    tenantId,
    isDeleted: false,
  }).populate("propertyId", "name");

  // If no payments found, return empty result
  if (dbPayments.length === 0) {
    return {
      payments: [],
      summary: {
        totalPaid: 0,
        totalPayments: 0,
        successRate: 0,
        overdueAmount: 0,
      },
    };
  }

  // Get Stripe payments for each payment record that has a stripePaymentLinkId
  const stripePayments: any[] = [];

  for (const payment of dbPayments) {
    if (payment.stripePaymentLinkId) {
      try {
        // Get the Stripe account for this payment
        const { StripeAccounts } = await import(
          "../stripe/stripe-accounts.schema"
        );
        const stripeAccount = await StripeAccounts.findById(
          payment.stripeAccountId,
        );

        if (stripeAccount && stripeAccount.stripeSecretKey) {
          // Temporarily disabled Stripe payment link transactions
          // const stripePaymentData = await getPaymentLinkTransactions(
          //   payment.stripePaymentLinkId,
          //   stripeAccount.stripeSecretKey,
          // );
          // if (stripePaymentData.data) {
          //   stripePayments.push(...stripePaymentData.data);
          // }
        }
      } catch (error) {
        console.error(
          `Error fetching Stripe payments for payment ${payment._id}:`,
          error,
        );
      }
    }
  }

  // Combine and merge data
  const combinedPayments = mergePaymentData(dbPayments, stripePayments);

  // Calculate summary
  const summary = calculateSummary(combinedPayments);

  return { payments: combinedPayments, summary };
};

export const mergePaymentData = (dbPayments: any[], stripePayments: any[]) => {
  const mergedPayments = [];

  // Add database payments
  for (const dbPayment of dbPayments) {
    mergedPayments.push({
      id: dbPayment._id,
      datePaid: dbPayment.paidDate || dbPayment.createdAt,
      amount: dbPayment.totalAmount,
      status: dbPayment.status,
      method: dbPayment.paymentMethod || "ONLINE",
      confirmationId: dbPayment.stripeTransactionId || dbPayment.transactionId,
      propertyName: dbPayment.propertyId?.name || "Unknown Property",
      description: dbPayment.description,
      receiptNumber: dbPayment.receiptNumber,
      source: "database",
    });
  }

  // Add Stripe payments that might not be in database
  for (const stripePayment of stripePayments) {
    const existingPayment = dbPayments.find(
      db => db.stripeTransactionId === stripePayment.id,
    );

    if (!existingPayment && stripePayment.status === "succeeded") {
      mergedPayments.push({
        id: stripePayment.id,
        datePaid: new Date(stripePayment.created * 1000),
        amount: stripePayment.amount / 100,
        status: "PAID",
        method: "ONLINE",
        confirmationId: stripePayment.id,
        propertyName:
          stripePayment.metadata?.propertyName || "Unknown Property",
        description: "Monthly Rent Payment",
        receiptNumber: `STRIPE-${stripePayment.id}`,
        source: "stripe",
      });
    }
  }

  // Sort by date (newest first)
  return mergedPayments.sort(
    (a, b) => new Date(b.datePaid).getTime() - new Date(a.datePaid).getTime(),
  );
};

export const calculateSummary = (payments: any[]) => {
  const totalPaid = payments
    .filter(p => p.status === "PAID")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPayments = payments.length;
  const paidPayments = payments.filter(p => p.status === "PAID").length;
  const successRate =
    totalPayments > 0 ? Math.round((paidPayments / totalPayments) * 100) : 0;

  const overdueAmount = payments
    .filter(p => p.status === "OVERDUE")
    .reduce((sum, p) => sum + p.amount, 0);

  return {
    totalPaid,
    totalPayments,
    successRate,
    overdueAmount,
  };
};

export const getPaymentSummary = async (tenantId: string) => {
  const user = await Users.findById(tenantId);

  if (!user) {
    return {
      totalPaid: 0,
      totalPayments: 0,
      successRate: 0,
      overdueAmount: 0,
    };
  }

  // Get payments from database only for summary
  const dbPayments = await Payments.find({
    tenantId,
    isDeleted: false,
  });

  return calculateSummary(
    dbPayments.map(p => ({
      status: p.status,
      amount: p.totalAmount,
    })),
  );
};

export const getRentSummary = async (
  tenantId: string,
): Promise<IRentSummaryResponse> => {
  const user = await Users.findById(tenantId);
  if (!user) {
    throw new Error("User not found");
  }

  console.log("Looking for lease for tenant:", tenantId);

  // Get active lease
  const activeLease = await Leases.findOne({
    tenantId,
    leaseStatus: "ACTIVE",
    isDeleted: false,
  }).populate("propertyId spotId");

  console.log("Active lease found:", activeLease ? "Yes" : "No");

  if (!activeLease) {
    // Check if there are any leases for this tenant (for debugging)
    const anyLease = await Leases.findOne({ tenantId });
    console.log("Any lease found:", anyLease ? "Yes" : "No");

    if (anyLease) {
      console.log("Lease status:", anyLease.leaseStatus);
      console.log("Lease isDeleted:", anyLease.isDeleted);
    }

    return {
      hasActiveLease: false,
      message: "No active lease found",
      rentSummary: undefined,
    };
  }

  // Get property and spot details
  const property = await Properties.findById(activeLease.propertyId);
  const spot = await Spots.findById(activeLease.spotId);

  if (!property || !spot) {
    throw new Error("Property or spot not found");
  }

  // Get current month's rent payment
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Calculate due date (typically 1st of each month)
  const dueDate = new Date(currentYear, currentMonth, 1);

  // Get rent payment for current month
  const currentMonthPayment = await Payments.findOne({
    tenantId,
    type: "RENT",
    dueDate: {
      $gte: new Date(currentYear, currentMonth, 1),
      $lt: new Date(currentYear, currentMonth + 1, 1),
    },
    isDeleted: false,
  });

  // Get all pending rent payments
  const pendingRentPayments = await Payments.find({
    tenantId,
    type: "RENT",
    status: { $in: ["PENDING", "OVERDUE"] },
    isDeleted: false,
  }).sort({ dueDate: 1 });

  // Get recent paid rent payments (last 6 months)
  const recentPaidPayments = await Payments.find({
    tenantId,
    type: "RENT",
    status: "PAID",
    isDeleted: false,
  })
    .sort({ dueDate: -1 })
    .limit(6);

  // Calculate overdue amount
  const overduePayments = pendingRentPayments.filter(
    payment => payment.status === "OVERDUE",
  );
  const totalOverdueAmount = overduePayments.reduce(
    (sum, payment) => sum + payment.totalAmount,
    0,
  );

  // Calculate days overdue for current payment
  const daysOverdue =
    currentMonthPayment && currentMonthPayment.status === "OVERDUE"
      ? Math.floor(
          (currentDate.getTime() - currentMonthPayment.dueDate.getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 0;

  // Create dynamic payment link for current month if payment is pending
  let currentMonthPaymentLink = null;
  if (currentMonthPayment && currentMonthPayment.status === "PENDING") {
    try {
      currentMonthPaymentLink = await createPaymentLink({
        tenantId: currentMonthPayment.tenantId.toString(),
        propertyId: currentMonthPayment.propertyId.toString(),
        spotId: currentMonthPayment.spotId.toString(),
        amount: currentMonthPayment.amount,
        type: currentMonthPayment.type,
        dueDate: currentMonthPayment.dueDate,
        description: currentMonthPayment.description,
        lateFeeAmount: currentMonthPayment.lateFeeAmount,
        receiptNumber: currentMonthPayment.receiptNumber,
      });
    } catch (error) {
      console.error("Error creating payment link for current month:", error);
    }
  }

  const rentSummary = {
    // Payment link information - now dynamic for current month
    paymentLink: currentMonthPaymentLink
      ? {
          id: currentMonthPaymentLink.id,
          url: currentMonthPaymentLink.url,
        }
      : {
          id: undefined,
          url: undefined,
        },
    // Property and spot information
    property: {
      id: (property as any)._id?.toString() || property._id,
      name: property.name,
      address: property.address,
    },
    spot: {
      id: (spot as any)._id?.toString() || spot._id,
      spotNumber: spot.spotNumber,
      spotIdentifier: spot.spotIdentifier,
      amenities: spot.amenities,
      size: spot.size,
    },

    // Lease information
    lease: {
      id: (activeLease as any)._id?.toString() || activeLease._id,
      leaseType: activeLease.leaseType,
      leaseStart: activeLease.leaseStart,
      leaseEnd: activeLease.leaseEnd,
      rentAmount: activeLease.rentAmount,
      depositAmount: activeLease.depositAmount,
      leaseStatus: activeLease.leaseStatus,
      paymentStatus: activeLease.paymentStatus,
    },

    // Current month payment
    currentMonth: {
      dueDate: dueDate,
      rentAmount: activeLease.rentAmount,
      status: (currentMonthPayment?.status as PaymentStatus) || "PENDING",
      paidDate: currentMonthPayment?.paidDate,
      paymentMethod: currentMonthPayment?.paymentMethod,
      lateFeeAmount: currentMonthPayment?.lateFeeAmount || 0,
      totalAmount: currentMonthPayment?.totalAmount || activeLease.rentAmount,
      daysOverdue: daysOverdue,
      receiptNumber: currentMonthPayment?.receiptNumber,
    },

    // Payment summary
    summary: {
      totalOverdueAmount,
      overdueCount: overduePayments.length,
      pendingCount: pendingRentPayments.length,
      totalPaidAmount: recentPaidPayments.reduce(
        (sum, payment) => sum + payment.totalAmount,
        0,
      ),
      averagePaymentAmount:
        recentPaidPayments.length > 0
          ? recentPaidPayments.reduce(
              (sum, payment) => sum + payment.totalAmount,
              0,
            ) / recentPaidPayments.length
          : 0,
    },

    // Recent payment history
    recentPayments: recentPaidPayments.map(payment => ({
      id: (payment as any)._id?.toString() || payment._id,
      dueDate: payment.dueDate,
      paidDate: payment.paidDate,
      amount: payment.totalAmount,
      paymentMethod: payment.paymentMethod,
      receiptNumber: payment.receiptNumber,
      status: payment.status,
    })),

    // Pending payments
    pendingPayments: pendingRentPayments.map(payment => ({
      id: (payment as any)._id?.toString() || payment._id,
      dueDate: payment.dueDate,
      amount: payment.totalAmount,
      status: payment.status,
      daysOverdue:
        payment.status === "OVERDUE"
          ? Math.floor(
              (currentDate.getTime() - payment.dueDate.getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : 0,
    })),
  };

  return {
    hasActiveLease: true,
    rentSummary,
  };
};

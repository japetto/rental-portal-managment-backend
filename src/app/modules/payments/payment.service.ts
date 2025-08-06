import Stripe from "stripe";
import { PaymentStatus } from "../../../shared/enums/payment.enums";
import { Leases } from "../leases/leases.schema";
import { Properties } from "../properties/properties.schema";
import { Spots } from "../spots/spots.schema";
import { Users } from "../users/users.schema";
import { IRentSummaryResponse } from "./payments.interface";
import { Payments } from "./payments.schema";

export const getPaymentHistory = async (tenantId: string) => {
  const user = await Users.findOne({
    _id: tenantId,
    isDeleted: false,
    isActive: true,
  });

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
        const { StripeAccounts } = await import("../stripe/stripe.schema");
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
  const user = await Users.findOne({
    _id: tenantId,
    isDeleted: false,
    isActive: true,
  });

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
  const user = await Users.findOne({
    _id: tenantId,
    isDeleted: false,
    isActive: true,
  });
  if (!user) {
    throw new Error("User not found or account is deactivated");
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
        receiptNumber:
          currentMonthPayment.receiptNumber ||
          `RENT-${currentMonthPayment._id}`,
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

// Create a unique payment link for a specific payment transaction
export const createPaymentLink = async (paymentData: {
  tenantId: string;
  propertyId?: string;
  spotId: string;
  amount: number;
  type: string;
  dueDate: Date;
  description: string;
  lateFeeAmount?: number;
  receiptNumber: string;
}) => {
  try {
    // Get user details for metadata
    const user = await Users.findOne({
      _id: paymentData.tenantId,
      isDeleted: false,
      isActive: true,
    });
    if (!user) throw new Error("User not found or account is deactivated");

    let property;
    let activeLease;
    let stripeAccount;

    if (paymentData.propertyId) {
      // If propertyId is provided, use it directly
      property = await Properties.findById(paymentData.propertyId);
      if (!property) throw new Error("Property not found");

      // Check if user has an active lease for this property
      activeLease = await Leases.findOne({
        tenantId: paymentData.tenantId,
        propertyId: paymentData.propertyId,
        leaseStatus: "ACTIVE",
        isDeleted: false,
      });

      if (!activeLease) {
        throw new Error("User does not have an active lease for this property");
      }

      // Get the Stripe account for this property
      const { StripeAccounts } = await import("../stripe/stripe.schema");
      stripeAccount = await StripeAccounts.findOne({
        propertyIds: paymentData.propertyId,
        isActive: true,
        webhookStatus: "ACTIVE",
      }).select("+stripeSecretKey");
    } else {
      // If propertyId is not provided, find the active lease and get property from it
      activeLease = await Leases.findOne({
        tenantId: paymentData.tenantId,
        leaseStatus: "ACTIVE",
        isDeleted: false,
      }).populate("propertyId");

      if (!activeLease) {
        throw new Error("No active lease found for this tenant");
      }

      property = activeLease.propertyId;
      if (!property) {
        throw new Error("Property not found in active lease");
      }

      // Get the Stripe account for this property
      const { StripeAccounts } = await import("../stripe/stripe.schema");
      stripeAccount = await StripeAccounts.findOne({
        propertyIds: (property as any)._id,
        isActive: true,
        webhookStatus: "ACTIVE",
      }).select("+stripeSecretKey");
    }

    if (!stripeAccount) {
      throw new Error("No active Stripe account found for this property");
    }

    console.log("Found Stripe account in createPaymentLink:", {
      id: stripeAccount._id,
      name: stripeAccount.name,
      hasSecretKey: !!stripeAccount.stripeSecretKey,
      secretKeyLength: stripeAccount.stripeSecretKey?.length,
      isActive: stripeAccount.isActive,
      isVerified: stripeAccount.isVerified,
    });

    if (!stripeAccount.stripeSecretKey) {
      throw new Error("Stripe secret key is missing for this account");
    }

    const totalAmount = paymentData.amount + (paymentData.lateFeeAmount || 0);

    // Debug logging for payment link creation
    console.log("🔗 Creating payment link with metadata:", {
      tenantId: paymentData.tenantId,
      receiptNumber: paymentData.receiptNumber,
      amount: totalAmount,
      type: paymentData.type,
      dueDate: paymentData.dueDate,
    });

    // Create Stripe instance with account-specific secret key
    const { createStripeInstance } = await import("../stripe/stripe.service");
    const stripe = createStripeInstance(stripeAccount.stripeSecretKey);

    // Helper function to format address
    const formatAddress = (address: any) => {
      if (!address) return "N/A";
      const parts = [];
      if (address.street) parts.push(address.street);
      if (address.city) parts.push(address.city);
      if (address.state) parts.push(address.state);
      if (address.zipCode) parts.push(address.zipCode);
      return parts.length > 0 ? parts.join(", ") : "N/A";
    };

    // Helper function to get valid redirect URL
    const getValidRedirectUrl = (path: string) => {
      const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      return `${baseUrl}${path}`;
    };

    // Create payment link with unique metadata
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${paymentData.type} Payment`,
              description: ` ${paymentData.dueDate.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
              })} - Name: ${user.name}`,
            },
            unit_amount: Math.round(totalAmount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ] as any,
      metadata: {
        // Core payment information
        tenantId: paymentData.tenantId,
        propertyId: paymentData.propertyId || (property as any)._id.toString(),
        spotId: paymentData.spotId,
        leaseId: (activeLease as any)._id.toString(),
        paymentType: paymentData.type,
        dueDate: paymentData.dueDate.toISOString(),
        receiptNumber: paymentData.receiptNumber,

        // Property and tenant details
        propertyName: (property as any).name,
        propertyAddress: formatAddress((property as any).address) || "N/A",
        propertyType: (property as any).propertyType || "N/A",
        lotNumber: (property as any).lotNumber || "N/A",
        unitNumber: (property as any).unitNumber || "N/A",

        // Tenant information
        tenantName: user.name,
        tenantEmail: user.email || "N/A",
        tenantPhone: (user as any).phone || "N/A",

        // Payment details
        amount: totalAmount.toString(),
        baseAmount: paymentData.amount.toString(),
        lateFeeAmount: (paymentData.lateFeeAmount || 0).toString(),
        paymentMonth: paymentData.dueDate.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
        }),
        paymentYear: paymentData.dueDate.getFullYear().toString(),

        // Lease information
        leaseStartDate: (activeLease as any).leaseStart?.toISOString() || "N/A",
        leaseEndDate: (activeLease as any).leaseEnd?.toISOString() || "N/A",
        rentAmount: (activeLease as any).rentAmount?.toString() || "N/A",

        // Stripe account information
        stripeAccountName: stripeAccount.name,

        // Additional context
        paymentDescription: paymentData.description,
        createdAt: new Date().toISOString(),
      },
      after_completion: {
        type: "redirect",
        redirect: {
          url: getValidRedirectUrl(
            `/payment-success?receipt=${paymentData.receiptNumber}&amount=${paymentData.amount}&type=${paymentData.type}`,
          ),
        },
      },
    } as any);

    return paymentLink;
  } catch (error) {
    console.error("Error creating payment link:", error);
    throw error;
  }
};

// Create a payment record and generate a unique payment intent (with metadata)
export const createPaymentWithLink = async (paymentData: {
  tenantId: string;
  propertyId?: string;
  spotId: string;
  amount: number;
  type: string;
  dueDate: Date;
  description: string;
  lateFeeAmount?: number;
  createdBy: string;
}) => {
  try {
    // Generate receipt number
    const receiptNumber = `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    let activeLease;
    let stripeAccount;

    if (paymentData.propertyId) {
      // Check if user has an active lease for this property
      activeLease = await Leases.findOne({
        tenantId: paymentData.tenantId,
        propertyId: paymentData.propertyId,
        leaseStatus: "ACTIVE",
        isDeleted: false,
      });

      if (!activeLease) {
        throw new Error("User does not have an active lease for this property");
      }

      // Get the Stripe account for this property
      const { StripeAccounts } = await import("../stripe/stripe.schema");
      stripeAccount = await StripeAccounts.findOne({
        propertyIds: paymentData.propertyId,
        isActive: true,
        webhookStatus: "ACTIVE",
      }).select("+stripeSecretKey");
    } else {
      // If propertyId is not provided, find the active lease and get property from it
      activeLease = await Leases.findOne({
        tenantId: paymentData.tenantId,
        leaseStatus: "ACTIVE",
        isDeleted: false,
      }).populate("propertyId");

      if (!activeLease) {
        throw new Error("No active lease found for this tenant");
      }

      // Get the Stripe account for this property
      const { StripeAccounts } = await import("../stripe/stripe.schema");
      stripeAccount = await StripeAccounts.findOne({
        propertyIds: (activeLease.propertyId as any)._id,
        isActive: true,
        webhookStatus: "ACTIVE",
      }).select("+stripeSecretKey");
    }

    if (!stripeAccount) {
      throw new Error("No active Stripe account found for this property");
    }

    if (!stripeAccount.stripeSecretKey) {
      throw new Error("Stripe secret key is missing for this account");
    }

    console.log("🔍 DEBUG: Using Stripe account for payment:", {
      accountId: stripeAccount._id,
      accountName: stripeAccount.name,
      isActive: stripeAccount.isActive,
      isVerified: stripeAccount.isVerified,
      webhookStatus: stripeAccount.webhookStatus,
    });

    // Get user details
    const user = await Users.findById(paymentData.tenantId);
    if (!user) {
      throw new Error("User not found");
    }

    // Get property details
    const property = await Properties.findById(
      paymentData.propertyId || (activeLease?.propertyId as any)._id,
    );
    if (!property) {
      throw new Error("Property not found");
    }

    // Calculate total amount including late fees
    const totalAmount = paymentData.amount + (paymentData.lateFeeAmount || 0);

    // Create Stripe instance
    const stripe = new Stripe(stripeAccount.stripeSecretKey, {
      apiVersion: "2025-06-30.basil",
    });

    // Helper function to format address
    const formatAddress = (address: any) => {
      if (!address) return "N/A";
      const parts = [];
      if (address.street) parts.push(address.street);
      if (address.city) parts.push(address.city);
      if (address.state) parts.push(address.state);
      if (address.zipCode) parts.push(address.zipCode);
      return parts.length > 0 ? parts.join(", ") : "N/A";
    };

    // Helper function to get valid redirect URL
    const getValidRedirectUrl = (path: string) => {
      const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      return `${baseUrl}${path}`;
    };

    // Prepare metadata object
    const metadata = {
      // Core payment information
      tenantId: paymentData.tenantId,
      propertyId: paymentData.propertyId || (property as any)._id.toString(),
      spotId: paymentData.spotId,
      leaseId: (activeLease as any)._id.toString(),
      paymentType: paymentData.type,
      dueDate: paymentData.dueDate.toISOString(),
      receiptNumber: receiptNumber,

      // Property and tenant details
      propertyName: (property as any).name,
      propertyAddress: formatAddress((property as any).address) || "N/A",
      propertyType: (property as any).propertyType || "N/A",
      lotNumber: (property as any).lotNumber || "N/A",
      unitNumber: (property as any).unitNumber || "N/A",

      // Tenant information
      tenantName: user.name,
      tenantEmail: user.email || "N/A",
      tenantPhone: (user as any).phone || "N/A",

      // Payment details
      amount: totalAmount.toString(),
      baseAmount: paymentData.amount.toString(),
      lateFeeAmount: (paymentData.lateFeeAmount || 0).toString(),
      paymentMonth: paymentData.dueDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      }),
      paymentYear: paymentData.dueDate.getFullYear().toString(),

      // Lease information
      leaseStartDate: (activeLease as any).leaseStart?.toISOString() || "N/A",
      leaseEndDate: (activeLease as any).leaseEnd?.toISOString() || "N/A",
      rentAmount: (activeLease as any).rentAmount?.toString() || "N/A",

      // Stripe account information
      stripeAccountName: stripeAccount.name,

      // Additional context
      paymentDescription: paymentData.description,
      createdAt: new Date().toISOString(),
    };

    console.log("🔍 DEBUG: Metadata being sent to Stripe:", metadata);

    // Create payment intent with metadata
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // Convert to cents
      currency: "usd",
      metadata,
      description: `${paymentData.type} Payment - ${paymentData.dueDate.toLocaleDateString(
        "en-US",
        {
          year: "numeric",
          month: "long",
        },
      )} - ${user.name}`,
      receipt_email: user.email,
      return_url: getValidRedirectUrl(
        `/payment-success?receipt=${receiptNumber}&amount=${paymentData.amount}&type=${paymentData.type}`,
      ),
    });

    console.log("✅ Payment intent created successfully:", {
      id: paymentIntent.id,
      client_secret: paymentIntent.client_secret,
      receiptNumber,
      metadata: paymentIntent.metadata,
      accountId: stripeAccount._id,
      accountName: stripeAccount.name,
      webhookStatus: stripeAccount.webhookStatus,
    });

    // Create a pending payment record that the webhook can update
    const paymentRecord = await Payments.create({
      tenantId: paymentData.tenantId,
      propertyId:
        paymentData.propertyId || (activeLease?.propertyId as any)._id,
      spotId: paymentData.spotId,
      amount: paymentData.amount,
      type: paymentData.type,
      status: "PENDING", // Will be updated to PAID by webhook
      dueDate: paymentData.dueDate,
      paidDate: null,
      paymentMethod: "ONLINE",
      transactionId: paymentIntent.id,
      stripeTransactionId: paymentIntent.id,
      stripePaymentIntentId: paymentIntent.id,
      receiptNumber: receiptNumber,
      description: paymentData.description,
      lateFeeAmount: paymentData.lateFeeAmount || 0,
      totalAmount: totalAmount,
      stripeAccountId: stripeAccount._id,
      createdBy: paymentData.createdBy,
    });

    console.log("✅ Payment record created with PENDING status:", {
      id: paymentRecord._id,
      receiptNumber: paymentRecord.receiptNumber,
      status: paymentRecord.status,
    });

    return {
      payment: paymentRecord,
      paymentIntent: {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
      },
      receiptNumber,
    };
  } catch (error) {
    console.error("Error creating payment with intent:", error);
    throw error;
  }
};

// Create a payment record and generate a unique payment link with enhanced logic
export const createPaymentWithLinkEnhanced = async (paymentData: {
  tenantId: string;
  currentDate?: string;
  createdBy: string;
}) => {
  console.log("🚀 ~ paymentData:", paymentData);
  try {
    // Get active lease for the tenant
    const activeLease = await Leases.findOne({
      tenantId: paymentData.tenantId,
      leaseStatus: "ACTIVE",
      isDeleted: false,
    }).populate("propertyId spotId");

    if (!activeLease) {
      throw new Error("No active lease found for this tenant");
    }

    // Get payment history to determine if this is a first-time payment
    const paymentHistory = await Payments.find({
      tenantId: paymentData.tenantId,
      type: "RENT",
      status: { $in: ["PAID", "PENDING", "OVERDUE"] },
      isDeleted: false,
    }).sort({ dueDate: 1 });

    // Calculate appropriate due date based on lease start and current date
    const effectiveCurrentDate = paymentData.currentDate
      ? new Date(paymentData.currentDate)
      : new Date();
    let paymentDueDate: Date;
    let paymentAmount: number;
    let isFirstTimePayment = false;
    let paymentDescription: string;

    // Defensive: ensure leaseStart is a Date
    const leaseStart: Date =
      activeLease.leaseStart instanceof Date
        ? activeLease.leaseStart
        : new Date(activeLease.leaseStart);

    // Defensive: ensure rentAmount is a number
    const rentAmount: number =
      typeof activeLease.rentAmount === "number"
        ? activeLease.rentAmount
        : Number(activeLease.rentAmount);

    // Determine payment based on lease start and payment history
    if (paymentHistory.length === 0) {
      // First-time payment - use lease start date as due date
      isFirstTimePayment = true;
      paymentDueDate = new Date(leaseStart);
      paymentAmount = rentAmount;
      paymentDescription = "First Month Rent Payment";

      // Check if lease started mid-month and adjust amount if needed
      const leaseStartDay = leaseStart.getDate();
      console.log("🔍 Lease start analysis:", {
        leaseStart: leaseStart.toISOString(),
        leaseStartDay,
        rentAmount,
        isFirstTimePayment,
      });

      if (leaseStartDay > 1) {
        // Pro-rate the first month's rent
        const daysInMonth = new Date(
          leaseStart.getFullYear(),
          leaseStart.getMonth() + 1,
          0,
        ).getDate();
        const remainingDays = daysInMonth - leaseStartDay + 1;
        paymentAmount = Math.round((rentAmount / daysInMonth) * remainingDays);
        paymentDescription = `Pro-rated First Month Rent (${remainingDays} days)`;

        console.log("📊 Pro-rated calculation:", {
          daysInMonth,
          remainingDays,
          originalAmount: rentAmount,
          proRatedAmount: paymentAmount,
        });
      } else {
        // If lease starts on the 1st of the month, charge full rent
        paymentAmount = rentAmount;
        paymentDescription = "First Month Rent Payment";
        console.log("💰 Full rent charged:", { amount: paymentAmount });
      }
    } else {
      // Not first-time payment - use current month's 1st day
      const currentMonth = new Date(
        effectiveCurrentDate.getFullYear(),
        effectiveCurrentDate.getMonth(),
        1,
      );

      // Check if we already have a payment for current month
      const existingCurrentMonthPayment = paymentHistory.find(payment => {
        // Defensive: ensure payment.dueDate is a Date
        const dueDate: Date =
          payment.dueDate instanceof Date
            ? payment.dueDate
            : new Date(payment.dueDate);

        if (isNaN(dueDate.getTime())) {
          // Skip invalid dates
          return false;
        }

        const paymentMonth = new Date(
          dueDate.getFullYear(),
          dueDate.getMonth(),
          1,
        );
        return paymentMonth.getTime() === currentMonth.getTime();
      });

      if (existingCurrentMonthPayment) {
        throw new Error("Rent payment for current month already exists");
      }

      paymentDueDate = currentMonth;
      // Always charge full rent amount for regular monthly payments
      paymentAmount = rentAmount;
      paymentDescription = "Monthly Rent Payment";

      console.log("💰 Regular monthly payment - full rent charged:", {
        amount: paymentAmount,
        dueDate: paymentDueDate.toISOString(),
      });
    }

    // Check if payment already exists for the calculated month
    const startOfMonth = new Date(
      paymentDueDate.getFullYear(),
      paymentDueDate.getMonth(),
      1,
    );
    const startOfNextMonth = new Date(
      paymentDueDate.getFullYear(),
      paymentDueDate.getMonth() + 1,
      1,
    );

    const existingPayment = await Payments.findOne({
      tenantId: paymentData.tenantId,
      type: "RENT",
      dueDate: {
        $gte: startOfMonth,
        $lt: startOfNextMonth,
      },
      isDeleted: false,
    });

    if (existingPayment) {
      throw new Error("Rent payment for this month already exists");
    }

    // Defensive: propertyId and spotId
    let propertyId: string | undefined = undefined;
    let spotId: string | undefined = undefined;

    if (
      activeLease.propertyId &&
      typeof activeLease.propertyId === "object" &&
      "_id" in activeLease.propertyId
    ) {
      propertyId = (
        activeLease.propertyId as { _id: { toString: () => string } }
      )._id.toString();
    } else if (typeof activeLease.propertyId === "string") {
      propertyId = activeLease.propertyId;
    }

    if (
      activeLease.spotId &&
      typeof activeLease.spotId === "object" &&
      "_id" in activeLease.spotId
    ) {
      spotId = (
        activeLease.spotId as { _id: { toString: () => string } }
      )._id.toString();
    } else if (typeof activeLease.spotId === "string") {
      spotId = activeLease.spotId;
    }

    // Validate that required fields are present
    if (!propertyId) {
      throw new Error("Property ID is required for payment creation");
    }
    if (!spotId) {
      throw new Error("Spot ID is required for payment creation");
    }

    const paymentDataForCreation = {
      tenantId: paymentData.tenantId,
      propertyId,
      spotId,
      amount: paymentAmount,
      type: "RENT",
      dueDate: paymentDueDate,
      description: paymentDescription,
      lateFeeAmount: 0,
      createdBy: paymentData.createdBy,
    };

    console.log(
      "🎯 Creating payment with calculated values:",
      paymentDataForCreation,
    );

    const result = await createPaymentWithLink(paymentDataForCreation);

    return {
      ...result,
      isFirstTimePayment,
      lease: {
        id: activeLease._id,
        rentAmount: rentAmount,
        leaseType: activeLease.leaseType,
        leaseStatus: activeLease.leaseStatus,
        leaseStart: leaseStart,
      },
      paymentInfo: {
        isFirstTimePayment,
        calculatedAmount: paymentAmount,
        originalRentAmount: rentAmount,
        dueDate: paymentDueDate,
        description: paymentDescription,
      },
    };
  } catch (error) {
    console.error("Error creating payment with link:", error);
    throw error;
  }
};

// Get payment link details
export const getPaymentLinkDetails = async (
  paymentLinkId: string,
  secretKey: string,
) => {
  const { createStripeInstance } = await import("../stripe/stripe.service");
  const stripe = createStripeInstance(secretKey);
  return await stripe.paymentLinks.retrieve(paymentLinkId);
};

// Get transaction history for a payment link
export const getPaymentLinkTransactions = async (
  paymentLinkId: string,
  secretKey: string,
) => {
  const { createStripeInstance } = await import("../stripe/stripe.service");
  const stripe = createStripeInstance(secretKey);
  return await stripe.paymentIntents.list({
    limit: 100,
  });
};

// Create payment record from Stripe data
export const createPaymentFromStripe = async (
  stripePayment: any,
  tenantId: string,
) => {
  const user = await Users.findOne({
    _id: tenantId,
    isDeleted: false,
    isActive: true,
  });
  if (!user) throw new Error("User not found or account is deactivated");

  // Find property by name from metadata
  const propertyName = stripePayment.metadata?.propertyName;
  if (!propertyName)
    throw new Error("Property name not found in payment metadata");

  const property = await Properties.findOne({ name: propertyName });
  if (!property) {
    // Cancel payment if property not found
    // Note: We need the secret key to cancel, but we don't have it here
    // This is a limitation - we'll need to handle this differently
    throw new Error(`Property not found: ${propertyName}`);
  }

  // Get the Stripe account for this property
  const { StripeAccounts } = await import("../stripe/stripe.schema");
  const stripeAccount = await StripeAccounts.findOne({
    propertyIds: (property as any)._id,
    isActive: true,
    isVerified: true,
  });

  // Create payment record
  return Payments.create({
    tenantId,
    propertyId: property._id,
    spotId: user.spotId,
    amount: stripePayment.amount / 100, // Convert from cents
    type: "RENT",
    status: "PAID",
    dueDate: new Date(),
    paidDate: new Date(stripePayment.created * 1000),
    paymentMethod: "ONLINE",
    transactionId: stripePayment.id,
    stripeTransactionId: stripePayment.id,
    stripeAccountId: stripeAccount?._id,
    receiptNumber: `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    description: "Monthly Rent Payment",
    totalAmount: stripePayment.amount / 100,
    createdBy: "SYSTEM",
  });
};

// Get comprehensive tenant payment status with automatic payment creation
export const getTenantPaymentStatusEnhanced = async (paymentData: {
  tenantId: string;
  createdBy: string;
}) => {
  try {
    // Get active lease for the tenant
    const activeLease = await Leases.findOne({
      tenantId: paymentData.tenantId,
      leaseStatus: "ACTIVE",
      isDeleted: false,
    }).populate("propertyId spotId");

    if (!activeLease) {
      throw new Error("No active lease found for this tenant");
    }

    // Get payment history to determine if this is a first-time payment
    const paymentHistory = await Payments.find({
      tenantId: paymentData.tenantId,
      type: "RENT",
      status: { $in: ["PAID", "PENDING", "OVERDUE"] },
      isDeleted: false,
    }).sort({ dueDate: 1 });

    // Get current month's payment status
    const currentDate = new Date();
    const currentMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1,
    );

    // Check if payment exists for current month
    const currentMonthPayment = await Payments.findOne({
      tenantId: paymentData.tenantId,
      type: "RENT",
      dueDate: {
        $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
        $lt: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
      },
      isDeleted: false,
    });

    // Get all pending/overdue payments
    const pendingPayments = await Payments.find({
      tenantId: paymentData.tenantId,
      type: "RENT",
      status: { $in: ["PENDING", "OVERDUE"] },
      isDeleted: false,
    }).sort({ dueDate: 1 });

    // Calculate overdue amounts
    const overduePayments = pendingPayments.filter(
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

    // Determine if we need to create a new payment
    let paymentAction = "NONE";
    let paymentLink = null;
    let newPayment = null;
    let isFirstTimePayment = false;

    if (!currentMonthPayment) {
      // Check if this is a first-time payment
      if (paymentHistory.length === 0) {
        // First-time payment - use lease start date as due date
        isFirstTimePayment = true;
        const paymentDueDate = new Date(activeLease.leaseStart);
        let paymentAmount = activeLease.rentAmount;
        let paymentDescription = "First Month Rent Payment";

        // Check if lease started mid-month and adjust amount if needed
        const leaseStartDay = activeLease.leaseStart.getDate();
        if (leaseStartDay > 1) {
          // Pro-rate the first month's rent
          const daysInMonth = new Date(
            activeLease.leaseStart.getFullYear(),
            activeLease.leaseStart.getMonth() + 1,
            0,
          ).getDate();
          const remainingDays = daysInMonth - leaseStartDay + 1;
          paymentAmount = Math.round(
            (activeLease.rentAmount / daysInMonth) * remainingDays,
          );
          paymentDescription = `Pro-rated First Month Rent (${remainingDays} days)`;
        }

        paymentAction = "CREATE_FIRST_TIME";

        try {
          newPayment = await createPaymentWithLink({
            tenantId: paymentData.tenantId,
            propertyId: (activeLease.propertyId as any)._id.toString(),
            spotId: (activeLease.spotId as any)._id.toString(),
            amount: paymentAmount,
            type: "RENT",
            dueDate: paymentDueDate,
            description: paymentDescription,
            lateFeeAmount: 0,
            createdBy: paymentData.createdBy,
          });

          paymentLink = {
            id: newPayment.paymentIntent.id,
            url: `https://checkout.stripe.com/pay/${newPayment.paymentIntent.id}#fid=${newPayment.paymentIntent.id}`,
          };
        } catch (error) {
          console.error("Error creating first-time payment:", error);
          paymentAction = "ERROR";
        }
      } else {
        // Not first-time payment - create for current month
        paymentAction = "CREATE_NEW";

        try {
          newPayment = await createPaymentWithLink({
            tenantId: paymentData.tenantId,
            propertyId: (activeLease.propertyId as any)._id.toString(),
            spotId: (activeLease.spotId as any)._id.toString(),
            amount: activeLease.rentAmount,
            type: "RENT",
            dueDate: currentMonth,
            description: "Monthly Rent Payment",
            lateFeeAmount: 0,
            createdBy: paymentData.createdBy,
          });

          paymentLink = {
            id: newPayment.paymentIntent.id,
            url: `https://checkout.stripe.com/pay/${newPayment.paymentIntent.id}#fid=${newPayment.paymentIntent.id}`,
          };
        } catch (error) {
          console.error("Error creating payment:", error);
          paymentAction = "ERROR";
        }
      }
    } else if (currentMonthPayment.status === "PENDING") {
      // Payment exists but is pending - check if payment link exists
      paymentAction = "PENDING";

      if (currentMonthPayment.stripePaymentLinkId) {
        // Get existing payment link details
        try {
          const { StripeAccounts } = await import("../stripe/stripe.schema");
          const stripeAccount = await StripeAccounts.findOne({
            _id: currentMonthPayment.stripeAccountId,
            isActive: true,
          }).select("+stripeSecretKey");

          if (stripeAccount) {
            const paymentLinkDetails = await getPaymentLinkDetails(
              currentMonthPayment.stripePaymentLinkId,
              stripeAccount.stripeSecretKey,
            );

            paymentLink = {
              id: paymentLinkDetails.id,
              url: paymentLinkDetails.url,
            };
          }
        } catch (error) {
          console.error("Error getting payment link details:", error);
        }
      }
    } else if (currentMonthPayment.status === "OVERDUE") {
      paymentAction = "OVERDUE";
    } else if (currentMonthPayment.status === "PAID") {
      paymentAction = "PAID";
    }

    // Get recent payment history
    const recentPayments = await Payments.find({
      tenantId: paymentData.tenantId,
      type: "RENT",
      status: "PAID",
      isDeleted: false,
    })
      .sort({ dueDate: -1 })
      .limit(6);

    return {
      tenantId: paymentData.tenantId,
      lease: {
        id: activeLease._id,
        rentAmount: activeLease.rentAmount,
        leaseType: activeLease.leaseType,
        leaseStatus: activeLease.leaseStatus,
        leaseStart: activeLease.leaseStart,
      },
      currentMonth: {
        dueDate: currentMonthPayment?.dueDate || currentMonth,
        rentAmount: activeLease.rentAmount,
        status: currentMonthPayment?.status || "PENDING",
        paidDate: currentMonthPayment?.paidDate,
        daysOverdue: daysOverdue,
        lateFeeAmount: currentMonthPayment?.lateFeeAmount || 0,
        totalAmount: currentMonthPayment?.totalAmount || activeLease.rentAmount,
        receiptNumber: currentMonthPayment?.receiptNumber,
      },
      paymentAction,
      paymentLink,
      isFirstTimePayment,
      summary: {
        totalOverdueAmount,
        overdueCount: overduePayments.length,
        pendingCount: pendingPayments.length,
        totalPaidAmount: recentPayments.reduce(
          (sum, payment) => sum + payment.totalAmount,
          0,
        ),
        averagePaymentAmount:
          recentPayments.length > 0
            ? recentPayments.reduce(
                (sum, payment) => sum + payment.totalAmount,
                0,
              ) / recentPayments.length
            : 0,
      },
      recentPayments: recentPayments.map(payment => ({
        id: payment._id,
        dueDate: payment.dueDate,
        paidDate: payment.paidDate,
        amount: payment.totalAmount,
        paymentMethod: payment.paymentMethod,
        receiptNumber: payment.receiptNumber,
        status: payment.status,
      })),
      pendingPayments: pendingPayments.map(payment => ({
        id: payment._id,
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
  } catch (error) {
    console.error("Error getting tenant payment status:", error);
    throw error;
  }
};

import { Leases } from "../leases/leases.schema";
import { Properties } from "../properties/properties.schema";
import { Spots } from "../spots/spots.schema";
import { Users } from "../users/users.schema";
import { Payments } from "./payments.schema";

const getPaymentHistory = async (tenantId: string) => {
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

const mergePaymentData = (dbPayments: any[], stripePayments: any[]) => {
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

const calculateSummary = (payments: any[]) => {
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

// Enhanced rent summary with shared payment calculation logic
const getRentSummaryEnhanced = async (tenantId: string) => {
  try {
    // Get active lease for the tenant
    const activeLease = await Leases.findOne({
      tenantId: tenantId,
      leaseStatus: "ACTIVE",
      isDeleted: false,
    }).populate("propertyId spotId");

    if (!activeLease) {
      return {
        hasActiveLease: false,
        message: "No active lease found",
        rentSummary: undefined,
      };
    }

    // Get tenant, property, and spot information
    const tenant = await Users.findById(tenantId);
    const property = await Properties.findById(activeLease.propertyId);
    const spot = await Spots.findById(activeLease.spotId);

    if (!tenant || !property || !spot) {
      throw new Error("Tenant, property, or spot information not found");
    }

    // Get payment history to determine if this is a first-time payment
    const paymentHistory = await Payments.find({
      tenantId: tenantId,
      type: "RENT",
      status: "PAID", // Only count successful payments
      isDeleted: false,
    }).sort({ dueDate: 1 });

    // Calculate current date and months
    const currentDate = new Date();
    const currentMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1,
    );
    const nextMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      1,
    );

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

    // Check current month payment status
    const currentMonthPayment = await Payments.findOne({
      tenantId: tenantId,
      type: "RENT",
      dueDate: {
        $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
        $lt: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
      },
      isDeleted: false,
    });

    // Check next month payment status
    const nextMonthPayment = await Payments.findOne({
      tenantId: tenantId,
      type: "RENT",
      dueDate: {
        $gte: new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1,
          1,
        ),
        $lt: new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 1),
      },
      isDeleted: false,
    });

    // Get all pending/overdue payments
    const pendingPayments = await Payments.find({
      tenantId: tenantId,
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

    // Calculate total amount due (current month + overdue)
    let currentMonthAmount =
      currentMonthPayment?.totalAmount || activeLease.rentAmount;

    // For first-time payments, use the first payment amount
    if (paymentHistory.length === 0) {
      const leaseStartDay = leaseStart.getDate();
      if (leaseStartDay > 1) {
        // Pro-rated first month
        const daysInMonth = new Date(
          leaseStart.getFullYear(),
          leaseStart.getMonth() + 1,
          0,
        ).getDate();
        const remainingDays = daysInMonth - leaseStartDay + 1;
        const proRatedRent = Math.round(
          (rentAmount / daysInMonth) * remainingDays,
        );
        currentMonthAmount = proRatedRent + activeLease.depositAmount;
      } else {
        // Full first month
        currentMonthAmount = rentAmount + activeLease.depositAmount;
      }
    }

    const totalDue = currentMonthAmount + totalOverdueAmount;

    // Calculate days overdue for current payment
    const daysOverdue =
      currentMonthPayment && currentMonthPayment.status === "OVERDUE"
        ? Math.floor(
            (currentDate.getTime() - currentMonthPayment.dueDate.getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 0;

    // Determine payment action and next payment details
    let paymentAction = "NONE";
    let nextPaymentDetails = null;
    let isFirstTimePayment = false;
    let canPayNextMonth = false;

    if (paymentHistory.length === 0) {
      // First-time payment scenario
      isFirstTimePayment = true;
      paymentAction = "FIRST_TIME_PAYMENT";

      // Calculate first payment details
      let firstPaymentAmount = rentAmount + activeLease.depositAmount;
      let firstPaymentDescription = `First Month Rent + Deposit - ${tenant.name} - ${property.name} (${property.address}) - ${spot.spotNumber || spot.spotIdentifier}`;

      // Check if lease started mid-month
      const leaseStartDay = leaseStart.getDate();
      if (leaseStartDay > 1) {
        const daysInMonth = new Date(
          leaseStart.getFullYear(),
          leaseStart.getMonth() + 1,
          0,
        ).getDate();
        const remainingDays = daysInMonth - leaseStartDay + 1;
        const proRatedRent = Math.round(
          (rentAmount / daysInMonth) * remainingDays,
        );
        firstPaymentAmount = proRatedRent + activeLease.depositAmount;
        firstPaymentDescription = `Pro-rated First Month Rent (${remainingDays} days) + Deposit - ${tenant.name} - ${property.name} (${property.address}) - ${spot.spotNumber || spot.spotIdentifier}`;
      }

      nextPaymentDetails = {
        amount: firstPaymentAmount,
        dueDate: leaseStart,
        description: firstPaymentDescription,
        includesDeposit: true,
        isProRated: leaseStartDay > 1,
        proRatedDays:
          leaseStartDay > 1
            ? (() => {
                const daysInMonth = new Date(
                  leaseStart.getFullYear(),
                  leaseStart.getMonth() + 1,
                  0,
                ).getDate();
                return daysInMonth - leaseStartDay + 1;
              })()
            : null,
      };
    } else {
      // Regular payment scenarios
      if (!currentMonthPayment) {
        // No payment for current month
        paymentAction = "CURRENT_MONTH_DUE";
        nextPaymentDetails = {
          amount: rentAmount,
          dueDate: currentMonth,
          description: `Monthly Rent Payment - ${tenant.name} - ${property.name} (${property.address}) - ${spot.spotNumber || spot.spotIdentifier}`,
          includesDeposit: false,
          isProRated: false,
        };
      } else if (currentMonthPayment.status === "PAID" && !nextMonthPayment) {
        // Current month is paid, can pay next month
        paymentAction = "CAN_PAY_NEXT_MONTH";
        canPayNextMonth = true;
        nextPaymentDetails = {
          amount: rentAmount,
          dueDate: nextMonth,
          description: `Monthly Rent Payment (Next Month) - ${tenant.name} - ${property.name} (${property.address}) - ${spot.spotNumber || spot.spotIdentifier}`,
          includesDeposit: false,
          isProRated: false,
        };
      } else if (currentMonthPayment.status === "PAID" && nextMonthPayment) {
        // Already paid for current and next month - one month ahead limit reached
        paymentAction = "PAYMENT_LIMIT_REACHED";
        const currentMonthName = currentMonth.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });
        const nextMonthName = nextMonth.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });
        nextPaymentDetails = {
          warning: `You have already paid for ${currentMonthName} and ${nextMonthName}. You cannot pay more than one month ahead.`,
        };
      } else if (currentMonthPayment.status === "PENDING") {
        paymentAction = "CURRENT_MONTH_PENDING";
        nextPaymentDetails = {
          amount: currentMonthPayment.totalAmount,
          dueDate: currentMonthPayment.dueDate,
          description: currentMonthPayment.description,
          status: "PENDING",
        };
      } else if (currentMonthPayment.status === "OVERDUE") {
        paymentAction = "CURRENT_MONTH_OVERDUE";
        nextPaymentDetails = {
          amount: currentMonthPayment.totalAmount,
          dueDate: currentMonthPayment.dueDate,
          description: currentMonthPayment.description,
          status: "OVERDUE",
          daysOverdue: daysOverdue,
        };
      }
    }

    // Simplified rent summary
    const rentSummary = {
      // Basic property info
      property: {
        name: property.name,
        address: property.address,
      },
      spot: {
        spotNumber: spot.spotNumber || spot.spotIdentifier,
      },

      // Lease info
      lease: {
        rentAmount: activeLease.rentAmount,
        depositAmount: activeLease.depositAmount,
        leaseStart: activeLease.leaseStart,
        leaseEnd: activeLease.leaseEnd,
      },

      // Current month status
      currentMonth: {
        status: currentMonthPayment?.status || "PENDING",
        dueDate: currentMonthPayment?.dueDate || currentMonth,
        amount:
          currentMonthPayment?.totalAmount ||
          (isFirstTimePayment ? currentMonthAmount : activeLease.rentAmount),
        daysOverdue: daysOverdue,
        // Add deposit information for first-time payments
        rentAmount: activeLease.rentAmount,
        depositAmount: isFirstTimePayment ? activeLease.depositAmount : 0,
        includesDeposit: isFirstTimePayment,
        isFirstTimePayment: isFirstTimePayment,
      },

      // Payment action and details
      paymentAction,
      canPayNextMonth,
      isFirstTimePayment,

      // Simple summary
      summary: {
        totalOverdueAmount,
        totalDue,
        overdueCount: overduePayments.length,
        pendingCount: pendingPayments.length,
      },

      // Recent payments (last 3 only)
      recentPayments: (
        await Payments.find({
          tenantId: tenantId,
          type: "RENT",
          status: "PAID",
          isDeleted: false,
        })
          .sort({ dueDate: -1 })
          .limit(3)
          .lean()
      ).map(payment => ({
        dueDate: payment.dueDate,
        amount: payment.totalAmount,
        status: payment.status,
      })),

      // Pending payments
      pendingPayments: pendingPayments.map(payment => ({
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
  } catch (error) {
    console.error("Error getting enhanced rent summary:", error);
    throw error;
  }
};

// Create payment with link
const createPaymentWithLink = async (paymentData: {
  tenantId: string;
  currentDate?: string;
  createdBy: string;
}) => {
  try {
    console.log("🚀 ~ createPaymentWithLink ~ paymentData:", paymentData);

    // Get active lease for the tenant
    const activeLease = await Leases.findOne({
      tenantId: paymentData.tenantId,
      leaseStatus: "ACTIVE",
      isDeleted: false,
    }).populate("propertyId spotId");

    if (!activeLease) {
      throw new Error("No active lease found for this tenant");
    }

    // Get tenant, property, and spot information for payment description
    const tenant = await Users.findById(paymentData.tenantId);
    const property = await Properties.findById(activeLease.propertyId);
    const spot = await Spots.findById(activeLease.spotId);

    if (!tenant || !property || !spot) {
      throw new Error("Tenant, property, or spot information not found");
    }

    // Get payment history to determine if this is a first-time payment
    const paymentHistory = await Payments.find({
      tenantId: paymentData.tenantId,
      type: "RENT",
      status: "PAID", // Only count successful payments
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
    let includeDeposit = false;
    let warningMessage: string | undefined;

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
      includeDeposit = true;
      paymentDueDate = new Date(leaseStart);
      paymentAmount = rentAmount + activeLease.depositAmount;
      paymentDescription = `First Month Rent + Deposit - ${tenant.name} - ${property.name} (${property.address}) - ${spot.spotNumber || spot.spotIdentifier}`;

      // Check if lease started mid-month and adjust amount if needed
      const leaseStartDay = leaseStart.getDate();
      console.log("🔍 Lease start analysis:", {
        leaseStart: leaseStart.toISOString(),
        leaseStartDay,
        rentAmount,
        depositAmount: activeLease.depositAmount,
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
        const proRatedRent = Math.round(
          (rentAmount / daysInMonth) * remainingDays,
        );
        paymentAmount = proRatedRent + activeLease.depositAmount;
        paymentDescription = `Pro-rated First Month Rent (${remainingDays} days) + Deposit - ${tenant.name} - ${property.name} (${property.address}) - ${spot.spotNumber || spot.spotIdentifier}`;

        console.log("📊 Pro-rated calculation:", {
          daysInMonth,
          remainingDays,
          originalAmount: rentAmount,
          proRatedAmount: proRatedRent,
          depositAmount: activeLease.depositAmount,
          totalAmount: paymentAmount,
        });
      } else {
        // If lease starts on the 1st of the month, charge full rent + deposit
        paymentAmount = rentAmount + activeLease.depositAmount;
        paymentDescription = `First Month Rent + Deposit - ${tenant.name} - ${property.name} (${property.address}) - ${spot.spotNumber || spot.spotIdentifier}`;
        console.log("💰 Full rent + deposit charged:", {
          amount: paymentAmount,
        });
      }
    } else {
      // Not first-time payment - check current month and next month
      const currentMonth = new Date(
        effectiveCurrentDate.getFullYear(),
        effectiveCurrentDate.getMonth(),
        1,
      );
      const nextMonth = new Date(
        effectiveCurrentDate.getFullYear(),
        effectiveCurrentDate.getMonth() + 1,
        1,
      );

      // Check if we already have a payment for current month
      const currentMonthPayment = paymentHistory.find(payment => {
        const dueDate: Date =
          payment.dueDate instanceof Date
            ? payment.dueDate
            : new Date(payment.dueDate);

        if (isNaN(dueDate.getTime())) {
          return false;
        }

        const paymentMonth = new Date(
          dueDate.getFullYear(),
          dueDate.getMonth(),
          1,
        );
        return paymentMonth.getTime() === currentMonth.getTime();
      });

      // Check if we already have a payment for next month
      const nextMonthPayment = paymentHistory.find(payment => {
        const dueDate: Date =
          payment.dueDate instanceof Date
            ? payment.dueDate
            : new Date(payment.dueDate);

        if (isNaN(dueDate.getTime())) {
          return false;
        }

        const paymentMonth = new Date(
          dueDate.getFullYear(),
          dueDate.getMonth(),
          1,
        );
        return paymentMonth.getTime() === nextMonth.getTime();
      });

      // Determine which month to create payment for
      if (!currentMonthPayment) {
        // No payment for current month - create current month payment
        paymentDueDate = currentMonth;
        paymentAmount = rentAmount;
        paymentDescription = `Monthly Rent Payment - ${tenant.name} - ${property.name} (${property.address}) - ${spot.spotNumber || spot.spotIdentifier}`;
        console.log("💰 Creating payment for current month:", {
          amount: paymentAmount,
          dueDate: paymentDueDate.toISOString(),
        });
      } else if (currentMonthPayment.status === "PAID" && !nextMonthPayment) {
        // Current month is paid, no payment for next month - create next month payment
        paymentDueDate = nextMonth;
        paymentAmount = rentAmount;
        paymentDescription = `Monthly Rent Payment (Next Month) - ${tenant.name} - ${property.name} (${property.address}) - ${spot.spotNumber || spot.spotIdentifier}`;
        console.log("💰 Creating payment for next month (one month ahead):", {
          amount: paymentAmount,
          dueDate: paymentDueDate.toISOString(),
        });
      } else if (currentMonthPayment.status === "PAID" && nextMonthPayment) {
        // Current month is paid AND next month already has payment - show warning
        const currentMonthName = new Date(
          effectiveCurrentDate.getFullYear(),
          effectiveCurrentDate.getMonth(),
          1,
        ).toLocaleDateString("en-US", { month: "long", year: "numeric" });

        const nextMonthName = new Date(
          effectiveCurrentDate.getFullYear(),
          effectiveCurrentDate.getMonth() + 1,
          1,
        ).toLocaleDateString("en-US", { month: "long", year: "numeric" });

        throw new Error(
          `You have already paid for ${currentMonthName} and ${nextMonthName}. You cannot pay more than one month ahead.`,
        );
      } else if (currentMonthPayment.status === "PENDING") {
        // Current month payment exists but is pending
        throw new Error(
          "Rent payment for current month already exists and is pending",
        );
      } else if (currentMonthPayment.status === "OVERDUE") {
        // Current month payment is overdue
        throw new Error(
          "Rent payment for current month is overdue. Please pay the overdue amount first.",
        );
      } else {
        // Fallback - should not reach here, but just in case
        throw new Error(
          "Unable to determine payment scenario. Please contact support.",
        );
      }
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

    // Get the Stripe account for this property
    const { StripeAccounts } = await import("../stripe/stripe.schema");
    const stripeAccount = await StripeAccounts.findOne({
      propertyIds: propertyId,
      isActive: true,
      isVerified: true,
    }).select("+stripeSecretKey"); // Explicitly select the secret key

    if (!stripeAccount) {
      throw new Error("No active Stripe account found for this property");
    }

    // Debug: Check if secret key exists
    console.log("🔍 Stripe account found:", {
      accountId: stripeAccount._id,
      name: stripeAccount.name,
      hasSecretKey: !!stripeAccount.stripeSecretKey,
      secretKeyLength: stripeAccount.stripeSecretKey?.length || 0,
    });

    if (!stripeAccount.stripeSecretKey) {
      throw new Error("Stripe account secret key is not configured");
    }

    // Create Stripe payment link first (without saving payment record)
    const { createStripeInstance } = await import("../stripe/stripe.service");
    console.log("🔧 Creating Stripe instance with secret key...");
    const stripe = createStripeInstance(stripeAccount.stripeSecretKey);

    // Generate a unique payment ID for metadata
    const tempPaymentId = `TEMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Create a temporary payment record to store metadata
    const tempPaymentRecord = await Payments.create({
      tenantId: paymentData.tenantId,
      propertyId,
      spotId,
      amount: paymentAmount,
      type: "RENT",
      status: "PENDING",
      dueDate: paymentDueDate,
      description: paymentDescription,
      lateFeeAmount: 0,
      totalAmount: paymentAmount,
      createdBy: paymentData.createdBy,
      receiptNumber: `TEMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      // Store metadata for webhook processing
      stripeMetadata: {
        isFirstTimePayment,
        includeDeposit,
        paymentAmount: paymentAmount.toString(),
        paymentDueDate: paymentDueDate.toISOString(),
        paymentDescription,
        createdBy: paymentData.createdBy,
      },
    });

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: paymentDescription,
            },
            unit_amount: Math.round(paymentAmount * 100), // Convert to cents
          },
          quantity: 1,
        } as any,
      ],
      metadata: {
        paymentRecordId: (tempPaymentRecord._id as any).toString(), // Store our payment record ID
        tenantId: paymentData.tenantId,
        propertyId: propertyId,
        spotId: spotId,
      },
      // This passes metadata to the Payment Intent when it's created
      payment_intent_data: {
        metadata: {
          paymentRecordId: (tempPaymentRecord._id as any).toString(),
          tenantId: paymentData.tenantId,
          propertyId: propertyId,
          spotId: spotId,
        },
      },
      payment_method_types: ["card"],
      after_completion: {
        type: "redirect",
        redirect: {
          url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/payment-success?payment_intent={CHECKOUT_SESSION_ID}`,
        },
      },
    });

    console.log("✅ Payment link created successfully:", {
      paymentLinkId: paymentLink.id,
      tempPaymentId: tempPaymentRecord._id,
      amount: paymentAmount,
      isFirstTimePayment,
      includeDeposit,
    });

    // Update payment record with payment link ID
    await Payments.findByIdAndUpdate(tempPaymentRecord._id, {
      stripePaymentLinkId: paymentLink.id,
      stripeAccountId: stripeAccount._id,
      status: "PENDING", // Update status to pending
    });

    return {
      paymentLink: {
        id: paymentLink.id,
        url: paymentLink.url,
      },
      tempPaymentId: tempPaymentRecord._id,
      amount: paymentAmount,
      dueDate: paymentDueDate,
      description: paymentDescription,
      isFirstTimePayment,
      includeDeposit,
      warningMessage,
      lease: {
        id: activeLease._id,
        rentAmount: rentAmount,
        depositAmount: activeLease.depositAmount,
        leaseType: activeLease.leaseType,
        leaseStatus: activeLease.leaseStatus,
        leaseStart: leaseStart,
      },
    };
  } catch (error) {
    console.error("Error creating payment with link:", error);
    throw error;
  }
};

// Get payment link details
const getPaymentLinkDetails = async (
  paymentLinkId: string,
  secretKey: string,
) => {
  const { createStripeInstance } = await import("../stripe/stripe.service");
  const stripe = createStripeInstance(secretKey);
  return await stripe.paymentLinks.retrieve(paymentLinkId);
};

// Get transaction history for a payment link
const getPaymentLinkTransactions = async (
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
const createPaymentFromStripe = async (
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

// Handle successful payment via webhook
const handleSuccessfulPayment = async (stripePaymentIntent: any) => {
  try {
    console.log("🎉 Processing successful payment:", {
      paymentIntentId: stripePaymentIntent.id,
      amount: stripePaymentIntent.amount / 100,
      metadata: stripePaymentIntent.metadata,
    });

    // Extract payment record ID from metadata
    const { paymentRecordId } = stripePaymentIntent.metadata;

    if (!paymentRecordId) {
      console.error(
        "❌ Missing paymentRecordId in metadata:",
        stripePaymentIntent.metadata,
      );
      throw new Error("Missing payment record ID in metadata");
    }

    // Find the existing payment record
    const existingPayment = await Payments.findById(paymentRecordId);
    if (!existingPayment) {
      console.error("❌ Payment record not found:", paymentRecordId);
      throw new Error("Payment record not found");
    }

    // Use stored metadata if available, otherwise use PaymentIntent data
    const storedMetadata = existingPayment.stripeMetadata || {};

    console.log("📋 Using stored metadata:", storedMetadata);

    // Update the payment record with successful payment details
    const updatedPayment = await Payments.findByIdAndUpdate(
      paymentRecordId,
      {
        status: "PAID",
        paidDate: new Date(stripePaymentIntent.created * 1000),
        paymentMethod: "ONLINE",
        transactionId: stripePaymentIntent.id,
        stripeTransactionId: stripePaymentIntent.id,
        stripePaymentIntentId: stripePaymentIntent.id,
        receiptNumber: `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        // Update description if we have stored metadata
        description:
          storedMetadata.paymentDescription || existingPayment.description,
      },
      { new: true },
    );

    console.log("✅ Payment record updated successfully:", {
      paymentId: updatedPayment?._id,
      amount: updatedPayment?.totalAmount,
      status: updatedPayment?.status,
      description: updatedPayment?.description,
    });

    return updatedPayment;
  } catch (error) {
    console.error("❌ Error handling successful payment:", error);
    throw error;
  }
};

// Get comprehensive tenant payment status with automatic payment creation
const getTenantPaymentStatusEnhanced = async (paymentData: {
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
      status: "PAID", // Only count successful payments
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

    // Calculate total amount due (current month + overdue)
    const currentMonthAmount =
      currentMonthPayment?.totalAmount || activeLease.rentAmount;
    const totalDue = currentMonthAmount + totalOverdueAmount;

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
            currentDate: new Date().toISOString(),
            createdBy: paymentData.createdBy,
          });

          paymentLink = {
            id: newPayment.paymentLink.id,
            url: newPayment.paymentLink.url,
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
            currentDate: new Date().toISOString(),
            createdBy: paymentData.createdBy,
          });

          paymentLink = {
            id: newPayment.paymentLink.id,
            url: newPayment.paymentLink.url,
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
        totalDue,
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

export const PaymentService = {
  getTenantPaymentStatusEnhanced,
  getPaymentLinkDetails,
  getPaymentHistory,
  getRentSummary: getRentSummaryEnhanced, // Changed to use the enhanced function
  createPaymentWithLink,
  handleSuccessfulPayment,
};

import { Request, Response } from "express";
import httpStatus from "http-status";
import Stripe from "stripe";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { Payments } from "../payments/payments.schema";
import { Properties } from "../properties/properties.schema";
import { Users } from "../users/users.schema";
import { StripeAccounts } from "./stripe-accounts.schema";
import { StripeService } from "./stripe.service";

// Create a new Stripe account for a property
export const createStripeAccount = catchAsync(
  async (req: Request, res: Response) => {
    const {
      name,
      description,
      stripeAccountId,
      businessName,
      businessEmail,
      isGlobalAccount = false,
      metadata,
    } = req.body;

    // Check if Stripe account ID already exists
    const existingAccount = await StripeAccounts.findOne({
      stripeAccountId,
      isDeleted: false,
    });

    if (existingAccount) {
      return sendResponse(res, {
        statusCode: httpStatus.CONFLICT,
        success: false,
        message: "Stripe account ID already exists",
        data: null,
      });
    }

    // Create new Stripe account
    const stripeAccount = await StripeAccounts.create({
      name,
      description,
      stripeAccountId,
      businessName,
      businessEmail,
      isActive: true,
      isVerified: false, // Will be verified through Stripe Connect onboarding
      isGlobalAccount,
      metadata,
    });

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Stripe account created successfully",
      data: stripeAccount,
    });
  },
);

// Link Stripe account to a property
export const linkStripeAccountToProperty = catchAsync(
  async (req: Request, res: Response) => {
    const { accountId, propertyId } = req.body;

    // Validate that property exists
    const property = await Properties.findById(propertyId);

    if (!property) {
      return sendResponse(res, {
        statusCode: httpStatus.NOT_FOUND,
        success: false,
        message: "Property not found",
        data: null,
      });
    }

    // Validate that Stripe account exists
    const stripeAccount = await StripeAccounts.findById(accountId);

    if (!stripeAccount) {
      return sendResponse(res, {
        statusCode: httpStatus.NOT_FOUND,
        success: false,
        message: "Stripe account not found",
        data: null,
      });
    }

    // Check if property already has a Stripe account
    const existingPropertyAccount = await StripeAccounts.findOne({
      propertyId,
      isDeleted: false,
    });

    if (existingPropertyAccount) {
      return sendResponse(res, {
        statusCode: httpStatus.CONFLICT,
        success: false,
        message: "Property already has a Stripe account",
        data: null,
      });
    }

    // Update the Stripe account with property ID
    const updatedAccount = await StripeAccounts.findByIdAndUpdate(
      accountId,
      { propertyId },
      { new: true },
    ).populate("propertyId", "name address");

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Stripe account linked to property successfully",
      data: updatedAccount,
    });
  },
);

// Get available Stripe accounts for a property
export const getAvailableStripeAccounts = catchAsync(
  async (req: Request, res: Response) => {
    const { propertyId } = req.params;

    // Validate that property exists
    const property = await Properties.findById(propertyId);
    if (!property) {
      return sendResponse(res, {
        statusCode: httpStatus.NOT_FOUND,
        success: false,
        message: "Property not found",
        data: null,
      });
    }

    // Get property-specific account
    const propertyAccount = await StripeAccounts.findOne({
      propertyId,
      isDeleted: false,
    }).populate("propertyId", "name address");

    // Get global accounts
    const globalAccounts = await StripeAccounts.find({
      isGlobalAccount: true,
      isDeleted: false,
    }).populate("propertyId", "name address");

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Available Stripe accounts retrieved successfully",
      data: {
        propertyAccount,
        globalAccounts,
        hasPropertyAccount: !!propertyAccount,
        hasGlobalAccounts: globalAccounts.length > 0,
      },
    });
  },
);

// Get all Stripe accounts
export const getAllStripeAccounts = catchAsync(
  async (req: Request, res: Response) => {
    const accounts = await StripeAccounts.find({ isDeleted: false })
      .populate("propertyId", "name address")
      .sort({ createdAt: -1 });

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Stripe accounts retrieved successfully",
      data: accounts,
    });
  },
);

// Get Stripe account by ID
export const getStripeAccountById = catchAsync(
  async (req: Request, res: Response) => {
    const { accountId } = req.params;

    const account = await StripeAccounts.findById(accountId).populate(
      "propertyId",
      "name address",
    );

    if (!account) {
      return sendResponse(res, {
        statusCode: httpStatus.NOT_FOUND,
        success: false,
        message: "Stripe account not found",
        data: null,
      });
    }

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Stripe account retrieved successfully",
      data: account,
    });
  },
);

// Get Stripe account by property ID
export const getStripeAccountByProperty = catchAsync(
  async (req: Request, res: Response) => {
    const { propertyId } = req.params;

    const account = await StripeAccounts.findOne({
      propertyId,
      isDeleted: false,
    }).populate("propertyId", "name address");

    if (!account) {
      return sendResponse(res, {
        statusCode: httpStatus.NOT_FOUND,
        success: false,
        message: "No Stripe account found for this property",
        data: null,
      });
    }

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Stripe account retrieved successfully",
      data: account,
    });
  },
);

// Update Stripe account
export const updateStripeAccount = catchAsync(
  async (req: Request, res: Response) => {
    const { accountId } = req.params;
    const updateData = req.body;

    const account = await StripeAccounts.findByIdAndUpdate(
      accountId,
      updateData,
      { new: true },
    ).populate("propertyId", "name address");

    if (!account) {
      return sendResponse(res, {
        statusCode: httpStatus.NOT_FOUND,
        success: false,
        message: "Stripe account not found",
        data: null,
      });
    }

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Stripe account updated successfully",
      data: account,
    });
  },
);

// Delete Stripe account (soft delete)
export const deleteStripeAccount = catchAsync(
  async (req: Request, res: Response) => {
    const { accountId } = req.params;

    const account = await StripeAccounts.findByIdAndUpdate(
      accountId,
      { isDeleted: true, deletedAt: new Date() },
      { new: true },
    );

    if (!account) {
      return sendResponse(res, {
        statusCode: httpStatus.NOT_FOUND,
        success: false,
        message: "Stripe account not found",
        data: null,
      });
    }

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Stripe account deleted successfully",
      data: null,
    });
  },
);

// Verify Stripe account (mark as verified)
export const verifyStripeAccount = catchAsync(
  async (req: Request, res: Response) => {
    const { accountId } = req.params;

    const account = await StripeAccounts.findByIdAndUpdate(
      accountId,
      { isVerified: true },
      { new: true },
    ).populate("propertyId", "name address");

    if (!account) {
      return sendResponse(res, {
        statusCode: httpStatus.NOT_FOUND,
        success: false,
        message: "Stripe account not found",
        data: null,
      });
    }

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Stripe account verified successfully",
      data: account,
    });
  },
);

// Create a new payment with unique payment link
export const createPaymentWithLink = catchAsync(
  async (req: Request, res: Response) => {
    const {
      tenantId,
      propertyId,
      spotId,
      amount,
      type,
      dueDate,
      description,
      lateFeeAmount,
    } = req.body;

    const stripeService = new StripeService();

    const result = await stripeService.createPaymentWithLink({
      tenantId,
      propertyId,
      spotId,
      amount,
      type,
      dueDate: new Date(dueDate),
      description,
      lateFeeAmount,
      createdBy: req.user?.id || "SYSTEM",
    });

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Payment created with payment link successfully",
      data: {
        payment: result.payment,
        paymentLink: {
          id: result.paymentLink.id,
          url: result.paymentLink.url,
          expiresAt: (result.paymentLink as any).expires_at,
        },
      },
    });
  },
);

// Get payment link details
export const getPaymentLinkDetails = catchAsync(
  async (req: Request, res: Response) => {
    const { paymentLinkId } = req.params;

    const stripeService = new StripeService();
    const paymentLink =
      await stripeService.getPaymentLinkDetails(paymentLinkId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Payment link details retrieved successfully",
      data: paymentLink,
    });
  },
);

export const handleWebhook = catchAsync(async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"];

  try {
    let event;

    // Get the raw body for signature verification
    const payload = req.body;

    // Verify the signature
    try {
      event = StripeService.constructWebhookEvent(payload, sig);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentSuccess(event.data.object);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentFailure(event.data.object);
        break;
      case "payment_intent.canceled":
        await handlePaymentCanceled(event.data.object);
        break;
      case "payment_intent.processing":
        break;
      case "payment_intent.requires_action":
        break;
      case "charge.succeeded":
        break;
      case "charge.updated":
        break;
      default:
        break;
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    res.status(400).send(`Webhook Error: ${error.message || "Unknown error"}`);
  }
});

export async function handlePaymentSuccess(
  paymentIntent: Stripe.PaymentIntent,
) {
  try {
    // Extract metadata from the unique payment link
    const metadata = paymentIntent.metadata;

    if (!metadata.tenantId || !metadata.receiptNumber) {
      throw new Error("Missing required payment metadata");
    }

    // Find the existing payment record by receipt number
    const existingPayment = await Payments.findOne({
      receiptNumber: metadata.receiptNumber,
    });

    if (!existingPayment) {
      throw new Error("Payment record not found");
    }

    // Check if payment already exists
    const duplicatePayment = await Payments.findOne({
      stripeTransactionId: paymentIntent.id,
    });

    if (duplicatePayment) {
      return;
    }

    // Update the existing payment record with Stripe transaction details
    await Payments.findByIdAndUpdate(
      existingPayment._id,
      {
        status: "PAID",
        paidDate: new Date(paymentIntent.created * 1000),
        paymentMethod: "ONLINE",
        transactionId: paymentIntent.id,
        stripeTransactionId: paymentIntent.id,
      },
      { new: true },
    );
  } catch (error: any) {
    console.error("Payment success handling error:", error);
    throw error;
  }
}

export async function handlePaymentFailure(
  paymentIntent: Stripe.PaymentIntent,
) {
  try {
    const metadata = paymentIntent.metadata;
    const receiptNumber = metadata.receiptNumber;

    if (receiptNumber) {
      // Update payment status to failed
      await Payments.findOneAndUpdate(
        { receiptNumber },
        { status: "CANCELLED" },
      );
    }
  } catch (error: any) {
    console.error("Payment failure handling error:", error);
  }
}

export async function handlePaymentCanceled(
  paymentIntent: Stripe.PaymentIntent,
) {
  try {
    const metadata = paymentIntent.metadata;
    const receiptNumber = metadata.receiptNumber;

    if (receiptNumber) {
      // Update payment status to cancelled
      await Payments.findOneAndUpdate(
        { receiptNumber },
        { status: "CANCELLED" },
      );
    }
  } catch (error: any) {
    console.error("Payment cancellation handling error:", error);
  }
}

// Sync payment history for a user
export const syncPaymentHistory = catchAsync(
  async (req: Request, res: Response) => {
    const { userId } = req.params;

    const user = await Users.findById(userId);
    if (!user) {
      return sendResponse(res, {
        statusCode: httpStatus.NOT_FOUND,
        success: false,
        message: "User not found",
        data: null,
      });
    }

    // Get user's active lease to find the property and Stripe account
    const { Leases } = await import("../leases/leases.schema");
    const activeLease = await Leases.findOne({
      tenantId: userId,
      leaseStatus: "ACTIVE",
      isDeleted: false,
    });

    if (!activeLease) {
      return sendResponse(res, {
        statusCode: httpStatus.NOT_FOUND,
        success: false,
        message: "No active lease found for user",
        data: null,
      });
    }

    // Get the Stripe account for this property
    const { StripeAccounts } = await import("./stripe-accounts.schema");
    const stripeAccount = await StripeAccounts.findOne({
      propertyId: activeLease.propertyId,
      isActive: true,
      isVerified: true,
    });

    if (!stripeAccount) {
      return sendResponse(res, {
        statusCode: httpStatus.NOT_FOUND,
        success: false,
        message: "No active Stripe account found for property",
        data: null,
      });
    }

    const stripeService = new StripeService();
    await stripeService.syncStripePayments(
      stripeAccount.stripeAccountId,
      userId,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Payment history synced successfully",
      data: null,
    });
  },
);

// Webhook status check endpoint
export const webhookStatus = catchAsync(async (req: Request, res: Response) => {
  const timestamp = new Date().toISOString();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Webhook endpoint is active",
    data: {
      timestamp,
      status: "active",
      endpoint: "/api/v1.0/webhooks/webhook",
      environment: process.env.NODE_ENV || "development",
    },
  });
});

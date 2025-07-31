import { Request, Response } from "express";
import httpStatus from "http-status";
import Stripe from "stripe";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { Payments } from "../payments/payments.schema";
import { Users } from "../users/users.schema";
import {
  createStripeAccount as createStripeAccountService,
  deleteStripeAccount as deleteStripeAccountService,
  getAllStripeAccounts as getAllStripeAccountsService,
  getAssignablePropertiesForAccount as getAssignablePropertiesForAccountService,
  getAvailableStripeAccounts as getAvailableStripeAccountsService,
  getDefaultAccount as getDefaultAccountService,
  getStripeAccountById as getStripeAccountByIdService,
  getStripeAccountsByProperty as getStripeAccountsByPropertyService,
  getUnassignedProperties as getUnassignedPropertiesService,
  linkPropertiesToAccount as linkPropertiesToAccountService,
  setDefaultAccount as setDefaultAccountService,
  StripeService,
  unlinkPropertiesFromAccount as unlinkPropertiesFromAccountService,
  updateStripeAccount as updateStripeAccountService,
  verifyStripeAccount as verifyStripeAccountService,
} from "./stripe.service";

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
      isDefaultAccount = false,
      metadata,
    } = req.body;

    // Prepare account data with proper defaults
    const accountData = {
      name,
      description: description || undefined,
      stripeAccountId,
      businessName: businessName || undefined,
      businessEmail: businessEmail || undefined,
      isActive: true,
      isVerified: false, // Will be verified through Stripe Connect onboarding
      isGlobalAccount: Boolean(isGlobalAccount),
      isDefaultAccount: Boolean(isDefaultAccount),
      propertyIds: [], // Start with empty property array
      metadata: metadata || undefined,
    };

    try {
      const stripeAccount = await createStripeAccountService(accountData);

      sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Stripe account created successfully",
        data: stripeAccount,
      });
    } catch (error: any) {
      if (error.message === "Stripe account ID already exists") {
        return sendResponse(res, {
          statusCode: httpStatus.CONFLICT,
          success: false,
          message: error.message,
          data: null,
        });
      }
      if (error.message === "Another account is already set as default") {
        return sendResponse(res, {
          statusCode: httpStatus.CONFLICT,
          success: false,
          message: error.message,
          data: null,
        });
      }
      throw error;
    }
  },
);

// Link multiple properties to a Stripe account
export const linkPropertiesToAccount = catchAsync(
  async (req: Request, res: Response) => {
    const { accountId, propertyIds } = req.body;

    try {
      const updatedAccount = await linkPropertiesToAccountService(
        accountId,
        propertyIds,
      );

      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Properties linked to Stripe account successfully",
        data: updatedAccount,
      });
    } catch (error: any) {
      if (error.message === "Stripe account not found") {
        return sendResponse(res, {
          statusCode: httpStatus.NOT_FOUND,
          success: false,
          message: error.message,
          data: null,
        });
      }
      if (error.message.includes("One or more properties not found")) {
        return sendResponse(res, {
          statusCode: httpStatus.NOT_FOUND,
          success: false,
          message: error.message,
          data: null,
        });
      }
      if (error.message.includes("already assigned to other accounts")) {
        return sendResponse(res, {
          statusCode: httpStatus.CONFLICT,
          success: false,
          message: error.message,
          data: null,
        });
      }
      throw error;
    }
  },
);

// Unlink properties from a Stripe account
export const unlinkPropertiesFromAccount = catchAsync(
  async (req: Request, res: Response) => {
    const { accountId, propertyIds } = req.body;

    try {
      const updatedAccount = await unlinkPropertiesFromAccountService(
        accountId,
        propertyIds,
      );

      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Properties unlinked from Stripe account successfully",
        data: updatedAccount,
      });
    } catch (error: any) {
      if (error.message === "Stripe account not found") {
        return sendResponse(res, {
          statusCode: httpStatus.NOT_FOUND,
          success: false,
          message: error.message,
          data: null,
        });
      }
      throw error;
    }
  },
);

// Set an account as default
export const setDefaultAccount = catchAsync(
  async (req: Request, res: Response) => {
    const { accountId } = req.body;

    try {
      const updatedAccount = await setDefaultAccountService(accountId);

      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Default account set successfully",
        data: updatedAccount,
      });
    } catch (error: any) {
      if (error.message === "Stripe account not found") {
        return sendResponse(res, {
          statusCode: httpStatus.NOT_FOUND,
          success: false,
          message: error.message,
          data: null,
        });
      }
      throw error;
    }
  },
);

// Get default account
export const getDefaultAccount = catchAsync(
  async (req: Request, res: Response) => {
    try {
      const defaultAccount = await getDefaultAccountService();

      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Default account retrieved successfully",
        data: defaultAccount,
      });
    } catch (error: any) {
      if (error.message === "No default account found") {
        return sendResponse(res, {
          statusCode: httpStatus.NOT_FOUND,
          success: false,
          message: error.message,
          data: null,
        });
      }
      throw error;
    }
  },
);

// Get all Stripe accounts with comprehensive property information
export const getAllStripeAccounts = catchAsync(
  async (req: Request, res: Response) => {
    const comprehensiveData = await getAllStripeAccountsService();

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message:
        "Stripe accounts and property assignments retrieved successfully",
      data: comprehensiveData,
    });
  },
);

// Get Stripe account by ID
export const getStripeAccountById = catchAsync(
  async (req: Request, res: Response) => {
    const { accountId } = req.params;

    try {
      const account = await getStripeAccountByIdService(accountId);

      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Stripe account retrieved successfully",
        data: account,
      });
    } catch (error: any) {
      if (error.message === "Stripe account not found") {
        return sendResponse(res, {
          statusCode: httpStatus.NOT_FOUND,
          success: false,
          message: error.message,
          data: null,
        });
      }
      throw error;
    }
  },
);

// Get Stripe accounts by property ID
export const getStripeAccountsByProperty = catchAsync(
  async (req: Request, res: Response) => {
    const { propertyId } = req.params;

    const accounts = await getStripeAccountsByPropertyService(propertyId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Stripe accounts retrieved successfully",
      data: accounts,
    });
  },
);

// Update Stripe account
export const updateStripeAccount = catchAsync(
  async (req: Request, res: Response) => {
    const { accountId } = req.params;
    const updateData = req.body;

    try {
      const account = await updateStripeAccountService(accountId, updateData);

      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Stripe account updated successfully",
        data: account,
      });
    } catch (error: any) {
      if (error.message === "Stripe account not found") {
        return sendResponse(res, {
          statusCode: httpStatus.NOT_FOUND,
          success: false,
          message: error.message,
          data: null,
        });
      }
      if (error.message === "Another account is already set as default") {
        return sendResponse(res, {
          statusCode: httpStatus.CONFLICT,
          success: false,
          message: error.message,
          data: null,
        });
      }
      throw error;
    }
  },
);

// Delete Stripe account (soft delete)
export const deleteStripeAccount = catchAsync(
  async (req: Request, res: Response) => {
    const { accountId } = req.params;

    try {
      await deleteStripeAccountService(accountId);

      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Stripe account deleted successfully",
        data: null,
      });
    } catch (error: any) {
      if (error.message === "Stripe account not found") {
        return sendResponse(res, {
          statusCode: httpStatus.NOT_FOUND,
          success: false,
          message: error.message,
          data: null,
        });
      }
      throw error;
    }
  },
);

// Verify Stripe account (mark as verified)
export const verifyStripeAccount = catchAsync(
  async (req: Request, res: Response) => {
    const { accountId } = req.params;

    try {
      const account = await verifyStripeAccountService(accountId);

      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Stripe account verified successfully",
        data: account,
      });
    } catch (error: any) {
      if (error.message === "Stripe account not found") {
        return sendResponse(res, {
          statusCode: httpStatus.NOT_FOUND,
          success: false,
          message: error.message,
          data: null,
        });
      }
      throw error;
    }
  },
);

// Get available Stripe accounts for a property (including global and default)
export const getAvailableStripeAccounts = catchAsync(
  async (req: Request, res: Response) => {
    const { propertyId } = req.params;

    try {
      const result = await getAvailableStripeAccountsService(propertyId);

      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Available Stripe accounts retrieved successfully",
        data: result,
      });
    } catch (error: any) {
      if (error.message === "Property not found") {
        return sendResponse(res, {
          statusCode: httpStatus.NOT_FOUND,
          success: false,
          message: error.message,
          data: null,
        });
      }
      throw error;
    }
  },
);

// Get unassigned properties (properties not linked to any Stripe account)
export const getUnassignedProperties = catchAsync(
  async (req: Request, res: Response) => {
    const unassignedProperties = await getUnassignedPropertiesService();

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Unassigned properties retrieved successfully",
      data: unassignedProperties,
    });
  },
);

// Get properties that can be assigned to a specific Stripe account
export const getAssignablePropertiesForAccount = catchAsync(
  async (req: Request, res: Response) => {
    const { accountId } = req.params;

    try {
      const assignableProperties =
        await getAssignablePropertiesForAccountService(accountId);

      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Assignable properties retrieved successfully",
        data: assignableProperties,
      });
    } catch (error: any) {
      if (error.message === "Stripe account not found") {
        return sendResponse(res, {
          statusCode: httpStatus.NOT_FOUND,
          success: false,
          message: error.message,
          data: null,
        });
      }
      throw error;
    }
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
      propertyIds: activeLease.propertyId,
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

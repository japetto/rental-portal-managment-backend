import { Request, Response } from "express";
import httpStatus from "http-status";
import Stripe from "stripe";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { Payments } from "../payments/payments.schema";
import {
  constructWebhookEvent,
  createStripeAccount as createStripeAccountService,
  deleteStripeAccount as deleteStripeAccountService,
  getAllStripeAccounts as getAllStripeAccountsService,
  getDefaultAccount as getDefaultAccountService,
  linkPropertiesToAccount as linkPropertiesToAccountService,
  setDefaultAccount as setDefaultAccountService,
  unlinkPropertiesFromAccount as unlinkPropertiesFromAccountService,
} from "./stripe.service";

// Create a new Stripe account for a property
export const createStripeAccount = catchAsync(
  async (req: Request, res: Response) => {
    const {
      name,
      description,
      stripeSecretKey,
      isDefaultAccount = false,
      metadata,
    } = req.body;

    // Prepare account data with proper defaults
    const accountData = {
      name,
      description: description || undefined,
      stripeSecretKey,
      isDefaultAccount: Boolean(isDefaultAccount),
      propertyIds: [], // Start with empty property array
      metadata: metadata || undefined,
    };

    try {
      const stripeAccount = await createStripeAccountService(accountData);

      sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message:
          stripeAccount.message ||
          "Stripe account created, verified, and webhook configured",
        data: stripeAccount,
      });
    } catch (error: any) {
      if (error.message === "Stripe account with this name already exists") {
        return sendResponse(res, {
          statusCode: httpStatus.CONFLICT,
          success: false,
          message: error.message,
          data: null,
        });
      }
      if (
        error.message ===
        "Stripe secret key is already in use by another account"
      ) {
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
      if (error.message === "Duplicate account entry") {
        return sendResponse(res, {
          statusCode: httpStatus.CONFLICT,
          success: false,
          message: "Account with these details already exists",
          data: null,
        });
      }
      if (
        error.message &&
        error.message.includes("Account verification failed")
      ) {
        return sendResponse(res, {
          statusCode: httpStatus.BAD_REQUEST,
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

// Delete Stripe account (permanent delete)
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

export async function handlePaymentSuccess(
  paymentIntent: Stripe.PaymentIntent,
  accountId?: string,
) {
  try {
    console.log("💰 PAYMENT SUCCESS WEBHOOK STARTED:", {
      timestamp: new Date().toISOString(),
      paymentIntentId: paymentIntent.id,
      metadata: paymentIntent.metadata,
      amount: paymentIntent.amount,
      status: paymentIntent.status,
      accountId,
    });

    // Extract metadata from the payment intent
    const metadata = paymentIntent.metadata;

    if (!metadata.tenantId || !metadata.receiptNumber) {
      console.error(
        "❌ PAYMENT SUCCESS WEBHOOK ERROR: Missing required payment metadata:",
        {
          timestamp: new Date().toISOString(),
          metadata: metadata,
          paymentIntentId: paymentIntent.id,
        },
      );
      throw new Error("Missing required payment metadata");
    }

    // Find existing payment record by receipt number
    console.log(
      "🔍 PAYMENT SUCCESS WEBHOOK: Looking for payment record with receipt number:",
      metadata.receiptNumber,
    );

    const existingPayment = await Payments.findOne({
      receiptNumber: metadata.receiptNumber,
    });

    if (!existingPayment) {
      console.error(
        "❌ PAYMENT SUCCESS WEBHOOK ERROR: No payment record found for receipt:",
        {
          timestamp: new Date().toISOString(),
          receiptNumber: metadata.receiptNumber,
          paymentIntentId: paymentIntent.id,
        },
      );
      return;
    }

    // Check if payment already processed to prevent duplicates
    if (existingPayment.status === "PAID") {
      console.log(
        "⚠️ PAYMENT SUCCESS WEBHOOK: Payment already processed, skipping...",
        {
          timestamp: new Date().toISOString(),
          paymentId: existingPayment._id,
          receiptNumber: existingPayment.receiptNumber,
          status: existingPayment.status,
        },
      );
      return;
    }

    // Update existing payment record with PAID status
    console.log(
      "💾 PAYMENT SUCCESS WEBHOOK: Updating payment record with PAID status...",
      {
        timestamp: new Date().toISOString(),
        paymentId: existingPayment._id,
        receiptNumber: existingPayment.receiptNumber,
        currentStatus: existingPayment.status,
        newStatus: "PAID",
        paymentIntentId: paymentIntent.id,
      },
    );

    const updatedPayment = await Payments.findByIdAndUpdate(
      existingPayment._id,
      {
        status: "PAID",
        paidDate: new Date(paymentIntent.created * 1000),
        paymentMethod: "ONLINE",
        transactionId: paymentIntent.id,
        stripeTransactionId: paymentIntent.id,
        stripePaymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount / 100, // Update with actual amount paid
        totalAmount: paymentIntent.amount / 100,
        stripeAccountId: accountId, // Store which Stripe account processed this
      },
      { new: true },
    );

    if (updatedPayment) {
      console.log("✅ PAYMENT SUCCESS WEBHOOK: Payment updated successfully:", {
        timestamp: new Date().toISOString(),
        id: updatedPayment._id,
        status: updatedPayment.status,
        amount: updatedPayment.amount,
        paidDate: updatedPayment.paidDate,
        transactionId: updatedPayment.transactionId,
        receiptNumber: updatedPayment.receiptNumber,
        stripeAccountId: updatedPayment.stripeAccountId,
      });
    } else {
      console.error(
        "❌ PAYMENT SUCCESS WEBHOOK ERROR: Failed to update payment",
        {
          timestamp: new Date().toISOString(),
          paymentId: existingPayment._id,
          receiptNumber: existingPayment.receiptNumber,
        },
      );
    }
  } catch (error: any) {
    console.error("❌ PAYMENT SUCCESS WEBHOOK ERROR:", {
      timestamp: new Date().toISOString(),
      error: error.message || "Unknown error",
      stack: error.stack,
      paymentIntentId: paymentIntent.id,
    });
    throw error;
  }
}

export async function handlePaymentFailure(
  paymentIntent: Stripe.PaymentIntent,
  accountId?: string,
) {
  try {
    const metadata = paymentIntent.metadata;
    const receiptNumber = metadata.receiptNumber;

    if (receiptNumber) {
      // Update payment status to failed
      await Payments.findOneAndUpdate(
        { receiptNumber },
        {
          status: "CANCELLED",
          stripeAccountId: accountId,
        },
      );
    }
  } catch (error: any) {
    console.error("Payment failure handling error:", error);
  }
}

export async function handlePaymentCanceled(
  paymentIntent: Stripe.PaymentIntent,
  accountId?: string,
) {
  try {
    const metadata = paymentIntent.metadata;
    const receiptNumber = metadata.receiptNumber;

    if (receiptNumber) {
      // Update payment status to cancelled
      await Payments.findOneAndUpdate(
        { receiptNumber },
        {
          status: "CANCELLED",
          stripeAccountId: accountId,
        },
      );
    }
  } catch (error: any) {
    console.error("Payment cancellation handling error:", error);
  }
}

export const handleWebhook = catchAsync(async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"];

  console.log("🔔 WEBHOOK RECEIVED:", {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    headers: {
      "stripe-signature": sig ? "present" : "missing",
      "content-type": req.headers["content-type"],
      "user-agent": req.headers["user-agent"],
    },
    bodySize: req.body ? JSON.stringify(req.body).length : 0,
    bodyPreview: req.body
      ? JSON.stringify(req.body).substring(0, 200) + "..."
      : "No body",
  });

  try {
    let event;
    let accountId: string | undefined;

    // Get the raw body for signature verification
    const payload = req.body;

    // Try to verify with account-specific webhook secrets first
    try {
      const { StripeAccounts } = await import("./stripe.schema");
      const accounts = await StripeAccounts.find({
        isActive: true,
        webhookStatus: "ACTIVE",
      }).select("+stripeSecretKey +webhookSecret");

      console.log(
        `🔍 WEBHOOK VERIFICATION: Found ${accounts.length} active Stripe accounts to try`,
      );

      for (const account of accounts) {
        if (account.stripeSecretKey && account.webhookSecret) {
          try {
            const stripe = new Stripe(account.stripeSecretKey, {
              apiVersion: "2025-06-30.basil",
            });

            event = stripe.webhooks.constructEvent(
              payload,
              sig as string,
              account.webhookSecret,
            );

            console.log(
              `✅ WEBHOOK VERIFIED: Successfully verified with account: ${account.name} (ID: ${account._id})`,
            );
            accountId = (account._id as any).toString();
            break;
          } catch (accountErr: any) {
            console.log(
              `❌ WEBHOOK VERIFICATION FAILED: Account ${account.name} (ID: ${account._id}): ${accountErr.message}`,
            );
          }
        }
      }
    } catch (importErr: any) {
      console.error(
        "❌ WEBHOOK ERROR: Error importing StripeAccounts schema:",
        importErr.message,
      );
    }

    // If account-specific verification failed, try with default webhook secret
    if (!event) {
      try {
        event = constructWebhookEvent(payload, sig);
        console.log(
          "✅ WEBHOOK VERIFIED: Successfully verified with default secret",
        );
      } catch (err: any) {
        console.error(
          "❌ WEBHOOK VERIFICATION FAILED: Signature verification failed:",
          err.message,
        );
        res.status(400).send(`Webhook Error: Signature verification failed`);
        return;
      }
    }

    console.log("🔔 PROCESSING WEBHOOK EVENT:", {
      timestamp: new Date().toISOString(),
      eventType: event.type,
      eventId: (event as any).id,
      eventCreated: (event as any).created,
      accountId,
      data: {
        object: (event.data.object as any).id,
        objectType: (event.data.object as any).object,
      },
    });

    switch (event.type) {
      case "payment_intent.succeeded":
        console.log("💰 WEBHOOK: Processing payment_intent.succeeded event");
        await handlePaymentSuccess(event.data.object, accountId);
        break;
      case "payment_intent.payment_failed":
        console.log(
          "❌ WEBHOOK: Processing payment_intent.payment_failed event",
        );
        await handlePaymentFailure(event.data.object, accountId);
        break;
      case "payment_intent.canceled":
        console.log("🚫 WEBHOOK: Processing payment_intent.canceled event");
        await handlePaymentCanceled(event.data.object, accountId);
        break;
      case "payment_intent.processing":
        console.log("⏳ WEBHOOK: Payment processing...");
        break;
      case "payment_intent.requires_action":
        console.log("⚠️ WEBHOOK: Payment requires action...");
        break;
      case "charge.succeeded":
        console.log("💳 WEBHOOK: Charge succeeded...");
        break;
      case "charge.updated":
        console.log("📝 WEBHOOK: Charge updated...");
        break;
      default:
        console.log(`❓ WEBHOOK: Unhandled webhook event type: ${event.type}`);
        break;
    }

    console.log("✅ WEBHOOK PROCESSED SUCCESSFULLY:", {
      timestamp: new Date().toISOString(),
      eventType: event.type,
      eventId: (event as any).id,
    });
    res.json({ received: true });
  } catch (error: any) {
    console.error("❌ WEBHOOK ERROR:", {
      timestamp: new Date().toISOString(),
      error: error.message || "Unknown error",
      stack: error.stack,
    });
    res.status(400).send(`Webhook Error: ${error.message || "Unknown error"}`);
  }
});

import { Request, Response } from "express";
import httpStatus from "http-status";
import Stripe from "stripe";
import config from "../../../config/config";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { Payments } from "../payments/payments.schema";
import { Users } from "../users/users.schema";
import {
  constructWebhookEvent,
  createPaymentWithLinkEnhanced,
  createStripeAccount as createStripeAccountService,
  createWebhookEndpoint,
  createWebhooksByAccountType as createWebhooksByAccountTypeService,
  deleteStripeAccount as deleteStripeAccountService,
  deleteWebhookEndpoint,
  getAccountStatistics as getAccountStatisticsService,
  getAllStripeAccounts as getAllStripeAccountsService,
  getAssignablePropertiesForAccount as getAssignablePropertiesForAccountService,
  getAvailableStripeAccounts as getAvailableStripeAccountsService,
  getDefaultAccount as getDefaultAccountService,
  getPaymentLinkDetails as getPaymentLinkDetailsService,
  getStripeAccountById as getStripeAccountByIdService,
  getStripeAccountsByProperty as getStripeAccountsByPropertyService,
  getTenantPaymentStatusEnhanced,
  getUnassignedProperties as getUnassignedPropertiesService,
  getWebhookEndpoint,
  linkPropertiesToAccount as linkPropertiesToAccountService,
  listWebhookEndpoints,
  setDefaultAccount as setDefaultAccountService,
  syncStripePayments as syncStripePaymentsService,
  unlinkPropertiesFromAccount as unlinkPropertiesFromAccountService,
  updateStripeAccountSecretKey as updateStripeAccountSecretKeyService,
  updateStripeAccount as updateStripeAccountService,
  updateWebhookEndpoint,
  verifyStripeAccount as verifyStripeAccountService,
} from "./stripe.service";

// Create a new Stripe account for a property
export const createStripeAccount = catchAsync(
  async (req: Request, res: Response) => {
    const {
      name,
      description,
      stripeAccountId,
      stripeSecretKey,
      accountType = "STANDARD",
      isGlobalAccount = false,
      isDefaultAccount = false,
      metadata,
    } = req.body;

    // Prepare account data with proper defaults
    const accountData = {
      name,
      description: description || undefined,
      stripeAccountId,
      stripeSecretKey,
      accountType,

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
        message:
          stripeAccount.message ||
          "Stripe account created, verified, and webhook configured",
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

// Verify Stripe account with Stripe API
export const verifyStripeAccount = catchAsync(
  async (req: Request, res: Response) => {
    const { accountId } = req.params;

    try {
      const account = await verifyStripeAccountService(accountId);

      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: account.message || "Stripe account verified successfully",
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
      if (error.message.includes("Account verification failed")) {
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

// Create a new payment with unique payment link - Enhanced for first-time payments
export const createPaymentWithLink = catchAsync(
  async (req: Request, res: Response) => {
    const { tenantId, currentDate } = req.body;

    const result = await createPaymentWithLinkEnhanced({
      tenantId,
      currentDate,
      createdBy: req.user?.id || "SYSTEM",
    });

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: result.isFirstTimePayment
        ? "First-time rent payment link created successfully"
        : "Rent payment link created successfully",
      data: {
        paymentLink: {
          id: result.paymentLink.id,
          url: result.paymentLink.url,
        },
        receiptNumber: result.receiptNumber,
        lease: result.lease,
        paymentInfo: result.paymentInfo,
      },
    });
  },
);

// Get payment link details
export const getPaymentLinkDetails = catchAsync(
  async (req: Request, res: Response) => {
    const { paymentLinkId } = req.params;

    // Get the payment to find the associated Stripe account
    const { Payments } = await import("../payments/payments.schema");
    const payment = await Payments.findOne({
      stripePaymentLinkId: paymentLinkId,
    }).populate("stripeAccountId");

    if (!payment) {
      return sendResponse(res, {
        statusCode: httpStatus.NOT_FOUND,
        success: false,
        message: "Payment link not found",
        data: null,
      });
    }

    const paymentLink = await getPaymentLinkDetailsService(
      paymentLinkId,
      (payment.stripeAccountId as any).stripeSecretKey,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Payment link details retrieved successfully",
      data: paymentLink,
    });
  },
);

// Get comprehensive tenant payment status with automatic payment creation
export const getTenantPaymentStatus = catchAsync(
  async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    const result = await getTenantPaymentStatusEnhanced({
      tenantId,
      createdBy: req.user?.id || "SYSTEM",
    });

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Tenant payment status retrieved successfully",
      data: result,
    });
  },
);

export const handleWebhook = catchAsync(async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"];

  console.log("🔔 Webhook received:", {
    method: req.method,
    path: req.path,
    headers: {
      "stripe-signature": sig ? "present" : "missing",
      "content-type": req.headers["content-type"],
      "user-agent": req.headers["user-agent"],
    },
    bodySize: req.body ? JSON.stringify(req.body).length : 0,
  });

  try {
    let event;

    // Get the raw body for signature verification
    const payload = req.body;

    // For multi-account setup, we need to verify with the correct account's webhook secret
    // Try to verify with all available Stripe accounts
    let verificationSuccess = false;
    let verificationError = null;

    try {
      // First try with the default webhook secret
      event = constructWebhookEvent(payload, sig);
      verificationSuccess = true;
      console.log("✅ Webhook verified with default secret");
    } catch (err: any) {
      verificationError = err.message;
      console.log(
        "Default webhook verification failed, trying with account-specific secrets...",
      );

      // If default fails, try with account-specific webhook secrets
      try {
        const { StripeAccounts } = await import("./stripe-accounts.schema");
        const accounts = await StripeAccounts.find({
          isActive: true,
          isDeleted: false,
          webhookStatus: "ACTIVE",
        }).select("+stripeSecretKey");

        console.log(
          `🔍 Found ${accounts.length} active Stripe accounts to try`,
        );

        for (const account of accounts) {
          if (account.stripeSecretKey) {
            try {
              const stripe = new Stripe(account.stripeSecretKey, {
                apiVersion: "2025-06-30.basil",
              });

              event = stripe.webhooks.constructEvent(
                payload,
                sig as string,
                config.stripe_webhook_secret, // Use the default webhook secret for now
              );

              console.log(`✅ Webhook verified with account: ${account.name}`);
              verificationSuccess = true;
              break;
            } catch (accountErr: any) {
              console.log(
                `❌ Webhook verification failed for account ${account.name}: ${accountErr.message}`,
              );
            }
          }
        }
      } catch (importErr: any) {
        console.error(
          "Error importing StripeAccounts schema:",
          importErr.message,
        );
      }
    }

    if (!verificationSuccess || !event) {
      console.error(
        "Webhook signature verification failed for all accounts:",
        verificationError,
      );
      res.status(400).send(`Webhook Error: Signature verification failed`);
      return;
    }

    console.log("🔔 Processing webhook event:", {
      type: event.type,
      id: (event as any).id,
      created: (event as any).created,
      data: {
        object: (event.data.object as any).id,
        objectType: (event.data.object as any).object,
      },
    });

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
        console.log("Payment processing...");
        break;
      case "payment_intent.requires_action":
        console.log("Payment requires action...");
        break;
      case "charge.succeeded":
        console.log("Charge succeeded...");
        break;
      case "charge.updated":
        console.log("Charge updated...");
        break;
      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
        break;
    }

    console.log("✅ Webhook processed successfully");
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
    console.log("💰 Processing payment success webhook:", {
      paymentIntentId: paymentIntent.id,
      metadata: paymentIntent.metadata,
      amount: paymentIntent.amount,
      status: paymentIntent.status,
    });

    // Extract metadata from the unique payment link
    const metadata = paymentIntent.metadata;

    if (!metadata.tenantId || !metadata.receiptNumber) {
      console.error("❌ Missing required payment metadata:", metadata);
      throw new Error("Missing required payment metadata");
    }

    // Find existing payment record by receipt number
    const existingPayment = await Payments.findOne({
      receiptNumber: metadata.receiptNumber,
    });

    if (!existingPayment) {
      console.error(
        "❌ No payment record found for receipt:",
        metadata.receiptNumber,
      );
      return;
    }

    // Check if payment already processed to prevent duplicates
    if (existingPayment.status === "PAID") {
      console.log("⚠️ Payment already processed, skipping...");
      return;
    }

    // Update existing payment record with PAID status
    console.log("💾 Updating payment record with PAID status...");

    const updatedPayment = await Payments.findByIdAndUpdate(
      existingPayment._id,
      {
        status: "PAID",
        paidDate: new Date(paymentIntent.created * 1000),
        paymentMethod: "ONLINE",
        transactionId: paymentIntent.id,
        stripeTransactionId: paymentIntent.id,
        amount: paymentIntent.amount / 100, // Update with actual amount paid
        totalAmount: paymentIntent.amount / 100,
      },
      { new: true },
    );

    if (updatedPayment) {
      console.log("✅ Payment updated successfully:", {
        id: updatedPayment._id,
        status: updatedPayment.status,
        amount: updatedPayment.amount,
        paidDate: updatedPayment.paidDate,
        transactionId: updatedPayment.transactionId,
        receiptNumber: updatedPayment.receiptNumber,
      });
    } else {
      console.error("❌ Failed to update payment");
    }
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

    const user = await Users.findOne({
      _id: userId,
      isDeleted: false,
      isActive: true,
    });
    if (!user) {
      return sendResponse(res, {
        statusCode: httpStatus.NOT_FOUND,
        success: false,
        message: "User not found or account is deactivated",
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
    }).select("+stripeSecretKey");

    if (!stripeAccount) {
      return sendResponse(res, {
        statusCode: httpStatus.NOT_FOUND,
        success: false,
        message: "No active Stripe account found for property",
        data: null,
      });
    }

    await syncStripePaymentsService(
      stripeAccount.stripeAccountId || "",
      userId,
      stripeAccount.stripeSecretKey,
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
  try {
    // Get webhook configuration info
    const webhookInfo = {
      endpoint: `${config.backend_url}/api/v1.0/stripe/webhook`,
      status: "ACTIVE",
      timestamp: new Date().toISOString(),
      environment: config.node_env,
    };

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Webhook endpoint is active",
      data: webhookInfo,
    });
  } catch (error: any) {
    sendResponse(res, {
      statusCode: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
      message: "Webhook status check failed",
      data: null,
    });
  }
});

// Get account statistics for debugging
export const getAccountStatistics = catchAsync(
  async (req: Request, res: Response) => {
    const statistics = await getAccountStatisticsService();

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Account statistics retrieved successfully",
      data: statistics,
    });
  },
);

// Update Stripe account secret key (for debugging)
export const updateStripeAccountSecretKey = catchAsync(
  async (req: Request, res: Response) => {
    const { accountId } = req.params;
    const { stripeSecretKey } = req.body;

    try {
      const updatedAccount = await updateStripeAccountSecretKeyService(
        accountId,
        stripeSecretKey,
      );

      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Stripe account secret key updated successfully",
        data: updatedAccount,
      });
    } catch (error: any) {
      if (error.message.includes("Stripe account not found")) {
        return sendResponse(res, {
          statusCode: httpStatus.NOT_FOUND,
          success: false,
          message: error.message,
          data: null,
        });
      }
      if (error.message.includes("Failed to update secret key")) {
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

// Create webhook for a specific Stripe account
export const createWebhook = catchAsync(async (req: Request, res: Response) => {
  const { accountId } = req.params;
  const { webhookUrl } = req.body;

  if (!webhookUrl) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: "Webhook URL is required",
      data: null,
    });
  }

  const webhook = await createWebhookEndpoint(accountId, webhookUrl);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Webhook created successfully",
    data: {
      id: webhook.id,
      url: webhook.url,
      status: webhook.status,
      enabled_events: webhook.enabled_events,
    },
  });
});

// Create webhooks for all active accounts
export const createWebhooksForAllAccounts = catchAsync(
  async (req: Request, res: Response) => {
    const { webhookUrl } = req.body;

    if (!webhookUrl) {
      return sendResponse(res, {
        statusCode: httpStatus.BAD_REQUEST,
        success: false,
        message: "Webhook URL is required",
        data: null,
      });
    }

    const result = await createWebhooksByAccountTypeService(webhookUrl);

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: `Webhooks created for ${result.successful}/${result.processedAccounts} ${result.accountTypeProcessed} accounts`,
      data: result,
    });
  },
);

// List webhooks for a Stripe account
export const listWebhooks = catchAsync(async (req: Request, res: Response) => {
  const { accountId } = req.params;

  const webhooks = await listWebhookEndpoints(accountId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Webhooks retrieved successfully",
    data: webhooks,
  });
});

// Get webhook details
export const getWebhook = catchAsync(async (req: Request, res: Response) => {
  const { accountId, webhookId } = req.params;

  const webhook = await getWebhookEndpoint(accountId, webhookId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Webhook details retrieved successfully",
    data: webhook,
  });
});

// Update webhook
export const updateWebhook = catchAsync(async (req: Request, res: Response) => {
  const { accountId, webhookId } = req.params;
  const updateData = req.body;

  const webhook = await updateWebhookEndpoint(accountId, webhookId, updateData);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Webhook updated successfully",
    data: {
      id: webhook.id,
      url: webhook.url,
      status: webhook.status,
      enabled_events: webhook.enabled_events,
    },
  });
});

// Delete webhook
export const deleteWebhook = catchAsync(async (req: Request, res: Response) => {
  const { accountId, webhookId } = req.params;

  await deleteWebhookEndpoint(accountId, webhookId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Webhook deleted successfully",
    data: null,
  });
});

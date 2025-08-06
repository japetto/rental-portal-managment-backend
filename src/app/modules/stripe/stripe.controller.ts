import { Request, Response } from "express";
import httpStatus from "http-status";
import Stripe from "stripe";
import catchAsync from "../../../shared/catchAsync";
import { PaymentStatus } from "../../../shared/enums/payment.enums";
import sendResponse from "../../../shared/sendResponse";
import { Payments } from "../payments/payments.schema";
import { StripeAccounts } from "./stripe.schema";
import {
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
    let metadata = paymentIntent.metadata;

    // If payment intent has no metadata, try to get it from the charge
    if (!metadata.paymentRecordId) {
      console.log(
        "🔍 PAYMENT SUCCESS WEBHOOK: No metadata in payment intent, checking charges...",
      );

      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
          apiVersion: "2025-06-30.basil",
        });

        const charges = await stripe.charges.list({
          payment_intent: paymentIntent.id,
          limit: 1,
        });

        if (charges.data.length > 0) {
          const charge = charges.data[0];
          console.log(
            "🔍 PAYMENT SUCCESS WEBHOOK: Found charge with metadata:",
            charge.metadata,
          );
          metadata = charge.metadata;
        }
      } catch (chargeError: any) {
        console.error(
          "❌ PAYMENT SUCCESS WEBHOOK ERROR: Failed to fetch charge metadata:",
          chargeError.message,
        );
      }
    }

    if (!metadata.paymentRecordId) {
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

    // Find existing payment record by paymentRecordId
    console.log(
      "🔍 PAYMENT SUCCESS WEBHOOK: Looking for payment record with ID:",
      metadata.paymentRecordId,
    );

    const existingPayment = await Payments.findById(metadata.paymentRecordId);

    if (!existingPayment) {
      console.error(
        "❌ PAYMENT SUCCESS WEBHOOK ERROR: No payment record found for ID:",
        {
          timestamp: new Date().toISOString(),
          paymentRecordId: metadata.paymentRecordId,
          paymentIntentId: paymentIntent.id,
        },
      );
      return;
    }

    // Check if payment already processed to prevent duplicates
    if (existingPayment.status === PaymentStatus.PAID) {
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

    // Use stored metadata if available, otherwise use PaymentIntent data
    const storedMetadata = existingPayment.stripeMetadata || {};

    console.log(
      "📋 PAYMENT SUCCESS WEBHOOK: Using stored metadata:",
      storedMetadata,
    );

    // Update existing payment record with PAID status
    console.log(
      "💾 PAYMENT SUCCESS WEBHOOK: Updating payment record with PAID status...",
      {
        timestamp: new Date().toISOString(),
        paymentId: existingPayment._id,
        receiptNumber: existingPayment.receiptNumber,
        currentStatus: existingPayment.status,
        newStatus: PaymentStatus.PAID,
        paymentIntentId: paymentIntent.id,
      },
    );

    const updatedPayment = await Payments.findByIdAndUpdate(
      existingPayment._id,
      {
        status: PaymentStatus.PAID,
        paidDate: new Date(paymentIntent.created * 1000),
        paymentMethod: "ONLINE",
        transactionId: paymentIntent.id,
        stripeTransactionId: paymentIntent.id,
        stripePaymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount / 100, // Update with actual amount paid
        totalAmount: paymentIntent.amount / 100,
        stripeAccountId: accountId, // Store which Stripe account processed this
        // Update description if we have stored metadata
        description:
          storedMetadata.paymentDescription || existingPayment.description,
        // Generate new receipt number for paid payment
        receiptNumber: `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
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
          status: PaymentStatus.CANCELLED,
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
          status: PaymentStatus.CANCELLED,
          stripeAccountId: accountId,
        },
      );
    }
  } catch (error: any) {
    console.error("Payment cancellation handling error:", error);
  }
}

export async function handleChargeSuccess(
  charge: Stripe.Charge,
  accountId?: string,
) {
  try {
    console.log("💳 CHARGE SUCCESS WEBHOOK STARTED:", {
      timestamp: new Date().toISOString(),
      chargeId: charge.id,
      paymentIntentId: charge.payment_intent as string,
      metadata: charge.metadata,
      amount: charge.amount,
      status: charge.status,
      accountId,
    });

    // Extract metadata from the charge
    const metadata = charge.metadata;

    if (!metadata.tenantId || !metadata.receiptNumber) {
      console.error(
        "❌ CHARGE SUCCESS WEBHOOK ERROR: Missing required payment metadata:",
        {
          timestamp: new Date().toISOString(),
          metadata: metadata,
          chargeId: charge.id,
        },
      );
      return; // Don't throw error, just log and return
    }

    // Find existing payment record by receipt number
    console.log(
      "🔍 CHARGE SUCCESS WEBHOOK: Looking for payment record with receipt number:",
      metadata.receiptNumber,
    );

    const existingPayment = await Payments.findOne({
      receiptNumber: metadata.receiptNumber,
    });

    if (!existingPayment) {
      console.error(
        "❌ CHARGE SUCCESS WEBHOOK ERROR: No payment record found for receipt:",
        {
          timestamp: new Date().toISOString(),
          receiptNumber: metadata.receiptNumber,
          chargeId: charge.id,
        },
      );
      return;
    }

    // Check if payment already processed to prevent duplicates
    if (existingPayment.status === PaymentStatus.PAID) {
      console.log(
        "⚠️ CHARGE SUCCESS WEBHOOK: Payment already processed, skipping...",
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
      "💾 CHARGE SUCCESS WEBHOOK: Updating payment record with PAID status...",
      {
        timestamp: new Date().toISOString(),
        paymentId: existingPayment._id,
        receiptNumber: existingPayment.receiptNumber,
        currentStatus: existingPayment.status,
        newStatus: PaymentStatus.PAID,
        chargeId: charge.id,
      },
    );

    const updatedPayment = await Payments.findByIdAndUpdate(
      existingPayment._id,
      {
        status: PaymentStatus.PAID,
        paidDate: new Date(charge.created * 1000),
        paymentMethod: "ONLINE",
        transactionId: charge.id,
        stripeTransactionId: charge.id,
        stripePaymentIntentId: charge.payment_intent as string,
        amount: charge.amount / 100, // Update with actual amount paid
        totalAmount: charge.amount / 100,
        stripeAccountId: accountId, // Store which Stripe account processed this
      },
      { new: true },
    );

    if (updatedPayment) {
      console.log("✅ CHARGE SUCCESS WEBHOOK: Payment updated successfully:", {
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
        "❌ CHARGE SUCCESS WEBHOOK ERROR: Failed to update payment",
        {
          timestamp: new Date().toISOString(),
          paymentId: existingPayment._id,
          receiptNumber: existingPayment.receiptNumber,
        },
      );
    }
  } catch (error: any) {
    console.error("❌ CHARGE SUCCESS WEBHOOK ERROR:", {
      timestamp: new Date().toISOString(),
      error: error.message || "Unknown error",
      stack: error.stack,
      chargeId: charge.id,
    });
    // Don't throw error, just log it
  }
}

// Test endpoint to verify webhook is accessible
export const testWebhook = catchAsync(async (req: Request, res: Response) => {
  console.log("🧪 WEBHOOK TEST: Test endpoint called");
  res.json({
    message: "Webhook endpoint is accessible",
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
  });
});

// Add this new webhook handler specifically for serverless environments
export const handleStripeWebhookServerless = async (req: any, res: any) => {
  let event;
  const signature = req.headers["stripe-signature"];

  try {
    // Extract accountId - either from URL path, query param, or metadata
    const accountId = req.query.accountId || req.params.accountId;

    if (!accountId) {
      console.error("No accountId provided in webhook request");
      return res.status(400).json({ error: "Missing accountId" });
    }

    // Get the account with the webhook secret
    const stripeAccount = await StripeAccounts.findById(accountId).select(
      "+stripeSecretKey +webhookSecret",
    );

    if (!stripeAccount || !stripeAccount.webhookSecret) {
      console.error(`No webhook secret found for account ${accountId}`);
      return res.status(400).json({ error: "Invalid account configuration" });
    }

    // Create Stripe instance with account-specific secret key
    const stripe = new Stripe(stripeAccount.stripeSecretKey, {
      apiVersion: "2025-06-30.basil",
    });

    // For serverless environments, we need to handle the body differently
    let rawBody: Buffer;

    console.log("🔍 Serverless webhook - Request body type:", typeof req.body);
    console.log(
      "🔍 Serverless webhook - Request body is Buffer:",
      Buffer.isBuffer(req.body),
    );

    if (Buffer.isBuffer(req.body)) {
      // Raw buffer (ideal case)
      rawBody = req.body;
      console.log("🔧 Serverless: Using raw buffer for webhook verification");
    } else if (typeof req.body === "string") {
      // String body
      rawBody = Buffer.from(req.body, "utf8");
      console.log(
        "🔧 Serverless: Using string converted to buffer for webhook verification",
      );
    } else if (typeof req.body === "object" && req.body !== null) {
      // Parsed JSON object - reconstruct the raw body
      const jsonString = JSON.stringify(req.body);
      rawBody = Buffer.from(jsonString, "utf8");
      console.log(
        "🔧 Serverless: Using reconstructed buffer from parsed JSON for webhook verification",
      );
      console.log("🔧 Serverless: JSON string length:", jsonString.length);
    } else {
      console.error(
        "❌ Serverless: Invalid request body type:",
        typeof req.body,
      );
      console.error("❌ Serverless: Request body:", req.body);
      return res.status(400).json({
        error:
          "Invalid request body for serverless webhook. Expected Buffer, string, or object.",
      });
    }

    if (!signature) {
      console.error("❌ Serverless: No Stripe signature found in headers");
      return res.status(400).json({ error: "Missing Stripe signature" });
    }

    console.log("🔧 Serverless: Raw body length:", rawBody.length);
    console.log(
      "🔧 Serverless: Signature:",
      signature.substring(0, 20) + "...",
    );

    // Verify the webhook signature using the raw buffer
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      stripeAccount.webhookSecret,
    );

    console.log(
      `🔔 SERVERLESS WEBHOOK RECEIVED: ${event.type} for account ${accountId}`,
    );

    // Handle the event based on type
    switch (event.type) {
      case "payment_intent.succeeded":
        await handleSuccessfulPayment(event.data.object, stripeAccount);
        break;

      case "payment_intent.payment_failed":
        await handleFailedPayment(event.data.object, stripeAccount);
        break;

      case "payment_intent.canceled":
        await handleCanceledPayment(event.data.object, stripeAccount);
        break;

      // Add other event types as needed
      default:
        console.log(`Serverless: Unhandled event type: ${event.type}`);
    }

    // Return a success response
    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error(`Serverless webhook error: ${error.message}`);
    console.error(`Serverless error stack: ${error.stack}`);
    return res
      .status(400)
      .json({ error: `Serverless Webhook Error: ${error.message}` });
  }
};

export const handleStripeWebhook = async (req: any, res: any) => {
  let event;
  const signature = req.headers["stripe-signature"];

  try {
    // Extract accountId - either from URL path, query param, or metadata
    const accountId = req.query.accountId || req.params.accountId;

    if (!accountId) {
      console.error("No accountId provided in webhook request");
      return res.status(400).json({ error: "Missing accountId" });
    }

    // Get the account with the webhook secret
    const stripeAccount = await StripeAccounts.findById(accountId).select(
      "+stripeSecretKey +webhookSecret",
    );

    if (!stripeAccount || !stripeAccount.webhookSecret) {
      console.error(`No webhook secret found for account ${accountId}`);
      return res.status(400).json({ error: "Invalid account configuration" });
    }

    // Create Stripe instance with account-specific secret key
    const stripe = new Stripe(stripeAccount.stripeSecretKey, {
      apiVersion: "2025-06-30.basil",
    });

    // Handle different request body types for different environments
    let rawBody: Buffer;

    console.log("🔍 Request body type:", typeof req.body);
    console.log("🔍 Request body is Buffer:", Buffer.isBuffer(req.body));

    if (Buffer.isBuffer(req.body)) {
      // Development environment - raw buffer from express.raw()
      rawBody = req.body;
      console.log("🔧 Using raw buffer for webhook verification");
    } else if (typeof req.body === "string") {
      // Production environment - string that needs to be converted to buffer
      rawBody = Buffer.from(req.body, "utf8");
      console.log(
        "🔧 Using string converted to buffer for webhook verification",
      );
    } else if (typeof req.body === "object" && req.body !== null) {
      // Production environment - parsed JSON object
      // We need to reconstruct the raw body from the parsed object
      rawBody = Buffer.from(JSON.stringify(req.body), "utf8");
      console.log(
        "🔧 Using reconstructed buffer from parsed JSON for webhook verification",
      );
    } else {
      console.error("❌ Invalid request body type:", typeof req.body);
      console.error("❌ Request body:", req.body);
      return res.status(400).json({
        error: "Invalid request body. Expected Buffer, string, or object.",
      });
    }

    if (!signature) {
      console.error("❌ No Stripe signature found in headers");
      return res.status(400).json({ error: "Missing Stripe signature" });
    }

    console.log("🔧 Raw body length:", rawBody.length);
    console.log("🔧 Signature:", signature.substring(0, 20) + "...");

    // Verify the webhook signature using the raw buffer
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      stripeAccount.webhookSecret,
    );

    console.log(`🔔 WEBHOOK RECEIVED: ${event.type} for account ${accountId}`);

    // Handle the event based on type
    switch (event.type) {
      case "payment_intent.succeeded":
        await handleSuccessfulPayment(event.data.object, stripeAccount);
        break;

      case "payment_intent.payment_failed":
        await handleFailedPayment(event.data.object, stripeAccount);
        break;

      case "payment_intent.canceled":
        await handleCanceledPayment(event.data.object, stripeAccount);
        break;

      // Add other event types as needed
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Return a success response
    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error(`Webhook error: ${error.message}`);
    console.error(`Error stack: ${error.stack}`);
    return res.status(400).json({ error: `Webhook Error: ${error.message}` });
  }
};

// Process successful payments with multiple fallback strategies
async function handleSuccessfulPayment(paymentIntent: any, stripeAccount: any) {
  try {
    console.log("🎉 Processing successful payment:", paymentIntent.id);
    console.log("Payment metadata:", paymentIntent.metadata);

    // If we have metadata with paymentRecordId, use it to update the payment record
    if (paymentIntent.metadata && paymentIntent.metadata.paymentRecordId) {
      const paymentRecordId = paymentIntent.metadata.paymentRecordId;

      // Update the payment record
      const updatedPayment = await Payments.findByIdAndUpdate(
        paymentRecordId,
        {
          status: PaymentStatus.PAID,
          paidDate: new Date(paymentIntent.created * 1000),
          paymentMethod: "ONLINE",
          stripePaymentIntentId: paymentIntent.id,
          stripeTransactionId:
            paymentIntent.charges?.data[0]?.id || paymentIntent.latest_charge,
          stripeMetadata: paymentIntent.metadata,
          receiptNumber: `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        },
        { new: true }, // Return the updated document
      );

      if (updatedPayment) {
        console.log(
          `✅ Payment record updated successfully: ${updatedPayment._id}`,
        );
        // Perform any additional actions (e.g., send receipt email)
      } else {
        console.error(`❌ Payment record not found: ${paymentRecordId}`);
        // Handle case where payment record doesn't exist
      }
    } else {
      // If metadata is missing, try to find payment by Payment Intent ID
      console.log(
        "Payment Intent metadata missing, searching by Payment Intent ID",
      );

      const existingPayment = await Payments.findOne({
        stripePaymentIntentId: paymentIntent.id,
      });

      if (existingPayment) {
        existingPayment.status = PaymentStatus.PAID;
        existingPayment.paidDate = new Date(paymentIntent.created * 1000);
        existingPayment.stripeTransactionId =
          paymentIntent.charges?.data[0]?.id || paymentIntent.latest_charge;
        await existingPayment.save();
        console.log(
          `✅ Payment record updated by PaymentIntent ID: ${existingPayment._id}`,
        );
      } else {
        // Try finding by payment link as last resort
        console.log(
          "Payment not found, attempting to lookup via Checkout Session",
        );

        // Create stripe instance with account secret key
        const stripe = new Stripe(stripeAccount.stripeSecretKey, {
          apiVersion: "2025-06-30.basil",
        });

        // Try to get related checkout session
        try {
          const sessions = await stripe.checkout.sessions.list({
            payment_intent: paymentIntent.id,
            limit: 1,
          });

          if (sessions.data.length > 0) {
            const session = sessions.data[0];

            // If we have a payment link ID in the session, use it to find our payment
            if (session.payment_link) {
              const paymentByLink = await Payments.findOne({
                stripePaymentLinkId: session.payment_link,
              });

              if (paymentByLink) {
                paymentByLink.status = PaymentStatus.PAID;
                paymentByLink.paidDate = new Date(paymentIntent.created * 1000);
                paymentByLink.stripePaymentIntentId = paymentIntent.id;
                paymentByLink.stripeTransactionId =
                  paymentIntent.charges?.data[0]?.id ||
                  paymentIntent.latest_charge;
                await paymentByLink.save();
                console.log(
                  `✅ Payment record updated by Payment Link ID: ${paymentByLink._id}`,
                );
              } else {
                console.error(
                  `❌ No payment found for Payment Link: ${session.payment_link}`,
                );
                // Consider creating a new payment record or logging this for manual review
              }
            }
          }
        } catch (err) {
          console.error("Error fetching checkout session:", err);
        }
      }
    }
  } catch (error) {
    console.error("Error handling successful payment:", error);
  }
}

// Process failed payments
async function handleFailedPayment(paymentIntent: any, stripeAccount: any) {
  try {
    console.log("❌ Processing failed payment:", paymentIntent.id);

    // If we have metadata with paymentRecordId, use it to update the payment record
    if (paymentIntent.metadata && paymentIntent.metadata.paymentRecordId) {
      const paymentRecordId = paymentIntent.metadata.paymentRecordId;

      // Update the payment record
      const updatedPayment = await Payments.findByIdAndUpdate(
        paymentRecordId,
        {
          status: PaymentStatus.PENDING, // Use PENDING since FAILED doesn't exist in enum
          stripePaymentIntentId: paymentIntent.id,
          stripeMetadata: {
            ...paymentIntent.metadata,
            error:
              paymentIntent.last_payment_error?.message || "Payment failed",
          },
        },
        { new: true },
      );

      if (updatedPayment) {
        console.log(`✅ Failed payment record updated: ${updatedPayment._id}`);
      } else {
        console.error(`❌ Failed payment record not found: ${paymentRecordId}`);
      }
    } else {
      // If no metadata, try to find by Payment Intent ID
      const existingPayment = await Payments.findOne({
        stripePaymentIntentId: paymentIntent.id,
      });

      if (existingPayment) {
        existingPayment.status = PaymentStatus.PENDING; // Use PENDING
        existingPayment.stripeMetadata = {
          ...existingPayment.stripeMetadata,
          error: paymentIntent.last_payment_error?.message || "Payment failed",
        };
        await existingPayment.save();
        console.log(
          `✅ Failed payment record updated by PaymentIntent ID: ${existingPayment._id}`,
        );
      }
    }
  } catch (error) {
    console.error("Error handling failed payment:", error);
  }
}

// Process canceled payments
async function handleCanceledPayment(paymentIntent: any, stripeAccount: any) {
  try {
    console.log("🚫 Processing canceled payment:", paymentIntent.id);

    // If we have metadata with paymentRecordId, use it to update the payment record
    if (paymentIntent.metadata && paymentIntent.metadata.paymentRecordId) {
      const paymentRecordId = paymentIntent.metadata.paymentRecordId;

      // Update the payment record
      const updatedPayment = await Payments.findByIdAndUpdate(
        paymentRecordId,
        {
          status: PaymentStatus.CANCELLED,
          stripePaymentIntentId: paymentIntent.id,
          stripeMetadata: {
            ...paymentIntent.metadata,
            error: "Payment was canceled",
          },
        },
        { new: true },
      );

      if (updatedPayment) {
        console.log(
          `✅ Canceled payment record updated: ${updatedPayment._id}`,
        );
      } else {
        console.error(
          `❌ Canceled payment record not found: ${paymentRecordId}`,
        );
      }
    } else {
      // If no metadata, try to find by Payment Intent ID
      const existingPayment = await Payments.findOne({
        stripePaymentIntentId: paymentIntent.id,
      });

      if (existingPayment) {
        existingPayment.status = PaymentStatus.CANCELLED;
        existingPayment.stripeMetadata = {
          ...existingPayment.stripeMetadata,
          error: "Payment was canceled",
        };
        await existingPayment.save();
        console.log(
          `✅ Canceled payment record updated by PaymentIntent ID: ${existingPayment._id}`,
        );
      }
    }
  } catch (error) {
    console.error("Error handling canceled payment:", error);
  }
}

import { Request, Response } from "express";
import httpStatus from "http-status";
import Stripe from "stripe";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { Payments } from "../payments/payments.schema";
import { Users } from "../users/users.schema";
import { StripeService } from "./stripe.service";

export class StripeController {
  // Create a new payment with unique payment link
  static createPaymentWithLink = catchAsync(
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
  static getPaymentLinkDetails = catchAsync(
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

  static handleWebhook = catchAsync(async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"];
    const timestamp = new Date().toISOString();

    console.log(`🔔 [${timestamp}] Webhook received`);
    console.log(`📋 Headers:`, {
      "stripe-signature": sig ? "present" : "missing",
      "content-type": req.headers["content-type"],
      "user-agent": req.headers["user-agent"],
    });

    try {
      let event;

      // Get the raw body for signature verification
      const payload = req.body;
      console.log(
        `📦 Payload type: ${typeof payload}, length: ${payload?.length || 0}`,
      );

      // Verify the signature
      try {
        event = StripeService.constructWebhookEvent(payload, sig);
        console.log(`✅ Signature verification successful`);
      } catch (err: any) {
        console.error(
          `❌ [${timestamp}] Webhook signature verification failed:`,
          err.message,
        );
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
      }

      console.log(`📨 [${timestamp}] Received webhook event: ${event.type}`);
      console.log(`🆔 Event ID: ${event.id}`);

      switch (event.type) {
        case "payment_intent.succeeded":
          console.log(`💰 [${timestamp}] Processing payment_intent.succeeded`);
          await StripeController.handlePaymentSuccess(event.data.object);
          break;
        case "payment_intent.payment_failed":
          console.log(
            `❌ [${timestamp}] Processing payment_intent.payment_failed`,
          );
          await StripeController.handlePaymentFailure(event.data.object);
          break;
        case "payment_intent.canceled":
          console.log(`🚫 [${timestamp}] Processing payment_intent.canceled`);
          await StripeController.handlePaymentCanceled(event.data.object);
          break;
        case "payment_intent.processing":
          console.log(
            `⏳ [${timestamp}] Payment processing: ${event.data.object.id}`,
          );
          break;
        case "payment_intent.requires_action":
          console.log(
            `⚠️ [${timestamp}] Payment requires action: ${event.data.object.id}`,
          );
          break;
        case "charge.succeeded":
          console.log(
            `💳 [${timestamp}] Charge succeeded: ${event.data.object.id}`,
          );
          break;
        case "charge.updated":
          console.log(
            `🔄 [${timestamp}] Charge updated: ${event.data.object.id}`,
          );
          break;
        default:
          console.log(`❓ [${timestamp}] Unhandled event type: ${event.type}`);
      }

      console.log(`✅ [${timestamp}] Webhook processed successfully`);
      res.json({ received: true });
    } catch (error: any) {
      console.error(`💥 [${timestamp}] Webhook error:`, error);
      res
        .status(400)
        .send(`Webhook Error: ${error.message || "Unknown error"}`);
    }
  });

  static async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    const timestamp = new Date().toISOString();

    try {
      console.log(`💰 [${timestamp}] Payment Intent Data:`, {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        amount_formatted: `$${(paymentIntent.amount / 100).toFixed(2)}`,
        metadata: paymentIntent.metadata,
        customer: paymentIntent.customer,
        created: new Date(paymentIntent.created * 1000).toISOString(),
        status: paymentIntent.status,
        currency: paymentIntent.currency,
      });

      // Extract metadata from the unique payment link
      const metadata = paymentIntent.metadata;
      console.log(`📋 [${timestamp}] Payment metadata:`, metadata);

      if (!metadata.tenantId || !metadata.receiptNumber) {
        console.error(
          `❌ [${timestamp}] Missing required metadata: tenantId or receiptNumber`,
        );
        throw new Error("Missing required payment metadata");
      }

      // Log additional metadata for debugging
      console.log(`📋 [${timestamp}] Additional metadata:`, {
        leaseId: metadata.leaseId,
        stripeAccountId: metadata.stripeAccountId,
        propertyName: metadata.propertyName,
      });

      // Find the existing payment record by receipt number
      const existingPayment = await Payments.findOne({
        receiptNumber: metadata.receiptNumber,
      });

      if (!existingPayment) {
        console.error(
          `❌ [${timestamp}] Payment record not found for receipt: ${metadata.receiptNumber}`,
        );
        throw new Error("Payment record not found");
      }

      // Check if payment already exists
      const duplicatePayment = await Payments.findOne({
        stripeTransactionId: paymentIntent.id,
      });

      if (duplicatePayment) {
        console.log(
          `⚠️ [${timestamp}] Payment already exists: ${paymentIntent.id}`,
        );
        return;
      }

      // Update the existing payment record with Stripe transaction details
      const updatedPayment = await Payments.findByIdAndUpdate(
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

      console.log(
        `✅ [${timestamp}] Payment successful for receipt ${metadata.receiptNumber}: ${paymentIntent.id}`,
      );
      console.log(
        `✅ [${timestamp}] Updated payment record: ${updatedPayment?._id}`,
      );
      console.log(
        `💰 [${timestamp}] Amount: $${(paymentIntent.amount / 100).toFixed(2)}`,
      );
    } catch (error: any) {
      console.error(`💥 [${timestamp}] Payment success handling error:`, error);
      throw error;
    }
  }

  static async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
    try {
      const metadata = paymentIntent.metadata;
      const receiptNumber = metadata.receiptNumber;

      if (receiptNumber) {
        // Update payment status to failed
        await Payments.findOneAndUpdate(
          { receiptNumber },
          { status: "CANCELLED" },
        );
        console.log(`Payment failed for receipt: ${receiptNumber}`);
      }
    } catch (error: any) {
      console.error("Payment failure handling error:", error);
    }
  }

  static async handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent) {
    try {
      const metadata = paymentIntent.metadata;
      const receiptNumber = metadata.receiptNumber;

      if (receiptNumber) {
        // Update payment status to cancelled
        await Payments.findOneAndUpdate(
          { receiptNumber },
          { status: "CANCELLED" },
        );
        console.log(`Payment canceled for receipt: ${receiptNumber}`);
      }
    } catch (error: any) {
      console.error("Payment cancellation handling error:", error);
    }
  }

  // Sync payment history for a user
  static syncPaymentHistory = catchAsync(
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
  static webhookStatus = catchAsync(async (req: Request, res: Response) => {
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
}

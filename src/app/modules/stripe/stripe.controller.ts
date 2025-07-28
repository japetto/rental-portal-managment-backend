import { Request, Response } from "express";
import httpStatus from "http-status";
import Stripe from "stripe";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { Payments } from "../payments/payments.schema";
import { Properties } from "../properties/properties.schema";
import { IUser } from "../users/users.interface";
import { Users } from "../users/users.schema";
import { StripeService } from "./stripe.service";

export class StripeController {
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

      let user: IUser | null = null;
      let lookupMethod = "";

      // Find user by payment link ID in metadata
      if (paymentIntent.metadata?.paymentLinkId) {
        lookupMethod = "metadata.paymentLinkId";
        console.log(
          `🔍 [${timestamp}] Looking for user with paymentLinkId:`,
          paymentIntent.metadata.paymentLinkId,
        );
        user = await Users.findOne({
          stripePaymentLinkId: paymentIntent.metadata.paymentLinkId,
        });
        console.log(
          `🔍 [${timestamp}] User found by ${lookupMethod}:`,
          user ? `Yes (${user._id})` : "No",
        );
      }

      // If not found, try to find by payment link ID from the payment intent
      if (!user && (paymentIntent as any).payment_link) {
        lookupMethod = "payment_link";
        console.log(
          `🔍 [${timestamp}] Looking for user with payment_link:`,
          (paymentIntent as any).payment_link,
        );
        user = await Users.findOne({
          stripePaymentLinkId: (paymentIntent as any).payment_link,
        });
        console.log(
          `🔍 [${timestamp}] User found by ${lookupMethod}:`,
          user ? `Yes (${user._id})` : "No",
        );
      }

      // If still not found, try to find by customer ID
      if (!user && paymentIntent.customer) {
        lookupMethod = "customer";
        console.log(
          `🔍 [${timestamp}] Looking for user with customerId:`,
          paymentIntent.customer,
        );
        user = await Users.findOne({
          stripeCustomerId: paymentIntent.customer as string,
        });
        console.log(
          `🔍 [${timestamp}] User found by ${lookupMethod}:`,
          user ? `Yes (${user._id})` : "No",
        );
      }

      if (!user) {
        console.error(
          `❌ [${timestamp}] User not found for payment. Available data:`,
          {
            metadata: paymentIntent.metadata,
            customer: paymentIntent.customer,
            payment_link: (paymentIntent as any).payment_link,
          },
        );
        throw new Error("User not found for payment");
      }

      console.log(
        `✅ [${timestamp}] User found: ${user._id} (via ${lookupMethod})`,
      );

      // Check if payment already exists
      const existingPayment = await Payments.findOne({
        stripeTransactionId: paymentIntent.id,
      });

      if (existingPayment) {
        console.log(
          `⚠️ [${timestamp}] Payment already exists: ${paymentIntent.id}`,
        );
        return;
      }

      // Get user details
      const userDoc = await Users.findById(user._id);
      if (!userDoc) throw new Error("User not found");

      console.log(`👤 [${timestamp}] User details:`, {
        userId: userDoc._id,
        propertyId: userDoc.propertyId,
        spotId: userDoc.spotId,
        stripePaymentLinkId: userDoc.stripePaymentLinkId,
      });

      // Find property by name from metadata or use user's assigned property
      let property = null;
      if (paymentIntent.metadata?.propertyName) {
        console.log(
          `🏠 [${timestamp}] Looking for property by name:`,
          paymentIntent.metadata.propertyName,
        );
        property = await Properties.findOne({
          name: paymentIntent.metadata.propertyName,
        });
      }

      if (!property) {
        console.log(
          `🏠 [${timestamp}] Looking for property by ID:`,
          userDoc.propertyId,
        );
        property = await Properties.findById(userDoc.propertyId);
      }

      if (!property) {
        console.error(`❌ [${timestamp}] Property not found for payment`);
        throw new Error("Property not found for payment");
      }

      console.log(
        `✅ [${timestamp}] Property found: ${property._id} (${property.name})`,
      );

      // Get lease details for validation
      const { Leases } = await import("../leases/leases.schema");
      const lease = await Leases.findOne({
        tenantId: user._id,
        leaseStatus: "ACTIVE",
        isDeleted: false,
      });

      console.log(
        `📋 [${timestamp}] Lease found:`,
        lease ? `Yes (${lease._id})` : "No",
      );

      // Create payment record
      const paymentData = {
        tenantId: user._id,
        propertyId: property._id,
        spotId: userDoc.spotId,
        amount: paymentIntent.amount / 100, // Convert from cents
        type: "RENT",
        status: "PAID",
        dueDate: lease?.leaseStart || new Date(),
        paidDate: new Date(paymentIntent.created * 1000),
        paymentMethod: "ONLINE",
        transactionId: paymentIntent.id,
        stripeTransactionId: paymentIntent.id,
        stripePaymentLinkId: userDoc.stripePaymentLinkId,
        receiptNumber: `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        description: "Monthly Rent Payment",
        totalAmount: paymentIntent.amount / 100,
        createdBy: "SYSTEM",
      };

      console.log(`💾 [${timestamp}] Creating payment record:`, {
        amount: paymentData.amount,
        dueDate: paymentData.dueDate,
        transactionId: paymentData.transactionId,
      });

      const payment = await Payments.create(paymentData);

      console.log(
        `✅ [${timestamp}] Payment successful for user ${user._id}: ${paymentIntent.id}`,
      );
      console.log(`✅ [${timestamp}] Created payment record: ${payment._id}`);
      console.log(
        `💰 [${timestamp}] Amount: $${paymentData.amount.toFixed(2)}`,
      );
    } catch (error: any) {
      console.error(`💥 [${timestamp}] Payment success handling error:`, error);
      throw error;
    }
  }

  static async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
    try {
      // Find user by payment link ID in metadata
      let user: IUser | null = null;
      if (paymentIntent.metadata?.paymentLinkId) {
        user = await Users.findOne({
          stripePaymentLinkId: paymentIntent.metadata.paymentLinkId,
        });
      }

      // If not found, try to find by customer ID
      if (!user && paymentIntent.customer) {
        user = await Users.findOne({
          stripeCustomerId: paymentIntent.customer as string,
        });
      }

      if (user) {
        console.log(`Payment failed for user: ${user._id}`);
        // Add notification logic here if needed
      }
    } catch (error: any) {
      console.error("Payment failure handling error:", error);
    }
  }

  static async handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent) {
    try {
      // Find user by payment link ID in metadata
      let user: IUser | null = null;
      if (paymentIntent.metadata?.paymentLinkId) {
        user = await Users.findOne({
          stripePaymentLinkId: paymentIntent.metadata.paymentLinkId,
        });
      }

      // If not found, try to find by customer ID
      if (!user && paymentIntent.customer) {
        user = await Users.findOne({
          stripeCustomerId: paymentIntent.customer as string,
        });
      }

      if (user) {
        console.log(`Payment canceled for user: ${user._id}`);
        // Add cancellation logic here if needed
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
      if (!user || !user.stripePaymentLinkId) {
        return sendResponse(res, {
          statusCode: httpStatus.NOT_FOUND,
          success: false,
          message: "User or payment link not found",
          data: null,
        });
      }

      const stripeService = new StripeService();
      await stripeService.syncStripePayments(user.stripePaymentLinkId, userId);

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

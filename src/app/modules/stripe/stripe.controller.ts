import { Request, Response } from "express";
import httpStatus from "http-status";
import Stripe from "stripe";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { Payments } from "../payments/payments.schema";
import { Users } from "../users/users.schema";
import { StripeService } from "./stripe.service";

export class StripeController {
  static handleWebhook = catchAsync(async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"];

    try {
      const event = StripeService.constructWebhookEvent(req.body, sig);

      switch (event.type) {
        case "payment_intent.succeeded":
          await StripeController.handlePaymentSuccess(event.data.object);
          break;
        case "payment_intent.payment_failed":
          await StripeController.handlePaymentFailure(event.data.object);
          break;
        case "payment_intent.canceled":
          await StripeController.handlePaymentCanceled(event.data.object);
          break;
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(400).send(`Webhook Error: ${error.message}`);
    }
  });

  static async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    const stripeService = new StripeService();

    try {
      // Find user by payment link
      const user = await Users.findOne({
        stripePaymentLinkId: paymentIntent.payment_link,
      });

      if (!user) {
        throw new Error("User not found for payment link");
      }

      // Create payment record with error handling
      await stripeService.createPaymentFromStripe(paymentIntent, user._id);

      console.log(
        `Payment successful for user ${user._id}: ${paymentIntent.id}`,
      );
    } catch (error) {
      console.error("Payment success handling error:", error);

      // If property not found, cancel payment
      if (error.message.includes("Property not found")) {
        await stripeService.cancelPaymentIntent(paymentIntent.id);
      }

      throw error;
    }
  }

  static async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
    console.log("Payment failed:", paymentIntent.id);

    // Find user by payment link
    const user = await Users.findOne({
      stripePaymentLinkId: paymentIntent.payment_link,
    });

    if (user) {
      // Create failed payment record
      await Payments.create({
        tenantId: user._id,
        propertyId: user.propertyId,
        spotId: user.spotId,
        amount: paymentIntent.amount / 100,
        type: "RENT",
        status: "CANCELLED",
        dueDate: new Date(),
        paymentMethod: "ONLINE",
        transactionId: paymentIntent.id,
        stripeTransactionId: paymentIntent.id,
        stripePaymentLinkId: user.stripePaymentLinkId,
        receiptNumber: `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        description: "Monthly Rent Payment - Failed",
        totalAmount: paymentIntent.amount / 100,
        createdBy: "SYSTEM",
      });
    }
  }

  static async handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent) {
    console.log("Payment canceled:", paymentIntent.id);

    // Find user by payment link
    const user = await Users.findOne({
      stripePaymentLinkId: paymentIntent.payment_link,
    });

    if (user) {
      // Create canceled payment record
      await Payments.create({
        tenantId: user._id,
        propertyId: user.propertyId,
        spotId: user.spotId,
        amount: paymentIntent.amount / 100,
        type: "RENT",
        status: "CANCELLED",
        dueDate: new Date(),
        paymentMethod: "ONLINE",
        transactionId: paymentIntent.id,
        stripeTransactionId: paymentIntent.id,
        stripePaymentLinkId: user.stripePaymentLinkId,
        receiptNumber: `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        description: "Monthly Rent Payment - Canceled",
        totalAmount: paymentIntent.amount / 100,
        createdBy: "SYSTEM",
      });
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
}

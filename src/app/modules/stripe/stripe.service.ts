import Stripe from "stripe";
import config from "../../../config/config";
import { Payments } from "../payments/payments.schema";
import { Properties } from "../properties/properties.schema";
import { Users } from "../users/users.schema";

export class StripeService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(config.stripe_secret_key, {
      apiVersion: "2025-06-30.basil",
    });
  }

  // Validate payment link exists in Stripe
  async validatePaymentLink(paymentLinkId: string): Promise<boolean> {
    try {
      const paymentLink =
        await this.stripe.paymentLinks.retrieve(paymentLinkId);
      return paymentLink.active;
    } catch (error) {
      return false;
    }
  }

  // Get payment link details
  async getPaymentLinkDetails(paymentLinkId: string) {
    return this.stripe.paymentLinks.retrieve(paymentLinkId);
  }

  // Get transaction history for a payment link
  async getPaymentLinkTransactions(paymentLinkId: string) {
    return this.stripe.paymentIntents.list({
      limit: 100,
    });
  }

  // Cancel payment intent (for error handling)
  async cancelPaymentIntent(paymentIntentId: string) {
    return this.stripe.paymentIntents.cancel(paymentIntentId);
  }

  // Sync existing payments from Stripe to database
  async syncStripePayments(paymentLinkId: string, tenantId: string) {
    const payments = await this.getPaymentLinkTransactions(paymentLinkId);

    for (const payment of payments.data) {
      // Check if payment already exists in database
      const existingPayment = await Payments.findOne({
        stripeTransactionId: payment.id,
      });

      if (!existingPayment && payment.status === "succeeded") {
        // Create payment record
        await this.createPaymentFromStripe(payment, tenantId);
      }
    }
  }

  // Create payment record from Stripe data
  async createPaymentFromStripe(
    stripePayment: Stripe.PaymentIntent,
    tenantId: string,
  ) {
    const user = await Users.findById(tenantId);
    if (!user) throw new Error("User not found");

    // Find property by propertyName from metadata
    const propertyName = stripePayment.metadata?.propertyName;
    if (!propertyName)
      throw new Error("Property name not found in payment metadata");

    const property = await Properties.findOne({ propertyName });
    if (!property) {
      // Cancel payment if property not found
      await this.cancelPaymentIntent(stripePayment.id);
      throw new Error(`Property not found: ${propertyName}`);
    }

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
      stripePaymentLinkId: user.stripePaymentLinkId,
      receiptNumber: `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      description: "Monthly Rent Payment",
      totalAmount: stripePayment.amount / 100,
      createdBy: "SYSTEM",
    });
  }

  // Construct webhook event for verification
  static constructWebhookEvent(
    payload: any,
    signature: string | string[] | undefined,
  ) {
    const stripe = new Stripe(config.stripe_secret_key, {
      apiVersion: "2025-06-30.basil",
    });

    return stripe.webhooks.constructEvent(
      payload,
      signature as string,
      config.stripe_webhook_secret,
    );
  }
}

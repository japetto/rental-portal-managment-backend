import Stripe from "stripe";
import config from "../../../config/config";
import { Leases } from "../leases/leases.schema";
import { Payments } from "../payments/payments.schema";
import { Properties } from "../properties/properties.schema";
import { Users } from "../users/users.schema";
import { StripeAccounts } from "./stripe-accounts.schema";

export class StripeService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(config.stripe_secret_key, {
      apiVersion: "2025-06-30.basil",
    });
  }

  // Create a unique payment link for a specific payment transaction
  async createPaymentLink(paymentData: {
    tenantId: string;
    propertyId: string;
    spotId: string;
    amount: number;
    type: string;
    dueDate: Date;
    description: string;
    lateFeeAmount?: number;
    receiptNumber: string;
  }) {
    try {
      // Get user and property details for metadata
      const user = await Users.findById(paymentData.tenantId);
      const property = await Properties.findById(paymentData.propertyId);

      if (!user) throw new Error("User not found");
      if (!property) throw new Error("Property not found");

      // Check if user has an active lease for this property
      const activeLease = await Leases.findOne({
        tenantId: paymentData.tenantId,
        propertyId: paymentData.propertyId,
        leaseStatus: "ACTIVE",
        isDeleted: false,
      });

      if (!activeLease) {
        throw new Error("User does not have an active lease for this property");
      }

      // Get the Stripe account for this property
      const stripeAccount = await StripeAccounts.findOne({
        propertyId: paymentData.propertyId,
        isActive: true,
        isVerified: true,
      });

      // If no property-specific account, try to find a global account
      if (!stripeAccount) {
        const globalAccount = await StripeAccounts.findOne({
          isGlobalAccount: true,
          isActive: true,
          isVerified: true,
        });

        if (!globalAccount) {
          throw new Error(
            "No active Stripe account found for this property or globally",
          );
        }

        // Use global account
        const totalAmount =
          paymentData.amount + (paymentData.lateFeeAmount || 0);

        // Create payment link with unique metadata using global Stripe account
        const paymentLink = await this.stripe.paymentLinks.create({
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: {
                  name: paymentData.description,
                  description: `Payment for ${property.name} - ${paymentData.type}`,
                },
                unit_amount: Math.round(totalAmount * 100), // Convert to cents
              },
              quantity: 1,
            },
          ] as any,
          metadata: {
            tenantId: paymentData.tenantId,
            propertyId: paymentData.propertyId,
            spotId: paymentData.spotId,
            leaseId: (activeLease as any)._id.toString(),
            paymentType: paymentData.type,
            dueDate: paymentData.dueDate.toISOString(),
            receiptNumber: paymentData.receiptNumber,
            propertyName: property.name,
            tenantName: user.name,
            amount: totalAmount.toString(),
            lateFeeAmount: (paymentData.lateFeeAmount || 0).toString(),
            stripeAccountId: globalAccount.stripeAccountId,
            isGlobalAccount: "true",
          },
          after_completion: {
            type: "redirect",
            redirect: {
              url: `${config.client_url}/payment-success?receipt=${paymentData.receiptNumber}`,
            },
          },
          expires_at: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days from now
        } as any);

        return paymentLink;
      }

      if (!stripeAccount) {
        throw new Error("No active Stripe account found for this property");
      }

      const totalAmount = paymentData.amount + (paymentData.lateFeeAmount || 0);

      // Create payment link with unique metadata using property-specific Stripe account
      const paymentLink = await this.stripe.paymentLinks.create({
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: paymentData.description,
                description: `Payment for ${property.name} - ${paymentData.type}`,
              },
              unit_amount: Math.round(totalAmount * 100), // Convert to cents
            },
            quantity: 1,
          },
        ] as any,
        metadata: {
          tenantId: paymentData.tenantId,
          propertyId: paymentData.propertyId,
          spotId: paymentData.spotId,
          leaseId: (activeLease as any)._id.toString(),
          paymentType: paymentData.type,
          dueDate: paymentData.dueDate.toISOString(),
          receiptNumber: paymentData.receiptNumber,
          propertyName: property.name,
          tenantName: user.name,
          amount: totalAmount.toString(),
          lateFeeAmount: (paymentData.lateFeeAmount || 0).toString(),
          stripeAccountId: stripeAccount.stripeAccountId,
        },
        after_completion: {
          type: "redirect",
          redirect: {
            url: `${config.client_url}/payment-success?receipt=${paymentData.receiptNumber}`,
          },
        },
        expires_at: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days from now
      } as any);

      return paymentLink;
    } catch (error) {
      console.error("Error creating payment link:", error);
      throw error;
    }
  }

  // Create a payment record and generate a unique payment link
  async createPaymentWithLink(paymentData: {
    tenantId: string;
    propertyId: string;
    spotId: string;
    amount: number;
    type: string;
    dueDate: Date;
    description: string;
    lateFeeAmount?: number;
    createdBy: string;
  }) {
    try {
      // Generate receipt number
      const receiptNumber = `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Check if user has an active lease for this property
      const activeLease = await Leases.findOne({
        tenantId: paymentData.tenantId,
        propertyId: paymentData.propertyId,
        leaseStatus: "ACTIVE",
        isDeleted: false,
      });

      if (!activeLease) {
        throw new Error("User does not have an active lease for this property");
      }

      // Get the Stripe account for this property
      const stripeAccount = await StripeAccounts.findOne({
        propertyId: paymentData.propertyId,
        isActive: true,
        isVerified: true,
      });

      // If no property-specific account, try to find a global account
      if (!stripeAccount) {
        const globalAccount = await StripeAccounts.findOne({
          isGlobalAccount: true,
          isActive: true,
          isVerified: true,
        });

        if (!globalAccount) {
          throw new Error(
            "No active Stripe account found for this property or globally",
          );
        }

        // Create payment record with global account
        const payment = await Payments.create({
          ...paymentData,
          receiptNumber,
          status: "PENDING",
          totalAmount: paymentData.amount + (paymentData.lateFeeAmount || 0),
          stripeAccountId: globalAccount._id,
        });

        // Create unique payment link
        const paymentLink = await this.createPaymentLink({
          ...paymentData,
          receiptNumber,
        });

        // Update payment record with payment link info
        await Payments.findByIdAndUpdate(payment._id, {
          stripePaymentLinkId: paymentLink.id,
        });

        return {
          payment,
          paymentLink,
        };
      }

      if (!stripeAccount) {
        throw new Error("No active Stripe account found for this property");
      }

      // Create payment record first
      const payment = await Payments.create({
        ...paymentData,
        receiptNumber,
        status: "PENDING",
        totalAmount: paymentData.amount + (paymentData.lateFeeAmount || 0),
        stripeAccountId: stripeAccount._id,
      });

      // Create unique payment link
      const paymentLink = await this.createPaymentLink({
        ...paymentData,
        receiptNumber,
      });

      // Update payment record with payment link info
      await Payments.findByIdAndUpdate(payment._id, {
        stripePaymentLinkId: paymentLink.id,
      });

      return {
        payment,
        paymentLink,
      };
    } catch (error) {
      console.error("Error creating payment with link:", error);
      throw error;
    }
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
    console.log("🚀 ~ payments:", payments.data);

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

    // Find property by name from metadata
    const propertyName = stripePayment.metadata?.propertyName;
    if (!propertyName)
      throw new Error("Property name not found in payment metadata");

    const property = await Properties.findOne({ name: propertyName });
    if (!property) {
      // Cancel payment if property not found
      await this.cancelPaymentIntent(stripePayment.id);
      throw new Error(`Property not found: ${propertyName}`);
    }

    // Get the Stripe account for this property
    const stripeAccount = await StripeAccounts.findOne({
      propertyId: property._id,
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

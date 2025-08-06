import config from "../../../config/config";
import { StripeAccounts } from "./stripe.schema";
import { createStripeInstance } from "./stripe.service";

// Helper function to ensure URL has proper scheme
export const getValidRedirectUrl = (path: string): string => {
  const baseUrl = config.client_url || "http://localhost:3000";

  // If baseUrl already has a scheme, use it as is
  if (baseUrl.startsWith("http://") || baseUrl.startsWith("https://")) {
    return `${baseUrl}${path}`;
  }

  // If no scheme, default to https
  return `https://${baseUrl}${path}`;
};

// Helper function to format address object to string
export const formatAddress = (address: any): string => {
  if (!address) return "N/A";

  // If address is already a string, return it
  if (typeof address === "string") return address;

  // If address is an object, format it
  if (typeof address === "object") {
    const parts = [];
    if (address.street) parts.push(address.street);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.zip) parts.push(address.zip);
    if (address.country) parts.push(address.country);

    return parts.length > 0 ? parts.join(", ") : "N/A";
  }

  return "N/A";
};

// Verify Stripe secret key with Stripe API
export const verifyStripeAccountId = async (secretKey: string) => {
  try {
    // Validate the secret key format
    if (!secretKey.startsWith("sk_")) {
      throw new Error(
        "Invalid Stripe secret key format. Must start with 'sk_'",
      );
    }

    // Create Stripe instance with account-specific secret key
    const stripe = createStripeInstance(secretKey);

    // Verify the secret key by making a test API call
    // Using balance.retrieve() is more reliable than paymentLinks.list()
    await stripe.balance.retrieve();

    return {
      isValid: true,
      message: "Stripe secret key verified successfully",
    };
  } catch (error: any) {
    if (error.code === "authentication_error") {
      throw new Error(
        "Invalid Stripe secret key. Please check your credentials",
      );
    }
    throw new Error(`Stripe account verification failed: ${error.message}`);
  }
};

// Create webhook endpoint for a Stripe account
export const createWebhookEndpoint = async (
  accountId: string,
  webhookUrl: string,
) => {
  try {
    // Get the Stripe account with secret key
    const stripeAccount =
      await StripeAccounts.findById(accountId).select("+stripeSecretKey");

    if (!stripeAccount) {
      throw new Error("Stripe account not found");
    }

    if (!stripeAccount.stripeSecretKey) {
      throw new Error("Stripe secret key is missing for this account");
    }

    // Create Stripe instance with account-specific secret key
    const stripe = createStripeInstance(stripeAccount.stripeSecretKey);

    // Create webhook endpoint
    const webhook = await stripe.webhookEndpoints.create({
      url: webhookUrl,
      enabled_events: [
        "payment_intent.succeeded",
        "payment_intent.payment_failed",
        "payment_intent.canceled",
        "payment_link.created",
        "payment_link.updated",
      ],
      metadata: {
        accountId: accountId,
        accountName: stripeAccount.name,
        propertyIds: stripeAccount.propertyIds.join(","),
      },
    });

    console.log(`✅ Webhook created for account ${stripeAccount.name}:`, {
      webhookId: webhook.id,
      url: webhook.url,
      status: webhook.status,
    });

    // Update the account with webhook information
    await StripeAccounts.findByIdAndUpdate(accountId, {
      webhookId: webhook.id,
      webhookUrl: webhook.url,
      webhookStatus: "ACTIVE",
      webhookCreatedAt: new Date(),
    });

    return webhook;
  } catch (error: any) {
    console.error("Error creating webhook endpoint:", error);
    throw new Error(`Failed to create webhook: ${error.message}`);
  }
};

import Stripe from "stripe";
import config from "../../../config/config";
import { StripeAccounts } from "./stripe.schema";

// Create Stripe instance with account-specific secret key
export const createStripeInstance = (secretKey: string): Stripe => {
  return new Stripe(secretKey, {
    apiVersion: "2025-06-30.basil",
  });
};

// Verify Stripe account ID and secret key with Stripe API
export const verifyStripeAccountId = async (
  stripeAccountId: string | undefined,
  secretKey: string,
  accountType: "STANDARD" | "CONNECT",
) => {
  try {
    // For CONNECT accounts, validate account ID
    if (accountType === "CONNECT") {
      if (!stripeAccountId) {
        throw new Error("Stripe Account ID is required for CONNECT accounts");
      }

      if (!stripeAccountId.startsWith("acct_")) {
        throw new Error(
          "Invalid Stripe account ID format. Must start with 'acct_'",
        );
      }
    }

    // Validate the secret key format
    if (!secretKey.startsWith("sk_")) {
      throw new Error(
        "Invalid Stripe secret key format. Must start with 'sk_'",
      );
    }

    // Create Stripe instance with account-specific secret key
    const stripe = createStripeInstance(secretKey);

    // For CONNECT accounts, verify the account exists
    if (accountType === "CONNECT" && stripeAccountId) {
      // Try to retrieve the account from Stripe
      const account = await stripe.accounts.retrieve(stripeAccountId);

      // Check if account is valid and active
      if (!account || account.object !== "account") {
        throw new Error("Invalid Stripe account ID");
      }

      // Check account status
      if (account.charges_enabled === false) {
        throw new Error("Stripe account is not enabled for charges");
      }
    }

    // Verify the secret key belongs to this account by making a test API call
    // Using balance.retrieve() is more reliable than paymentLinks.list()
    await stripe.balance.retrieve();
    return {
      isValid: true,
      account:
        accountType === "CONNECT"
          ? { id: stripeAccountId }
          : { id: "STANDARD_ACCOUNT" },
      message: `${accountType} account and secret key verified successfully`,
    };
  } catch (error: any) {
    if (error.code === "resource_missing") {
      throw new Error("Stripe account not found. Please check the account ID");
    }
    if (error.code === "invalid_request_error") {
      throw new Error("Invalid Stripe account ID format");
    }
    if (error.code === "authentication_error") {
      throw new Error(
        "Invalid Stripe secret key. Please check your credentials",
      );
    }
    throw new Error(`Stripe account verification failed: ${error.message}`);
  }
};

// Construct webhook event for verification
export const constructWebhookEvent = (
  payload: any,
  signature: string | string[] | undefined,
) => {
  const stripe = new Stripe(config.stripe_secret_key, {
    apiVersion: "2025-06-30.basil",
  });

  return stripe.webhooks.constructEvent(
    payload,
    signature as string,
    config.stripe_webhook_secret,
  );
};

// Check if account exists by name or ID
export const checkAccountExists = async (
  name: string,
  stripeAccountId?: string,
) => {
  const existingByName = await StripeAccounts.findOne({
    name,
    isDeleted: false,
  });

  if (existingByName) {
    return { exists: true, type: "name", account: existingByName };
  }

  if (stripeAccountId) {
    const existingById = await StripeAccounts.findOne({
      stripeAccountId,
      isDeleted: false,
    });

    if (existingById) {
      return { exists: true, type: "id", account: existingById };
    }
  }

  return { exists: false };
};

// Auto-assign property to default account
export const autoAssignPropertyToDefaultAccount = async (
  propertyId: string,
) => {
  try {
    // Find the default account
    const defaultAccount = await StripeAccounts.findOne({
      isDefaultAccount: true,
      isDeleted: false,
      isActive: true,
    });

    if (!defaultAccount) {
      console.log("No default Stripe account found for auto-assignment");
      return null;
    }

    // Check if property is already assigned to any account
    const existingAssignment = await StripeAccounts.findOne({
      propertyIds: propertyId,
      isDeleted: false,
    });

    if (existingAssignment) {
      console.log(
        `Property ${propertyId} is already assigned to account ${existingAssignment._id}`,
      );
      return existingAssignment;
    }

    // Add property to default account
    const updatedAccount = await StripeAccounts.findByIdAndUpdate(
      defaultAccount._id,
      { $push: { propertyIds: propertyId } },
      { new: true },
    ).populate("propertyIds", "name address");

    console.log(
      `Property ${propertyId} auto-assigned to default account ${defaultAccount._id}`,
    );
    return updatedAccount;
  } catch (error) {
    console.error("Error auto-assigning property to default account:", error);
    return null;
  }
};

// Stripe Account Management Functions

export const createStripeAccount = async (accountData: any) => {
  try {
    // Check if backend_url is configured before proceeding
    if (!config.backend_url) {
      throw new Error(
        "Backend URL is not configured. Please set BACKEND_URL in environment variables before creating Stripe accounts.",
      );
    }

    console.log("🔧 Checking backend URL configuration:", config.backend_url);

    // Check if account with same name already exists
    const existingAccountByName = await StripeAccounts.findOne({
      name: accountData.name,
      isDeleted: false,
    });

    if (existingAccountByName) {
      throw new Error("Stripe account with this name already exists");
    }

    // Check if account with same secret key already exists
    const existingAccountBySecretKey = await StripeAccounts.findOne({
      stripeSecretKey: accountData.stripeSecretKey,
      isDeleted: false,
    });

    if (existingAccountBySecretKey) {
      throw new Error("Stripe secret key is already in use by another account");
    }

    // Check if account with same ID already exists (for CONNECT accounts)
    if (accountData.stripeAccountId) {
      const existingAccount = await StripeAccounts.findOne({
        stripeAccountId: accountData.stripeAccountId,
        isDeleted: false,
      });

      if (existingAccount) {
        throw new Error("Stripe account ID already exists");
      }
    }

    // Verify the Stripe secret key with Stripe API
    try {
      if (accountData.accountType === "STANDARD") {
        // For STANDARD accounts, verify the secret key
        const stripe = createStripeInstance(accountData.stripeSecretKey);
        const account = await stripe.accounts.retrieve();
        accountData.stripeAccountId = account.id;
      } else {
        // For CONNECT accounts, verify with account ID
        await verifyStripeAccountId(
          accountData.stripeAccountId,
          accountData.stripeSecretKey,
          accountData.accountType || "STANDARD",
        );
      }
    } catch (error: any) {
      throw new Error(`Account verification failed: ${error.message}`);
    }

    // If setting as default, ensure no other default exists
    if (accountData.isDefaultAccount) {
      const existingDefault = await StripeAccounts.findOne({
        isDefaultAccount: true,
        isDeleted: false,
      });

      if (existingDefault) {
        throw new Error("Another account is already set as default");
      }
    }

    // Prepare account data for database
    const accountWithVerification = {
      ...accountData,
      isVerified: true, // Automatically verify the account
      isActive: true, // Automatically activate the account
    };

    // For STANDARD accounts, don't include stripeAccountId at all
    if (accountData.accountType === "STANDARD") {
      delete accountWithVerification.stripeAccountId;
    }

    const createdAccount = await StripeAccounts.create(accountWithVerification);

    // Automatically create webhook for this account after successful creation
    let webhookResult = null;
    try {
      const webhookUrl = `${config.backend_url}/api/v1.0/stripe/webhook`;

      console.log(
        `🔗 Creating webhook for new account: ${createdAccount.name}`,
      );

      const webhook = await createWebhookEndpoint(
        (createdAccount as any)._id.toString(),
        webhookUrl,
      );

      // Update the account with webhook information
      await StripeAccounts.findByIdAndUpdate((createdAccount as any)._id, {
        webhookId: webhook.id,
        webhookUrl: webhook.url,
        webhookStatus: "ACTIVE",
        webhookCreatedAt: new Date(),
      });

      webhookResult = {
        success: true,
        webhookId: webhook.id,
        webhookUrl: webhook.url,
        message: "Webhook created successfully",
      };

      console.log(`✅ Webhook created for new account: ${webhook.id}`);
    } catch (webhookError: any) {
      console.error(
        `❌ Failed to create webhook for new account:`,
        webhookError.message,
      );
      webhookResult = {
        success: false,
        error: webhookError.message,
        message: "Account created but webhook creation failed",
      };
    }

    // Return the created account with verification status and webhook info
    return {
      ...createdAccount.toObject(),
      verificationStatus: "VERIFIED",
      webhook: webhookResult,
      message: "Stripe account created, verified, and webhook configured",
    };
  } catch (error: any) {
    // Handle MongoDB duplicate key errors
    if (error.code === 11000) {
      if (error.keyPattern?.stripeAccountId) {
        throw new Error("Stripe account ID already exists");
      }
      if (error.keyPattern?.name) {
        throw new Error("Stripe account with this name already exists");
      }
      if (error.keyPattern?.stripeSecretKey) {
        throw new Error(
          "Stripe secret key is already in use by another account",
        );
      }
      throw new Error("Duplicate account entry");
    }

    // Re-throw other errors
    throw error;
  }
};

// Get all Stripe accounts with comprehensive property information
export const getAllStripeAccounts = async () => {
  const { Properties } = await import("../properties/properties.schema");

  // Get all non-deleted Stripe accounts with populated property details
  const stripeAccounts = await StripeAccounts.find({ isDeleted: false })
    .populate({
      path: "propertyIds",
      select: "_id name address",
      match: { isDeleted: false },
    })
    .lean();

  // Get all non-deleted properties
  const allProperties = await Properties.find({ isDeleted: false }).lean();

  // Get all properties that are assigned to any Stripe account
  const assignedProperties = await StripeAccounts.aggregate([
    { $match: { isDeleted: false } },
    { $unwind: "$propertyIds" },
    { $group: { _id: "$propertyIds" } },
  ]);

  // Extract assigned property IDs
  const assignedPropertyIds = assignedProperties.map(item =>
    item._id.toString(),
  );

  // Filter out assigned properties to get unassigned properties
  const unassignedProperties = allProperties.filter(
    property => !assignedPropertyIds.includes((property as any)._id.toString()),
  );

  // Find the default account and its properties
  const defaultAccount = stripeAccounts.find(
    account => account.isDefaultAccount,
  );
  const defaultAccountProperties = defaultAccount
    ? defaultAccount.propertyIds
    : [];

  // Prepare the comprehensive response
  const response = {
    stripeAccounts: stripeAccounts.map(account => ({
      _id: account._id,
      name: account.name,
      description: account.description,
      stripeAccountId: account.stripeAccountId,

      isActive: account.isActive,
      isVerified: account.isVerified,
      isGlobalAccount: account.isGlobalAccount,
      isDefaultAccount: account.isDefaultAccount,
      propertyIds: account.propertyIds,
      metadata: account.metadata,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    })),
    unassignedProperties: unassignedProperties.map(property => ({
      _id: property._id,
      name: property.name,
      address: property.address,
    })),
    defaultAccount: defaultAccount
      ? {
          _id: defaultAccount._id,
          name: defaultAccount.name,
          stripeAccountId: defaultAccount.stripeAccountId,
          isDefaultAccount: defaultAccount.isDefaultAccount,
          properties: defaultAccountProperties,
        }
      : null,
    summary: {
      totalStripeAccounts: stripeAccounts.length,
      totalProperties: allProperties.length,
      assignedProperties: assignedPropertyIds.length,
      unassignedProperties: unassignedProperties.length,
      hasDefaultAccount: !!defaultAccount,
      defaultAccountPropertiesCount: defaultAccountProperties.length,
    },
  };

  return response;
};

export const getDefaultAccount = async () => {
  const defaultAccount = await StripeAccounts.findOne({
    isDefaultAccount: true,
    isDeleted: false,
  }).populate("propertyIds", "name address");

  if (!defaultAccount) {
    throw new Error("No default account found");
  }

  return defaultAccount;
};

export const setDefaultAccount = async (accountId: string) => {
  const stripeAccount = await StripeAccounts.findById(accountId);

  if (!stripeAccount) {
    throw new Error("Stripe account not found");
  }

  // Remove default flag from all accounts
  await StripeAccounts.updateMany(
    { isDeleted: false },
    { isDefaultAccount: false },
  );

  // Set the specified account as default
  return await StripeAccounts.findByIdAndUpdate(
    accountId,
    { isDefaultAccount: true },
    { new: true },
  ).populate("propertyIds", "name address");
};

export const linkPropertiesToAccount = async (
  accountId: string,
  propertyIds: string[],
) => {
  const stripeAccount = await StripeAccounts.findById(accountId);

  if (!stripeAccount) {
    throw new Error("Stripe account not found");
  }

  // Validate that all properties exist
  const { Properties } = await import("../properties/properties.schema");
  const properties = await Properties.find({
    _id: { $in: propertyIds },
    isDeleted: false,
  });

  if (properties.length !== propertyIds.length) {
    throw new Error("One or more properties not found");
  }

  // Check for duplicate property assignments
  const existingAssignments = await StripeAccounts.find({
    propertyIds: { $in: propertyIds },
    isDeleted: false,
    _id: { $ne: accountId },
  });

  if (existingAssignments.length > 0) {
    const conflictingProperties = existingAssignments
      .map(acc =>
        acc.propertyIds.filter(id => propertyIds.includes(id.toString())),
      )
      .flat();
    throw new Error(
      `Some properties are already assigned to other accounts: ${conflictingProperties.join(", ")}`,
    );
  }

  // Add properties to the account (avoid duplicates)
  const uniquePropertyIds = [
    ...new Set([...stripeAccount.propertyIds, ...propertyIds]),
  ];

  return await StripeAccounts.findByIdAndUpdate(
    accountId,
    { propertyIds: uniquePropertyIds },
    { new: true },
  ).populate("propertyIds", "name address");
};

export const unlinkPropertiesFromAccount = async (
  accountId: string,
  propertyIds: string[],
) => {
  const stripeAccount = await StripeAccounts.findById(accountId);

  if (!stripeAccount) {
    throw new Error("Stripe account not found");
  }

  // Remove properties from the account
  const updatedPropertyIds = stripeAccount.propertyIds.filter(
    id => !propertyIds.includes(id.toString()),
  );

  return await StripeAccounts.findByIdAndUpdate(
    accountId,
    { propertyIds: updatedPropertyIds },
    { new: true },
  ).populate("propertyIds", "name address");
};

export const deleteStripeAccount = async (accountId: string) => {
  const account = await StripeAccounts.findByIdAndUpdate(
    accountId,
    { isDeleted: true, deletedAt: new Date() },
    { new: true },
  );

  if (!account) {
    throw new Error("Stripe account not found");
  }

  return account;
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

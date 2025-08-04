import Stripe from "stripe";
import config from "../../../config/config";
import { Leases } from "../leases/leases.schema";
import { Payments } from "../payments/payments.schema";
import { Properties } from "../properties/properties.schema";
import { Users } from "../users/users.schema";
import { StripeAccounts } from "./stripe-accounts.schema";

// Create Stripe instance with account-specific secret key
const createStripeInstance = (secretKey: string): Stripe => {
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

// Validate account for payments
export const validateAccountForPayments = async (
  stripeAccountId: string,
  secretKey: string,
) => {
  try {
    const stripe = createStripeInstance(secretKey);
    const account = await stripe.accounts.retrieve(stripeAccountId);

    if (!account.charges_enabled) {
      throw new Error("Account is not enabled for charges");
    }

    return {
      isValid: true,
      account,
      message: "Account is valid for payments",
    };
  } catch (error: any) {
    throw new Error(`Account validation failed: ${error.message}`);
  }
};

// Verify only the secret key (without account ID)
export const verifySecretKey = async (secretKey: string) => {
  try {
    // Validate the secret key format
    if (!secretKey.startsWith("sk_")) {
      throw new Error(
        "Invalid Stripe secret key format. Must start with 'sk_'",
      );
    }

    // Create Stripe instance with the secret key
    const stripe = createStripeInstance(secretKey);

    // Test the secret key by making a simple API call to balance
    // This is more reliable than paymentLinks.list()
    await stripe.balance.retrieve();

    return {
      isValid: true,
      message: "Stripe secret key is valid",
    };
  } catch (error: any) {
    if (error.code === "authentication_error") {
      throw new Error(
        "Invalid Stripe secret key. Please check your credentials",
      );
    }
    throw new Error(`Secret key verification failed: ${error.message}`);
  }
};

// Get account details from secret key
export const getAccountDetailsFromSecretKey = async (secretKey: string) => {
  try {
    const stripe = createStripeInstance(secretKey);

    // Get account details
    const account = await stripe.accounts.retrieve();

    return {
      accountId: account.id,
      accountType: account.object,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      country: account.country,
      businessType: account.business_type,
      capabilities: account.capabilities,
      detailsSubmitted: account.details_submitted,
    };
  } catch (error: any) {
    if (error.code === "authentication_error") {
      throw new Error("Invalid Stripe secret key");
    }
    throw new Error(`Failed to get account details: ${error.message}`);
  }
};

// Verify secret key and get account details for STANDARD accounts
export const verifySecretKeyAndGetAccount = async (secretKey: string) => {
  try {
    const stripe = createStripeInstance(secretKey);

    // For STANDARD accounts, we can retrieve the account details directly
    const account = await stripe.accounts.retrieve();

    return {
      isValid: true,
      accountId: account.id,
      accountType: account.object,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      country: account.country,
      businessType: account.business_type,
      capabilities: account.capabilities,
      detailsSubmitted: account.details_submitted,
      message: "Stripe secret key is valid",
    };
  } catch (error: any) {
    if (error.code === "authentication_error") {
      throw new Error(
        "Invalid Stripe secret key. Please check your credentials",
      );
    }
    throw new Error(`Secret key verification failed: ${error.message}`);
  }
};

export class StripeService {
  // Create Stripe instance with account-specific secret key
  createStripeInstance(secretKey: string): Stripe {
    return new Stripe(secretKey, {
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
        propertyIds: paymentData.propertyId,
        isActive: true,
        isVerified: true,
      });

      if (!stripeAccount) {
        throw new Error("No active Stripe account found for this property");
      }

      const totalAmount = paymentData.amount + (paymentData.lateFeeAmount || 0);

      // Create Stripe instance with account-specific secret key
      const stripe = this.createStripeInstance(stripeAccount.stripeSecretKey);

      // Create payment link with unique metadata
      const paymentLink = await stripe.paymentLinks.create({
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
          isGlobalAccount: stripeAccount.isGlobalAccount ? "true" : "false",
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
        propertyIds: paymentData.propertyId,
        isActive: true,
        isVerified: true,
      });

      if (!stripeAccount) {
        throw new Error("No active Stripe account found for this property");
      }

      // Create payment record
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
  async validatePaymentLink(
    paymentLinkId: string,
    secretKey: string,
  ): Promise<boolean> {
    try {
      const stripe = this.createStripeInstance(secretKey);
      const paymentLink = await stripe.paymentLinks.retrieve(paymentLinkId);
      return paymentLink.active;
    } catch (error) {
      return false;
    }
  }

  // Get payment link details
  async getPaymentLinkDetails(paymentLinkId: string, secretKey: string) {
    const stripe = this.createStripeInstance(secretKey);
    return await stripe.paymentLinks.retrieve(paymentLinkId);
  }

  // Get transaction history for a payment link
  async getPaymentLinkTransactions(paymentLinkId: string, secretKey: string) {
    const stripe = this.createStripeInstance(secretKey);
    return await stripe.paymentIntents.list({
      limit: 100,
    });
  }

  // Cancel payment intent (for error handling)
  async cancelPaymentIntent(paymentIntentId: string, secretKey: string) {
    const stripe = this.createStripeInstance(secretKey);
    return await stripe.paymentIntents.cancel(paymentIntentId);
  }

  // Sync existing payments from Stripe to database
  async syncStripePayments(
    paymentLinkId: string,
    tenantId: string,
    secretKey: string,
  ) {
    const payments = await this.getPaymentLinkTransactions(
      paymentLinkId,
      secretKey,
    );
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
      // Note: We need the secret key to cancel, but we don't have it here
      // This is a limitation - we'll need to handle this differently
      throw new Error(`Property not found: ${propertyName}`);
    }

    // Get the Stripe account for this property
    const stripeAccount = await StripeAccounts.findOne({
      propertyIds: (property as any)._id,
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
        // For STANDARD accounts, verify the secret key and get account details
        const verification = await verifySecretKeyAndGetAccount(
          accountData.stripeSecretKey,
        );

        // Update account data with the retrieved account ID
        accountData.stripeAccountId = verification.accountId;
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

    // Return the created account with verification status
    return {
      ...createdAccount.toObject(),
      verificationStatus: "VERIFIED",
      message: "Stripe account created and verified successfully",
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

export const getStripeAccountById = async (accountId: string) => {
  const account = await StripeAccounts.findById(accountId).populate(
    "propertyIds",
    "name address",
  );

  if (!account) {
    throw new Error("Stripe account not found");
  }

  return account;
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

export const getStripeAccountsByProperty = async (propertyId: string) => {
  return await StripeAccounts.find({
    propertyIds: propertyId,
    isDeleted: false,
  }).populate("propertyIds", "name address");
};

export const updateStripeAccount = async (
  accountId: string,
  updateData: any,
) => {
  // If setting as default, ensure no other default exists
  if (updateData.isDefaultAccount) {
    const existingDefault = await StripeAccounts.findOne({
      isDefaultAccount: true,
      isDeleted: false,
      _id: { $ne: accountId },
    });

    if (existingDefault) {
      throw new Error("Another account is already set as default");
    }
  }

  const account = await StripeAccounts.findByIdAndUpdate(
    accountId,
    updateData,
    { new: true },
  ).populate("propertyIds", "name address");

  if (!account) {
    throw new Error("Stripe account not found");
  }

  return account;
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

export const getAvailableStripeAccounts = async (propertyId: string) => {
  // Validate that property exists
  const { Properties } = await import("../properties/properties.schema");
  const property = await Properties.findById(propertyId);
  if (!property) {
    throw new Error("Property not found");
  }

  // Get property-specific accounts
  const propertyAccounts = await StripeAccounts.find({
    propertyIds: propertyId,
    isDeleted: false,
  }).populate("propertyIds", "name address");

  // Get global accounts
  const globalAccounts = await StripeAccounts.find({
    isGlobalAccount: true,
    isDeleted: false,
  }).populate("propertyIds", "name address");

  // Get default account
  const defaultAccount = await StripeAccounts.findOne({
    isDefaultAccount: true,
    isDeleted: false,
  }).populate("propertyIds", "name address");

  return {
    propertyAccounts,
    globalAccounts,
    defaultAccount,
    hasPropertyAccounts: propertyAccounts.length > 0,
    hasGlobalAccounts: globalAccounts.length > 0,
    hasDefaultAccount: !!defaultAccount,
  };
};

// Get unassigned properties (properties not linked to any Stripe account)
export const getUnassignedProperties = async () => {
  const { Properties } = await import("../properties/properties.schema");

  // Get all non-deleted properties
  const allProperties = await Properties.find({ isDeleted: false });

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

  // Filter out assigned properties
  const unassignedProperties = allProperties.filter(
    property => !assignedPropertyIds.includes((property as any)._id.toString()),
  );

  return unassignedProperties;
};

// Get account statistics for debugging
export const getAccountStatistics = async () => {
  const totalAccounts = await StripeAccounts.countDocuments({
    isDeleted: false,
  });
  const activeAccounts = await StripeAccounts.countDocuments({
    isDeleted: false,
    isActive: true,
  });
  const verifiedAccounts = await StripeAccounts.countDocuments({
    isDeleted: false,
    isVerified: true,
  });
  const defaultAccounts = await StripeAccounts.countDocuments({
    isDeleted: false,
    isDefaultAccount: true,
  });
  const standardAccounts = await StripeAccounts.countDocuments({
    isDeleted: false,
    accountType: "STANDARD",
  });
  const connectAccounts = await StripeAccounts.countDocuments({
    isDeleted: false,
    accountType: "CONNECT",
  });

  return {
    totalAccounts,
    activeAccounts,
    verifiedAccounts,
    defaultAccounts,
    standardAccounts,
    connectAccounts,
  };
};

// Get properties that can be assigned to a specific Stripe account
export const getAssignablePropertiesForAccount = async (accountId: string) => {
  // Validate that Stripe account exists
  const stripeAccount = await StripeAccounts.findById(accountId);
  if (!stripeAccount) {
    throw new Error("Stripe account not found");
  }

  const { Properties } = await import("../properties/properties.schema");

  // Get all non-deleted properties
  const allProperties = await Properties.find({ isDeleted: false });

  // Get all properties that are assigned to OTHER Stripe accounts
  const assignedToOtherAccounts = await StripeAccounts.aggregate([
    { $match: { isDeleted: false, _id: { $ne: stripeAccount._id } } },
    { $unwind: "$propertyIds" },
    { $group: { _id: "$propertyIds" } },
  ]);

  // Extract property IDs assigned to other accounts
  const assignedToOtherIds = assignedToOtherAccounts.map(item =>
    item._id.toString(),
  );

  // Filter properties that are either unassigned or already assigned to this account
  const assignableProperties = allProperties.filter(property => {
    const propertyId = (property as any)._id.toString();
    // Include if not assigned to other accounts OR already assigned to this account
    return (
      !assignedToOtherIds.includes(propertyId) ||
      stripeAccount.propertyIds.some(id => id.toString() === propertyId)
    );
  });

  return assignableProperties;
};

export const verifyStripeAccount = async (accountId: string) => {
  const account = await StripeAccounts.findById(accountId);

  if (!account) {
    throw new Error("Stripe account not found");
  }

  // Verify the account with Stripe API
  try {
    await verifyStripeAccountId(
      account.stripeAccountId,
      account.stripeSecretKey,
      account.accountType || "STANDARD",
    );

    // Update the account as verified
    const updatedAccount = await StripeAccounts.findByIdAndUpdate(
      accountId,
      { isVerified: true },
      { new: true },
    ).populate("propertyIds", "name address");

    if (!updatedAccount) {
      throw new Error("Failed to update account verification status");
    }

    return {
      ...(updatedAccount as any).toObject(),
      verificationStatus: "VERIFIED",
      message: "Stripe account verified successfully",
    };
  } catch (error: any) {
    throw new Error(`Account verification failed: ${error.message}`);
  }
};

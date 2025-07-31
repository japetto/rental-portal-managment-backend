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

// Get the best available account for a property
export const getBestAvailableAccountForProperty = async (
  propertyId: string,
) => {
  try {
    // First, check for property-specific accounts
    const propertyAccounts = await StripeAccounts.find({
      propertyIds: propertyId,
      isDeleted: false,
      isActive: true,
    }).populate("propertyIds", "name address");

    if (propertyAccounts.length > 0) {
      return propertyAccounts[0]; // Return the first property-specific account
    }

    // Check for global accounts
    const globalAccounts = await StripeAccounts.find({
      isGlobalAccount: true,
      isDeleted: false,
      isActive: true,
    }).populate("propertyIds", "name address");

    if (globalAccounts.length > 0) {
      return globalAccounts[0]; // Return the first global account
    }

    // Check for default account
    const defaultAccount = await StripeAccounts.findOne({
      isDefaultAccount: true,
      isDeleted: false,
      isActive: true,
    }).populate("propertyIds", "name address");

    if (defaultAccount) {
      return defaultAccount;
    }

    // If no suitable account found, return null
    return null;
  } catch (error) {
    console.error("Error getting best available account for property:", error);
    return null;
  }
};

// Stripe Account Management Functions
export const createStripeAccount = async (accountData: any) => {
  const existingAccount = await StripeAccounts.findOne({
    stripeAccountId: accountData.stripeAccountId,
    isDeleted: false,
  });

  if (existingAccount) {
    throw new Error("Stripe account ID already exists");
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

  return await StripeAccounts.create(accountData);
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
      businessName: account.businessName,
      businessEmail: account.businessEmail,
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

export const verifyStripeAccount = async (accountId: string) => {
  const account = await StripeAccounts.findByIdAndUpdate(
    accountId,
    { isVerified: true },
    { new: true },
  ).populate("propertyIds", "name address");

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

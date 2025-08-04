"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWebhookEndpoint = exports.updateWebhookEndpoint = exports.deleteWebhookEndpoint = exports.listWebhookEndpoints = exports.createWebhooksByAccountType = exports.createWebhookEndpoint = exports.updateStripeAccountSecretKey = exports.verifyStripeAccount = exports.getAssignablePropertiesForAccount = exports.getAccountStatistics = exports.getUnassignedProperties = exports.getAvailableStripeAccounts = exports.deleteStripeAccount = exports.updateStripeAccount = exports.getStripeAccountsByProperty = exports.unlinkPropertiesFromAccount = exports.linkPropertiesToAccount = exports.setDefaultAccount = exports.getDefaultAccount = exports.getStripeAccountById = exports.getAllStripeAccounts = exports.createStripeAccount = exports.autoAssignPropertyToDefaultAccount = exports.checkAccountExists = exports.getTenantPaymentStatusEnhanced = exports.constructWebhookEvent = exports.createPaymentFromStripe = exports.syncStripePayments = exports.cancelPaymentIntent = exports.getPaymentLinkTransactions = exports.getPaymentLinkDetails = exports.validatePaymentLink = exports.createPaymentWithLinkEnhanced = exports.createPaymentWithLink = exports.createPaymentLink = exports.verifySecretKeyAndGetAccount = exports.verifySecretKey = exports.verifyStripeAccountId = exports.createStripeInstance = void 0;
const stripe_1 = __importDefault(require("stripe"));
const config_1 = __importDefault(require("../../../config/config"));
const leases_schema_1 = require("../leases/leases.schema");
const payments_schema_1 = require("../payments/payments.schema");
const properties_schema_1 = require("../properties/properties.schema");
const users_schema_1 = require("../users/users.schema");
const stripe_accounts_schema_1 = require("./stripe-accounts.schema");
// Helper function to ensure URL has proper scheme
const getValidRedirectUrl = (path) => {
    const baseUrl = config_1.default.client_url || "http://localhost:3000";
    // If baseUrl already has a scheme, use it as is
    if (baseUrl.startsWith("http://") || baseUrl.startsWith("https://")) {
        return `${baseUrl}${path}`;
    }
    // If no scheme, default to https
    return `https://${baseUrl}${path}`;
};
// Helper function to format address object to string
const formatAddress = (address) => {
    if (!address)
        return "N/A";
    // If address is already a string, return it
    if (typeof address === "string")
        return address;
    // If address is an object, format it
    if (typeof address === "object") {
        const parts = [];
        if (address.street)
            parts.push(address.street);
        if (address.city)
            parts.push(address.city);
        if (address.state)
            parts.push(address.state);
        if (address.zip)
            parts.push(address.zip);
        if (address.country)
            parts.push(address.country);
        return parts.length > 0 ? parts.join(", ") : "N/A";
    }
    return "N/A";
};
// Create Stripe instance with account-specific secret key
const createStripeInstance = (secretKey) => {
    return new stripe_1.default(secretKey, {
        apiVersion: "2025-06-30.basil",
    });
};
exports.createStripeInstance = createStripeInstance;
// Verify Stripe account ID and secret key with Stripe API
const verifyStripeAccountId = (stripeAccountId, secretKey, accountType) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // For CONNECT accounts, validate account ID
        if (accountType === "CONNECT") {
            if (!stripeAccountId) {
                throw new Error("Stripe Account ID is required for CONNECT accounts");
            }
            if (!stripeAccountId.startsWith("acct_")) {
                throw new Error("Invalid Stripe account ID format. Must start with 'acct_'");
            }
        }
        // Validate the secret key format
        if (!secretKey.startsWith("sk_")) {
            throw new Error("Invalid Stripe secret key format. Must start with 'sk_'");
        }
        // Create Stripe instance with account-specific secret key
        const stripe = (0, exports.createStripeInstance)(secretKey);
        // For CONNECT accounts, verify the account exists
        if (accountType === "CONNECT" && stripeAccountId) {
            // Try to retrieve the account from Stripe
            const account = yield stripe.accounts.retrieve(stripeAccountId);
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
        yield stripe.balance.retrieve();
        return {
            isValid: true,
            account: accountType === "CONNECT"
                ? { id: stripeAccountId }
                : { id: "STANDARD_ACCOUNT" },
            message: `${accountType} account and secret key verified successfully`,
        };
    }
    catch (error) {
        if (error.code === "resource_missing") {
            throw new Error("Stripe account not found. Please check the account ID");
        }
        if (error.code === "invalid_request_error") {
            throw new Error("Invalid Stripe account ID format");
        }
        if (error.code === "authentication_error") {
            throw new Error("Invalid Stripe secret key. Please check your credentials");
        }
        throw new Error(`Stripe account verification failed: ${error.message}`);
    }
});
exports.verifyStripeAccountId = verifyStripeAccountId;
// Verify only the secret key (without account ID)
const verifySecretKey = (secretKey) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Validate the secret key format
        if (!secretKey.startsWith("sk_")) {
            throw new Error("Invalid Stripe secret key format. Must start with 'sk_'");
        }
        // Create Stripe instance with the secret key
        const stripe = (0, exports.createStripeInstance)(secretKey);
        // Test the secret key by making a simple API call to balance
        // This is more reliable than paymentLinks.list()
        yield stripe.balance.retrieve();
        return {
            isValid: true,
            message: "Stripe secret key is valid",
        };
    }
    catch (error) {
        if (error.code === "authentication_error") {
            throw new Error("Invalid Stripe secret key. Please check your credentials");
        }
        throw new Error(`Secret key verification failed: ${error.message}`);
    }
});
exports.verifySecretKey = verifySecretKey;
// Verify secret key and get account details for STANDARD accounts
const verifySecretKeyAndGetAccount = (secretKey) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const stripe = (0, exports.createStripeInstance)(secretKey);
        // For STANDARD accounts, we can retrieve the account details directly
        const account = yield stripe.accounts.retrieve();
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
    }
    catch (error) {
        if (error.code === "authentication_error") {
            throw new Error("Invalid Stripe secret key. Please check your credentials");
        }
        throw new Error(`Secret key verification failed: ${error.message}`);
    }
});
exports.verifySecretKeyAndGetAccount = verifySecretKeyAndGetAccount;
// Create a unique payment link for a specific payment transaction
const createPaymentLink = (paymentData) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        // Get user details for metadata
        const user = yield users_schema_1.Users.findById(paymentData.tenantId);
        if (!user)
            throw new Error("User not found");
        let property;
        let activeLease;
        let stripeAccount;
        if (paymentData.propertyId) {
            // If propertyId is provided, use it directly
            property = yield properties_schema_1.Properties.findById(paymentData.propertyId);
            if (!property)
                throw new Error("Property not found");
            // Check if user has an active lease for this property
            activeLease = yield leases_schema_1.Leases.findOne({
                tenantId: paymentData.tenantId,
                propertyId: paymentData.propertyId,
                leaseStatus: "ACTIVE",
                isDeleted: false,
            });
            if (!activeLease) {
                throw new Error("User does not have an active lease for this property");
            }
            // Get the Stripe account for this property
            stripeAccount = yield stripe_accounts_schema_1.StripeAccounts.findOne({
                propertyIds: paymentData.propertyId,
                isActive: true,
                isVerified: true,
            }).select("+stripeSecretKey");
        }
        else {
            // If propertyId is not provided, find the active lease and get property from it
            activeLease = yield leases_schema_1.Leases.findOne({
                tenantId: paymentData.tenantId,
                leaseStatus: "ACTIVE",
                isDeleted: false,
            }).populate("propertyId");
            if (!activeLease) {
                throw new Error("No active lease found for this tenant");
            }
            property = activeLease.propertyId;
            if (!property) {
                throw new Error("Property not found in active lease");
            }
            // Get the Stripe account for this property
            stripeAccount = yield stripe_accounts_schema_1.StripeAccounts.findOne({
                propertyIds: property._id,
                isActive: true,
                isVerified: true,
            }).select("+stripeSecretKey");
        }
        if (!stripeAccount) {
            throw new Error("No active Stripe account found for this property");
        }
        console.log("Found Stripe account in createPaymentLink:", {
            id: stripeAccount._id,
            name: stripeAccount.name,
            hasSecretKey: !!stripeAccount.stripeSecretKey,
            secretKeyLength: (_a = stripeAccount.stripeSecretKey) === null || _a === void 0 ? void 0 : _a.length,
            isActive: stripeAccount.isActive,
            isVerified: stripeAccount.isVerified,
        });
        if (!stripeAccount.stripeSecretKey) {
            throw new Error("Stripe secret key is missing for this account");
        }
        const totalAmount = paymentData.amount + (paymentData.lateFeeAmount || 0);
        // Debug logging for payment link creation
        console.log("🔗 Creating payment link with metadata:", {
            tenantId: paymentData.tenantId,
            receiptNumber: paymentData.receiptNumber,
            amount: totalAmount,
            type: paymentData.type,
            dueDate: paymentData.dueDate,
        });
        // Create Stripe instance with account-specific secret key
        const stripe = (0, exports.createStripeInstance)(stripeAccount.stripeSecretKey);
        // Create payment link with unique metadata
        const paymentLink = yield stripe.paymentLinks.create({
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: `${paymentData.type} Payment`,
                            description: ` ${paymentData.dueDate.toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                            })} - Name: ${user.name}`,
                        },
                        unit_amount: Math.round(totalAmount * 100), // Convert to cents
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                // Core payment information
                tenantId: paymentData.tenantId,
                propertyId: paymentData.propertyId || property._id.toString(),
                spotId: paymentData.spotId,
                leaseId: activeLease._id.toString(),
                paymentType: paymentData.type,
                dueDate: paymentData.dueDate.toISOString(),
                receiptNumber: paymentData.receiptNumber,
                // Property and tenant details
                propertyName: property.name,
                propertyAddress: formatAddress(property.address) || "N/A",
                propertyType: property.propertyType || "N/A",
                lotNumber: property.lotNumber || "N/A",
                unitNumber: property.unitNumber || "N/A",
                // Tenant information
                tenantName: user.name,
                tenantEmail: user.email || "N/A",
                tenantPhone: user.phone || "N/A",
                // Payment details
                amount: totalAmount.toString(),
                baseAmount: paymentData.amount.toString(),
                lateFeeAmount: (paymentData.lateFeeAmount || 0).toString(),
                paymentMonth: paymentData.dueDate.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                }),
                paymentYear: paymentData.dueDate.getFullYear().toString(),
                // Lease information
                leaseStartDate: ((_b = activeLease.leaseStart) === null || _b === void 0 ? void 0 : _b.toISOString()) || "N/A",
                leaseEndDate: ((_c = activeLease.leaseEnd) === null || _c === void 0 ? void 0 : _c.toISOString()) || "N/A",
                rentAmount: ((_d = activeLease.rentAmount) === null || _d === void 0 ? void 0 : _d.toString()) || "N/A",
                // Stripe account information
                stripeAccountId: stripeAccount.stripeAccountId,
                stripeAccountName: stripeAccount.name,
                isGlobalAccount: stripeAccount.isGlobalAccount ? "true" : "false",
                // Additional context
                paymentDescription: paymentData.description,
                createdAt: new Date().toISOString(),
            },
            after_completion: {
                type: "redirect",
                redirect: {
                    url: getValidRedirectUrl(`/payment-success?receipt=${paymentData.receiptNumber}`),
                },
            },
        });
        return paymentLink;
    }
    catch (error) {
        console.error("Error creating payment link:", error);
        throw error;
    }
});
exports.createPaymentLink = createPaymentLink;
// // Create a payment record and generate a unique payment link
// async createPaymentWithLink(paymentData: {
//   tenantId: string;
//   propertyId?: string;
//   spotId: string;
//   amount: number;
//   type: string;
//   dueDate: Date;
//   description: string;
//   lateFeeAmount?: number;
//   createdBy: string;
// }) {
//   try {
//     // Generate receipt number
//     const receiptNumber = `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
//     let activeLease;
//     let stripeAccount;
//     if (paymentData.propertyId) {
//       // Check if user has an active lease for this property
//       activeLease = await Leases.findOne({
//         tenantId: paymentData.tenantId,
//         propertyId: paymentData.propertyId,
//         leaseStatus: "ACTIVE",
//         isDeleted: false,
//       });
//       if (!activeLease) {
//         throw new Error(
//           "User does not have an active lease for this property",
//         );
//       }
//       // Get the Stripe account for this property
//       stripeAccount = await StripeAccounts.findOne({
//         propertyIds: paymentData.propertyId,
//         isActive: true,
//         isVerified: true,
//       });
//     } else {
//       // If propertyId is not provided, find the active lease and get property from it
//       activeLease = await Leases.findOne({
//         tenantId: paymentData.tenantId,
//         leaseStatus: "ACTIVE",
//         isDeleted: false,
//       }).populate("propertyId");
//       if (!activeLease) {
//         throw new Error("No active lease found for this tenant");
//       }
//       // Get the Stripe account for this property
//       stripeAccount = await StripeAccounts.findOne({
//         propertyIds: (activeLease.propertyId as any)._id,
//         isActive: true,
//         isVerified: true,
//       });
//     }
//     if (!stripeAccount) {
//       throw new Error("No active Stripe account found for this property");
//     }
//     console.log("Found Stripe account in createPaymentWithLink:", {
//       id: stripeAccount._id,
//       name: stripeAccount.name,
//       hasSecretKey: !!stripeAccount.stripeSecretKey,
//       secretKeyLength: stripeAccount.stripeSecretKey?.length,
//       isActive: stripeAccount.isActive,
//       isVerified: stripeAccount.isVerified,
//     });
//     if (!stripeAccount.stripeSecretKey) {
//       throw new Error("Stripe secret key is missing for this account");
//     }
//     // Create payment record
//     const payment = await Payments.create({
//       ...paymentData,
//       receiptNumber,
//       status: "PENDING",
//       totalAmount: paymentData.amount + (paymentData.lateFeeAmount || 0),
//       stripeAccountId: stripeAccount._id,
//     });
//     // Create unique payment link
//     const paymentLink = await this.createPaymentLink({
//       ...paymentData,
//       receiptNumber,
//     });
//     // Update payment record with payment link info
//     await Payments.findByIdAndUpdate(payment._id, {
//       stripePaymentLinkId: paymentLink.id,
//     });
//     return {
//       payment,
//       paymentLink,
//     };
//   } catch (error) {
//     console.error("Error creating payment with link:", error);
//     throw error;
//   }
// }
// Create a payment record and generate a unique payment link
const createPaymentWithLink = (paymentData) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Generate receipt number
        const receiptNumber = `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        let activeLease;
        let stripeAccount;
        if (paymentData.propertyId) {
            // Check if user has an active lease for this property
            activeLease = yield leases_schema_1.Leases.findOne({
                tenantId: paymentData.tenantId,
                propertyId: paymentData.propertyId,
                leaseStatus: "ACTIVE",
                isDeleted: false,
            });
            if (!activeLease) {
                throw new Error("User does not have an active lease for this property");
            }
            // Get the Stripe account for this property
            stripeAccount = yield stripe_accounts_schema_1.StripeAccounts.findOne({
                propertyIds: paymentData.propertyId,
                isActive: true,
                isVerified: true,
            }).select("+stripeSecretKey");
        }
        else {
            // If propertyId is not provided, find the active lease and get property from it
            activeLease = yield leases_schema_1.Leases.findOne({
                tenantId: paymentData.tenantId,
                leaseStatus: "ACTIVE",
                isDeleted: false,
            }).populate("propertyId");
            if (!activeLease) {
                throw new Error("No active lease found for this tenant");
            }
            // Get the Stripe account for this property
            stripeAccount = yield stripe_accounts_schema_1.StripeAccounts.findOne({
                propertyIds: activeLease.propertyId._id,
                isActive: true,
                isVerified: true,
            }).select("+stripeSecretKey");
        }
        if (!stripeAccount) {
            throw new Error("No active Stripe account found for this property");
        }
        if (!stripeAccount.stripeSecretKey) {
            throw new Error("Stripe secret key is missing for this account");
        }
        // Create payment record
        const paymentDataToSave = Object.assign(Object.assign({}, paymentData), { receiptNumber, status: "PENDING", totalAmount: paymentData.amount + (paymentData.lateFeeAmount || 0), stripeAccountId: stripeAccount._id });
        // Create unique payment link first
        const paymentLink = yield (0, exports.createPaymentLink)(Object.assign(Object.assign({}, paymentData), { receiptNumber }));
        console.log("✅ Payment link created successfully:", {
            id: paymentLink.id,
            url: paymentLink.url,
            receiptNumber,
        });
        return {
            payment: null, // No payment record created yet
            paymentLink,
            receiptNumber, // Pass receipt number for webhook to use
        };
    }
    catch (error) {
        console.error("Error creating payment with link:", error);
        throw error;
    }
});
exports.createPaymentWithLink = createPaymentWithLink;
// Create a payment record and generate a unique payment link with enhanced logic
const createPaymentWithLinkEnhanced = (paymentData) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("🚀 ~ paymentData:", paymentData);
    try {
        // Get active lease for the tenant
        const { Leases } = yield Promise.resolve().then(() => __importStar(require("../leases/leases.schema")));
        const activeLease = yield Leases.findOne({
            tenantId: paymentData.tenantId,
            leaseStatus: "ACTIVE",
            isDeleted: false,
        }).populate("propertyId spotId");
        if (!activeLease) {
            throw new Error("No active lease found for this tenant");
        }
        // Get payment history to determine if this is a first-time payment
        const { Payments } = yield Promise.resolve().then(() => __importStar(require("../payments/payments.schema")));
        const paymentHistory = yield Payments.find({
            tenantId: paymentData.tenantId,
            type: "RENT",
            status: { $in: ["PAID", "PENDING", "OVERDUE"] },
            isDeleted: false,
        }).sort({ dueDate: 1 });
        // Calculate appropriate due date based on lease start and current date
        const effectiveCurrentDate = paymentData.currentDate
            ? new Date(paymentData.currentDate)
            : new Date();
        let paymentDueDate;
        let paymentAmount;
        let isFirstTimePayment = false;
        let paymentDescription;
        // Defensive: ensure leaseStart is a Date
        const leaseStart = activeLease.leaseStart instanceof Date
            ? activeLease.leaseStart
            : new Date(activeLease.leaseStart);
        // Defensive: ensure rentAmount is a number
        const rentAmount = typeof activeLease.rentAmount === "number"
            ? activeLease.rentAmount
            : Number(activeLease.rentAmount);
        // Determine payment based on lease start and payment history
        if (paymentHistory.length === 0) {
            // First-time payment - use lease start date as due date
            isFirstTimePayment = true;
            paymentDueDate = new Date(leaseStart);
            paymentAmount = rentAmount;
            paymentDescription = "First Month Rent Payment";
            // Check if lease started mid-month and adjust amount if needed
            const leaseStartDay = leaseStart.getDate();
            console.log("🔍 Lease start analysis:", {
                leaseStart: leaseStart.toISOString(),
                leaseStartDay,
                rentAmount,
                isFirstTimePayment,
            });
            if (leaseStartDay > 1) {
                // Pro-rate the first month's rent
                const daysInMonth = new Date(leaseStart.getFullYear(), leaseStart.getMonth() + 1, 0).getDate();
                const remainingDays = daysInMonth - leaseStartDay + 1;
                paymentAmount = Math.round((rentAmount / daysInMonth) * remainingDays);
                paymentDescription = `Pro-rated First Month Rent (${remainingDays} days)`;
                console.log("📊 Pro-rated calculation:", {
                    daysInMonth,
                    remainingDays,
                    originalAmount: rentAmount,
                    proRatedAmount: paymentAmount,
                });
            }
            else {
                // If lease starts on the 1st of the month, charge full rent
                paymentAmount = rentAmount;
                paymentDescription = "First Month Rent Payment";
                console.log("💰 Full rent charged:", { amount: paymentAmount });
            }
        }
        else {
            // Not first-time payment - use current month's 1st day
            const currentMonth = new Date(effectiveCurrentDate.getFullYear(), effectiveCurrentDate.getMonth(), 1);
            // Check if we already have a payment for current month
            const existingCurrentMonthPayment = paymentHistory.find(payment => {
                // Defensive: ensure payment.dueDate is a Date
                const dueDate = payment.dueDate instanceof Date
                    ? payment.dueDate
                    : new Date(payment.dueDate);
                if (isNaN(dueDate.getTime())) {
                    // Skip invalid dates
                    return false;
                }
                const paymentMonth = new Date(dueDate.getFullYear(), dueDate.getMonth(), 1);
                return paymentMonth.getTime() === currentMonth.getTime();
            });
            if (existingCurrentMonthPayment) {
                throw new Error("Rent payment for current month already exists");
            }
            paymentDueDate = currentMonth;
            // Always charge full rent amount for regular monthly payments
            paymentAmount = rentAmount;
            paymentDescription = "Monthly Rent Payment";
            console.log("💰 Regular monthly payment - full rent charged:", {
                amount: paymentAmount,
                dueDate: paymentDueDate.toISOString(),
            });
        }
        // Check if payment already exists for the calculated month
        const startOfMonth = new Date(paymentDueDate.getFullYear(), paymentDueDate.getMonth(), 1);
        const startOfNextMonth = new Date(paymentDueDate.getFullYear(), paymentDueDate.getMonth() + 1, 1);
        const existingPayment = yield Payments.findOne({
            tenantId: paymentData.tenantId,
            type: "RENT",
            dueDate: {
                $gte: startOfMonth,
                $lt: startOfNextMonth,
            },
            isDeleted: false,
        });
        if (existingPayment) {
            throw new Error("Rent payment for this month already exists");
        }
        // Defensive: propertyId and spotId
        let propertyId = undefined;
        let spotId = undefined;
        if (activeLease.propertyId &&
            typeof activeLease.propertyId === "object" &&
            "_id" in activeLease.propertyId) {
            propertyId = activeLease.propertyId._id.toString();
        }
        else if (typeof activeLease.propertyId === "string") {
            propertyId = activeLease.propertyId;
        }
        if (activeLease.spotId &&
            typeof activeLease.spotId === "object" &&
            "_id" in activeLease.spotId) {
            spotId = activeLease.spotId._id.toString();
        }
        else if (typeof activeLease.spotId === "string") {
            spotId = activeLease.spotId;
        }
        // Validate that required fields are present
        if (!propertyId) {
            throw new Error("Property ID is required for payment creation");
        }
        if (!spotId) {
            throw new Error("Spot ID is required for payment creation");
        }
        const paymentDataForCreation = {
            tenantId: paymentData.tenantId,
            propertyId,
            spotId,
            amount: paymentAmount,
            type: "RENT",
            dueDate: paymentDueDate,
            description: paymentDescription,
            lateFeeAmount: 0,
            createdBy: paymentData.createdBy,
        };
        console.log("🎯 Creating payment with calculated values:", paymentDataForCreation);
        const result = yield (0, exports.createPaymentWithLink)(paymentDataForCreation);
        return Object.assign(Object.assign({}, result), { isFirstTimePayment, lease: {
                id: activeLease._id,
                rentAmount: rentAmount,
                leaseType: activeLease.leaseType,
                leaseStatus: activeLease.leaseStatus,
                leaseStart: leaseStart,
            }, paymentInfo: {
                isFirstTimePayment,
                calculatedAmount: paymentAmount,
                originalRentAmount: rentAmount,
                dueDate: paymentDueDate,
                description: paymentDescription,
            } });
    }
    catch (error) {
        console.error("Error creating payment with link:", error);
        throw error;
    }
});
exports.createPaymentWithLinkEnhanced = createPaymentWithLinkEnhanced;
// Validate payment link exists in Stripe
const validatePaymentLink = (paymentLinkId, secretKey) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const stripe = (0, exports.createStripeInstance)(secretKey);
        const paymentLink = yield stripe.paymentLinks.retrieve(paymentLinkId);
        return paymentLink.active;
    }
    catch (error) {
        return false;
    }
});
exports.validatePaymentLink = validatePaymentLink;
// Get payment link details
const getPaymentLinkDetails = (paymentLinkId, secretKey) => __awaiter(void 0, void 0, void 0, function* () {
    const stripe = (0, exports.createStripeInstance)(secretKey);
    return yield stripe.paymentLinks.retrieve(paymentLinkId);
});
exports.getPaymentLinkDetails = getPaymentLinkDetails;
// Get transaction history for a payment link
const getPaymentLinkTransactions = (paymentLinkId, secretKey) => __awaiter(void 0, void 0, void 0, function* () {
    const stripe = (0, exports.createStripeInstance)(secretKey);
    return yield stripe.paymentIntents.list({
        limit: 100,
    });
});
exports.getPaymentLinkTransactions = getPaymentLinkTransactions;
// Cancel payment intent (for error handling)
const cancelPaymentIntent = (paymentIntentId, secretKey) => __awaiter(void 0, void 0, void 0, function* () {
    const stripe = (0, exports.createStripeInstance)(secretKey);
    return yield stripe.paymentIntents.cancel(paymentIntentId);
});
exports.cancelPaymentIntent = cancelPaymentIntent;
// Sync existing payments from Stripe to database
const syncStripePayments = (paymentLinkId, tenantId, secretKey) => __awaiter(void 0, void 0, void 0, function* () {
    const payments = yield (0, exports.getPaymentLinkTransactions)(paymentLinkId, secretKey);
    for (const payment of payments.data) {
        // Check if payment already exists in database
        const existingPayment = yield payments_schema_1.Payments.findOne({
            stripeTransactionId: payment.id,
        });
        if (!existingPayment && payment.status === "succeeded") {
            // Create payment record
            yield (0, exports.createPaymentFromStripe)(payment, tenantId);
        }
    }
});
exports.syncStripePayments = syncStripePayments;
// Create payment record from Stripe data
const createPaymentFromStripe = (stripePayment, tenantId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const user = yield users_schema_1.Users.findById(tenantId);
    if (!user)
        throw new Error("User not found");
    // Find property by name from metadata
    const propertyName = (_a = stripePayment.metadata) === null || _a === void 0 ? void 0 : _a.propertyName;
    if (!propertyName)
        throw new Error("Property name not found in payment metadata");
    const property = yield properties_schema_1.Properties.findOne({ name: propertyName });
    if (!property) {
        // Cancel payment if property not found
        // Note: We need the secret key to cancel, but we don't have it here
        // This is a limitation - we'll need to handle this differently
        throw new Error(`Property not found: ${propertyName}`);
    }
    // Get the Stripe account for this property
    const stripeAccount = yield stripe_accounts_schema_1.StripeAccounts.findOne({
        propertyIds: property._id,
        isActive: true,
        isVerified: true,
    });
    // Create payment record
    return payments_schema_1.Payments.create({
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
        stripeAccountId: stripeAccount === null || stripeAccount === void 0 ? void 0 : stripeAccount._id,
        receiptNumber: `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        description: "Monthly Rent Payment",
        totalAmount: stripePayment.amount / 100,
        createdBy: "SYSTEM",
    });
});
exports.createPaymentFromStripe = createPaymentFromStripe;
// Construct webhook event for verification
const constructWebhookEvent = (payload, signature) => {
    const stripe = new stripe_1.default(config_1.default.stripe_secret_key, {
        apiVersion: "2025-06-30.basil",
    });
    return stripe.webhooks.constructEvent(payload, signature, config_1.default.stripe_webhook_secret);
};
exports.constructWebhookEvent = constructWebhookEvent;
// Get comprehensive tenant payment status with automatic payment creation
const getTenantPaymentStatusEnhanced = (paymentData) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Get active lease for the tenant
        const { Leases } = yield Promise.resolve().then(() => __importStar(require("../leases/leases.schema")));
        const activeLease = yield Leases.findOne({
            tenantId: paymentData.tenantId,
            leaseStatus: "ACTIVE",
            isDeleted: false,
        }).populate("propertyId spotId");
        if (!activeLease) {
            throw new Error("No active lease found for this tenant");
        }
        // Get payment history to determine if this is a first-time payment
        const { Payments } = yield Promise.resolve().then(() => __importStar(require("../payments/payments.schema")));
        const paymentHistory = yield Payments.find({
            tenantId: paymentData.tenantId,
            type: "RENT",
            status: { $in: ["PAID", "PENDING", "OVERDUE"] },
            isDeleted: false,
        }).sort({ dueDate: 1 });
        // Get current month's payment status
        const currentDate = new Date();
        const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        // Check if payment exists for current month
        const currentMonthPayment = yield Payments.findOne({
            tenantId: paymentData.tenantId,
            type: "RENT",
            dueDate: {
                $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
                $lt: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
            },
            isDeleted: false,
        });
        // Get all pending/overdue payments
        const pendingPayments = yield Payments.find({
            tenantId: paymentData.tenantId,
            type: "RENT",
            status: { $in: ["PENDING", "OVERDUE"] },
            isDeleted: false,
        }).sort({ dueDate: 1 });
        // Calculate overdue amounts
        const overduePayments = pendingPayments.filter(payment => payment.status === "OVERDUE");
        const totalOverdueAmount = overduePayments.reduce((sum, payment) => sum + payment.totalAmount, 0);
        // Calculate days overdue for current payment
        const daysOverdue = currentMonthPayment && currentMonthPayment.status === "OVERDUE"
            ? Math.floor((currentDate.getTime() - currentMonthPayment.dueDate.getTime()) /
                (1000 * 60 * 60 * 24))
            : 0;
        // Determine if we need to create a new payment
        let paymentAction = "NONE";
        let paymentLink = null;
        let newPayment = null;
        let isFirstTimePayment = false;
        if (!currentMonthPayment) {
            // Check if this is a first-time payment
            if (paymentHistory.length === 0) {
                // First-time payment - use lease start date as due date
                isFirstTimePayment = true;
                const paymentDueDate = new Date(activeLease.leaseStart);
                let paymentAmount = activeLease.rentAmount;
                let paymentDescription = "First Month Rent Payment";
                // Check if lease started mid-month and adjust amount if needed
                const leaseStartDay = activeLease.leaseStart.getDate();
                if (leaseStartDay > 1) {
                    // Pro-rate the first month's rent
                    const daysInMonth = new Date(activeLease.leaseStart.getFullYear(), activeLease.leaseStart.getMonth() + 1, 0).getDate();
                    const remainingDays = daysInMonth - leaseStartDay + 1;
                    paymentAmount = Math.round((activeLease.rentAmount / daysInMonth) * remainingDays);
                    paymentDescription = `Pro-rated First Month Rent (${remainingDays} days)`;
                }
                paymentAction = "CREATE_FIRST_TIME";
                try {
                    newPayment = yield (0, exports.createPaymentWithLink)({
                        tenantId: paymentData.tenantId,
                        propertyId: activeLease.propertyId._id.toString(),
                        spotId: activeLease.spotId._id.toString(),
                        amount: paymentAmount,
                        type: "RENT",
                        dueDate: paymentDueDate,
                        description: paymentDescription,
                        lateFeeAmount: 0,
                        createdBy: paymentData.createdBy,
                    });
                    paymentLink = {
                        id: newPayment.paymentLink.id,
                        url: newPayment.paymentLink.url,
                    };
                }
                catch (error) {
                    console.error("Error creating first-time payment:", error);
                    paymentAction = "ERROR";
                }
            }
            else {
                // Not first-time payment - create for current month
                paymentAction = "CREATE_NEW";
                try {
                    newPayment = yield (0, exports.createPaymentWithLink)({
                        tenantId: paymentData.tenantId,
                        propertyId: activeLease.propertyId._id.toString(),
                        spotId: activeLease.spotId._id.toString(),
                        amount: activeLease.rentAmount,
                        type: "RENT",
                        dueDate: currentMonth,
                        description: "Monthly Rent Payment",
                        lateFeeAmount: 0,
                        createdBy: paymentData.createdBy,
                    });
                    paymentLink = {
                        id: newPayment.paymentLink.id,
                        url: newPayment.paymentLink.url,
                    };
                }
                catch (error) {
                    console.error("Error creating payment:", error);
                    paymentAction = "ERROR";
                }
            }
        }
        else if (currentMonthPayment.status === "PENDING") {
            // Payment exists but is pending - check if payment link exists
            paymentAction = "PENDING";
            if (currentMonthPayment.stripePaymentLinkId) {
                // Get existing payment link details
                try {
                    const { StripeAccounts } = yield Promise.resolve().then(() => __importStar(require("./stripe-accounts.schema")));
                    const stripeAccount = yield StripeAccounts.findOne({
                        _id: currentMonthPayment.stripeAccountId,
                        isActive: true,
                    }).select("+stripeSecretKey");
                    if (stripeAccount) {
                        const paymentLinkDetails = yield (0, exports.getPaymentLinkDetails)(currentMonthPayment.stripePaymentLinkId, stripeAccount.stripeSecretKey);
                        paymentLink = {
                            id: paymentLinkDetails.id,
                            url: paymentLinkDetails.url,
                        };
                    }
                }
                catch (error) {
                    console.error("Error getting payment link details:", error);
                }
            }
        }
        else if (currentMonthPayment.status === "OVERDUE") {
            paymentAction = "OVERDUE";
        }
        else if (currentMonthPayment.status === "PAID") {
            paymentAction = "PAID";
        }
        // Get recent payment history
        const recentPayments = yield Payments.find({
            tenantId: paymentData.tenantId,
            type: "RENT",
            status: "PAID",
            isDeleted: false,
        })
            .sort({ dueDate: -1 })
            .limit(6);
        return {
            tenantId: paymentData.tenantId,
            lease: {
                id: activeLease._id,
                rentAmount: activeLease.rentAmount,
                leaseType: activeLease.leaseType,
                leaseStatus: activeLease.leaseStatus,
                leaseStart: activeLease.leaseStart,
            },
            currentMonth: {
                dueDate: (currentMonthPayment === null || currentMonthPayment === void 0 ? void 0 : currentMonthPayment.dueDate) || currentMonth,
                rentAmount: activeLease.rentAmount,
                status: (currentMonthPayment === null || currentMonthPayment === void 0 ? void 0 : currentMonthPayment.status) || "PENDING",
                paidDate: currentMonthPayment === null || currentMonthPayment === void 0 ? void 0 : currentMonthPayment.paidDate,
                daysOverdue: daysOverdue,
                lateFeeAmount: (currentMonthPayment === null || currentMonthPayment === void 0 ? void 0 : currentMonthPayment.lateFeeAmount) || 0,
                totalAmount: (currentMonthPayment === null || currentMonthPayment === void 0 ? void 0 : currentMonthPayment.totalAmount) || activeLease.rentAmount,
                receiptNumber: currentMonthPayment === null || currentMonthPayment === void 0 ? void 0 : currentMonthPayment.receiptNumber,
            },
            paymentAction,
            paymentLink,
            isFirstTimePayment,
            summary: {
                totalOverdueAmount,
                overdueCount: overduePayments.length,
                pendingCount: pendingPayments.length,
                totalPaidAmount: recentPayments.reduce((sum, payment) => sum + payment.totalAmount, 0),
                averagePaymentAmount: recentPayments.length > 0
                    ? recentPayments.reduce((sum, payment) => sum + payment.totalAmount, 0) / recentPayments.length
                    : 0,
            },
            recentPayments: recentPayments.map(payment => ({
                id: payment._id,
                dueDate: payment.dueDate,
                paidDate: payment.paidDate,
                amount: payment.totalAmount,
                paymentMethod: payment.paymentMethod,
                receiptNumber: payment.receiptNumber,
                status: payment.status,
            })),
            pendingPayments: pendingPayments.map(payment => ({
                id: payment._id,
                dueDate: payment.dueDate,
                amount: payment.totalAmount,
                status: payment.status,
                daysOverdue: payment.status === "OVERDUE"
                    ? Math.floor((currentDate.getTime() - payment.dueDate.getTime()) /
                        (1000 * 60 * 60 * 24))
                    : 0,
            })),
        };
    }
    catch (error) {
        console.error("Error getting tenant payment status:", error);
        throw error;
    }
});
exports.getTenantPaymentStatusEnhanced = getTenantPaymentStatusEnhanced;
// Check if account exists by name or ID
const checkAccountExists = (name, stripeAccountId) => __awaiter(void 0, void 0, void 0, function* () {
    const existingByName = yield stripe_accounts_schema_1.StripeAccounts.findOne({
        name,
        isDeleted: false,
    });
    if (existingByName) {
        return { exists: true, type: "name", account: existingByName };
    }
    if (stripeAccountId) {
        const existingById = yield stripe_accounts_schema_1.StripeAccounts.findOne({
            stripeAccountId,
            isDeleted: false,
        });
        if (existingById) {
            return { exists: true, type: "id", account: existingById };
        }
    }
    return { exists: false };
});
exports.checkAccountExists = checkAccountExists;
// Auto-assign property to default account
const autoAssignPropertyToDefaultAccount = (propertyId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Find the default account
        const defaultAccount = yield stripe_accounts_schema_1.StripeAccounts.findOne({
            isDefaultAccount: true,
            isDeleted: false,
            isActive: true,
        });
        if (!defaultAccount) {
            console.log("No default Stripe account found for auto-assignment");
            return null;
        }
        // Check if property is already assigned to any account
        const existingAssignment = yield stripe_accounts_schema_1.StripeAccounts.findOne({
            propertyIds: propertyId,
            isDeleted: false,
        });
        if (existingAssignment) {
            console.log(`Property ${propertyId} is already assigned to account ${existingAssignment._id}`);
            return existingAssignment;
        }
        // Add property to default account
        const updatedAccount = yield stripe_accounts_schema_1.StripeAccounts.findByIdAndUpdate(defaultAccount._id, { $push: { propertyIds: propertyId } }, { new: true }).populate("propertyIds", "name address");
        console.log(`Property ${propertyId} auto-assigned to default account ${defaultAccount._id}`);
        return updatedAccount;
    }
    catch (error) {
        console.error("Error auto-assigning property to default account:", error);
        return null;
    }
});
exports.autoAssignPropertyToDefaultAccount = autoAssignPropertyToDefaultAccount;
// Stripe Account Management Functions
const createStripeAccount = (accountData) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        // Check if client_url is configured before proceeding
        if (!config_1.default.client_url) {
            throw new Error("Client URL is not configured. Please set CLIENT_URL in environment variables before creating Stripe accounts.");
        }
        console.log("🔧 Checking client URL configuration:", config_1.default.client_url);
        // Check if account with same name already exists
        const existingAccountByName = yield stripe_accounts_schema_1.StripeAccounts.findOne({
            name: accountData.name,
            isDeleted: false,
        });
        if (existingAccountByName) {
            throw new Error("Stripe account with this name already exists");
        }
        // Check if account with same secret key already exists
        const existingAccountBySecretKey = yield stripe_accounts_schema_1.StripeAccounts.findOne({
            stripeSecretKey: accountData.stripeSecretKey,
            isDeleted: false,
        });
        if (existingAccountBySecretKey) {
            throw new Error("Stripe secret key is already in use by another account");
        }
        // Check if account with same ID already exists (for CONNECT accounts)
        if (accountData.stripeAccountId) {
            const existingAccount = yield stripe_accounts_schema_1.StripeAccounts.findOne({
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
                const verification = yield (0, exports.verifySecretKeyAndGetAccount)(accountData.stripeSecretKey);
                // Update account data with the retrieved account ID
                accountData.stripeAccountId = verification.accountId;
            }
            else {
                // For CONNECT accounts, verify with account ID
                yield (0, exports.verifyStripeAccountId)(accountData.stripeAccountId, accountData.stripeSecretKey, accountData.accountType || "STANDARD");
            }
        }
        catch (error) {
            throw new Error(`Account verification failed: ${error.message}`);
        }
        // If setting as default, ensure no other default exists
        if (accountData.isDefaultAccount) {
            const existingDefault = yield stripe_accounts_schema_1.StripeAccounts.findOne({
                isDefaultAccount: true,
                isDeleted: false,
            });
            if (existingDefault) {
                throw new Error("Another account is already set as default");
            }
        }
        // Prepare account data for database
        const accountWithVerification = Object.assign(Object.assign({}, accountData), { isVerified: true, isActive: true });
        // For STANDARD accounts, don't include stripeAccountId at all
        if (accountData.accountType === "STANDARD") {
            delete accountWithVerification.stripeAccountId;
        }
        const createdAccount = yield stripe_accounts_schema_1.StripeAccounts.create(accountWithVerification);
        // Automatically create webhook for this account after successful creation
        let webhookResult = null;
        try {
            const webhookUrl = `${config_1.default.client_url}/api/stripe/webhook`;
            console.log(`🔗 Creating webhook for new account: ${createdAccount.name}`);
            const webhook = yield (0, exports.createWebhookEndpoint)(createdAccount._id.toString(), webhookUrl);
            // Update the account with webhook information
            yield stripe_accounts_schema_1.StripeAccounts.findByIdAndUpdate(createdAccount._id, {
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
        }
        catch (webhookError) {
            console.error(`❌ Failed to create webhook for new account:`, webhookError.message);
            webhookResult = {
                success: false,
                error: webhookError.message,
                message: "Account created but webhook creation failed",
            };
        }
        // Return the created account with verification status and webhook info
        return Object.assign(Object.assign({}, createdAccount.toObject()), { verificationStatus: "VERIFIED", webhook: webhookResult, message: "Stripe account created, verified, and webhook configured" });
    }
    catch (error) {
        // Handle MongoDB duplicate key errors
        if (error.code === 11000) {
            if ((_a = error.keyPattern) === null || _a === void 0 ? void 0 : _a.stripeAccountId) {
                throw new Error("Stripe account ID already exists");
            }
            if ((_b = error.keyPattern) === null || _b === void 0 ? void 0 : _b.name) {
                throw new Error("Stripe account with this name already exists");
            }
            if ((_c = error.keyPattern) === null || _c === void 0 ? void 0 : _c.stripeSecretKey) {
                throw new Error("Stripe secret key is already in use by another account");
            }
            throw new Error("Duplicate account entry");
        }
        // Re-throw other errors
        throw error;
    }
});
exports.createStripeAccount = createStripeAccount;
// Get all Stripe accounts with comprehensive property information
const getAllStripeAccounts = () => __awaiter(void 0, void 0, void 0, function* () {
    const { Properties } = yield Promise.resolve().then(() => __importStar(require("../properties/properties.schema")));
    // Get all non-deleted Stripe accounts with populated property details
    const stripeAccounts = yield stripe_accounts_schema_1.StripeAccounts.find({ isDeleted: false })
        .populate({
        path: "propertyIds",
        select: "_id name address",
        match: { isDeleted: false },
    })
        .lean();
    // Get all non-deleted properties
    const allProperties = yield Properties.find({ isDeleted: false }).lean();
    // Get all properties that are assigned to any Stripe account
    const assignedProperties = yield stripe_accounts_schema_1.StripeAccounts.aggregate([
        { $match: { isDeleted: false } },
        { $unwind: "$propertyIds" },
        { $group: { _id: "$propertyIds" } },
    ]);
    // Extract assigned property IDs
    const assignedPropertyIds = assignedProperties.map(item => item._id.toString());
    // Filter out assigned properties to get unassigned properties
    const unassignedProperties = allProperties.filter(property => !assignedPropertyIds.includes(property._id.toString()));
    // Find the default account and its properties
    const defaultAccount = stripeAccounts.find(account => account.isDefaultAccount);
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
});
exports.getAllStripeAccounts = getAllStripeAccounts;
const getStripeAccountById = (accountId) => __awaiter(void 0, void 0, void 0, function* () {
    const account = yield stripe_accounts_schema_1.StripeAccounts.findById(accountId).populate("propertyIds", "name address");
    if (!account) {
        throw new Error("Stripe account not found");
    }
    return account;
});
exports.getStripeAccountById = getStripeAccountById;
const getDefaultAccount = () => __awaiter(void 0, void 0, void 0, function* () {
    const defaultAccount = yield stripe_accounts_schema_1.StripeAccounts.findOne({
        isDefaultAccount: true,
        isDeleted: false,
    }).populate("propertyIds", "name address");
    if (!defaultAccount) {
        throw new Error("No default account found");
    }
    return defaultAccount;
});
exports.getDefaultAccount = getDefaultAccount;
const setDefaultAccount = (accountId) => __awaiter(void 0, void 0, void 0, function* () {
    const stripeAccount = yield stripe_accounts_schema_1.StripeAccounts.findById(accountId);
    if (!stripeAccount) {
        throw new Error("Stripe account not found");
    }
    // Remove default flag from all accounts
    yield stripe_accounts_schema_1.StripeAccounts.updateMany({ isDeleted: false }, { isDefaultAccount: false });
    // Set the specified account as default
    return yield stripe_accounts_schema_1.StripeAccounts.findByIdAndUpdate(accountId, { isDefaultAccount: true }, { new: true }).populate("propertyIds", "name address");
});
exports.setDefaultAccount = setDefaultAccount;
const linkPropertiesToAccount = (accountId, propertyIds) => __awaiter(void 0, void 0, void 0, function* () {
    const stripeAccount = yield stripe_accounts_schema_1.StripeAccounts.findById(accountId);
    if (!stripeAccount) {
        throw new Error("Stripe account not found");
    }
    // Validate that all properties exist
    const { Properties } = yield Promise.resolve().then(() => __importStar(require("../properties/properties.schema")));
    const properties = yield Properties.find({
        _id: { $in: propertyIds },
        isDeleted: false,
    });
    if (properties.length !== propertyIds.length) {
        throw new Error("One or more properties not found");
    }
    // Check for duplicate property assignments
    const existingAssignments = yield stripe_accounts_schema_1.StripeAccounts.find({
        propertyIds: { $in: propertyIds },
        isDeleted: false,
        _id: { $ne: accountId },
    });
    if (existingAssignments.length > 0) {
        const conflictingProperties = existingAssignments
            .map(acc => acc.propertyIds.filter(id => propertyIds.includes(id.toString())))
            .flat();
        throw new Error(`Some properties are already assigned to other accounts: ${conflictingProperties.join(", ")}`);
    }
    // Add properties to the account (avoid duplicates)
    const uniquePropertyIds = [
        ...new Set([...stripeAccount.propertyIds, ...propertyIds]),
    ];
    return yield stripe_accounts_schema_1.StripeAccounts.findByIdAndUpdate(accountId, { propertyIds: uniquePropertyIds }, { new: true }).populate("propertyIds", "name address");
});
exports.linkPropertiesToAccount = linkPropertiesToAccount;
const unlinkPropertiesFromAccount = (accountId, propertyIds) => __awaiter(void 0, void 0, void 0, function* () {
    const stripeAccount = yield stripe_accounts_schema_1.StripeAccounts.findById(accountId);
    if (!stripeAccount) {
        throw new Error("Stripe account not found");
    }
    // Remove properties from the account
    const updatedPropertyIds = stripeAccount.propertyIds.filter(id => !propertyIds.includes(id.toString()));
    return yield stripe_accounts_schema_1.StripeAccounts.findByIdAndUpdate(accountId, { propertyIds: updatedPropertyIds }, { new: true }).populate("propertyIds", "name address");
});
exports.unlinkPropertiesFromAccount = unlinkPropertiesFromAccount;
const getStripeAccountsByProperty = (propertyId) => __awaiter(void 0, void 0, void 0, function* () {
    return yield stripe_accounts_schema_1.StripeAccounts.find({
        propertyIds: propertyId,
        isDeleted: false,
    }).populate("propertyIds", "name address");
});
exports.getStripeAccountsByProperty = getStripeAccountsByProperty;
const updateStripeAccount = (accountId, updateData) => __awaiter(void 0, void 0, void 0, function* () {
    // If setting as default, ensure no other default exists
    if (updateData.isDefaultAccount) {
        const existingDefault = yield stripe_accounts_schema_1.StripeAccounts.findOne({
            isDefaultAccount: true,
            isDeleted: false,
            _id: { $ne: accountId },
        });
        if (existingDefault) {
            throw new Error("Another account is already set as default");
        }
    }
    const account = yield stripe_accounts_schema_1.StripeAccounts.findByIdAndUpdate(accountId, updateData, { new: true }).populate("propertyIds", "name address");
    if (!account) {
        throw new Error("Stripe account not found");
    }
    return account;
});
exports.updateStripeAccount = updateStripeAccount;
const deleteStripeAccount = (accountId) => __awaiter(void 0, void 0, void 0, function* () {
    const account = yield stripe_accounts_schema_1.StripeAccounts.findByIdAndUpdate(accountId, { isDeleted: true, deletedAt: new Date() }, { new: true });
    if (!account) {
        throw new Error("Stripe account not found");
    }
    return account;
});
exports.deleteStripeAccount = deleteStripeAccount;
const getAvailableStripeAccounts = (propertyId) => __awaiter(void 0, void 0, void 0, function* () {
    // Validate that property exists
    const { Properties } = yield Promise.resolve().then(() => __importStar(require("../properties/properties.schema")));
    const property = yield Properties.findById(propertyId);
    if (!property) {
        throw new Error("Property not found");
    }
    // Get property-specific accounts
    const propertyAccounts = yield stripe_accounts_schema_1.StripeAccounts.find({
        propertyIds: propertyId,
        isDeleted: false,
    }).populate("propertyIds", "name address");
    // Get global accounts
    const globalAccounts = yield stripe_accounts_schema_1.StripeAccounts.find({
        isGlobalAccount: true,
        isDeleted: false,
    }).populate("propertyIds", "name address");
    // Get default account
    const defaultAccount = yield stripe_accounts_schema_1.StripeAccounts.findOne({
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
});
exports.getAvailableStripeAccounts = getAvailableStripeAccounts;
// Get unassigned properties (properties not linked to any Stripe account)
const getUnassignedProperties = () => __awaiter(void 0, void 0, void 0, function* () {
    const { Properties } = yield Promise.resolve().then(() => __importStar(require("../properties/properties.schema")));
    // Get all non-deleted properties
    const allProperties = yield Properties.find({ isDeleted: false });
    // Get all properties that are assigned to any Stripe account
    const assignedProperties = yield stripe_accounts_schema_1.StripeAccounts.aggregate([
        { $match: { isDeleted: false } },
        { $unwind: "$propertyIds" },
        { $group: { _id: "$propertyIds" } },
    ]);
    // Extract assigned property IDs
    const assignedPropertyIds = assignedProperties.map(item => item._id.toString());
    // Filter out assigned properties
    const unassignedProperties = allProperties.filter(property => !assignedPropertyIds.includes(property._id.toString()));
    return unassignedProperties;
});
exports.getUnassignedProperties = getUnassignedProperties;
// Get account statistics for debugging
const getAccountStatistics = () => __awaiter(void 0, void 0, void 0, function* () {
    const totalAccounts = yield stripe_accounts_schema_1.StripeAccounts.countDocuments({
        isDeleted: false,
    });
    const activeAccounts = yield stripe_accounts_schema_1.StripeAccounts.countDocuments({
        isDeleted: false,
        isActive: true,
    });
    const verifiedAccounts = yield stripe_accounts_schema_1.StripeAccounts.countDocuments({
        isDeleted: false,
        isVerified: true,
    });
    const defaultAccounts = yield stripe_accounts_schema_1.StripeAccounts.countDocuments({
        isDeleted: false,
        isDefaultAccount: true,
    });
    const standardAccounts = yield stripe_accounts_schema_1.StripeAccounts.countDocuments({
        isDeleted: false,
        accountType: "STANDARD",
    });
    const connectAccounts = yield stripe_accounts_schema_1.StripeAccounts.countDocuments({
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
});
exports.getAccountStatistics = getAccountStatistics;
// Get properties that can be assigned to a specific Stripe account
const getAssignablePropertiesForAccount = (accountId) => __awaiter(void 0, void 0, void 0, function* () {
    // Validate that Stripe account exists
    const stripeAccount = yield stripe_accounts_schema_1.StripeAccounts.findById(accountId);
    if (!stripeAccount) {
        throw new Error("Stripe account not found");
    }
    const { Properties } = yield Promise.resolve().then(() => __importStar(require("../properties/properties.schema")));
    // Get all non-deleted properties
    const allProperties = yield Properties.find({ isDeleted: false });
    // Get all properties that are assigned to OTHER Stripe accounts
    const assignedToOtherAccounts = yield stripe_accounts_schema_1.StripeAccounts.aggregate([
        { $match: { isDeleted: false, _id: { $ne: stripeAccount._id } } },
        { $unwind: "$propertyIds" },
        { $group: { _id: "$propertyIds" } },
    ]);
    // Extract property IDs assigned to other accounts
    const assignedToOtherIds = assignedToOtherAccounts.map(item => item._id.toString());
    // Filter properties that are either unassigned or already assigned to this account
    const assignableProperties = allProperties.filter(property => {
        const propertyId = property._id.toString();
        // Include if not assigned to other accounts OR already assigned to this account
        return (!assignedToOtherIds.includes(propertyId) ||
            stripeAccount.propertyIds.some(id => id.toString() === propertyId));
    });
    return assignableProperties;
});
exports.getAssignablePropertiesForAccount = getAssignablePropertiesForAccount;
const verifyStripeAccount = (accountId) => __awaiter(void 0, void 0, void 0, function* () {
    const account = yield stripe_accounts_schema_1.StripeAccounts.findById(accountId);
    if (!account) {
        throw new Error("Stripe account not found");
    }
    // Verify the account with Stripe API
    try {
        yield (0, exports.verifyStripeAccountId)(account.stripeAccountId, account.stripeSecretKey, account.accountType || "STANDARD");
        // Update the account as verified
        const updatedAccount = yield stripe_accounts_schema_1.StripeAccounts.findByIdAndUpdate(accountId, { isVerified: true }, { new: true }).populate("propertyIds", "name address");
        if (!updatedAccount) {
            throw new Error("Failed to update account verification status");
        }
        return Object.assign(Object.assign({}, updatedAccount.toObject()), { verificationStatus: "VERIFIED", message: "Stripe account verified successfully" });
    }
    catch (error) {
        throw new Error(`Account verification failed: ${error.message}`);
    }
});
exports.verifyStripeAccount = verifyStripeAccount;
// Update Stripe account secret key (for debugging/fixing existing accounts)
const updateStripeAccountSecretKey = (accountId, secretKey) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Verify the secret key first
        const verification = yield (0, exports.verifySecretKeyAndGetAccount)(secretKey);
        // Update the account with the new secret key
        const updatedAccount = yield stripe_accounts_schema_1.StripeAccounts.findByIdAndUpdate(accountId, {
            stripeSecretKey: secretKey,
            stripeAccountId: verification.accountId,
            isVerified: true,
            isActive: true,
        }, { new: true }).select("+stripeSecretKey");
        if (!updatedAccount) {
            throw new Error("Stripe account not found");
        }
        return Object.assign(Object.assign({}, updatedAccount.toObject()), { message: "Stripe account secret key updated successfully" });
    }
    catch (error) {
        throw new Error(`Failed to update secret key: ${error.message}`);
    }
});
exports.updateStripeAccountSecretKey = updateStripeAccountSecretKey;
// Create webhook endpoint for a Stripe account
const createWebhookEndpoint = (accountId, webhookUrl) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Get the Stripe account with secret key
        const stripeAccount = yield stripe_accounts_schema_1.StripeAccounts.findById(accountId).select("+stripeSecretKey");
        if (!stripeAccount) {
            throw new Error("Stripe account not found");
        }
        if (!stripeAccount.stripeSecretKey) {
            throw new Error("Stripe secret key is missing for this account");
        }
        // Create Stripe instance with account-specific secret key
        const stripe = (0, exports.createStripeInstance)(stripeAccount.stripeSecretKey);
        // Create webhook endpoint
        const webhook = yield stripe.webhookEndpoints.create({
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
        yield stripe_accounts_schema_1.StripeAccounts.findByIdAndUpdate(accountId, {
            webhookId: webhook.id,
            webhookUrl: webhook.url,
            webhookStatus: "ACTIVE",
            webhookCreatedAt: new Date(),
        });
        return webhook;
    }
    catch (error) {
        console.error("Error creating webhook endpoint:", error);
        throw new Error(`Failed to create webhook: ${error.message}`);
    }
});
exports.createWebhookEndpoint = createWebhookEndpoint;
// Create webhooks based on account type
const createWebhooksByAccountType = (webhookUrl) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Get all active and verified Stripe accounts
        const stripeAccounts = yield stripe_accounts_schema_1.StripeAccounts.find({
            isActive: true,
            isVerified: true,
            isDeleted: false,
        }).select("+stripeSecretKey");
        const results = [];
        let accountsToProcess = [];
        // Determine which accounts to process based on account types
        const connectAccounts = stripeAccounts.filter(account => account.accountType === "CONNECT");
        const standardAccounts = stripeAccounts.filter(account => account.accountType === "STANDARD");
        console.log(`📊 Account analysis:`, {
            totalAccounts: stripeAccounts.length,
            connectAccounts: connectAccounts.length,
            standardAccounts: standardAccounts.length,
        });
        // If there are CONNECT accounts, only process CONNECT accounts
        if (connectAccounts.length > 0) {
            accountsToProcess = connectAccounts;
            console.log(`🔗 Processing CONNECT accounts only: ${connectAccounts.length} accounts`);
        }
        else {
            // If no CONNECT accounts, process all STANDARD accounts
            accountsToProcess = standardAccounts;
            console.log(`🏢 Processing all STANDARD accounts: ${standardAccounts.length} accounts`);
        }
        for (const account of accountsToProcess) {
            try {
                if (!account.stripeSecretKey) {
                    console.warn(`⚠️ Skipping account ${account.name} - no secret key`);
                    continue;
                }
                const webhook = yield (0, exports.createWebhookEndpoint)(account._id.toString(), webhookUrl);
                results.push({
                    accountId: account._id,
                    accountName: account.name,
                    accountType: account.accountType,
                    success: true,
                    webhookId: webhook.id,
                    webhookUrl: webhook.url,
                });
            }
            catch (error) {
                console.error(`❌ Failed to create webhook for account ${account.name}:`, error.message);
                results.push({
                    accountId: account._id,
                    accountName: account.name,
                    accountType: account.accountType,
                    success: false,
                    error: error.message,
                });
            }
        }
        return {
            totalAccounts: stripeAccounts.length,
            connectAccounts: connectAccounts.length,
            standardAccounts: standardAccounts.length,
            processedAccounts: accountsToProcess.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            accountTypeProcessed: connectAccounts.length > 0 ? "CONNECT" : "STANDARD",
            results,
        };
    }
    catch (error) {
        console.error("Error creating webhooks by account type:", error);
        throw error;
    }
});
exports.createWebhooksByAccountType = createWebhooksByAccountType;
// List webhook endpoints for a Stripe account
const listWebhookEndpoints = (accountId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const stripeAccount = yield stripe_accounts_schema_1.StripeAccounts.findById(accountId).select("+stripeSecretKey");
        if (!stripeAccount || !stripeAccount.stripeSecretKey) {
            throw new Error("Stripe account not found or missing secret key");
        }
        const stripe = (0, exports.createStripeInstance)(stripeAccount.stripeSecretKey);
        const webhooks = yield stripe.webhookEndpoints.list();
        return webhooks.data.map(webhook => ({
            id: webhook.id,
            url: webhook.url,
            status: webhook.status,
            enabled_events: webhook.enabled_events,
            metadata: webhook.metadata,
            created: webhook.created,
        }));
    }
    catch (error) {
        console.error("Error listing webhook endpoints:", error);
        throw error;
    }
});
exports.listWebhookEndpoints = listWebhookEndpoints;
// Delete webhook endpoint
const deleteWebhookEndpoint = (accountId, webhookId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const stripeAccount = yield stripe_accounts_schema_1.StripeAccounts.findById(accountId).select("+stripeSecretKey");
        if (!stripeAccount || !stripeAccount.stripeSecretKey) {
            throw new Error("Stripe account not found or missing secret key");
        }
        const stripe = (0, exports.createStripeInstance)(stripeAccount.stripeSecretKey);
        const deletedWebhook = yield stripe.webhookEndpoints.del(webhookId);
        console.log(`✅ Webhook deleted: ${webhookId}`);
        return deletedWebhook;
    }
    catch (error) {
        console.error("Error deleting webhook endpoint:", error);
        throw error;
    }
});
exports.deleteWebhookEndpoint = deleteWebhookEndpoint;
// Update webhook endpoint
const updateWebhookEndpoint = (accountId, webhookId, updateData) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const stripeAccount = yield stripe_accounts_schema_1.StripeAccounts.findById(accountId).select("+stripeSecretKey");
        if (!stripeAccount || !stripeAccount.stripeSecretKey) {
            throw new Error("Stripe account not found or missing secret key");
        }
        const stripe = (0, exports.createStripeInstance)(stripeAccount.stripeSecretKey);
        const updatedWebhook = yield stripe.webhookEndpoints.update(webhookId, updateData);
        console.log(`✅ Webhook updated: ${webhookId}`);
        return updatedWebhook;
    }
    catch (error) {
        console.error("Error updating webhook endpoint:", error);
        throw error;
    }
});
exports.updateWebhookEndpoint = updateWebhookEndpoint;
// Get webhook endpoint details
const getWebhookEndpoint = (accountId, webhookId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const stripeAccount = yield stripe_accounts_schema_1.StripeAccounts.findById(accountId).select("+stripeSecretKey");
        if (!stripeAccount || !stripeAccount.stripeSecretKey) {
            throw new Error("Stripe account not found or missing secret key");
        }
        const stripe = (0, exports.createStripeInstance)(stripeAccount.stripeSecretKey);
        const webhook = yield stripe.webhookEndpoints.retrieve(webhookId);
        return {
            id: webhook.id,
            url: webhook.url,
            status: webhook.status,
            enabled_events: webhook.enabled_events,
            metadata: webhook.metadata,
            created: webhook.created,
            api_version: webhook.api_version,
        };
    }
    catch (error) {
        console.error("Error getting webhook endpoint:", error);
        throw error;
    }
});
exports.getWebhookEndpoint = getWebhookEndpoint;

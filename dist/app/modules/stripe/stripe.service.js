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
exports.createWebhookEndpoint = exports.deleteStripeAccount = exports.unlinkPropertiesFromAccount = exports.linkPropertiesToAccount = exports.setDefaultAccount = exports.getDefaultAccount = exports.getAllStripeAccounts = exports.createStripeAccount = exports.autoAssignPropertyToDefaultAccount = exports.checkAccountExists = exports.createStripeInstance = void 0;
const stripe_1 = __importDefault(require("stripe"));
const config_1 = __importDefault(require("../../../config/config"));
const stripe_schema_1 = require("./stripe.schema");
const stripe_utils_1 = require("./stripe.utils");
// Create Stripe instance with account-specific secret key
const createStripeInstance = (secretKey) => {
    return new stripe_1.default(secretKey, {
        apiVersion: "2025-06-30.basil",
    });
};
exports.createStripeInstance = createStripeInstance;
// Note: Webhook verification is handled in dedicated handlers; no shared construct function needed
// Check if account exists by name
const checkAccountExists = (name) => __awaiter(void 0, void 0, void 0, function* () {
    const existingByName = yield stripe_schema_1.StripeAccounts.findOne({
        name,
    });
    if (existingByName) {
        return { exists: true, type: "name", account: existingByName };
    }
    return { exists: false };
});
exports.checkAccountExists = checkAccountExists;
// Auto-assign property to default account
const autoAssignPropertyToDefaultAccount = (propertyId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Find the default account
        const defaultAccount = yield stripe_schema_1.StripeAccounts.findOne({
            isDefaultAccount: true,
            isActive: true,
        });
        if (!defaultAccount) {
            console.log("No default Stripe account found for auto-assignment");
            return null;
        }
        // Check if property is already assigned to any account
        const existingAssignment = yield stripe_schema_1.StripeAccounts.findOne({
            propertyIds: propertyId,
        });
        if (existingAssignment) {
            console.log(`Property ${propertyId} is already assigned to account ${existingAssignment._id}`);
            return existingAssignment;
        }
        // Add property to default account
        const updatedAccount = yield stripe_schema_1.StripeAccounts.findByIdAndUpdate(defaultAccount._id, { $push: { propertyIds: propertyId } }, { new: true }).populate("propertyIds", "name address");
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
    var _a, _b;
    try {
        // Check if backend_url is configured before proceeding
        if (!config_1.default.backend_url) {
            throw new Error("Backend URL is not configured. Please set BACKEND_URL in environment variables before creating Stripe accounts.");
        }
        // Check if account with same name already exists
        const existingAccountByName = yield stripe_schema_1.StripeAccounts.findOne({
            name: accountData.name,
        });
        if (existingAccountByName) {
            throw new Error("Stripe account with this name already exists");
        }
        // Check if account with same secret key already exists
        const existingAccountBySecretKey = yield stripe_schema_1.StripeAccounts.findOne({
            stripeSecretKey: accountData.stripeSecretKey,
        });
        if (existingAccountBySecretKey) {
            throw new Error("Stripe secret key is already in use by another account");
        }
        // Verify the Stripe secret key with Stripe API
        try {
            // Verify the secret key
            yield (0, stripe_utils_1.verifyStripeAccountId)(accountData.stripeSecretKey);
        }
        catch (error) {
            throw new Error(`Account verification failed: ${error.message}`);
        }
        // If setting as default, ensure no other default exists
        if (accountData.isDefaultAccount) {
            const existingDefault = yield stripe_schema_1.StripeAccounts.findOne({
                isDefaultAccount: true,
            });
            if (existingDefault) {
                throw new Error("Another account is already set as default");
            }
        }
        // Prepare account data for database
        const accountWithVerification = Object.assign(Object.assign({}, accountData), { isVerified: true, isActive: true });
        const createdAccount = yield stripe_schema_1.StripeAccounts.create(accountWithVerification);
        // Automatically create webhook for this account after successful creation
        let webhookResult = null;
        try {
            const webhookUrl = `${config_1.default.backend_url}/stripe/webhook-vercel`;
            const webhook = yield (0, exports.createWebhookEndpoint)(createdAccount._id.toString(), webhookUrl);
            // Update the account with webhook information
            yield stripe_schema_1.StripeAccounts.findByIdAndUpdate(createdAccount._id, {
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
            if ((_a = error.keyPattern) === null || _a === void 0 ? void 0 : _a.name) {
                throw new Error("Stripe account with this name already exists");
            }
            if ((_b = error.keyPattern) === null || _b === void 0 ? void 0 : _b.stripeSecretKey) {
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
    // Get all Stripe accounts with populated property details
    const stripeAccounts = yield stripe_schema_1.StripeAccounts.find()
        .populate({
        path: "propertyIds",
        select: "_id name address",
        match: { isDeleted: false },
    })
        .lean();
    // Get all non-deleted properties
    const allProperties = yield Properties.find({ isDeleted: false }).lean();
    // Get all properties that are assigned to any Stripe account
    const assignedProperties = yield stripe_schema_1.StripeAccounts.aggregate([
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
            isActive: account.isActive,
            isVerified: account.isVerified,
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
const getDefaultAccount = () => __awaiter(void 0, void 0, void 0, function* () {
    const defaultAccount = yield stripe_schema_1.StripeAccounts.findOne({
        isDefaultAccount: true,
    }).populate("propertyIds", "name address");
    if (!defaultAccount) {
        throw new Error("No default account found");
    }
    return defaultAccount;
});
exports.getDefaultAccount = getDefaultAccount;
const setDefaultAccount = (accountId) => __awaiter(void 0, void 0, void 0, function* () {
    const stripeAccount = yield stripe_schema_1.StripeAccounts.findById(accountId);
    if (!stripeAccount) {
        throw new Error("Stripe account not found");
    }
    // Remove default flag from all accounts
    yield stripe_schema_1.StripeAccounts.updateMany({}, { isDefaultAccount: false });
    // Set the specified account as default
    return yield stripe_schema_1.StripeAccounts.findByIdAndUpdate(accountId, { isDefaultAccount: true }, { new: true }).populate("propertyIds", "name address");
});
exports.setDefaultAccount = setDefaultAccount;
const linkPropertiesToAccount = (accountId, propertyIds) => __awaiter(void 0, void 0, void 0, function* () {
    const stripeAccount = yield stripe_schema_1.StripeAccounts.findById(accountId);
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
    const existingAssignments = yield stripe_schema_1.StripeAccounts.find({
        propertyIds: { $in: propertyIds },
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
    return yield stripe_schema_1.StripeAccounts.findByIdAndUpdate(accountId, { propertyIds: uniquePropertyIds }, { new: true }).populate("propertyIds", "name address");
});
exports.linkPropertiesToAccount = linkPropertiesToAccount;
const unlinkPropertiesFromAccount = (accountId, propertyIds) => __awaiter(void 0, void 0, void 0, function* () {
    const stripeAccount = yield stripe_schema_1.StripeAccounts.findById(accountId);
    if (!stripeAccount) {
        throw new Error("Stripe account not found");
    }
    // Remove properties from the account
    const updatedPropertyIds = stripeAccount.propertyIds.filter(id => !propertyIds.includes(id.toString()));
    return yield stripe_schema_1.StripeAccounts.findByIdAndUpdate(accountId, { propertyIds: updatedPropertyIds }, { new: true }).populate("propertyIds", "name address");
});
exports.unlinkPropertiesFromAccount = unlinkPropertiesFromAccount;
const deleteStripeAccount = (accountId) => __awaiter(void 0, void 0, void 0, function* () {
    const account = yield stripe_schema_1.StripeAccounts.findByIdAndDelete(accountId);
    if (!account) {
        throw new Error("Stripe account not found");
    }
    return account;
});
exports.deleteStripeAccount = deleteStripeAccount;
// Create webhook endpoint for a Stripe account
const createWebhookEndpoint = (accountId, webhookUrl) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Get the Stripe account with secret key
        const stripeAccount = yield stripe_schema_1.StripeAccounts.findById(accountId).select("+stripeSecretKey");
        if (!stripeAccount) {
            throw new Error("Stripe account not found");
        }
        if (!stripeAccount.stripeSecretKey) {
            throw new Error("Stripe secret key is missing for this account");
        }
        // Create Stripe instance with account-specific secret key
        const stripe = (0, exports.createStripeInstance)(stripeAccount.stripeSecretKey);
        // Use the new webhook endpoint for Vercel deployment
        const newWebhookUrl = webhookUrl.replace("/webhook", "/webhook-vercel");
        // Make sure the webhookUrl includes the accountId as a query parameter
        const webhookUrlWithId = newWebhookUrl.includes("?")
            ? `${newWebhookUrl}&accountId=${accountId}`
            : `${newWebhookUrl}?accountId=${accountId}`;
        // Create webhook endpoint
        const webhook = yield stripe.webhookEndpoints.create({
            url: webhookUrlWithId,
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
        // IMPORTANT: Store the webhook secret when it's created
        // This is only available at creation time
        yield stripe_schema_1.StripeAccounts.findByIdAndUpdate(accountId, {
            webhookId: webhook.id,
            webhookUrl: webhookUrlWithId,
            webhookSecret: webhook.secret, // Store the webhook secret
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

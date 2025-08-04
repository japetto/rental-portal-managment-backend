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
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeAccounts = exports.stripeAccountsSchema = void 0;
const mongoose_1 = require("mongoose");
exports.stripeAccountsSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true, unique: true },
    description: { type: String, required: false },
    propertyIds: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "Properties",
            required: false, // Optional - can be linked later
        },
    ],
    // Stripe account details
    stripeAccountId: {
        type: String,
        required: false,
        unique: true,
        sparse: true,
    },
    // Stripe secret key for this account (encrypted)
    stripeSecretKey: {
        type: String,
        required: true,
        select: false,
        unique: true,
    }, // Hidden by default for security
    // Account type: STANDARD = user's own account, CONNECT = platform account
    accountType: {
        type: String,
        enum: ["STANDARD", "CONNECT"],
        default: "STANDARD",
        required: true,
    },
    // Account status
    isActive: { type: Boolean, required: true, default: true },
    isVerified: { type: Boolean, required: true, default: false },
    // Global account flag - if true, can be used for all properties
    isGlobalAccount: { type: Boolean, required: true, default: false },
    // Default account flag - newly added properties will use this account
    isDefaultAccount: { type: Boolean, required: true, default: false },
    // Webhook information
    webhookId: { type: String, required: false },
    webhookUrl: { type: String, required: false },
    webhookStatus: {
        type: String,
        enum: ["ACTIVE", "INACTIVE", "FAILED"],
        default: "INACTIVE",
    },
    webhookCreatedAt: { type: Date },
    // Metadata
    metadata: { type: mongoose_1.Schema.Types.Mixed },
    isDeleted: { type: Boolean, required: true, default: false },
    deletedAt: { type: Date },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
    },
});
// Pre-save middleware for soft delete
exports.stripeAccountsSchema.pre("save", function (next) {
    if (this.isDeleted && !this.deletedAt) {
        this.deletedAt = new Date();
    }
    next();
});
// Pre-save middleware for validation
exports.stripeAccountsSchema.pre("save", function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        // Validate that all properties exist
        if (this.propertyIds && this.propertyIds.length > 0) {
            const { Properties } = yield Promise.resolve().then(() => __importStar(require("../properties/properties.schema")));
            for (const propertyId of this.propertyIds) {
                const property = yield Properties.findById(propertyId);
                if (!property || property.isDeleted) {
                    return next(new Error(`Invalid property ID ${propertyId} or property is deleted`));
                }
            }
        }
        // Ensure only one default account exists
        if (this.isDefaultAccount && !this.isNew) {
            const { StripeAccounts } = yield Promise.resolve().then(() => __importStar(require("./stripe-accounts.schema")));
            const existingDefault = yield StripeAccounts.findOne({
                isDefaultAccount: true,
                isDeleted: false,
                _id: { $ne: this._id },
            });
            if (existingDefault) {
                return next(new Error("Another account is already set as default"));
            }
        }
        next();
    });
});
exports.StripeAccounts = (0, mongoose_1.model)("StripeAccounts", exports.stripeAccountsSchema);

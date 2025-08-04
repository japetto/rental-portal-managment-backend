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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PropertiesController = void 0;
const http_status_1 = __importDefault(require("http-status"));
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const properties_schema_1 = require("./properties.schema");
class PropertiesController {
}
exports.PropertiesController = PropertiesController;
_a = PropertiesController;
// Get all properties with Stripe account details
PropertiesController.getAllPropertiesWithStripeDetails = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const properties = yield properties_schema_1.Properties.find({ isDeleted: false })
        .populate("totalSpots", "status")
        .populate("availableSpots", "status")
        .sort({ createdAt: -1 });
    // Get all Stripe accounts with their property assignments
    const { StripeAccounts } = yield Promise.resolve().then(() => __importStar(require("../stripe/stripe-accounts.schema")));
    const stripeAccounts = yield StripeAccounts.find({ isDeleted: false })
        .populate("propertyIds", "name address")
        .select("name description stripeAccountId isActive isVerified businessName businessEmail isGlobalAccount isDefaultAccount propertyIds");
    // Create a map of property ID to Stripe account
    const propertyToStripeMap = new Map();
    stripeAccounts.forEach(account => {
        account.propertyIds.forEach((propertyId) => {
            propertyToStripeMap.set(propertyId._id.toString(), {
                _id: account._id,
                name: account.name,
                description: account.description,
                stripeAccountId: account.stripeAccountId,
                isActive: account.isActive,
                isVerified: account.isVerified,
                isGlobalAccount: account.isGlobalAccount,
                isDefaultAccount: account.isDefaultAccount,
            });
        });
    });
    // Transform the data to include Stripe details
    const propertiesWithStripe = properties.map(property => {
        const propertyObj = property.toObject();
        const stripeAccount = propertyToStripeMap.get(propertyObj._id.toString());
        return {
            _id: propertyObj._id,
            name: propertyObj.name,
            description: propertyObj.description,
            address: propertyObj.address,
            amenities: propertyObj.amenities,
            images: propertyObj.images,
            rules: propertyObj.rules,
            isActive: propertyObj.isActive,
            createdAt: propertyObj.createdAt,
            updatedAt: propertyObj.updatedAt,
            totalSpots: propertyObj.totalSpots || 0,
            availableSpots: propertyObj.availableSpots || 0,
            stripeAccount: stripeAccount || null,
            hasStripeAccount: !!stripeAccount,
        };
    });
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Properties with Stripe details retrieved successfully",
        data: propertiesWithStripe,
    });
}));
// Get properties with available Stripe accounts (including global accounts)
PropertiesController.getPropertiesWithAvailableStripeAccounts = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const properties = yield properties_schema_1.Properties.find({ isDeleted: false })
        .populate("totalSpots", "status")
        .populate("availableSpots", "status")
        .sort({ createdAt: -1 });
    // Get all Stripe accounts with their property assignments
    const { StripeAccounts } = yield Promise.resolve().then(() => __importStar(require("../stripe/stripe-accounts.schema")));
    const stripeAccounts = yield StripeAccounts.find({ isDeleted: false })
        .populate("propertyIds", "name address")
        .select("name description stripeAccountId isActive isVerified isGlobalAccount isDefaultAccount propertyIds");
    // Get all global Stripe accounts
    const globalAccounts = yield StripeAccounts.find({
        isGlobalAccount: true,
        isActive: true,
        isVerified: true,
        isDeleted: false,
    }).select("name description stripeAccountId");
    // Create a map of property ID to Stripe account
    const propertyToStripeMap = new Map();
    stripeAccounts.forEach(account => {
        account.propertyIds.forEach((propertyId) => {
            propertyToStripeMap.set(propertyId._id.toString(), {
                _id: account._id,
                name: account.name,
                description: account.description,
                stripeAccountId: account.stripeAccountId,
                isActive: account.isActive,
                isVerified: account.isVerified,
                isGlobalAccount: account.isGlobalAccount,
                isDefaultAccount: account.isDefaultAccount,
                accountType: "PROPERTY_SPECIFIC",
            });
        });
    });
    // Transform the data to include available Stripe accounts
    const propertiesWithAvailableStripe = properties.map(property => {
        const propertyObj = property.toObject();
        // Property-specific account
        const propertyStripeAccount = propertyToStripeMap.get(propertyObj._id.toString()) || null;
        return {
            _id: propertyObj._id,
            name: propertyObj.name,
            description: propertyObj.description,
            address: propertyObj.address,
            amenities: propertyObj.amenities,
            images: propertyObj.images,
            rules: propertyObj.rules,
            isActive: propertyObj.isActive,
            createdAt: propertyObj.createdAt,
            updatedAt: propertyObj.updatedAt,
            totalSpots: propertyObj.totalSpots || 0,
            availableSpots: propertyObj.availableSpots || 0,
            stripeAccount: propertyStripeAccount,
            availableStripeAccounts: {
                propertySpecific: propertyStripeAccount,
                globalAccounts: globalAccounts.map(account => ({
                    _id: account._id,
                    name: account.name,
                    description: account.description,
                    stripeAccountId: account.stripeAccountId,
                    accountType: "GLOBAL",
                })),
                hasPropertySpecific: !!propertyStripeAccount,
                hasGlobalAccounts: globalAccounts.length > 0,
                totalAvailableAccounts: (propertyStripeAccount ? 1 : 0) + globalAccounts.length,
            },
        };
    });
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Properties with available Stripe accounts retrieved successfully",
        data: propertiesWithAvailableStripe,
    });
}));
// Get properties without Stripe accounts
PropertiesController.getPropertiesWithoutStripeAccounts = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const properties = yield properties_schema_1.Properties.find({ isDeleted: false })
        .populate("totalSpots", "status")
        .populate("availableSpots", "status")
        .sort({ createdAt: -1 });
    // Get all Stripe accounts with their property assignments
    const { StripeAccounts } = yield Promise.resolve().then(() => __importStar(require("../stripe/stripe-accounts.schema")));
    const stripeAccounts = yield StripeAccounts.find({ isDeleted: false })
        .populate("propertyIds", "name address")
        .select("propertyIds");
    // Create a set of property IDs that have Stripe accounts
    const propertiesWithStripe = new Set();
    stripeAccounts.forEach(account => {
        account.propertyIds.forEach((propertyId) => {
            propertiesWithStripe.add(propertyId._id.toString());
        });
    });
    // Filter properties that don't have Stripe accounts
    const propertiesWithoutStripe = properties
        .filter(property => !propertiesWithStripe.has(property._id.toString()))
        .map(property => {
        const propertyObj = property.toObject();
        return {
            _id: propertyObj._id,
            name: propertyObj.name,
            description: propertyObj.description,
            address: propertyObj.address,
            amenities: propertyObj.amenities,
            images: propertyObj.images,
            rules: propertyObj.rules,
            isActive: propertyObj.isActive,
            createdAt: propertyObj.createdAt,
            updatedAt: propertyObj.updatedAt,
            totalSpots: propertyObj.totalSpots || 0,
            availableSpots: propertyObj.availableSpots || 0,
            stripeAccount: null,
            hasStripeAccount: false,
        };
    });
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Properties without Stripe accounts retrieved successfully",
        data: propertiesWithoutStripe,
    });
}));

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
exports.getPropertiesWithoutStripeAccountsService = exports.getPropertiesWithAvailableStripeAccountsService = exports.getAllPropertiesWithStripeDetailsService = exports.addLotDataToProperties = exports.addLotDataToProperty = exports.calculatePropertyLotData = void 0;
const spots_schema_1 = require("../spots/spots.schema");
const properties_schema_1 = require("./properties.schema");
// Helper function to calculate lot data for a property
const calculatePropertyLotData = (propertyId) => __awaiter(void 0, void 0, void 0, function* () {
    const totalSpots = yield spots_schema_1.Spots.countDocuments({ propertyId });
    const availableSpots = yield spots_schema_1.Spots.countDocuments({
        propertyId,
        status: "AVAILABLE",
    });
    const maintenanceSpots = yield spots_schema_1.Spots.countDocuments({
        propertyId,
        status: "MAINTENANCE",
    });
    return {
        totalSpots,
        availableSpots,
        maintenanceSpots,
    };
});
exports.calculatePropertyLotData = calculatePropertyLotData;
// Helper function to add lot data to property object
const addLotDataToProperty = (property) => __awaiter(void 0, void 0, void 0, function* () {
    // Keeping the original document shape for compatibility across modules
    // Lot data is computed ad-hoc where needed using calculatePropertyLotData
    return property;
});
exports.addLotDataToProperty = addLotDataToProperty;
// Helper function to add lot data to multiple properties
const addLotDataToProperties = (properties) => __awaiter(void 0, void 0, void 0, function* () {
    // Preserve original docs; other services rely on Document methods
    return properties;
});
exports.addLotDataToProperties = addLotDataToProperties;
// Fetch all properties and join with their Stripe details
const getAllPropertiesWithStripeDetailsService = () => __awaiter(void 0, void 0, void 0, function* () {
    const properties = yield properties_schema_1.Properties.find({ isDeleted: false })
        .populate("totalSpots", "status")
        .populate("availableSpots", "status")
        .sort({ createdAt: -1 });
    const { StripeAccounts } = yield Promise.resolve().then(() => __importStar(require("../stripe/stripe.schema")));
    const stripeAccounts = yield StripeAccounts.find({ isDeleted: false })
        .populate("propertyIds", "name address")
        .select("name description stripeAccountId isActive isVerified isGlobalAccount isDefaultAccount propertyIds")
        .lean();
    const propertyToStripeMap = new Map();
    stripeAccounts.forEach(account => {
        const summary = {
            _id: account._id.toString(),
            name: account.name,
            description: account.description,
            isActive: account.isActive,
            isVerified: account.isVerified,
            isDefaultAccount: account.isDefaultAccount,
        };
        (account.propertyIds || []).forEach(propertyId => {
            propertyToStripeMap.set(propertyId._id.toString(), summary);
        });
    });
    const results = [];
    for (const prop of properties) {
        const id = prop._id.toString();
        const lotData = yield (0, exports.calculatePropertyLotData)(id);
        const base = prop.toObject();
        const stripeAccount = propertyToStripeMap.get(id) || null;
        results.push(Object.assign(Object.assign({ _id: id, name: base.name, description: base.description, address: base.address, identifierType: base.identifierType, amenities: base.amenities, images: base.images, rules: base.rules, isActive: base.isActive, createdAt: base.createdAt, updatedAt: base.updatedAt }, lotData), { stripeAccount, hasStripeAccount: Boolean(stripeAccount) }));
    }
    return results;
});
exports.getAllPropertiesWithStripeDetailsService = getAllPropertiesWithStripeDetailsService;
// Fetch properties with available Stripe accounts
const getPropertiesWithAvailableStripeAccountsService = () => __awaiter(void 0, void 0, void 0, function* () {
    const properties = yield properties_schema_1.Properties.find({ isDeleted: false })
        .populate("totalSpots", "status")
        .populate("availableSpots", "status")
        .sort({ createdAt: -1 });
    const { StripeAccounts } = yield Promise.resolve().then(() => __importStar(require("../stripe/stripe.schema")));
    const stripeAccounts = yield StripeAccounts.find({ isDeleted: false })
        .populate("propertyIds", "name address")
        .select("name description stripeAccountId isActive isVerified isGlobalAccount isDefaultAccount propertyIds")
        .lean();
    const globalAccountsRaw = yield StripeAccounts.find({
        isGlobalAccount: true,
        isActive: true,
        isVerified: true,
        isDeleted: false,
    })
        .select("name description isDefaultAccount")
        .lean();
    const globalAccounts = globalAccountsRaw.map(acc => ({
        _id: acc._id.toString(),
        name: acc.name,
        description: acc.description,
        isActive: true,
        isVerified: true,
        isDefaultAccount: Boolean(acc.isDefaultAccount),
    }));
    const propertyToStripeMap = new Map();
    stripeAccounts.forEach(account => {
        const summary = {
            _id: account._id.toString(),
            name: account.name,
            description: account.description,
            isActive: account.isActive,
            isVerified: account.isVerified,
            isDefaultAccount: account.isDefaultAccount,
        };
        (account.propertyIds || []).forEach(propertyId => {
            propertyToStripeMap.set(propertyId._id.toString(), summary);
        });
    });
    const results = [];
    for (const prop of properties) {
        const id = prop._id.toString();
        const lotData = yield (0, exports.calculatePropertyLotData)(id);
        const base = prop.toObject();
        const propertyStripeAccount = propertyToStripeMap.get(id) || null;
        const availableStripeAccounts = {
            propertySpecific: propertyStripeAccount,
            globalAccounts,
            hasPropertySpecific: Boolean(propertyStripeAccount),
            hasGlobalAccounts: globalAccounts.length > 0,
            totalAvailableAccounts: (propertyStripeAccount ? 1 : 0) + globalAccounts.length,
        };
        results.push(Object.assign(Object.assign({ _id: id, name: base.name, description: base.description, address: base.address, identifierType: base.identifierType, amenities: base.amenities, images: base.images, rules: base.rules, isActive: base.isActive, createdAt: base.createdAt, updatedAt: base.updatedAt }, lotData), { stripeAccount: propertyStripeAccount, availableStripeAccounts }));
    }
    return results;
});
exports.getPropertiesWithAvailableStripeAccountsService = getPropertiesWithAvailableStripeAccountsService;
// Fetch properties without any Stripe account assigned
const getPropertiesWithoutStripeAccountsService = () => __awaiter(void 0, void 0, void 0, function* () {
    const properties = yield properties_schema_1.Properties.find({ isDeleted: false })
        .populate("totalSpots", "status")
        .populate("availableSpots", "status")
        .sort({ createdAt: -1 });
    const { StripeAccounts } = yield Promise.resolve().then(() => __importStar(require("../stripe/stripe.schema")));
    const stripeAccounts = yield StripeAccounts.find({ isDeleted: false })
        .populate("propertyIds", "name address")
        .select("propertyIds")
        .lean();
    const propertiesWithStripe = new Set();
    stripeAccounts.forEach(account => {
        (account.propertyIds || []).forEach(propertyId => {
            propertiesWithStripe.add(propertyId._id.toString());
        });
    });
    const results = [];
    for (const prop of properties) {
        const id = prop._id.toString();
        if (propertiesWithStripe.has(id))
            continue;
        const lotData = yield (0, exports.calculatePropertyLotData)(id);
        const base = prop.toObject();
        results.push(Object.assign(Object.assign({ _id: id, name: base.name, description: base.description, address: base.address, identifierType: base.identifierType, amenities: base.amenities, images: base.images, rules: base.rules, isActive: base.isActive, createdAt: base.createdAt, updatedAt: base.updatedAt }, lotData), { stripeAccount: null, hasStripeAccount: false }));
    }
    return results;
});
exports.getPropertiesWithoutStripeAccountsService = getPropertiesWithoutStripeAccountsService;

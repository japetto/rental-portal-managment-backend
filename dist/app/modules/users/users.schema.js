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
exports.Users = exports.usersSchema = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const mongoose_1 = require("mongoose");
const config_1 = __importDefault(require("../../../config/config"));
const user_constant_1 = require("./user.constant");
exports.usersSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, "Please use a valid email address"],
    },
    phoneNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    profileImage: {
        type: String,
        required: true,
        default: "https://i.ibb.co/dcHVrp8/User-Profile-PNG-Image.png",
    },
    password: {
        type: String,
        required: false,
        select: false,
        validate: {
            validator: function (value) {
                // If password is provided, it must be at least 6 characters
                if (value && value.trim() !== "") {
                    return value.length >= 6;
                }
                // If password is empty or not provided, it's valid
                return true;
            },
            message: "Password must be at least 6 characters long",
        },
    },
    role: {
        type: String,
        required: true,
        enum: user_constant_1.UserRoleEnums,
        default: "TENANT",
    },
    isInvited: { type: Boolean, required: false, default: false },
    isVerified: { type: Boolean, required: false, default: false },
    bio: { type: String, required: false, default: "Not Updated Yet!" },
    preferredLocation: {
        type: String,
        required: true,
    },
    // Tenant-specific fields
    propertyId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Properties",
        required: false,
    },
    spotId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Spots", required: false },
    leaseId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Leases", required: false },
    // RV Information (tenant's personal property)
    rvInfo: {
        make: { type: String, required: false },
        model: { type: String, required: false },
        year: { type: Number, required: false, min: 1900 },
        length: { type: Number, required: false, min: 1 },
        licensePlate: { type: String, required: false },
    },
    isActive: { type: Boolean, required: true, default: true },
    isDeleted: { type: Boolean, required: true, default: false },
    deletedAt: { type: Date },
    // History tracking for property and spot assignments
    userHistory: [
        {
            propertyId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Properties" },
            spotId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Spots" },
            leaseId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Leases" },
            assignedAt: { type: Date, default: Date.now },
            removedAt: { type: Date },
            reason: { type: String }, // "LEASE_START", "LEASE_END", "TRANSFER", "CANCELLATION"
        },
    ],
    // Stripe payment link fields
    stripePaymentLinkId: { type: String }, // Single payment link per tenant
    stripePaymentLinkUrl: { type: String }, // Payment link URL
    stripeCustomerId: { type: String }, // Stripe customer ID for webhook lookup
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
    },
});
exports.usersSchema.pre("save", function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (this.password &&
            this.password.trim() !== "" &&
            this.isModified("password")) {
            this.password = yield bcrypt_1.default.hash(this.password, Number(config_1.default.salt_round));
        }
        next();
    });
});
// Pre-save middleware for soft delete
exports.usersSchema.pre("save", function (next) {
    if (this.isDeleted && !this.deletedAt) {
        this.deletedAt = new Date();
    }
    next();
});
// Pre-save middleware for validation
exports.usersSchema.pre("save", function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        // Validate that if propertyId is set, it exists
        if (this.propertyId) {
            const { Properties } = yield Promise.resolve().then(() => __importStar(require("../properties/properties.schema")));
            const property = yield Properties.findById(this.propertyId);
            if (!property || property.isDeleted) {
                return next(new Error("Invalid property ID or property is deleted"));
            }
        }
        // Validate that if spotId is set, it exists and belongs to the property
        if (this.spotId) {
            const { Spots } = yield Promise.resolve().then(() => __importStar(require("../spots/spots.schema")));
            const spot = yield Spots.findById(this.spotId);
            if (!spot || spot.isDeleted) {
                return next(new Error("Invalid spot ID or spot is deleted"));
            }
            // If both propertyId and spotId are set, validate they match
            if (this.propertyId &&
                spot.propertyId.toString() !== this.propertyId.toString()) {
                return next(new Error("Spot does not belong to the assigned property"));
            }
        }
        // Validate that if leaseId is set, it exists and belongs to this tenant
        if (this.leaseId) {
            const { Leases } = yield Promise.resolve().then(() => __importStar(require("../leases/leases.schema")));
            const lease = yield Leases.findById(this.leaseId);
            if (!lease || lease.isDeleted) {
                return next(new Error("Invalid lease ID or lease is deleted"));
            }
            if (lease.tenantId.toString() !== this._id.toString()) {
                return next(new Error("Lease does not belong to this tenant"));
            }
        }
        next();
    });
});
// Instance method to compare password
exports.usersSchema.methods.comparePassword = function (candidatePassword) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!this.password) {
            return false;
        }
        return bcrypt_1.default.compare(candidatePassword, this.password);
    });
};
// Virtual to get user's active lease
exports.usersSchema.virtual("activeLease", {
    ref: "Leases",
    localField: "_id",
    foreignField: "tenantId",
    justOne: true,
    match: { leaseStatus: "ACTIVE" },
});
// Virtual to get user's pending payments count
exports.usersSchema.virtual("pendingPaymentsCount", {
    ref: "Payments",
    localField: "_id",
    foreignField: "tenantId",
    count: true,
    match: { status: { $in: ["PENDING", "OVERDUE"] } },
});
exports.Users = (0, mongoose_1.model)("Users", exports.usersSchema);

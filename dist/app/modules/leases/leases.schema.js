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
exports.Leases = exports.leasesSchema = void 0;
const mongoose_1 = require("mongoose");
const payment_enums_1 = require("../../../shared/enums/payment.enums");
exports.leasesSchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Users", required: true },
    spotId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Spots", required: true },
    propertyId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Properties",
        required: true,
    },
    leaseType: {
        type: String,
        enum: Object.values(payment_enums_1.LeaseType),
        required: true,
    },
    leaseStart: { type: Date, required: true },
    leaseEnd: { type: Date, required: false }, // Optional for monthly leases
    rentAmount: { type: Number, required: true, min: 0 },
    depositAmount: { type: Number, required: true, min: 0 },
    leaseStatus: {
        type: String,
        enum: Object.values(payment_enums_1.LeaseStatus),
        required: true,
        default: payment_enums_1.LeaseStatus.PENDING,
    },
    occupants: { type: Number, required: true, min: 1 },
    pets: {
        hasPets: { type: Boolean, required: true, default: false },
        petDetails: [
            {
                type: { type: String, required: true },
                breed: { type: String, required: true },
                name: { type: String, required: true },
                weight: { type: Number, required: true, min: 0 },
            },
        ],
    },
    emergencyContact: {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        relationship: { type: String, required: true },
    },
    specialRequests: [{ type: String }],
    documents: [{ type: String }], // URLs for PDF/DOC files
    notes: { type: String, default: "" },
    isActive: { type: Boolean, required: true, default: true },
    isDeleted: { type: Boolean, required: true, default: false },
    deletedAt: { type: Date },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
    },
});
// Pre-save middleware for soft delete
exports.leasesSchema.pre("save", function (next) {
    if (this.isDeleted && !this.deletedAt) {
        this.deletedAt = new Date();
    }
    next();
});
// Pre-save middleware for lease validation
exports.leasesSchema.pre("save", function (next) {
    // Validate lease type and end date logic
    if (this.leaseType === payment_enums_1.LeaseType.FIXED_TERM && !this.leaseEnd) {
        return next(new Error("Lease end date is required for FIXED_TERM leases"));
    }
    if (this.leaseType === payment_enums_1.LeaseType.MONTHLY && this.leaseEnd) {
        return next(new Error("Lease end date should not be provided for MONTHLY leases"));
    }
    // Validate pet details if hasPets is true
    if (this.pets.hasPets &&
        (!this.pets.petDetails || this.pets.petDetails.length === 0)) {
        return next(new Error("Pet details are required when hasPets is true"));
    }
    // Set default lease status based on start date
    const now = new Date();
    if (!this.leaseStatus || this.leaseStatus === payment_enums_1.LeaseStatus.PENDING) {
        this.leaseStatus =
            this.leaseStart <= now ? payment_enums_1.LeaseStatus.ACTIVE : payment_enums_1.LeaseStatus.PENDING;
    }
    next();
});
// Pre-save middleware for cross-schema validation
exports.leasesSchema.pre("save", function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        // Validate that property exists and is active
        const { Properties } = yield Promise.resolve().then(() => __importStar(require("../properties/properties.schema")));
        const property = yield Properties.findById(this.propertyId);
        if (!property || property.isDeleted || !property.isActive) {
            return next(new Error("Invalid property ID or property is inactive/deleted"));
        }
        // Validate that spot exists, is active, and belongs to the property
        const { Spots } = yield Promise.resolve().then(() => __importStar(require("../spots/spots.schema")));
        const spot = yield Spots.findById(this.spotId);
        if (!spot || spot.isDeleted || !spot.isActive) {
            return next(new Error("Invalid spot ID or spot is inactive/deleted"));
        }
        if (spot.propertyId.toString() !== this.propertyId.toString()) {
            return next(new Error("Spot does not belong to the assigned property"));
        }
        // Validate that tenant exists and is active
        const { Users } = yield Promise.resolve().then(() => __importStar(require("../users/users.schema")));
        const tenant = yield Users.findById(this.tenantId);
        if (!tenant || tenant.isDeleted || !tenant.isActive) {
            return next(new Error("Invalid tenant ID or tenant is inactive/deleted"));
        }
        // Check if spot is already occupied by another active lease
        const { Leases } = yield Promise.resolve().then(() => __importStar(require("./leases.schema")));
        const existingLease = yield Leases.findOne({
            spotId: this.spotId,
            leaseStatus: payment_enums_1.LeaseStatus.ACTIVE,
            isDeleted: false,
            _id: { $ne: this._id }, // Exclude current lease if updating
        });
        if (existingLease) {
            return next(new Error("Spot is already occupied by another active lease"));
        }
        next();
    });
});
// Virtual for calculating lease duration in days
exports.leasesSchema.virtual("durationDays").get(function () {
    if (!this.leaseEnd) {
        // For monthly leases without end date, calculate from start to current date
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - this.leaseStart.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    const diffTime = Math.abs(this.leaseEnd.getTime() - this.leaseStart.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});
// Virtual for checking if lease is active
exports.leasesSchema.virtual("isLeaseActive").get(function () {
    const now = new Date();
    if (this.leaseType === payment_enums_1.LeaseType.MONTHLY && !this.leaseEnd) {
        // Monthly leases without end date are active if they've started and status is ACTIVE
        return this.leaseStart <= now && this.leaseStatus === payment_enums_1.LeaseStatus.ACTIVE;
    }
    if (this.leaseEnd) {
        return (this.leaseStart <= now &&
            this.leaseEnd >= now &&
            this.leaseStatus === payment_enums_1.LeaseStatus.ACTIVE);
    }
    return false;
});
// Virtual for calculating payment status from related payments
exports.leasesSchema.virtual("paymentStatus").get(function () {
    return __awaiter(this, void 0, void 0, function* () {
        const { Payments } = yield Promise.resolve().then(() => __importStar(require("../payments/payments.schema")));
        const { PaymentStatus } = yield Promise.resolve().then(() => __importStar(require("../../../shared/enums/payment.enums")));
        const payments = yield Payments.find({
            tenantId: this.tenantId,
            type: "RENT",
            isDeleted: false,
        });
        if (payments.length === 0) {
            return PaymentStatus.PENDING;
        }
        const pendingPayments = payments.filter(p => p.status === PaymentStatus.PENDING);
        const overduePayments = payments.filter(p => p.status === PaymentStatus.OVERDUE);
        const paidPayments = payments.filter(p => p.status === PaymentStatus.PAID);
        if (overduePayments.length > 0) {
            return PaymentStatus.OVERDUE;
        }
        if (pendingPayments.length > 0 && paidPayments.length > 0) {
            return PaymentStatus.PARTIAL;
        }
        if (pendingPayments.length > 0) {
            return PaymentStatus.PENDING;
        }
        return PaymentStatus.PAID;
    });
});
exports.Leases = (0, mongoose_1.model)("Leases", exports.leasesSchema);

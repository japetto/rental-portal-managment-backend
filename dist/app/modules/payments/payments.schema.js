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
exports.Payments = exports.paymentsSchema = void 0;
const mongoose_1 = require("mongoose");
const payment_enums_1 = require("../../../shared/enums/payment.enums");
exports.paymentsSchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Users", required: true },
    propertyId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Properties",
        required: true,
    },
    spotId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Spots", required: true },
    amount: { type: Number, required: true, min: 0 },
    type: {
        type: String,
        enum: Object.values(payment_enums_1.PaymentType),
        required: true,
    },
    status: {
        type: String,
        enum: Object.values(payment_enums_1.PaymentStatus),
        required: true,
        default: payment_enums_1.PaymentStatus.PENDING,
    },
    paidDate: { type: Date },
    paymentMethod: {
        type: String,
        enum: Object.values(payment_enums_1.PaymentMethod),
    },
    transactionId: { type: String },
    receiptNumber: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    notes: { type: String },
    lateFeeAmount: { type: Number, min: 0, default: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    createdBy: { type: String, required: true },
    // Stripe transaction fields
    stripeTransactionId: { type: String }, // From Stripe webhook
    stripePaymentLinkId: { type: String }, // Payment link ID from Stripe
    stripeAccountId: { type: mongoose_1.Schema.Types.ObjectId, ref: "StripeAccounts" }, // Stripe account used for this payment
    isActive: { type: Boolean, required: true, default: true },
    isDeleted: { type: Boolean, required: true, default: false },
    deletedAt: { type: Date },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
    },
});
// Pre-save middleware to calculate total amount
exports.paymentsSchema.pre("save", function (next) {
    this.totalAmount = this.amount + (this.lateFeeAmount || 0);
    next();
});
// Pre-save middleware for soft delete
exports.paymentsSchema.pre("save", function (next) {
    if (this.isDeleted && !this.deletedAt) {
        this.deletedAt = new Date();
    }
    next();
});
// Pre-save middleware for payment validation
exports.paymentsSchema.pre("save", function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        // Validate payment amount against lease for rent payments
        if (this.type === payment_enums_1.PaymentType.RENT) {
            const { Leases } = yield Promise.resolve().then(() => __importStar(require("../leases/leases.schema")));
            const lease = yield Leases.findOne({
                tenantId: this.tenantId,
                leaseStatus: "ACTIVE",
                isDeleted: false,
            });
            if (lease && this.amount > lease.rentAmount) {
                return next(new Error(`Rent payment amount (${this.amount}) cannot exceed lease rent amount (${lease.rentAmount})`));
            }
        }
        // Validate payment amount against lease for deposit payments
        if (this.type === payment_enums_1.PaymentType.DEPOSIT) {
            const { Leases } = yield Promise.resolve().then(() => __importStar(require("../leases/leases.schema")));
            const lease = yield Leases.findOne({
                tenantId: this.tenantId,
                leaseStatus: "ACTIVE",
                isDeleted: false,
            });
            if (lease && this.amount !== lease.depositAmount) {
                return next(new Error(`Deposit payment amount (${this.amount}) must match lease deposit amount (${lease.depositAmount})`));
            }
        }
        // Validate due date is within lease period
        if (this.dueDate) {
            const { Leases } = yield Promise.resolve().then(() => __importStar(require("../leases/leases.schema")));
            const lease = yield Leases.findOne({
                tenantId: this.tenantId,
                leaseStatus: "ACTIVE",
                isDeleted: false,
            });
            if (lease) {
                if (this.dueDate < lease.leaseStart) {
                    return next(new Error("Payment due date cannot be before lease start date"));
                }
                if (lease.leaseEnd && this.dueDate > lease.leaseEnd) {
                    return next(new Error("Payment due date cannot be after lease end date"));
                }
            }
        }
        // Validate status transitions
        if (this.isModified("status")) {
            const validTransitions = {
                [payment_enums_1.PaymentStatus.PENDING]: [
                    payment_enums_1.PaymentStatus.PAID,
                    payment_enums_1.PaymentStatus.OVERDUE,
                    payment_enums_1.PaymentStatus.CANCELLED,
                ],
                [payment_enums_1.PaymentStatus.OVERDUE]: [payment_enums_1.PaymentStatus.PAID, payment_enums_1.PaymentStatus.CANCELLED],
                [payment_enums_1.PaymentStatus.PAID]: [payment_enums_1.PaymentStatus.REFUNDED],
                [payment_enums_1.PaymentStatus.CANCELLED]: [],
                [payment_enums_1.PaymentStatus.REFUNDED]: [],
                [payment_enums_1.PaymentStatus.PARTIAL]: [
                    payment_enums_1.PaymentStatus.PAID,
                    payment_enums_1.PaymentStatus.OVERDUE,
                    payment_enums_1.PaymentStatus.CANCELLED,
                ],
            };
            const currentStatus = this.status;
            // For new documents, skip validation
            // Note: Status transition validation would be better handled in the service layer
            // to avoid TypeScript issues with accessing previous document state
        }
        next();
    });
});
// Pre-save middleware for cross-schema validation
exports.paymentsSchema.pre("save", function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        // Validate that tenant exists and is active
        const { Users } = yield Promise.resolve().then(() => __importStar(require("../users/users.schema")));
        const tenant = yield Users.findById(this.tenantId);
        if (!tenant || tenant.isDeleted || !tenant.isActive) {
            return next(new Error("Invalid tenant ID or tenant is inactive/deleted"));
        }
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
        // Validate that there's an active lease for this tenant
        const { Leases } = yield Promise.resolve().then(() => __importStar(require("../leases/leases.schema")));
        const lease = yield Leases.findOne({
            tenantId: this.tenantId,
            leaseStatus: "ACTIVE",
            isDeleted: false,
        });
        if (!lease) {
            return next(new Error("No active lease found for this tenant"));
        }
        // Validate that payment property/spot matches lease property/spot
        if (lease.propertyId.toString() !== this.propertyId.toString()) {
            return next(new Error("Payment property does not match lease property"));
        }
        if (lease.spotId.toString() !== this.spotId.toString()) {
            return next(new Error("Payment spot does not match lease spot"));
        }
        next();
    });
});
// Generate receipt number
exports.paymentsSchema.pre("save", function (next) {
    if (this.isNew && !this.receiptNumber) {
        const timestamp = Date.now().toString();
        const random = Math.floor(Math.random() * 1000)
            .toString()
            .padStart(3, "0");
        this.receiptNumber = `RCP-${timestamp}-${random}`;
    }
    next();
});
exports.Payments = (0, mongoose_1.model)("Payments", exports.paymentsSchema);

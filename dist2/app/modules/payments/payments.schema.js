"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Payments = exports.paymentsSchema = void 0;
const mongoose_1 = require("mongoose");
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
        enum: ["RENT", "DEPOSIT", "LATE_FEE", "UTILITY", "MAINTENANCE", "OTHER"],
        required: true,
    },
    status: {
        type: String,
        enum: ["PENDING", "PAID", "OVERDUE", "CANCELLED", "REFUNDED"],
        required: true,
        default: "PENDING",
    },
    dueDate: { type: Date, required: true },
    paidDate: { type: Date },
    paymentMethod: {
        type: String,
        enum: [
            "CASH",
            "CHECK",
            "CREDIT_CARD",
            "DEBIT_CARD",
            "BANK_TRANSFER",
            "ONLINE",
        ],
    },
    transactionId: { type: String },
    receiptNumber: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    notes: { type: String },
    lateFeeAmount: { type: Number, min: 0, default: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    createdBy: { type: String, required: true },
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
// Indexes for efficient queries
exports.paymentsSchema.index({ tenantId: 1, status: 1 });
exports.paymentsSchema.index({ propertyId: 1, status: 1 });
exports.paymentsSchema.index({ dueDate: 1, status: 1 });
exports.paymentsSchema.index({ paidDate: 1 });
exports.paymentsSchema.index({ transactionId: 1 });
// Virtual to check if payment is overdue
exports.paymentsSchema.virtual("isOverdue").get(function () {
    if (this.status === "PAID")
        return false;
    return new Date() > this.dueDate;
});
// Virtual to calculate days overdue
exports.paymentsSchema.virtual("daysOverdue").get(function () {
    if (this.status === "PAID" || new Date() <= this.dueDate)
        return 0;
    const diffTime = Math.abs(new Date().getTime() - this.dueDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});
exports.Payments = (0, mongoose_1.model)("Payments", exports.paymentsSchema);

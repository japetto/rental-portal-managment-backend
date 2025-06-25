"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Leases = exports.leasesSchema = void 0;
const mongoose_1 = require("mongoose");
exports.leasesSchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Users", required: true },
    spotId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Spots", required: true },
    propertyId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Properties",
        required: true,
    },
    leaseStart: { type: Date, required: true },
    leaseEnd: { type: Date, required: true },
    rentAmount: { type: Number, required: true, min: 0 },
    depositAmount: { type: Number, required: true, min: 0 },
    paymentStatus: {
        type: String,
        enum: ["PAID", "PENDING", "OVERDUE", "PARTIAL"],
        required: true,
        default: "PENDING",
    },
    leaseStatus: {
        type: String,
        enum: ["ACTIVE", "EXPIRED", "CANCELLED", "PENDING"],
        required: true,
        default: "PENDING",
    },
    occupants: { type: Number, required: true, min: 1 },
    rvInfo: {
        make: { type: String, required: true },
        model: { type: String, required: true },
        year: { type: Number, required: true, min: 1900 },
        length: { type: Number, required: true, min: 1 },
        licensePlate: { type: String, required: true },
    },
    emergencyContact: {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        relationship: { type: String, required: true },
    },
    specialRequests: [{ type: String }],
    documents: [{ type: String }],
    notes: { type: String, default: "" },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
    },
});
// Virtual for calculating lease duration in days
exports.leasesSchema.virtual("durationDays").get(function () {
    const diffTime = Math.abs(this.leaseEnd.getTime() - this.leaseStart.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});
// Virtual for checking if lease is active
exports.leasesSchema.virtual("isActive").get(function () {
    const now = new Date();
    return (this.leaseStart <= now &&
        this.leaseEnd >= now &&
        this.leaseStatus === "ACTIVE");
});
// Index for efficient queries
exports.leasesSchema.index({ tenantId: 1, leaseStatus: 1 });
exports.leasesSchema.index({ spotId: 1, leaseStatus: 1 });
exports.leasesSchema.index({ propertyId: 1, leaseStatus: 1 });
exports.leasesSchema.index({ leaseStart: 1, leaseEnd: 1 });
exports.Leases = (0, mongoose_1.model)("Leases", exports.leasesSchema);

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceRequests = exports.serviceRequestsSchema = void 0;
const mongoose_1 = require("mongoose");
exports.serviceRequestsSchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Users", required: true },
    propertyId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Properties",
        required: true,
    },
    spotId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Spots", required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: {
        type: String,
        enum: ["MAINTENANCE", "UTILITY", "SECURITY", "CLEANING", "OTHER"],
        required: true,
    },
    priority: {
        type: String,
        enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
        required: true,
        default: "MEDIUM",
    },
    status: {
        type: String,
        enum: ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
        required: true,
        default: "PENDING",
    },
    requestedDate: { type: Date, required: true, default: Date.now },
    completedDate: { type: Date },
    assignedTo: { type: String },
    estimatedCost: { type: Number, min: 0 },
    actualCost: { type: Number, min: 0 },
    images: [{ type: String }],
    adminNotes: { type: String },
    tenantNotes: { type: String },
    isActive: { type: Boolean, required: true, default: true },
    isDeleted: { type: Boolean, required: true, default: false },
    deletedAt: { type: Date },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
    },
});
// Indexes for efficient queries
exports.serviceRequestsSchema.index({ tenantId: 1, status: 1 });
exports.serviceRequestsSchema.index({ propertyId: 1, status: 1 });
exports.serviceRequestsSchema.index({ status: 1, priority: 1 });
exports.serviceRequestsSchema.index({ requestedDate: 1 });
exports.ServiceRequests = (0, mongoose_1.model)("ServiceRequests", exports.serviceRequestsSchema);

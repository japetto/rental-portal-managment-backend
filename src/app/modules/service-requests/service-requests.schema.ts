import { model, Schema } from "mongoose";
import { IServiceRequest } from "./service-requests.interface";

export const serviceRequestsSchema = new Schema<IServiceRequest>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Users", required: true },
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Properties",
      required: true,
    },
    spotId: { type: Schema.Types.ObjectId, ref: "Spots", required: true },
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
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  },
);

// Indexes for efficient queries
serviceRequestsSchema.index({ tenantId: 1, status: 1 });
serviceRequestsSchema.index({ propertyId: 1, status: 1 });
serviceRequestsSchema.index({ status: 1, priority: 1 });
serviceRequestsSchema.index({ requestedDate: 1 });

export const ServiceRequests = model<IServiceRequest>(
  "ServiceRequests",
  serviceRequestsSchema,
);

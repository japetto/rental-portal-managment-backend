import { model, Schema } from "mongoose";
import { IAnnouncement } from "./announcements.interface";

export const announcementsSchema = new Schema<IAnnouncement>(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    type: {
      type: String,
      enum: ["GENERAL", "MAINTENANCE", "EVENT", "EMERGENCY", "RULE_UPDATE"],
      required: true,
    },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      required: true,
      default: "MEDIUM",
    },
    propertyId: { type: Schema.Types.ObjectId, ref: "Properties" }, // Optional - system-wide if null
    isActive: { type: Boolean, required: true, default: true },
    publishDate: { type: Date, required: true, default: Date.now },
    expiryDate: { type: Date },
    createdBy: { type: String, required: true },
    attachments: [{ type: String }],
    readBy: [{ type: Schema.Types.ObjectId, ref: "Users" }],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  },
);

// Indexes for efficient queries
announcementsSchema.index({ propertyId: 1, isActive: 1 });
announcementsSchema.index({ type: 1, priority: 1 });
announcementsSchema.index({ publishDate: 1 });
announcementsSchema.index({ expiryDate: 1 });
announcementsSchema.index({ readBy: 1 });

// Virtual to check if announcement is expired
announcementsSchema.virtual("isExpired").get(function (this: IAnnouncement) {
  if (!this.expiryDate) return false;
  return new Date() > this.expiryDate;
});

export const Announcements = model<IAnnouncement>(
  "Announcements",
  announcementsSchema,
);

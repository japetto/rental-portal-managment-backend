import { model, Schema } from "mongoose";
import { IAnnouncement } from "./announcements.interface";

export const announcementsSchema = new Schema<IAnnouncement>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: [5000, "Content cannot exceed 5000 characters"],
    },
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
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Properties",
      required: false, // Optional - system-wide if null
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    expiryDate: {
      type: Date,
      validate: {
        validator: function (this: IAnnouncement, value: Date) {
          // Expiry date should be after creation date
          if (value && this.createdAt && value <= this.createdAt) {
            return false;
          }
          return true;
        },
        message: "Expiry date must be after creation date",
      },
    },
    createdBy: {
      type: String,
      required: true,
    },
    attachments: [
      {
        type: String,
        validate: {
          validator: function (v: string) {
            // Basic URL validation
            return /^https?:\/\/.+/.test(v);
          },
          message: "Attachment must be a valid URL",
        },
      },
    ],
    readBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "Users",
      },
    ],
    // Add target audience for better filtering
    targetAudience: {
      type: String,
      enum: ["ALL", "TENANTS_ONLY", "ADMINS_ONLY", "PROPERTY_SPECIFIC"],
      default: "ALL",
    },
    // Add notification settings
    sendNotification: {
      type: Boolean,
      default: true,
    },
    // Add tags for better categorization
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  },
);

// Virtual to check if announcement is expired
announcementsSchema.virtual("isExpired").get(function (this: IAnnouncement) {
  if (!this.expiryDate) return false;
  return new Date() > this.expiryDate;
});

// Virtual to check if announcement is currently active (not expired and active)
announcementsSchema.virtual("isCurrentlyActive").get(function (
  this: IAnnouncement,
) {
  if (!this.isActive) return false;
  if (this.expiryDate && new Date() > this.expiryDate) return false;
  return new Date() >= this.createdAt;
});

// Virtual to get read count
announcementsSchema.virtual("readCount").get(function (this: IAnnouncement) {
  return this.readBy ? this.readBy.length : 0;
});

export const Announcements = model<IAnnouncement>(
  "Announcements",
  announcementsSchema,
);

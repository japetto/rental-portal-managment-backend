import { model, Schema } from "mongoose";
import { IDocument } from "./documents.interface";

export const documentsSchema = new Schema<IDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    fileUrl: {
      type: String,
      required: true,
      validate: {
        validator: function (v: string) {
          // Basic URL validation
          return /^https?:\/\/.+/.test(v);
        },
        message: "File URL must be a valid URL",
      },
    },
    fileType: {
      type: String,
      enum: ["IMAGE", "PDF", "DOC"],
      required: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileSize: {
      type: Number,
      min: [0, "File size cannot be negative"],
    },
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Properties",
      required: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      required: true,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
    tags: [
      {
        type: String,
        trim: true,
        maxlength: [50, "Tag cannot exceed 50 characters"],
      },
    ],
    category: {
      type: String,
      trim: true,
      maxlength: [100, "Category cannot exceed 100 characters"],
    },
    expiryDate: {
      type: Date,
      validate: {
        validator: function (this: IDocument, value: Date) {
          // Expiry date should be after creation date
          if (value && this.createdAt && value <= this.createdAt) {
            return false;
          }
          return true;
        },
        message: "Expiry date must be after creation date",
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  },
);

// Virtual to check if document is expired
documentsSchema.virtual("isExpired").get(function (this: IDocument) {
  if (!this.expiryDate) return false;
  return new Date() > this.expiryDate;
});

// Virtual to check if document is currently active (not expired and active)
documentsSchema.virtual("isCurrentlyActive").get(function (this: IDocument) {
  if (!this.isActive) return false;
  if (this.expiryDate && new Date() > this.expiryDate) return false;
  return true;
});

// Virtual to get file extension
documentsSchema.virtual("fileExtension").get(function (this: IDocument) {
  if (!this.fileName) return "";
  const parts = this.fileName.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
});

// Virtual to get formatted file size
documentsSchema.virtual("formattedFileSize").get(function (this: IDocument) {
  if (!this.fileSize) return "Unknown";

  const bytes = this.fileSize;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  if (bytes === 0) return "0 Bytes";

  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
});

// Indexes for better query performance
documentsSchema.index({ propertyId: 1, isActive: 1, isDeleted: 1 });
documentsSchema.index({ fileType: 1, isActive: 1 });
documentsSchema.index({ category: 1, isActive: 1 });
documentsSchema.index({ uploadedBy: 1, isActive: 1 });
documentsSchema.index({ title: "text", description: "text" });
documentsSchema.index({ tags: 1 });
documentsSchema.index({ createdAt: -1 });
documentsSchema.index({ expiryDate: 1 });

export const Documents = model<IDocument>("Documents", documentsSchema);

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Announcements = exports.announcementsSchema = void 0;
const mongoose_1 = require("mongoose");
exports.announcementsSchema = new mongoose_1.Schema({
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
    propertyId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Properties" }, // Optional - system-wide if null
    isActive: { type: Boolean, required: true, default: true },
    publishDate: { type: Date, required: true, default: Date.now },
    expiryDate: { type: Date },
    createdBy: { type: String, required: true },
    attachments: [{ type: String }],
    readBy: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Users" }],
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
    },
});
// Indexes for efficient queries
exports.announcementsSchema.index({ propertyId: 1, isActive: 1 });
exports.announcementsSchema.index({ type: 1, priority: 1 });
exports.announcementsSchema.index({ publishDate: 1 });
exports.announcementsSchema.index({ expiryDate: 1 });
exports.announcementsSchema.index({ readBy: 1 });
// Virtual to check if announcement is expired
exports.announcementsSchema.virtual("isExpired").get(function () {
    if (!this.expiryDate)
        return false;
    return new Date() > this.expiryDate;
});
exports.Announcements = (0, mongoose_1.model)("Announcements", exports.announcementsSchema);

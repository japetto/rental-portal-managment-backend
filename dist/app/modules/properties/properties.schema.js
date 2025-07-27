"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Properties = exports.propertiesSchema = void 0;
const mongoose_1 = require("mongoose");
exports.propertiesSchema = new mongoose_1.Schema({
    name: { type: String, trim: true, required: true },
    description: { type: String, required: true },
    address: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        zip: { type: String, required: true },
        country: { type: String, required: false },
    },
    amenities: [{ type: String, required: true }],
    images: [{ type: String }],
    rules: [{ type: String }],
    isActive: { type: Boolean, required: true, default: true },
    isDeleted: { type: Boolean, required: true, default: false },
    deletedAt: { type: Date },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
    },
});
// Virtual to get total spots count
exports.propertiesSchema.virtual("totalSpots", {
    ref: "Spots",
    localField: "_id",
    foreignField: "propertyId",
    count: true,
});
// Virtual to get available spots count
exports.propertiesSchema.virtual("availableSpots", {
    ref: "Spots",
    localField: "_id",
    foreignField: "propertyId",
    count: true,
    match: { status: "AVAILABLE", isActive: true },
});
exports.Properties = (0, mongoose_1.model)("Properties", exports.propertiesSchema);

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Spots = exports.spotsSchema = void 0;
const mongoose_1 = require("mongoose");
exports.spotsSchema = new mongoose_1.Schema({
    spotNumber: { type: String, required: true },
    propertyId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Properties",
        required: true,
    },
    status: {
        type: String,
        enum: ["AVAILABLE", "MAINTENANCE"],
        required: true,
        default: "AVAILABLE",
    },
    size: {
        length: { type: Number, required: true, min: 1 },
        width: { type: Number, required: true, min: 1 },
    },
    price: {
        daily: { type: Number, required: true, min: 0 },
        weekly: { type: Number, required: true, min: 0 },
        monthly: { type: Number, required: true, min: 0 },
    },
    description: { type: String, required: true },
    images: [{ type: String }],
    isActive: { type: Boolean, required: true, default: true },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
    },
});
// Compound index to ensure unique spot numbers within a property
exports.spotsSchema.index({ propertyId: 1, spotNumber: 1 }, { unique: true });
exports.Spots = (0, mongoose_1.model)("Spots", exports.spotsSchema);

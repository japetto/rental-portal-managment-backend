"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Spots = exports.spotsSchema = void 0;
const mongoose_1 = require("mongoose");
exports.spotsSchema = new mongoose_1.Schema({
    spotNumber: { type: String, required: true },
    spotIdentifier: { type: String, required: true },
    propertyId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Properties",
        required: true,
    },
    status: {
        type: String,
        enum: ["AVAILABLE", "MAINTENANCE", "RESERVED", "BOOKED"],
        required: true,
        default: "AVAILABLE",
    },
    size: {
        length: { type: Number },
        width: { type: Number },
    },
    amenities: [{ type: String }],
    price: {
        daily: { type: Number, min: 0 },
        weekly: { type: Number, min: 0 },
        monthly: { type: Number, min: 0 },
    },
    description: { type: String, required: true },
    images: [{ type: String }],
    isActive: { type: Boolean, required: true, default: true },
    isDeleted: { type: Boolean, required: true, default: false },
    deletedAt: { type: Date },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
    },
});
// Compound index to ensure unique spot numbers within a property
exports.spotsSchema.index({ propertyId: 1, spotNumber: 1 }, { unique: true });
// Custom validation to ensure at least one price is provided
exports.spotsSchema.pre("save", function (next) {
    const price = this.price;
    if (!price.daily && !price.weekly && !price.monthly) {
        return next(new Error("At least one price (daily, weekly, or monthly) must be provided"));
    }
    next();
});
exports.Spots = (0, mongoose_1.model)("Spots", exports.spotsSchema);

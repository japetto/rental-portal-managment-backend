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
        country: { type: String, required: true, default: "USA" },
    },
    amenities: [{ type: String, required: true }],
    images: [{ type: String }],
    rules: [{ type: String }],
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
    },
});
exports.Properties = (0, mongoose_1.model)("Properties", exports.propertiesSchema);

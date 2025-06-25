"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Users = exports.usersSchema = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const mongoose_1 = require("mongoose");
const config_1 = __importDefault(require("../../../config/config"));
const user_constant_1 = require("./user.constant");
exports.usersSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, "Please use a valid email address"],
    },
    phoneNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    profileImage: {
        type: String,
        required: true,
        default: "https://i.ibb.co/dcHVrp8/User-Profile-PNG-Image.png",
    },
    password: {
        type: String,
        required: true,
        select: false,
        minlength: [6, "Password must be at least 6 characters long"],
    },
    role: {
        type: String,
        required: true,
        enum: user_constant_1.UserRoleEnums,
        default: "TENANT",
    },
    isInvited: { type: Boolean, required: false, default: false },
    isVerified: { type: Boolean, required: false, default: false },
    bio: { type: String, required: false, default: "Not Updated Yet!" },
    preferredLocation: {
        type: String,
        required: true,
    },
    // Tenant-specific fields
    propertyId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Properties",
        required: false,
    },
    spotId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Spots", required: false },
    emergencyContact: {
        name: { type: String, required: false },
        phone: { type: String, required: false },
        relationship: { type: String, required: false },
    },
    specialRequests: [{ type: String }],
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
    },
});
exports.usersSchema.pre("save", function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        this.password = yield bcrypt_1.default.hash(this.password, Number(config_1.default.salt_round));
        next();
    });
});
exports.Users = (0, mongoose_1.model)("Users", exports.usersSchema);

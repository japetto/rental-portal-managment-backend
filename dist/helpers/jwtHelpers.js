"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jwtHelpers = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const createToken = (payload, secret, expireTime) => {
    if (!secret) {
        throw new Error("JWT_SECRET is not configured");
    }
    if (!expireTime) {
        throw new Error("JWT_EXPIRES_IN is not configured");
    }
    return jsonwebtoken_1.default.sign(payload, secret, {
        expiresIn: expireTime,
    });
};
const jwtVerify = (token, secret) => {
    if (!secret) {
        throw new Error("JWT_SECRET is not configured");
    }
    try {
        return jsonwebtoken_1.default.verify(token, secret);
    }
    catch (error) {
        throw error;
    }
};
exports.jwtHelpers = {
    createToken,
    jwtVerify,
};

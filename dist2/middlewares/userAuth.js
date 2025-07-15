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
exports.userAuth = void 0;
const http_status_1 = __importDefault(require("http-status"));
const users_schema_1 = require("../app/modules/users/users.schema");
const config_1 = __importDefault(require("../config/config"));
const ApiError_1 = __importDefault(require("../errors/ApiError"));
const jwtHelpers_1 = require("../helpers/jwtHelpers");
const verifyAuthToken_1 = require("../util/verifyAuthToken");
const userAuth = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Get token from request
        const token = (0, verifyAuthToken_1.verifyAuthToken)(req);
        // Check if JWT configuration is set
        if (!config_1.default.jwt_secret) {
            throw new ApiError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, "Server configuration error: JWT_SECRET not set");
        }
        if (!config_1.default.jwt_expires_in) {
            throw new ApiError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, "Server configuration error: JWT_EXPIRES_IN not set");
        }
        // Verify token
        const verifiedToken = jwtHelpers_1.jwtHelpers.jwtVerify(token, config_1.default.jwt_secret);
        // Check if user exists
        const user = yield users_schema_1.Users.findById(verifiedToken.id);
        if (!user) {
            throw new ApiError_1.default(http_status_1.default.UNAUTHORIZED, "User not found");
        }
        // Check if user is verified (for non-invited users)
        if (!user.isInvited && !user.isVerified) {
            throw new ApiError_1.default(http_status_1.default.UNAUTHORIZED, "Account not verified. Please contact administrator.");
        }
        // Add user to request
        req.user = user;
        next();
    }
    catch (error) {
        // Handle specific JWT errors
        if (error instanceof Error) {
            if (error.message.includes("jwt expired")) {
                next(new ApiError_1.default(http_status_1.default.UNAUTHORIZED, "Token has expired. Please login again."));
                return;
            }
            if (error.message.includes("jwt malformed")) {
                next(new ApiError_1.default(http_status_1.default.UNAUTHORIZED, "Invalid token format."));
                return;
            }
            if (error.message.includes("invalid signature")) {
                next(new ApiError_1.default(http_status_1.default.UNAUTHORIZED, "Invalid token signature."));
                return;
            }
            if (error.message.includes("JWT_SECRET is not configured")) {
                next(new ApiError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, "Server configuration error: JWT_SECRET not set"));
                return;
            }
            if (error.message.includes("JWT_EXPIRES_IN is not configured")) {
                next(new ApiError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, "Server configuration error: JWT_EXPIRES_IN not set"));
                return;
            }
        }
        next(error);
    }
});
exports.userAuth = userAuth;

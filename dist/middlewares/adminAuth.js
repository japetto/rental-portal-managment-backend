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
exports.adminAuth = void 0;
const http_status_1 = __importDefault(require("http-status"));
const users_schema_1 = require("../app/modules/users/users.schema");
const config_1 = __importDefault(require("../config/config"));
const ApiError_1 = __importDefault(require("../errors/ApiError"));
const jwtHelpers_1 = require("../helpers/jwtHelpers");
const verifyAuthToken_1 = require("../util/verifyAuthToken");
const adminAuth = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Get token from request
        const token = (0, verifyAuthToken_1.verifyAuthToken)(req);
        // Verify token
        const verifiedToken = jwtHelpers_1.jwtHelpers.jwtVerify(token, config_1.default.jwt_secret);
        // Check if user exists
        const user = yield users_schema_1.Users.findById(verifiedToken.id).select("+password");
        if (!user) {
            throw new ApiError_1.default(http_status_1.default.UNAUTHORIZED, "User not found");
        }
        // Check if user is admin
        if (user.role !== "SUPER_ADMIN") {
            throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Access denied. Admin privileges required");
        }
        // Check if user is verified
        // if (!user.isVerified) {
        //   throw new ApiError(httpStatus.UNAUTHORIZED, "Account not verified");
        // }
        // Add user to request
        req.user = user;
        next();
    }
    catch (error) {
        next(error);
    }
});
exports.adminAuth = adminAuth;

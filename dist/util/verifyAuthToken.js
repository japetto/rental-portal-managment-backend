"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAuthToken = void 0;
const http_status_1 = __importDefault(require("http-status"));
const ApiError_1 = __importDefault(require("../errors/ApiError"));
const verifyAuthToken = (req) => {
    const authorizationHeader = req.headers.authorization;
    // Check if the Authorization header is present
    if (!authorizationHeader) {
        throw new ApiError_1.default(http_status_1.default.UNAUTHORIZED, "Authorization Token is Missing");
    }
    // Extract the token from the Authorization header
    const token = authorizationHeader.replace("Bearer ", "");
    return token;
};
exports.verifyAuthToken = verifyAuthToken;

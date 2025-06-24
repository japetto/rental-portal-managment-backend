"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.join(process.cwd(), ".env") });
exports.default = {
    node_env: process.env.NODE_ENV,
    port: process.env.PORT,
    database_url: process.env.DATABASE_URL,
    salt_round: process.env.SALT_ROUND,
    anonymous_user_uid: process.env.ANONYMOUS_USER_UID,
    admin_uid: process.env.ADMIN_UID,
    jwt_secret: process.env.JWT_SECRET,
    jwt_expires_in: process.env.JWT_EXPIRES_IN,
    redis_host: process.env.UPSTASH_REDIS_ENDPOINT,
    redis_password: process.env.UPSTASH_REDIS_PASSWORD,
    redis_port: process.env.UPSTASH_REDIS_PORT,
    redis_crypto_key: process.env.REDIS_CRYPTO_KEY,
    nodemailer_user: process.env.NODEMAILER_USER,
    nodemailer_pass: process.env.NODEMAILER_PASS,
};

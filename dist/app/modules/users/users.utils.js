"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decryptForgotPasswordResponse = exports.encryptForgotPasswordResponse = exports.generateAuthToken = void 0;
exports.generateUID = generateUID;
exports.encryptData = encryptData;
const crypto_js_1 = __importDefault(require("crypto-js"));
const crypto_1 = __importDefault(require("crypto"));
const config_1 = __importDefault(require("../../../config/config"));
const jwtHelpers_1 = require("../../../helpers/jwtHelpers");
function generateUID(userRole) {
    const uidLength = 20;
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let uid;
    if (userRole === "customer") {
        uid = "c00";
    }
    else if (userRole === "hotelOwner") {
        uid = "ho00";
    }
    for (let i = 0; i < uidLength; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        uid += characters.charAt(randomIndex);
    }
    return uid;
}
function encryptData(user) {
    const authData = {
        _id: user._id.toString(),
        userName: user.userName,
        email: user.email,
        contactNumber: user.contactNumber,
        profileImage: user.profileImage,
        role: user.role,
        uid: user.uid,
        location: user.location,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        socialLinks: user.socialLinks,
        gender: user === null || user === void 0 ? void 0 : user.gender,
        dateOfBirth: user.dateOfBirth,
    };
    const encryptedData = crypto_js_1.default.AES.encrypt(JSON.stringify(authData), String(config_1.default.jwt_secret)).toString();
    return encryptedData;
}
// Generate AuthToken
const generateAuthToken = (user) => {
    const accessToken = jwtHelpers_1.jwtHelpers.createToken({
        id: user.uid,
    }, config_1.default.jwt_secret, config_1.default.jwt_expires_in);
    const encryptedUserData = encryptData(user);
    return {
        token: accessToken,
        userData: encryptedUserData,
    };
};
exports.generateAuthToken = generateAuthToken;
const encryptForgotPasswordResponse = (data) => {
    const ENCRYPTION_KEY = config_1.default.redis_crypto_key;
    const ALGORITHM = "aes-256-cbc";
    const iv = crypto_1.default.randomBytes(16);
    const cipher = crypto_1.default.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let encryptData = cipher.update(data, "utf8", "hex");
    encryptData += cipher.final("hex");
    return iv.toString("hex") + ":" + encryptData;
};
exports.encryptForgotPasswordResponse = encryptForgotPasswordResponse;
const decryptForgotPasswordResponse = (encryptedData) => {
    const ENCRYPTION_KEY = config_1.default.redis_crypto_key;
    const ALGORITHM = "aes-256-cbc";
    const [ivHex, encryptedText] = encryptedData.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto_1.default.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
};
exports.decryptForgotPasswordResponse = decryptForgotPasswordResponse;
// ! Do Not remove it
// export function decryptData(
//   encryptedData: string,
//   secretKey: string,
// ): IUserWithoutPassword {
//   const bytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
//   const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
//   return decryptedData as IUserWithoutPassword;
// }

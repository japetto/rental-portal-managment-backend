import CryptoJS from "crypto-js";
import crypto from "crypto";
import config from "../../../config/config";
import { IUserWithoutPassword } from "./users.interface";
import { jwtHelpers } from "../../../helpers/jwtHelpers";
import { Secret } from "jsonwebtoken";

export function generateUID(userRole: "hotelOwner" | "customer") {
  const uidLength = 20;
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let uid;
  if (userRole === "customer") {
    uid = "c00";
  } else if (userRole === "hotelOwner") {
    uid = "ho00";
  }

  for (let i = 0; i < uidLength; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    uid += characters.charAt(randomIndex);
  }

  return uid;
}

export function encryptData(user: IUserWithoutPassword) {
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
    gender: user?.gender,
    dateOfBirth: user.dateOfBirth,
  };

  const encryptedData = CryptoJS.AES.encrypt(
    JSON.stringify(authData),
    String(config.jwt_secret),
  ).toString();
  return encryptedData;
}

// Generate AuthToken
export const generateAuthToken = (user: IUserWithoutPassword) => {
  const accessToken = jwtHelpers.createToken(
    {
      id: user.uid,
    },
    config.jwt_secret as Secret,
    config.jwt_expires_in as string,
  );

  const encryptedUserData = encryptData(user as any);

  return {
    token: accessToken,
    userData: encryptedUserData,
  };
};

export const encryptForgotPasswordResponse = (data: string) => {
  const ENCRYPTION_KEY = config.redis_crypto_key;
  const ALGORITHM = "aes-256-cbc";

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY),
    iv,
  );
  let encryptData = cipher.update(data, "utf8", "hex");
  encryptData += cipher.final("hex");
  return iv.toString("hex") + ":" + encryptData;
};

export const decryptForgotPasswordResponse = (encryptedData: string) => {
  const ENCRYPTION_KEY = config.redis_crypto_key;
  const ALGORITHM = "aes-256-cbc";

  const [ivHex, encryptedText] = encryptedData.split(":");
  const iv = Buffer.from(ivHex, "hex");

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY),
    iv,
  );
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};

// ! Do Not remove it
// export function decryptData(
//   encryptedData: string,
//   secretKey: string,
// ): IUserWithoutPassword {
//   const bytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
//   const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
//   return decryptedData as IUserWithoutPassword;
// }

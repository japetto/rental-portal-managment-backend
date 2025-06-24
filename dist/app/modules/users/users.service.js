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
exports.UserService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const http_status_1 = __importDefault(require("http-status"));
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const users_schema_1 = require("./users.schema");
const users_utils_1 = require("./users.utils");
//* User Register Custom
const userRegister = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, phoneNumber } = payload;
    const isExistsUser = yield users_schema_1.Users.findOne({
        $or: [{ email }, { phoneNumber }],
    });
    if (isExistsUser) {
        throw new ApiError_1.default(http_status_1.default.CONFLICT, "Email or Contact Already Exists");
    }
    const user = yield users_schema_1.Users.create(payload);
    return (0, users_utils_1.generateAuthToken)(user);
});
//* User Login Custom
const userLogin = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = payload;
    const isExists = yield users_schema_1.Users.findOne({ email: email });
    if (!isExists) {
        throw new ApiError_1.default(http_status_1.default.UNAUTHORIZED, "Invalid Email Or Password");
    }
    const checkPassword = yield bcrypt_1.default.compare(password, isExists.password);
    if (!checkPassword) {
        throw new ApiError_1.default(http_status_1.default.UNAUTHORIZED, "Invalid Email Or Password");
    }
    return (0, users_utils_1.generateAuthToken)(isExists);
});
// //* Check User for Provider Login
// const checkUserForProviderLogin = async (
//   payload: ICheckUserExists,
// ): Promise<IAuthUser | null> => {
//   const { email } = payload;
//   const isExistsUser = await Users.findOne({ email });
//   if (!isExistsUser) {
//     throw new ApiError(httpStatus.NOT_FOUND, "User Dose Not Exists!");
//   }
//   if (isExistsUser) {
//     const updatedUser = await Users.findOneAndUpdate({ email }, isExistsUser, {
//       new: true,
//     });
//     return generateAuthToken(updatedUser as any);
//   }
//   return null;
// };
// //* Provider Login
// const providerLogin = async (payload: IUser): Promise<IAuthUser> => {
//   const { email } = payload;
//   const isExistsUser = await Users.findOne({ email });
//   if (isExistsUser) {
//     if (!isExistsUser.isInvited) {
//       const updatedUser = await Users.findOneAndUpdate(
//         { email },
//         isExistsUser,
//         {
//           new: true,
//         },
//       );
//       return generateAuthToken(updatedUser as any);
//     }
//     if (isExistsUser.isInvited) {
//       return generateAuthToken(isExistsUser as any);
//     }
//   }
//   const isEmailExists = await Users.findOne({ email: email });
//   if (isEmailExists) {
//     throw new ApiError(
//       httpStatus.CONFLICT,
//       "Something went wrong! Please try again",
//     );
//   }
//   const user = await Users.create(payload);
//   return generateAuthToken(user as any);
// };
// //* Update User
// const updateUser = async (
//   userID: string,
//   payload: Partial<IUser>,
//   token: string,
// ): Promise<IAuthUser | null> => {
//   jwtHelpers.jwtVerify(token, config.jwt_secret as Secret);
//   const isExistsUser = await Users.findById({ _id: userID });
//   if (!isExistsUser) {
//     throw new ApiError(httpStatus.NOT_FOUND, "User Not Found");
//   }
//   const {
//     email,
//     phoneNumber,
//     ...updatePayload
//   } = payload;
//   if (email !== undefined || phoneNumber !== undefined) {
//     throw new ApiError(
//       httpStatus.UNAUTHORIZED,
//       "Permission Denied! Please Try Again.",
//     );
//   }
//   if (payload.email) {
//     const isExists = await Users.findOne({ email: payload.email });
//     if (isExists) {
//       throw new ApiError(
//         httpStatus.FORBIDDEN,
//         "Email Already Exists! Try Another One.",
//       );
//     }
//     updatePayload.email = payload.email;
//   }
//   if (payload.phoneNumber) {
//     const isExists = await Users.findOne({
//       phoneNumber: payload.phoneNumber,
//     });
//     if (isExists) {
//       throw new ApiError(
//         httpStatus.FORBIDDEN,
//         "Contact Number Already Exists! Try Another One.",
//       );
//     }
//     updatePayload.contactNumber = payload.contactNumber;
//   }
//   if (location && Object.keys(location).length > 0) {
//     Object.keys(location).map(key => {
//       const locationsKey = `location.${key}`;
//       (updatePayload as any)[locationsKey] =
//         location[key as keyof typeof location];
//     });
//   }
//   if (socialLinks && Object.keys(socialLinks).length > 0) {
//     Object.keys(socialLinks).map(key => {
//       const locationsKey = `socialLinks.${key}`;
//       (updatePayload as any)[locationsKey] =
//         socialLinks[key as keyof typeof socialLinks];
//     });
//   }
//   if (dateOfBirth && Object.keys(dateOfBirth).length > 0) {
//     Object.keys(dateOfBirth).map(key => {
//       const locationsKey = `dateOfBirth.${key}`;
//       (updatePayload as any)[locationsKey] =
//         dateOfBirth[key as keyof typeof dateOfBirth];
//     });
//   }
//   const user = await Users.findOneAndUpdate({ _id: userID }, updatePayload, {
//     new: true,
//   });
//   return generateAuthToken(user as any);
// };
// // * For Updating the password
// const updatePassword = async (
//   payload: IUpdatePassword,
//   token: string,
// ): Promise<IAuthUser | null> => {
//   jwtHelpers.jwtVerify(token, config.jwt_secret as Secret);
//   const { userId, currentPassword, newPassword, confirmPassword } = payload;
//   const isExistsUser = await Users.findById({ _id: userId });
//   if (!isExistsUser) {
//     throw new ApiError(httpStatus.NOT_FOUND, "User Not Found");
//   }
//   const isPassMatched = await bcrypt.compare(
//     currentPassword,
//     isExistsUser.password as string,
//   );
//   if (!isPassMatched) {
//     throw new ApiError(
//       httpStatus.UNAUTHORIZED,
//       "Incorrect current password. Please try again.",
//     );
//   }
//   const isPreviousPass = await bcrypt.compare(
//     newPassword,
//     isExistsUser.password as string,
//   );
//   if (isPreviousPass || currentPassword === newPassword) {
//     throw new ApiError(
//       httpStatus.FORBIDDEN,
//       "New Password Cannot be The Previous Password",
//     );
//   }
//   if (newPassword !== confirmPassword) {
//     throw new ApiError(
//       httpStatus.FORBIDDEN,
//       "New Password and Confirm Password must match.",
//     );
//   }
//   const pass = await bcrypt.hash(newPassword, Number(config.salt_round));
//   isExistsUser.password = pass;
//   const user = await Users.findOneAndUpdate({ _id: userId }, isExistsUser, {
//     new: true,
//   });
//   return generateAuthToken(user as any);
// };
// //* Forgot Password Part-1 Find user via email
// const findUserForForgotPassword = async (
//   email: string,
// ): Promise<IForgetPasswordValidator> => {
//   const user = await Users.findOne(
//     { email: email },
//     {
//       _id: 0,
//       email: 1,
//     },
//   ).lean();
//   if (!user) {
//     throw new ApiError(httpStatus.NOT_FOUND, "Invalid User!");
//   }
//   const redis = new Redis({
//     url: config.redis_host,
//     token: config.redis_password,
//   });
//   const otp = crypto.randomInt(100000, 999999).toString();
//   const dataToEncrypt = JSON.stringify({ otp: otp, verified: false });
//   const encryptData = encryptForgotPasswordResponse(dataToEncrypt);
//   await redis.set(email, encryptData, { ex: 180 });
//   const transporter = nodemailer.createTransport({
//     host: "smtp.gmail.com",
//     port: 587,
//     secure: false,
//     auth: {
//       user: config.nodemailer_user,
//       pass: config.nodemailer_pass,
//     },
//   });
//   await transporter.sendMail({
//     to: email,
//     subject: "OTP For Reset Password",
//     text: `Your OTP is ${otp}`,
//   });
//   return user;
// };
// //* Forgot Password Part-2
// const verifyOtpForForgotPassword = async (email: string, otp: string) => {
//   const user = await Users.findOne(
//     { email: email },
//     {
//       _id: 0,
//       email: 1,
//     },
//   ).lean();
//   if (!user) {
//     throw new ApiError(httpStatus.NOT_FOUND, "Invalid User!");
//   }
//   const redis = new Redis({
//     url: config.redis_host,
//     token: config.redis_password,
//   });
//   const encryptData = await redis.get(email);
//   if (!encryptData) {
//     throw new ApiError(httpStatus.BAD_REQUEST, "OTP expired or not found.");
//   }
//   const decryptedData = decryptForgotPasswordResponse(encryptData as string);
//   const { otp: storedOtp, verified } = JSON.parse(decryptedData);
//   if (Number(storedOtp) !== Number(otp)) {
//     throw new ApiError(httpStatus.BAD_REQUEST, "Invalid OTP!");
//   }
//   if (verified === true) {
//     throw new ApiError(httpStatus.BAD_REQUEST, "OTP Already Verified!");
//   }
//   const updatedData = JSON.stringify({ otp: storedOtp, verified: true });
//   const encryptUpdatedData = encryptForgotPasswordResponse(updatedData);
//   await redis.set(email, encryptUpdatedData, { ex: 180 });
//   return { message: "OTP verified successfully." };
// };
// //* Forgot Password Part-3
// const forgotPassword = async (
//   payload: IUpdatePasswordValidator,
// ): Promise<string | null> => {
//   const { email, password } = payload;
//   const isExistsUser = await Users.findOne({ email: email });
//   if (!isExistsUser) {
//     throw new ApiError(httpStatus.NOT_FOUND, "Invalid User!");
//   }
//   const redis = new Redis({
//     url: config.redis_host,
//     token: config.redis_password,
//   });
//   const encryptedRedisResponse = await redis.get(email);
//   if (!encryptedRedisResponse) {
//     throw new ApiError(
//       httpStatus.BAD_REQUEST,
//       "Failed to Update! Please try again.",
//     );
//   }
//   const decryptedData = decryptForgotPasswordResponse(
//     encryptedRedisResponse as string,
//   );
//   const { verified } = JSON.parse(decryptedData);
//   if (verified !== true) {
//     throw new ApiError(
//       httpStatus.BAD_REQUEST,
//       "Failed to Update! Please try again.",
//     );
//   }
//   const isPreviousPass = await bcrypt.compare(
//     password,
//     isExistsUser.password as string,
//   );
//   if (isPreviousPass) {
//     throw new ApiError(
//       httpStatus.FORBIDDEN,
//       "New Password Cannot be The Previous Password",
//     );
//   }
//   const newPass = await bcrypt.hash(password, Number(config.salt_round));
//   payload.password = newPass;
//   await Users.findOneAndUpdate({ email: email }, payload, {
//     new: true,
//   });
//   await redis.del(email);
//   return null;
// };
exports.UserService = {
    userRegister,
    userLogin,
    // checkUserForProviderLogin,
    // providerLogin,
    // updateUser,
    // updatePassword,
    // findUserForForgotPassword,
    // verifyOtpForForgotPassword,
    // forgotPassword,
};

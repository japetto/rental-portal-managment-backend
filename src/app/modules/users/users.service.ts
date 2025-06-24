import { Redis } from "@upstash/redis";
import bcrypt from "bcrypt";
import crypto from "crypto";
import httpStatus from "http-status";
import { Secret } from "jsonwebtoken";
import nodemailer from "nodemailer";
import config from "../../../config/config";
import ApiError from "../../../errors/ApiError";
import { jwtHelpers } from "../../../helpers/jwtHelpers";
import {
  IAuthUser,
  ICheckUserExists,
  IForgetPasswordValidator,
  ILoginUser,
  IUpdatePassword,
  IUpdatePasswordValidator,
  IUser,
  linkedProvidersEnums,
} from "./users.interface";
import { Users } from "./users.schema";
import {
  decryptForgotPasswordResponse,
  encryptForgotPasswordResponse,
  generateAuthToken,
  generateUID,
} from "./users.utils";

//* User Register Custom
const userRegister = async (payload: IUser): Promise<IAuthUser> => {
  const { email, contactNumber, role } = payload;

  const isExistsUser = await Users.findOne({
    $or: [{ email }, { contactNumber }],
  });
  if (isExistsUser) {
    throw new ApiError(httpStatus.CONFLICT, "Email or Contact Already Exists");
  }

  const uid = generateUID(role);
  const isUIDExists = await Users.findOne({ uid: uid });
  if (isUIDExists) {
    throw new ApiError(
      httpStatus.CONFLICT,
      "Something went wrong! Please try again",
    );
  }
  payload.uid = uid as string;

  payload.linkedProviders = ["CUSTOM"];

  const user = await Users.create(payload);

  return generateAuthToken(user as any);
};

//* User Login Custom
const userLogin = async (payload: ILoginUser): Promise<IAuthUser> => {
  const { email, password } = payload;

  const isExists = await Users.findOne({ email: email });

  if (!isExists) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid Email Or Password");
  }

  const checkPassword = await bcrypt.compare(password, isExists.password);

  if (!checkPassword) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid Email Or Password");
  }

  return generateAuthToken(isExists as any);
};

//* Check User for Provider Login
const checkUserForProviderLogin = async (
  payload: ICheckUserExists,
): Promise<IAuthUser | null> => {
  const { authMethod, email } = payload;

  const isExistsUser = await Users.findOne({ email });
  if (!isExistsUser) {
    throw new ApiError(httpStatus.NOT_FOUND, "User Dose Not Exists!");
  }

  const linkedProviders = isExistsUser.linkedProviders;

  if (isExistsUser && !linkedProviders.includes(authMethod)) {
    linkedProviders.push(authMethod);
    const updatedUser = await Users.findOneAndUpdate({ email }, isExistsUser, {
      new: true,
    });
    return generateAuthToken(updatedUser as any);
  }

  if (isExistsUser && linkedProviders.includes(authMethod)) {
    return generateAuthToken(isExistsUser as any);
  }

  return null;
};

//* Provider Login
const providerLogin = async (
  payload: IUser,
  authMethod: linkedProvidersEnums,
): Promise<IAuthUser> => {
  const { email, role } = payload;

  const isExistsUser = await Users.findOne({ email });
  if (isExistsUser) {
    const linkedProviders = isExistsUser.linkedProviders;
    if (!linkedProviders.includes(authMethod)) {
      linkedProviders.push(authMethod);
      const updatedUser = await Users.findOneAndUpdate(
        { email },
        isExistsUser,
        {
          new: true,
        },
      );
      return generateAuthToken(updatedUser as any);
    }

    if (linkedProviders.includes(authMethod)) {
      return generateAuthToken(isExistsUser as any);
    }
  }

  const uid = generateUID(role);
  const isUIDExists = await Users.findOne({ uid: uid });
  if (isUIDExists) {
    throw new ApiError(
      httpStatus.CONFLICT,
      "Something went wrong! Please try again",
    );
  }
  payload.uid = uid as string;

  payload.linkedProviders = ["CUSTOM", authMethod];

  const user = await Users.create(payload);

  return generateAuthToken(user as any);
};

//* Update User
const updateUser = async (
  userID: string,
  payload: Partial<IUser>,
  token: string,
): Promise<IAuthUser | null> => {
  jwtHelpers.jwtVerify(token, config.jwt_secret as Secret);

  const isExistsUser = await Users.findById({ _id: userID });
  if (!isExistsUser) {
    throw new ApiError(httpStatus.NOT_FOUND, "User Not Found");
  }

  const {
    role,
    uid,
    password,
    location,
    socialLinks,
    dateOfBirth,
    ...updatePayload
  } = payload;

  if (role !== undefined || uid !== undefined || password !== undefined) {
    throw new ApiError(
      httpStatus.UNAUTHORIZED,
      "Permission Denied! Please Try Again.",
    );
  }

  if (payload.email) {
    const isExists = await Users.findOne({ email: payload.email });
    if (isExists) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        "Email Already Exists! Try Another One.",
      );
    }
    updatePayload.email = payload.email;
  }

  if (payload.contactNumber) {
    const isExists = await Users.findOne({
      contactNumber: payload.contactNumber,
    });
    if (isExists) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        "Contact Number Already Exists! Try Another One.",
      );
    }
    updatePayload.contactNumber = payload.contactNumber;
  }

  if (location && Object.keys(location).length > 0) {
    Object.keys(location).map(key => {
      const locationsKey = `location.${key}`;
      (updatePayload as any)[locationsKey] =
        location[key as keyof typeof location];
    });
  }

  if (socialLinks && Object.keys(socialLinks).length > 0) {
    Object.keys(socialLinks).map(key => {
      const locationsKey = `socialLinks.${key}`;
      (updatePayload as any)[locationsKey] =
        socialLinks[key as keyof typeof socialLinks];
    });
  }

  if (dateOfBirth && Object.keys(dateOfBirth).length > 0) {
    Object.keys(dateOfBirth).map(key => {
      const locationsKey = `dateOfBirth.${key}`;
      (updatePayload as any)[locationsKey] =
        dateOfBirth[key as keyof typeof dateOfBirth];
    });
  }

  const user = await Users.findOneAndUpdate({ _id: userID }, updatePayload, {
    new: true,
  });

  return generateAuthToken(user as any);
};

// * For Updating the password
const updatePassword = async (
  payload: IUpdatePassword,
  token: string,
): Promise<IAuthUser | null> => {
  jwtHelpers.jwtVerify(token, config.jwt_secret as Secret);

  const { userId, currentPassword, newPassword, confirmPassword } = payload;

  const isExistsUser = await Users.findById({ _id: userId });
  if (!isExistsUser) {
    throw new ApiError(httpStatus.NOT_FOUND, "User Not Found");
  }

  const isPassMatched = await bcrypt.compare(
    currentPassword,
    isExistsUser.password as string,
  );

  if (!isPassMatched) {
    throw new ApiError(
      httpStatus.UNAUTHORIZED,
      "Incorrect current password. Please try again.",
    );
  }

  const isPreviousPass = await bcrypt.compare(
    newPassword,
    isExistsUser.password as string,
  );

  if (isPreviousPass || currentPassword === newPassword) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "New Password Cannot be The Previous Password",
    );
  }

  if (newPassword !== confirmPassword) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "New Password and Confirm Password must match.",
    );
  }

  const pass = await bcrypt.hash(newPassword, Number(config.salt_round));
  isExistsUser.password = pass;

  const user = await Users.findOneAndUpdate({ _id: userId }, isExistsUser, {
    new: true,
  });

  return generateAuthToken(user as any);
};

//* Forgot Password Part-1 Find user via email
const findUserForForgotPassword = async (
  email: string,
): Promise<IForgetPasswordValidator> => {
  const user = await Users.findOne(
    { email: email },
    {
      _id: 0,
      email: 1,
    },
  ).lean();
  
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "Invalid User!");
  }

  const redis = new Redis({
    url: config.redis_host,
    token: config.redis_password,
  });

  const otp = crypto.randomInt(100000, 999999).toString();
  const dataToEncrypt = JSON.stringify({ otp: otp, verified: false });
  const encryptData = encryptForgotPasswordResponse(dataToEncrypt);
  await redis.set(email, encryptData, { ex: 180 });

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: config.nodemailer_user,
      pass: config.nodemailer_pass,
    },
  });

  await transporter.sendMail({
    to: email,
    subject: "OTP For Reset Password",
    text: `Your OTP is ${otp}`,
  });

  return user;
};

//* Forgot Password Part-2
const verifyOtpForForgotPassword = async (email: string, otp: string) => {
  const user = await Users.findOne(
    { email: email },
    {
      _id: 0,
      email: 1,
    },
  ).lean();
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "Invalid User!");
  }

  const redis = new Redis({
    url: config.redis_host,
    token: config.redis_password,
  });

  const encryptData = await redis.get(email);
  if (!encryptData) {
    throw new ApiError(httpStatus.BAD_REQUEST, "OTP expired or not found.");
  }

  const decryptedData = decryptForgotPasswordResponse(encryptData as string);
  const { otp: storedOtp, verified } = JSON.parse(decryptedData);

  if (Number(storedOtp) !== Number(otp)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid OTP!");
  }

  if (verified === true) {
    throw new ApiError(httpStatus.BAD_REQUEST, "OTP Already Verified!");
  }

  const updatedData = JSON.stringify({ otp: storedOtp, verified: true });
  const encryptUpdatedData = encryptForgotPasswordResponse(updatedData);
  await redis.set(email, encryptUpdatedData, { ex: 180 });

  return { message: "OTP verified successfully." };
};

//* Forgot Password Part-3
const forgotPassword = async (
  payload: IUpdatePasswordValidator,
): Promise<string | null> => {
  const { email, password } = payload;
  const isExistsUser = await Users.findOne({ email: email });
  if (!isExistsUser) {
    throw new ApiError(httpStatus.NOT_FOUND, "Invalid User!");
  }

  const redis = new Redis({
    url: config.redis_host,
    token: config.redis_password,
  });

  const encryptedRedisResponse = await redis.get(email);
  if (!encryptedRedisResponse) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Failed to Update! Please try again.",
    );
  }

  const decryptedData = decryptForgotPasswordResponse(
    encryptedRedisResponse as string,
  );
  const { verified } = JSON.parse(decryptedData);

  if (verified !== true) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Failed to Update! Please try again.",
    );
  }

  const isPreviousPass = await bcrypt.compare(
    password,
    isExistsUser.password as string,
  );

  if (isPreviousPass) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "New Password Cannot be The Previous Password",
    );
  }
  const newPass = await bcrypt.hash(password, Number(config.salt_round));
  payload.password = newPass;

  await Users.findOneAndUpdate({ email: email }, payload, {
    new: true,
  });

  await redis.del(email);

  return null;
};

export const UserService = {
  userRegister,
  userLogin,
  checkUserForProviderLogin,
  providerLogin,
  updateUser,
  updatePassword,
  findUserForForgotPassword,
  verifyOtpForForgotPassword,
  forgotPassword,
};

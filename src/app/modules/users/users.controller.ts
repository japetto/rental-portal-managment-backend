import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { UserService } from "./users.service";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";
import { verifyAuthToken } from "../../../util/verifyAuthToken";

// User Register
const userRegister = catchAsync(async (req: Request, res: Response) => {
  const { ...userInfo } = req.body;

  const result = await UserService.userRegister(userInfo);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Registration Successful",
    data: result,
  });
});

// User Login
const userLogin = catchAsync(async (req: Request, res: Response) => {
  const { ...authCredentials } = req.body;

  const result = await UserService.userLogin(authCredentials);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Login Successful",
    data: result,
  });
});

// Check User Exists
const checkUserForProviderLogin = catchAsync(
  async (req: Request, res: Response) => {
    const { ...userInfo } = req.body;

    const result = await UserService.checkUserForProviderLogin(userInfo);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Login Successful",
      data: result,
    });
  },
);

// Check User Exists
const providerLogin = catchAsync(async (req: Request, res: Response) => {
  const { userInfo, authMethod } = req.body;

  const result = await UserService.providerLogin(userInfo, authMethod);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Login Successful",
    data: result,
  });
});

// Update User
const updatedUser = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { ...payload } = req.body;
  const token = verifyAuthToken(req);

  const result = await UserService.updateUser(id, payload, token);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "User Updated Successfully",
    data: result,
  });
});

// Update User
const updatePassword = catchAsync(async (req: Request, res: Response) => {
  const { ...payload } = req.body;
  const token = verifyAuthToken(req);

  const result = await UserService.updatePassword(payload, token);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "User Updated Successfully",
    data: result,
  });
});

// Find User For Forgot Password
const findUserForForgotPassword = catchAsync(
  async (req: Request, res: Response) => {
    const { email } = req.body;

    const result = await UserService.findUserForForgotPassword(email);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "OTP has been sent to your email",
      data: result,
    });
  },
);

// Find User For Forgot Password
const verifyOtpForForgotPassword = catchAsync(
  async (req: Request, res: Response) => {
    const { email, otp } = req.body;

    const result = await UserService.verifyOtpForForgotPassword(email, otp);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "OTP Successfully Verified!",
      data: result,
    });
  },
);

// Forgot Password
const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const { ...payload } = req.body;
  const result = await UserService.forgotPassword(payload);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Password Updated Successfully",
    data: result,
  });
});

export const UserController = {
  userRegister,
  userLogin,
  checkUserForProviderLogin,
  providerLogin,
  updatedUser,
  updatePassword,
  findUserForForgotPassword,
  verifyOtpForForgotPassword,
  forgotPassword,
};

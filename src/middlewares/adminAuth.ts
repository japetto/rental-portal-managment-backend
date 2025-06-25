import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { Users } from "../app/modules/users/users.schema";
import config from "../config/config";
import ApiError from "../errors/ApiError";
import { jwtHelpers } from "../helpers/jwtHelpers";
import { verifyAuthToken } from "../util/verifyAuthToken";

export const adminAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Get token from request
    const token = verifyAuthToken(req);

    // Verify token
    const verifiedToken = jwtHelpers.jwtVerify(token, config.jwt_secret);

    // Check if user exists
    const user = await Users.findById(verifiedToken.id).select("+password");
    if (!user) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "User not found");
    }

    // Check if user is admin
    if (user.role !== "SUPER_ADMIN") {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        "Access denied. Admin privileges required",
      );
    }

    // Check if user is verified
    // if (!user.isVerified) {
    //   throw new ApiError(httpStatus.UNAUTHORIZED, "Account not verified");
    // }

    // Add user to request
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

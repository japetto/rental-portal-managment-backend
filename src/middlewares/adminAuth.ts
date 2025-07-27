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

    // Check if JWT configuration is set
    if (!config.jwt_secret) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Server configuration error: JWT_SECRET not set",
      );
    }

    if (!config.jwt_expires_in) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Server configuration error: JWT_EXPIRES_IN not set",
      );
    }
    // console.log("🚀 ~ config.jwt_secret:", config.jwt_secret);

    // console.log("🚀 ~ token:", token);

    // Verify token
    const verifiedToken = jwtHelpers.jwtVerify(token, config.jwt_secret);
    // console.log("🚀 ~ verifiedToken:", verifiedToken);

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
    // Handle specific JWT errors
    if (error instanceof Error) {
      if (error.message.includes("jwt expired")) {
        next(
          new ApiError(
            httpStatus.UNAUTHORIZED,
            "Token has expired. Please login again.",
          ),
        );
        return;
      }
      if (error.message.includes("jwt malformed")) {
        next(new ApiError(httpStatus.UNAUTHORIZED, "Invalid token format."));
        return;
      }
      if (error.message.includes("invalid signature")) {
        next(new ApiError(httpStatus.UNAUTHORIZED, "Invalid token signature."));
        return;
      }
      if (error.message.includes("JWT_SECRET is not configured")) {
        next(
          new ApiError(
            httpStatus.INTERNAL_SERVER_ERROR,
            "Server configuration error: JWT_SECRET not set",
          ),
        );
        return;
      }
      if (error.message.includes("JWT_EXPIRES_IN is not configured")) {
        next(
          new ApiError(
            httpStatus.INTERNAL_SERVER_ERROR,
            "Server configuration error: JWT_EXPIRES_IN not set",
          ),
        );
        return;
      }
    }

    next(error);
  }
};

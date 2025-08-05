import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { Users } from "../app/modules/users/users.schema";
import config from "../config/config";
import ApiError from "../errors/ApiError";
import { jwtHelpers } from "../helpers/jwtHelpers";
import { verifyAuthToken } from "../util/verifyAuthToken";

export const userAuth = async (
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

    // Verify token
    const verifiedToken = jwtHelpers.jwtVerify(token, config.jwt_secret);
    console.log("🚀 ~ verifiedToken.id:", verifiedToken.id);

    // Check if user exists and is active
    const user = await Users.findOne({
      _id: verifiedToken.id,
      isDeleted: false,
      isActive: true,
    });
    console.log("🚀 ~ user:", user);
    if (!user) {
      throw new ApiError(
        httpStatus.UNAUTHORIZED,
        "User not found or account is deactivated",
      );
    }

    // Check if user is verified (for non-invited users)
    if (!user.isInvited && !user.isVerified) {
      throw new ApiError(
        httpStatus.UNAUTHORIZED,
        "Account not verified. Please contact administrator.",
      );
    }

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

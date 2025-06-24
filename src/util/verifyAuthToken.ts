import { Request } from "express";
import httpStatus from "http-status";
import ApiError from "../errors/ApiError";

export const verifyAuthToken = (req: Request) => {
  const authorizationHeader = req.headers.authorization;

  // Check if the Authorization header is present
  if (!authorizationHeader) {
    throw new ApiError(
      httpStatus.UNAUTHORIZED,
      "Authorization Token is Missing"
    );
  }

  // Extract the token from the Authorization header
  const token = authorizationHeader.replace("Bearer ", "");

  return token;
};

/* eslint-disable @typescript-eslint/no-unused-vars */
import { ErrorRequestHandler } from "express";
import config from "../config/config";
import { IGenericErrorMessages } from "../interface/error";
import handleValidationError from "../errors/handleValidationError";
import { ZodError } from "zod";
import handleZodError from "../errors/handleZodError";
import ApiError from "../errors/ApiError";
import handleCastError from "../errors/handleCastError";
import handleDuplicationError from "../errors/handleDuplicationError";

const globalErrorHandler: ErrorRequestHandler = (error, req, res, next) => {
  config.node_env === "development"
    ? console.log(`GlobalErrorHandler~~`, error)
    : console.error(`GlobalErrorHandler~~`, error);

  let statusCode = 500;
  let message = "Internal Server Error!";
  let errorMessages: IGenericErrorMessages[] = [];

  if (error?.name === "ValidationError") {
    const simplifiedError = handleValidationError(error);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorMessages = simplifiedError.errorMessages;
  } //
  else if (error?.name === "MongoServerError") {
    const simplifiedError = handleDuplicationError(error);
    statusCode = simplifiedError?.statusCode;
    message = simplifiedError?.message;
    errorMessages = simplifiedError?.errorMessages;
  } //
  else if (error instanceof ZodError) {
    const simplifiedError = handleZodError(error);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorMessages = simplifiedError.errorMessages;
  } //
  else if (error?.name === "CastError") {
    const simplifiedError = handleCastError(error);
    statusCode = simplifiedError?.statusCode;
    message = simplifiedError?.message;
    errorMessages = simplifiedError?.errorMessages;
  } //
  else if (error instanceof ApiError) {
    statusCode = error?.statusCode;
    message = error?.message;
    errorMessages = error?.message
      ? [
          {
            path: "",
            message: error?.message,
          },
        ]
      : [];
  } //
  else if (error instanceof Error) {
    message = error?.message;
    errorMessages = error?.message
      ? [
          {
            path: "",
            message: error?.message,
          },
        ]
      : [];
  }

  res.status(statusCode).send({
    success: false,
    statusCode,
    message,
    errorMessages,
    stack: config.node_env === "production" ? undefined : error?.stack,
  });
};

export default globalErrorHandler;

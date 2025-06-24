import mongoose from "mongoose";
import {
  IGenericErrorMessages,
  IGenericErrorResponse,
} from "../interface/error";

const handleCastError = (
  error: mongoose.Error.CastError
): IGenericErrorResponse => {
  const statusCode = 400;
  const errors: IGenericErrorMessages[] = [
    {
      path: error?.path,
      message: `Invalid _id: '${error.value}' Detected!`,
    },
  ];

  return {
    statusCode: statusCode,
    message: error.name,
    errorMessages: errors,
  };
};

export default handleCastError;

import { IGenericErrorMessages } from "../interface/error";
import { IGenericErrorResponse } from "../interface/error";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleDuplicationError = (error: any): IGenericErrorResponse => {
  const statusCode = 500;
  if (error.code === 11000 && error.keyPattern) {
    const duplicateKey = Object.keys(error.keyPattern)[0];
    const duplicateValue = error.keyValue[duplicateKey];
    const statusCode = 409;

    const errorMessage: IGenericErrorMessages = {
      path: duplicateKey,
      message: `Duplicate key error: '${duplicateKey}' with value '${duplicateValue}'`,
    };

    return {
      statusCode,
      message: "Duplicate Key Error",
      errorMessages: [errorMessage],
    };
  }

  return {
    statusCode,
    message: "Internal Server Error",
    errorMessages: [],
  };
};

export default handleDuplicationError;

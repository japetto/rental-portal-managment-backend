"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleDuplicationError = (error) => {
    const statusCode = 500;
    if (error.code === 11000 && error.keyPattern) {
        const duplicateKey = Object.keys(error.keyPattern)[0];
        const duplicateValue = error.keyValue[duplicateKey];
        const statusCode = 409;
        let message = "Duplicate Key Error";
        let errorMessage;
        // Handle specific duplicate key errors with better messages
        if (duplicateKey === "name") {
            message = "Property Name Already Exists";
            errorMessage = {
                path: duplicateKey,
                message: `A property with the name '${duplicateValue}' already exists. Please choose a different name.`,
            };
        }
        else if (duplicateKey === "propertyName") {
            message = "Property Name Already Exists";
            errorMessage = {
                path: duplicateKey,
                message: `A property with this name already exists. Please choose a different name.`,
            };
        }
        else if (duplicateKey === "email") {
            message = "Email Already Exists";
            errorMessage = {
                path: duplicateKey,
                message: `A user with the email '${duplicateValue}' already exists. Please use a different email address.`,
            };
        }
        else if (duplicateKey === "phoneNumber") {
            message = "Phone Number Already Exists";
            errorMessage = {
                path: duplicateKey,
                message: `A user with the phone number '${duplicateValue}' already exists. Please use a different phone number.`,
            };
        }
        else {
            // Generic duplicate key error
            errorMessage = {
                path: duplicateKey,
                message: `Duplicate key error: '${duplicateKey}' with value '${duplicateValue}'`,
            };
        }
        return {
            statusCode,
            message,
            errorMessages: [errorMessage],
        };
    }
    return {
        statusCode,
        message: "Internal Server Error",
        errorMessages: [],
    };
};
exports.default = handleDuplicationError;

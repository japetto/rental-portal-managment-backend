import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import {
  getAllPropertiesWithStripeDetailsService,
  getPropertiesWithAvailableStripeAccountsService,
  getPropertiesWithoutStripeAccountsService,
} from "./properties.service";

export const getAllPropertiesWithStripeDetails = catchAsync(
  async (req: Request, res: Response) => {
    const data = await getAllPropertiesWithStripeDetailsService();
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Properties with Stripe details retrieved successfully",
      data,
    });
  },
);

export const getPropertiesWithAvailableStripeAccounts = catchAsync(
  async (req: Request, res: Response) => {
    const data = await getPropertiesWithAvailableStripeAccountsService();
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message:
        "Properties with available Stripe accounts retrieved successfully",
      data,
    });
  },
);

export const getPropertiesWithoutStripeAccounts = catchAsync(
  async (req: Request, res: Response) => {
    const data = await getPropertiesWithoutStripeAccountsService();
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Properties without Stripe accounts retrieved successfully",
      data,
    });
  },
);

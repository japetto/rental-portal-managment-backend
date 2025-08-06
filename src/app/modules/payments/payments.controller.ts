import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";

import { PaymentService } from "./payment.service";
import { Payments } from "./payments.schema";

// Get payment data by receipt number (for payment success page)
const getPaymentByReceipt = catchAsync(async (req: Request, res: Response) => {
  const { receiptNumber } = req.params;

  const payment = await Payments.findOne({
    receiptNumber,
    isDeleted: false,
  }).populate([
    {
      path: "tenantId",
      select: "name email phone",
    },
    {
      path: "propertyId",
      select: "name address propertyType lotNumber unitNumber",
    },
    {
      path: "spotId",
      select: "spotNumber spotType",
    },
    {
      path: "stripeAccountId",
      select: "name stripeAccountId",
    },
  ]);

  if (!payment) {
    return sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: "Payment not found",
      data: null,
    });
  }

  // Format the payment data for the frontend
  const paymentData = {
    id: payment._id,
    receiptNumber: payment.receiptNumber,
    amount: payment.amount,
    totalAmount: payment.totalAmount,
    lateFeeAmount: payment.lateFeeAmount,
    type: payment.type,
    status: payment.status,
    dueDate: payment.dueDate,
    paidDate: payment.paidDate,
    description: payment.description,
    paymentMethod: payment.paymentMethod,
    transactionId: payment.transactionId,
    stripeTransactionId: payment.stripeTransactionId,
    stripePaymentLinkId: payment.stripePaymentLinkId,

    // Tenant information
    tenant: {
      id: (payment.tenantId as any)._id,
      name: (payment.tenantId as any).name,
      email: (payment.tenantId as any).email,
      phone: (payment.tenantId as any).phone,
    },

    // Property information
    property: {
      id: (payment.propertyId as any)._id,
      name: (payment.propertyId as any).name,
      address: (payment.propertyId as any).address,
      propertyType: (payment.propertyId as any).propertyType,
      lotNumber: (payment.propertyId as any).lotNumber,
      unitNumber: (payment.propertyId as any).unitNumber,
    },

    // Parking spot information
    spot: payment.spotId
      ? {
          id: (payment.spotId as any)._id,
          spotNumber: (payment.spotId as any).spotNumber,
          spotType: (payment.spotId as any).spotType,
        }
      : null,

    // Stripe account information
    stripeAccount: payment.stripeAccountId
      ? {
          id: (payment.stripeAccountId as any)._id,
          name: (payment.stripeAccountId as any).name,
          stripeAccountId: (payment.stripeAccountId as any).stripeAccountId,
        }
      : null,

    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment data retrieved successfully",
    data: paymentData,
  });
});

// Get payment link details
const getPaymentLinkDetails = catchAsync(
  async (req: Request, res: Response) => {
    const { paymentLinkId } = req.params;

    // Get the payment to find the associated Stripe account
    const payment = await Payments.findOne({
      stripePaymentLinkId: paymentLinkId,
    }).populate("stripeAccountId");

    if (!payment) {
      return sendResponse(res, {
        statusCode: httpStatus.NOT_FOUND,
        success: false,
        message: "Payment link not found",
        data: null,
      });
    }

    const paymentLink = await PaymentService.getPaymentLinkDetails(
      paymentLinkId,
      (payment.stripeAccountId as any).stripeSecretKey,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Payment link details retrieved successfully",
      data: paymentLink,
    });
  },
);

// Get comprehensive tenant payment status with automatic payment creation
const getTenantPaymentStatus = catchAsync(
  async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    const result = await PaymentService.getTenantPaymentStatusEnhanced({
      tenantId,
      createdBy: req.user?.id || "SYSTEM",
    });

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Tenant payment status retrieved successfully",
      data: result,
    });
  },
);

// Get user's payment history
const getPaymentHistory = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?._id?.toString();

  if (!userId) {
    return sendResponse(res, {
      statusCode: httpStatus.UNAUTHORIZED,
      success: false,
      message: "User not authenticated",
      data: null,
    });
  }

  const result = await PaymentService.getPaymentHistory(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment history retrieved successfully",
    data: result,
  });
});

// Get user's rent summary
const getRentSummary = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?._id?.toString();

  if (!userId) {
    return sendResponse(res, {
      statusCode: httpStatus.UNAUTHORIZED,
      success: false,
      message: "User not authenticated",
      data: null,
    });
  }

  try {
    const result = await PaymentService.getRentSummary(userId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: result.hasActiveLease
        ? "Rent summary retrieved successfully"
        : "No active lease found",
      data: result,
    });
  } catch (error: any) {
    console.error("Error in getRentSummary controller:", error);

    return sendResponse(res, {
      statusCode: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
      message: "Error retrieving rent summary",
      data: {
        error: error.message,
        hasActiveLease: false,
      },
    });
  }
});

// Create payment with link
const createPaymentWithLink = catchAsync(
  async (req: Request, res: Response) => {
    const { tenantId, currentDate } = req.body;
    const createdBy = req.user?.id || "SYSTEM";

    try {
      const result = await PaymentService.createPaymentWithLink({
        tenantId,
        currentDate,
        createdBy,
      });

      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Payment with link created successfully",
        data: result,
      });
    } catch (error: any) {
      // Handle specific error messages for better user experience
      if (
        error.message.includes("You have already paid for") &&
        error.message.includes("You cannot pay more than one month ahead")
      ) {
        return sendResponse(res, {
          statusCode: httpStatus.BAD_REQUEST,
          success: false,
          message: "Payment Limit Reached",
          data: {
            error: error.message,
            warning: error.message,
            paymentStatus: "LIMIT_REACHED",
          },
        });
      } else if (error.message.includes("already exists and is pending")) {
        return sendResponse(res, {
          statusCode: httpStatus.CONFLICT,
          success: false,
          message: "Payment Already Pending",
          data: {
            error: error.message,
            paymentStatus: "PENDING",
          },
        });
      } else if (error.message.includes("is overdue")) {
        return sendResponse(res, {
          statusCode: httpStatus.BAD_REQUEST,
          success: false,
          message: "Overdue Payment",
          data: {
            error: error.message,
            paymentStatus: "OVERDUE",
          },
        });
      } else {
        // Re-throw other errors to be handled by global error handler
        throw error;
      }
    }
  },
);

export const PaymentController = {
  getPaymentByReceipt,
  getPaymentLinkDetails,
  getTenantPaymentStatus,
  getPaymentHistory,
  getRentSummary,
  createPaymentWithLink,
};

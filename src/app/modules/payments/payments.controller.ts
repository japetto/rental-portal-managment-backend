import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";

import { PaymentService } from "./payment.service";
import { Payments } from "./payments.schema";

// Get payment data by Stripe session ID (more secure for payment success page)
const getReceiptBySessionId = catchAsync(
  async (req: Request, res: Response) => {
    const { session_id, accountId } = req.query;
    console.log("🚀 ~ accountId:", accountId);
    console.log("🚀 ~ session_id:", session_id);

    if (!session_id || typeof session_id !== "string") {
      return sendResponse(res, {
        statusCode: httpStatus.BAD_REQUEST,
        success: false,
        message: "Session ID is required",
        data: null,
      });
    }

    try {
      const paymentData = await PaymentService.getReceiptBySessionId(
        session_id,
        accountId as string | undefined,
      );

      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Payment data retrieved successfully",
        data: paymentData,
      });
    } catch (error: any) {
      console.error("Error retrieving receipt by session ID:", error);

      return sendResponse(res, {
        statusCode: httpStatus.NOT_FOUND,
        success: false,
        message: error.message || "Payment not found",
        data: null,
      });
    }
  },
);

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

      // Check if this is a pending payment response
      if (result.hasPendingPayment) {
        return sendResponse(res, {
          statusCode: httpStatus.OK,
          success: true,
          message: result.message,
          data: {
            hasPendingPayment: true,
            pendingPayment: result.pendingPayment,
            paymentLink: result.paymentLink,
            amount: result.amount,
            dueDate: result.dueDate,
            description: result.description,
            createdAt: result.createdAt,
            paymentStatus: "PENDING",
          },
        });
      }

      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Payment with link created successfully",
        data: {
          hasPendingPayment: false,
          paymentLink: result.paymentLink,
          amount: result.amount,
          dueDate: result.dueDate,
          description: result.description,
          isFirstTimePayment: result.isFirstTimePayment,
          includeDeposit: result.includeDeposit,
          warningMessage: result.warningMessage,
          lease: result.lease,
        },
      });
    } catch (error: any) {
      if (
        error.message.includes(
          "You have already paid for the current month and next month",
        )
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
        throw error;
      }
    }
  },
);

// Add new controller method to verify payment link ownership
const verifyPaymentLink = catchAsync(async (req: Request, res: Response) => {
  const { paymentLinkId } = req.params;
  const tenantId = req.user?.id;

  if (!tenantId) {
    return sendResponse(res, {
      statusCode: httpStatus.UNAUTHORIZED,
      success: false,
      message: "User not authenticated",
      data: {
        error: "Authentication required",
      },
    });
  }

  try {
    const verificationResult = await PaymentService.verifyPaymentLinkOwnership(
      paymentLinkId,
      tenantId,
    );

    if (!verificationResult.isValid) {
      return sendResponse(res, {
        statusCode: httpStatus.BAD_REQUEST,
        success: false,
        message: verificationResult.message,
        data: {
          isValid: false,
          message: verificationResult.message,
        },
      });
    }

    // Get detailed payment information
    const pendingPaymentDetails =
      await PaymentService.getPendingPaymentDetails(tenantId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Payment link is valid",
      data: {
        isValid: true,
        message: verificationResult.message,
        paymentRecord: verificationResult.paymentRecord,
        pendingPayment: pendingPaymentDetails,
      },
    });
  } catch (error: any) {
    console.error("Error verifying payment link:", error);
    sendResponse(res, {
      statusCode: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
      message: "Error verifying payment link",
      data: {
        error: error.message,
      },
    });
  }
});

export const PaymentController = {
  getReceiptBySessionId,
  getPaymentLinkDetails,
  getTenantPaymentStatus,
  getPaymentHistory,
  getRentSummary,
  createPaymentWithLink,
  verifyPaymentLink,
  // Admin: get specific tenant payment history
  getTenantPaymentHistory: catchAsync(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    const result = await PaymentService.getPaymentHistory(tenantId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Tenant payment history retrieved successfully",
      data: result,
    });
  }),
};

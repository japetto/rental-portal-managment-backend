import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import {
  createPaymentLink as createPaymentLinkService,
  createPaymentWithLinkEnhanced,
  getPaymentHistory as getPaymentHistoryService,
  getPaymentLinkDetails as getPaymentLinkDetailsService,
  getRentSummary as getRentSummaryService,
  getTenantPaymentStatusEnhanced,
} from "./payment.service";
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

// Create a new payment with unique payment link - Enhanced for first-time payments
const createPaymentWithLink = catchAsync(
  async (req: Request, res: Response) => {
    const { tenantId, currentDate } = req.body;

    const result = await createPaymentWithLinkEnhanced({
      tenantId,
      currentDate,
      createdBy: req.user?.id || "SYSTEM",
    });

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: result.isFirstTimePayment
        ? "First-time rent payment link created successfully"
        : "Rent payment link created successfully",
      data: {
        paymentLink: {
          id: result.paymentLink.id,
          url: result.paymentLink.url,
        },
        receiptNumber: result.receiptNumber,
        lease: result.lease,
        paymentInfo: result.paymentInfo,
      },
    });
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

    const paymentLink = await getPaymentLinkDetailsService(
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

    const result = await getTenantPaymentStatusEnhanced({
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

  const result = await getPaymentHistoryService(userId);

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

  const result = await getRentSummaryService(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.hasActiveLease
      ? "Rent summary retrieved successfully"
      : "No active lease found",
    data: result,
  });
});

// Create payment link for a specific payment
const createPaymentLink = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?._id?.toString();
  const { paymentId } = req.params;

  if (!userId) {
    return sendResponse(res, {
      statusCode: httpStatus.UNAUTHORIZED,
      success: false,
      message: "User not authenticated",
      data: null,
    });
  }

  // Find the payment and verify it belongs to the user
  const payment = await Payments.findOne({
    _id: paymentId,
    tenantId: userId,
    status: { $in: ["PENDING", "OVERDUE"] },
    isDeleted: false,
  });

  if (!payment) {
    return sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: "Payment not found or not eligible for payment",
      data: null,
    });
  }

  try {
    const paymentLink = await createPaymentLinkService({
      tenantId: payment.tenantId.toString(),
      propertyId: payment.propertyId.toString(),
      spotId: payment.spotId.toString(),
      amount: payment.amount,
      type: payment.type,
      dueDate: payment.dueDate,
      description: payment.description,
      lateFeeAmount: payment.lateFeeAmount,
      receiptNumber: payment.receiptNumber,
    });

    // Update payment record with the new payment link
    await Payments.findByIdAndUpdate(payment._id, {
      stripePaymentLinkId: paymentLink.id,
    });

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Payment link created successfully",
      data: {
        paymentId: payment._id,
        paymentLink: {
          id: paymentLink.id,
          url: paymentLink.url,
        },
      },
    });
  } catch (error: any) {
    sendResponse(res, {
      statusCode: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
      message: "Failed to create payment link",
      data: null,
    });
  }
});

export const PaymentController = {
  getPaymentByReceipt,
  createPaymentWithLink,
  getPaymentLinkDetails,
  getTenantPaymentStatus,
  getPaymentHistory,
  getRentSummary,
  createPaymentLink,
};

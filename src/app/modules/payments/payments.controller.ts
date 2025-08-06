import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import {
  createPaymentWithLinkEnhanced,
  getPaymentLinkDetails as getPaymentLinkDetailsService,
  getTenantPaymentStatusEnhanced,
} from "../stripe/stripe.service";
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

export const PaymentController = {
  getPaymentByReceipt,
  createPaymentWithLink,
  getPaymentLinkDetails,
  getTenantPaymentStatus,
};

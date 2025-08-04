import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
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

export const PaymentController = {
  getPaymentByReceipt,
};

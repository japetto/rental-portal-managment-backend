import { Request, Response } from "express";
import httpStatus from "http-status";
import Stripe from "stripe";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { Payments } from "../payments/payments.schema";
import { Users } from "../users/users.schema";
import {
  createStripeAccount as createStripeAccountService,
  deleteStripeAccount as deleteStripeAccountService,
  getAccountStatistics as getAccountStatisticsService,
  getAllStripeAccounts as getAllStripeAccountsService,
  getAssignablePropertiesForAccount as getAssignablePropertiesForAccountService,
  getAvailableStripeAccounts as getAvailableStripeAccountsService,
  getDefaultAccount as getDefaultAccountService,
  getStripeAccountById as getStripeAccountByIdService,
  getStripeAccountsByProperty as getStripeAccountsByPropertyService,
  getUnassignedProperties as getUnassignedPropertiesService,
  linkPropertiesToAccount as linkPropertiesToAccountService,
  setDefaultAccount as setDefaultAccountService,
  StripeService,
  unlinkPropertiesFromAccount as unlinkPropertiesFromAccountService,
  updateStripeAccount as updateStripeAccountService,
  verifyStripeAccount as verifyStripeAccountService,
} from "./stripe.service";

// Create a new Stripe account for a property
export const createStripeAccount = catchAsync(
  async (req: Request, res: Response) => {
    const {
      name,
      description,
      stripeAccountId,
      stripeSecretKey,
      accountType = "STANDARD",
      isGlobalAccount = false,
      isDefaultAccount = false,
      metadata,
    } = req.body;

    // Prepare account data with proper defaults
    const accountData = {
      name,
      description: description || undefined,
      stripeAccountId,
      stripeSecretKey,
      accountType,

      isGlobalAccount: Boolean(isGlobalAccount),
      isDefaultAccount: Boolean(isDefaultAccount),
      propertyIds: [], // Start with empty property array
      metadata: metadata || undefined,
    };

    try {
      const stripeAccount = await createStripeAccountService(accountData);

      sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message:
          stripeAccount.message ||
          "Stripe account created and verified successfully",
        data: stripeAccount,
      });
    } catch (error: any) {
      if (error.message === "Stripe account ID already exists") {
        return sendResponse(res, {
          statusCode: httpStatus.CONFLICT,
          success: false,
          message: error.message,
          data: null,
        });
      }
      if (error.message === "Stripe account with this name already exists") {
        return sendResponse(res, {
          statusCode: httpStatus.CONFLICT,
          success: false,
          message: error.message,
          data: null,
        });
      }
      if (
        error.message ===
        "Stripe secret key is already in use by another account"
      ) {
        return sendResponse(res, {
          statusCode: httpStatus.CONFLICT,
          success: false,
          message: error.message,
          data: null,
        });
      }
      if (error.message === "Another account is already set as default") {
        return sendResponse(res, {
          statusCode: httpStatus.CONFLICT,
          success: false,
          message: error.message,
          data: null,
        });
      }
      if (error.message === "Duplicate account entry") {
        return sendResponse(res, {
          statusCode: httpStatus.CONFLICT,
          success: false,
          message: "Account with these details already exists",
          data: null,
        });
      }
      if (
        error.message &&
        error.message.includes("Account verification failed")
      ) {
        return sendResponse(res, {
          statusCode: httpStatus.BAD_REQUEST,
          success: false,
          message: error.message,
          data: null,
        });
      }
      throw error;
    }
  },
);

// Link multiple properties to a Stripe account
export const linkPropertiesToAccount = catchAsync(
  async (req: Request, res: Response) => {
    const { accountId, propertyIds } = req.body;

    try {
      const updatedAccount = await linkPropertiesToAccountService(
        accountId,
        propertyIds,
      );

      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Properties linked to Stripe account successfully",
        data: updatedAccount,
      });
    } catch (error: any) {
      if (error.message === "Stripe account not found") {
        return sendResponse(res, {
          statusCode: httpStatus.NOT_FOUND,
          success: false,
          message: error.message,
          data: null,
        });
      }
      if (error.message.includes("One or more properties not found")) {
        return sendResponse(res, {
          statusCode: httpStatus.NOT_FOUND,
          success: false,
          message: error.message,
          data: null,
        });
      }
      if (error.message.includes("already assigned to other accounts")) {
        return sendResponse(res, {
          statusCode: httpStatus.CONFLICT,
          success: false,
          message: error.message,
          data: null,
        });
      }
      throw error;
    }
  },
);

// Unlink properties from a Stripe account
export const unlinkPropertiesFromAccount = catchAsync(
  async (req: Request, res: Response) => {
    const { accountId, propertyIds } = req.body;

    try {
      const updatedAccount = await unlinkPropertiesFromAccountService(
        accountId,
        propertyIds,
      );

      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Properties unlinked from Stripe account successfully",
        data: updatedAccount,
      });
    } catch (error: any) {
      if (error.message === "Stripe account not found") {
        return sendResponse(res, {
          statusCode: httpStatus.NOT_FOUND,
          success: false,
          message: error.message,
          data: null,
        });
      }
      throw error;
    }
  },
);

// Set an account as default
export const setDefaultAccount = catchAsync(
  async (req: Request, res: Response) => {
    const { accountId } = req.body;

    try {
      const updatedAccount = await setDefaultAccountService(accountId);

      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Default account set successfully",
        data: updatedAccount,
      });
    } catch (error: any) {
      if (error.message === "Stripe account not found") {
        return sendResponse(res, {
          statusCode: httpStatus.NOT_FOUND,
          success: false,
          message: error.message,
          data: null,
        });
      }
      throw error;
    }
  },
);

// Get default account
export const getDefaultAccount = catchAsync(
  async (req: Request, res: Response) => {
    try {
      const defaultAccount = await getDefaultAccountService();

      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Default account retrieved successfully",
        data: defaultAccount,
      });
    } catch (error: any) {
      if (error.message === "No default account found") {
        return sendResponse(res, {
          statusCode: httpStatus.NOT_FOUND,
          success: false,
          message: error.message,
          data: null,
        });
      }
      throw error;
    }
  },
);

// Get all Stripe accounts with comprehensive property information
export const getAllStripeAccounts = catchAsync(
  async (req: Request, res: Response) => {
    const comprehensiveData = await getAllStripeAccountsService();

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message:
        "Stripe accounts and property assignments retrieved successfully",
      data: comprehensiveData,
    });
  },
);

// Get Stripe account by ID
export const getStripeAccountById = catchAsync(
  async (req: Request, res: Response) => {
    const { accountId } = req.params;

    try {
      const account = await getStripeAccountByIdService(accountId);

      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Stripe account retrieved successfully",
        data: account,
      });
    } catch (error: any) {
      if (error.message === "Stripe account not found") {
        return sendResponse(res, {
          statusCode: httpStatus.NOT_FOUND,
          success: false,
          message: error.message,
          data: null,
        });
      }
      throw error;
    }
  },
);

// Get Stripe accounts by property ID
export const getStripeAccountsByProperty = catchAsync(
  async (req: Request, res: Response) => {
    const { propertyId } = req.params;

    const accounts = await getStripeAccountsByPropertyService(propertyId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Stripe accounts retrieved successfully",
      data: accounts,
    });
  },
);

// Update Stripe account
export const updateStripeAccount = catchAsync(
  async (req: Request, res: Response) => {
    const { accountId } = req.params;
    const updateData = req.body;

    try {
      const account = await updateStripeAccountService(accountId, updateData);

      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Stripe account updated successfully",
        data: account,
      });
    } catch (error: any) {
      if (error.message === "Stripe account not found") {
        return sendResponse(res, {
          statusCode: httpStatus.NOT_FOUND,
          success: false,
          message: error.message,
          data: null,
        });
      }
      if (error.message === "Another account is already set as default") {
        return sendResponse(res, {
          statusCode: httpStatus.CONFLICT,
          success: false,
          message: error.message,
          data: null,
        });
      }
      throw error;
    }
  },
);

// Delete Stripe account (soft delete)
export const deleteStripeAccount = catchAsync(
  async (req: Request, res: Response) => {
    const { accountId } = req.params;

    try {
      await deleteStripeAccountService(accountId);

      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Stripe account deleted successfully",
        data: null,
      });
    } catch (error: any) {
      if (error.message === "Stripe account not found") {
        return sendResponse(res, {
          statusCode: httpStatus.NOT_FOUND,
          success: false,
          message: error.message,
          data: null,
        });
      }
      throw error;
    }
  },
);

// Verify Stripe account with Stripe API
export const verifyStripeAccount = catchAsync(
  async (req: Request, res: Response) => {
    const { accountId } = req.params;

    try {
      const account = await verifyStripeAccountService(accountId);

      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: account.message || "Stripe account verified successfully",
        data: account,
      });
    } catch (error: any) {
      if (error.message === "Stripe account not found") {
        return sendResponse(res, {
          statusCode: httpStatus.NOT_FOUND,
          success: false,
          message: error.message,
          data: null,
        });
      }
      if (error.message.includes("Account verification failed")) {
        return sendResponse(res, {
          statusCode: httpStatus.BAD_REQUEST,
          success: false,
          message: error.message,
          data: null,
        });
      }
      throw error;
    }
  },
);

// Get available Stripe accounts for a property (including global and default)
export const getAvailableStripeAccounts = catchAsync(
  async (req: Request, res: Response) => {
    const { propertyId } = req.params;

    try {
      const result = await getAvailableStripeAccountsService(propertyId);

      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Available Stripe accounts retrieved successfully",
        data: result,
      });
    } catch (error: any) {
      if (error.message === "Property not found") {
        return sendResponse(res, {
          statusCode: httpStatus.NOT_FOUND,
          success: false,
          message: error.message,
          data: null,
        });
      }
      throw error;
    }
  },
);

// Get unassigned properties (properties not linked to any Stripe account)
export const getUnassignedProperties = catchAsync(
  async (req: Request, res: Response) => {
    const unassignedProperties = await getUnassignedPropertiesService();

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Unassigned properties retrieved successfully",
      data: unassignedProperties,
    });
  },
);

// Get properties that can be assigned to a specific Stripe account
export const getAssignablePropertiesForAccount = catchAsync(
  async (req: Request, res: Response) => {
    const { accountId } = req.params;

    try {
      const assignableProperties =
        await getAssignablePropertiesForAccountService(accountId);

      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Assignable properties retrieved successfully",
        data: assignableProperties,
      });
    } catch (error: any) {
      if (error.message === "Stripe account not found") {
        return sendResponse(res, {
          statusCode: httpStatus.NOT_FOUND,
          success: false,
          message: error.message,
          data: null,
        });
      }
      throw error;
    }
  },
);

// Create a new payment with unique payment link - Enhanced for first-time payments
export const createPaymentWithLink = catchAsync(
  async (req: Request, res: Response) => {
    const { tenantId, currentDate } = req.body;

    const stripeService = new StripeService();

    // Get active lease for the tenant
    const { Leases } = await import("../leases/leases.schema");
    const activeLease = await Leases.findOne({
      tenantId,
      leaseStatus: "ACTIVE",
      isDeleted: false,
    }).populate("propertyId spotId");

    if (!activeLease) {
      return sendResponse(res, {
        statusCode: httpStatus.NOT_FOUND,
        success: false,
        message: "No active lease found for this tenant",
        data: null,
      });
    }

    // Get payment history to determine if this is a first-time payment
    const { Payments } = await import("../payments/payments.schema");
    const paymentHistory = await Payments.find({
      tenantId,
      type: "RENT",
      status: { $in: ["PAID", "PENDING", "OVERDUE"] },
      isDeleted: false,
    }).sort({ dueDate: 1 });

    // Calculate appropriate due date based on lease start and current date
    const effectiveCurrentDate = currentDate
      ? new Date(currentDate)
      : new Date();
    let paymentDueDate: Date;
    let paymentAmount: number;
    let isFirstTimePayment = false;
    let paymentDescription: string;

    // Determine payment based on lease start and payment history
    if (paymentHistory.length === 0) {
      // First-time payment - use lease start date as due date
      isFirstTimePayment = true;
      paymentDueDate = new Date(activeLease.leaseStart);
      paymentAmount = activeLease.rentAmount;
      paymentDescription = "First Month Rent Payment";

      // Check if lease started mid-month and adjust amount if needed
      const leaseStartDay = activeLease.leaseStart.getDate();
      if (leaseStartDay > 1) {
        // Pro-rate the first month's rent
        const daysInMonth = new Date(
          activeLease.leaseStart.getFullYear(),
          activeLease.leaseStart.getMonth() + 1,
          0,
        ).getDate();
        const remainingDays = daysInMonth - leaseStartDay + 1;
        paymentAmount = Math.round(
          (activeLease.rentAmount / daysInMonth) * remainingDays,
        );
        paymentDescription = `Pro-rated First Month Rent (${remainingDays} days)`;
      }
    } else {
      // Not first-time payment - use current month's 1st day
      const currentMonth = new Date(
        effectiveCurrentDate.getFullYear(),
        effectiveCurrentDate.getMonth(),
        1,
      );

      // Check if we already have a payment for current month
      const existingCurrentMonthPayment = paymentHistory.find(payment => {
        const paymentMonth = new Date(
          payment.dueDate.getFullYear(),
          payment.dueDate.getMonth(),
          1,
        );
        return paymentMonth.getTime() === currentMonth.getTime();
      });

      if (existingCurrentMonthPayment) {
        return sendResponse(res, {
          statusCode: httpStatus.CONFLICT,
          success: false,
          message: "Rent payment for current month already exists",
          data: {
            existingPayment: {
              id: existingCurrentMonthPayment._id,
              receiptNumber: existingCurrentMonthPayment.receiptNumber,
              status: existingCurrentMonthPayment.status,
              stripePaymentLinkId:
                existingCurrentMonthPayment.stripePaymentLinkId,
            },
          },
        });
      }

      paymentDueDate = currentMonth;
      paymentAmount = activeLease.rentAmount;
      paymentDescription = "Monthly Rent Payment";
    }

    // Check if payment already exists for the calculated month
    const existingPayment = await Payments.findOne({
      tenantId,
      type: "RENT",
      dueDate: {
        $gte: new Date(
          paymentDueDate.getFullYear(),
          paymentDueDate.getMonth(),
          1,
        ),
        $lt: new Date(
          paymentDueDate.getFullYear(),
          paymentDueDate.getMonth() + 1,
          1,
        ),
      },
      isDeleted: false,
    });

    if (existingPayment) {
      return sendResponse(res, {
        statusCode: httpStatus.CONFLICT,
        success: false,
        message: "Rent payment for this month already exists",
        data: {
          existingPayment: {
            id: existingPayment._id,
            receiptNumber: existingPayment.receiptNumber,
            status: existingPayment.status,
            stripePaymentLinkId: existingPayment.stripePaymentLinkId,
          },
        },
      });
    }

    const result = await stripeService.createPaymentWithLink({
      tenantId,
      propertyId: (activeLease.propertyId as any)._id.toString(),
      spotId: (activeLease.spotId as any)._id.toString(),
      amount: paymentAmount,
      type: "RENT",
      dueDate: paymentDueDate,
      description: paymentDescription,
      lateFeeAmount: 0,
      createdBy: req.user?.id || "SYSTEM",
    });

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: isFirstTimePayment
        ? "First-time rent payment link created successfully"
        : "Rent payment link created successfully",
      data: {
        payment: result.payment,
        paymentLink: {
          id: result.paymentLink.id,
          url: result.paymentLink.url,
          expiresAt: (result.paymentLink as any).expires_at,
        },
        lease: {
          id: activeLease._id,
          rentAmount: activeLease.rentAmount,
          leaseType: activeLease.leaseType,
          leaseStatus: activeLease.leaseStatus,
          leaseStart: activeLease.leaseStart,
        },
        paymentInfo: {
          isFirstTimePayment,
          calculatedAmount: paymentAmount,
          originalRentAmount: activeLease.rentAmount,
          dueDate: paymentDueDate,
          description: paymentDescription,
        },
      },
    });
  },
);

// Get payment link details
export const getPaymentLinkDetails = catchAsync(
  async (req: Request, res: Response) => {
    const { paymentLinkId } = req.params;

    // Get the payment to find the associated Stripe account
    const { Payments } = await import("../payments/payments.schema");
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

    const stripeService = new StripeService();
    const paymentLink = await stripeService.getPaymentLinkDetails(
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
export const getTenantPaymentStatus = catchAsync(
  async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    // Get active lease for the tenant
    const { Leases } = await import("../leases/leases.schema");
    const activeLease = await Leases.findOne({
      tenantId,
      leaseStatus: "ACTIVE",
      isDeleted: false,
    }).populate("propertyId spotId");

    if (!activeLease) {
      return sendResponse(res, {
        statusCode: httpStatus.NOT_FOUND,
        success: false,
        message: "No active lease found for this tenant",
        data: null,
      });
    }

    // Get payment history to determine if this is a first-time payment
    const { Payments } = await import("../payments/payments.schema");
    const paymentHistory = await Payments.find({
      tenantId,
      type: "RENT",
      status: { $in: ["PAID", "PENDING", "OVERDUE"] },
      isDeleted: false,
    }).sort({ dueDate: 1 });

    // Get current month's payment status
    const currentDate = new Date();
    const currentMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1,
    );

    // Check if payment exists for current month
    const currentMonthPayment = await Payments.findOne({
      tenantId,
      type: "RENT",
      dueDate: {
        $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
        $lt: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
      },
      isDeleted: false,
    });

    // Get all pending/overdue payments
    const pendingPayments = await Payments.find({
      tenantId,
      type: "RENT",
      status: { $in: ["PENDING", "OVERDUE"] },
      isDeleted: false,
    }).sort({ dueDate: 1 });

    // Calculate overdue amounts
    const overduePayments = pendingPayments.filter(
      payment => payment.status === "OVERDUE",
    );
    const totalOverdueAmount = overduePayments.reduce(
      (sum, payment) => sum + payment.totalAmount,
      0,
    );

    // Calculate days overdue for current payment
    const daysOverdue =
      currentMonthPayment && currentMonthPayment.status === "OVERDUE"
        ? Math.floor(
            (currentDate.getTime() - currentMonthPayment.dueDate.getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 0;

    // Determine if we need to create a new payment
    let paymentAction = "NONE";
    let paymentLink = null;
    let newPayment = null;
    let isFirstTimePayment = false;

    if (!currentMonthPayment) {
      // Check if this is a first-time payment
      if (paymentHistory.length === 0) {
        // First-time payment - use lease start date as due date
        isFirstTimePayment = true;
        const paymentDueDate = new Date(activeLease.leaseStart);
        let paymentAmount = activeLease.rentAmount;
        let paymentDescription = "First Month Rent Payment";

        // Check if lease started mid-month and adjust amount if needed
        const leaseStartDay = activeLease.leaseStart.getDate();
        if (leaseStartDay > 1) {
          // Pro-rate the first month's rent
          const daysInMonth = new Date(
            activeLease.leaseStart.getFullYear(),
            activeLease.leaseStart.getMonth() + 1,
            0,
          ).getDate();
          const remainingDays = daysInMonth - leaseStartDay + 1;
          paymentAmount = Math.round(
            (activeLease.rentAmount / daysInMonth) * remainingDays,
          );
          paymentDescription = `Pro-rated First Month Rent (${remainingDays} days)`;
        }

        paymentAction = "CREATE_FIRST_TIME";

        const stripeService = new StripeService();
        try {
          newPayment = await stripeService.createPaymentWithLink({
            tenantId,
            propertyId: (activeLease.propertyId as any)._id.toString(),
            spotId: (activeLease.spotId as any)._id.toString(),
            amount: paymentAmount,
            type: "RENT",
            dueDate: paymentDueDate,
            description: paymentDescription,
            lateFeeAmount: 0,
            createdBy: req.user?.id || "SYSTEM",
          });

          paymentLink = {
            id: newPayment.paymentLink.id,
            url: newPayment.paymentLink.url,
            expiresAt: (newPayment.paymentLink as any).expires_at,
          };
        } catch (error) {
          console.error("Error creating first-time payment:", error);
          paymentAction = "ERROR";
        }
      } else {
        // Not first-time payment - create for current month
        paymentAction = "CREATE_NEW";

        const stripeService = new StripeService();
        try {
          newPayment = await stripeService.createPaymentWithLink({
            tenantId,
            propertyId: (activeLease.propertyId as any)._id.toString(),
            spotId: (activeLease.spotId as any)._id.toString(),
            amount: activeLease.rentAmount,
            type: "RENT",
            dueDate: currentMonth,
            description: "Monthly Rent Payment",
            lateFeeAmount: 0,
            createdBy: req.user?.id || "SYSTEM",
          });

          paymentLink = {
            id: newPayment.paymentLink.id,
            url: newPayment.paymentLink.url,
            expiresAt: (newPayment.paymentLink as any).expires_at,
          };
        } catch (error) {
          console.error("Error creating payment:", error);
          paymentAction = "ERROR";
        }
      }
    } else if (currentMonthPayment.status === "PENDING") {
      // Payment exists but is pending - check if payment link exists
      paymentAction = "PENDING";

      if (currentMonthPayment.stripePaymentLinkId) {
        // Get existing payment link details
        const stripeService = new StripeService();
        try {
          const { StripeAccounts } = await import(
            "../stripe/stripe-accounts.schema"
          );
          const stripeAccount = await StripeAccounts.findOne({
            _id: currentMonthPayment.stripeAccountId,
            isActive: true,
          });

          if (stripeAccount) {
            const paymentLinkDetails =
              await stripeService.getPaymentLinkDetails(
                currentMonthPayment.stripePaymentLinkId,
                stripeAccount.stripeSecretKey,
              );

            paymentLink = {
              id: paymentLinkDetails.id,
              url: paymentLinkDetails.url,
              expiresAt: (paymentLinkDetails as any).expires_at,
            };
          }
        } catch (error) {
          console.error("Error getting payment link details:", error);
        }
      }
    } else if (currentMonthPayment.status === "OVERDUE") {
      paymentAction = "OVERDUE";
    } else if (currentMonthPayment.status === "PAID") {
      paymentAction = "PAID";
    }

    // Get recent payment history
    const recentPayments = await Payments.find({
      tenantId,
      type: "RENT",
      status: "PAID",
      isDeleted: false,
    })
      .sort({ dueDate: -1 })
      .limit(6);

    const response = {
      tenantId,
      lease: {
        id: activeLease._id,
        rentAmount: activeLease.rentAmount,
        leaseType: activeLease.leaseType,
        leaseStatus: activeLease.leaseStatus,
        leaseStart: activeLease.leaseStart,
      },
      currentMonth: {
        dueDate: currentMonthPayment?.dueDate || currentMonth,
        rentAmount: activeLease.rentAmount,
        status: currentMonthPayment?.status || "PENDING",
        paidDate: currentMonthPayment?.paidDate,
        daysOverdue: daysOverdue,
        lateFeeAmount: currentMonthPayment?.lateFeeAmount || 0,
        totalAmount: currentMonthPayment?.totalAmount || activeLease.rentAmount,
        receiptNumber: currentMonthPayment?.receiptNumber,
      },
      paymentAction,
      paymentLink,
      isFirstTimePayment,
      summary: {
        totalOverdueAmount,
        overdueCount: overduePayments.length,
        pendingCount: pendingPayments.length,
        totalPaidAmount: recentPayments.reduce(
          (sum, payment) => sum + payment.totalAmount,
          0,
        ),
        averagePaymentAmount:
          recentPayments.length > 0
            ? recentPayments.reduce(
                (sum, payment) => sum + payment.totalAmount,
                0,
              ) / recentPayments.length
            : 0,
      },
      recentPayments: recentPayments.map(payment => ({
        id: payment._id,
        dueDate: payment.dueDate,
        paidDate: payment.paidDate,
        amount: payment.totalAmount,
        paymentMethod: payment.paymentMethod,
        receiptNumber: payment.receiptNumber,
        status: payment.status,
      })),
      pendingPayments: pendingPayments.map(payment => ({
        id: payment._id,
        dueDate: payment.dueDate,
        amount: payment.totalAmount,
        status: payment.status,
        daysOverdue:
          payment.status === "OVERDUE"
            ? Math.floor(
                (currentDate.getTime() - payment.dueDate.getTime()) /
                  (1000 * 60 * 60 * 24),
              )
            : 0,
      })),
    };

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Tenant payment status retrieved successfully",
      data: response,
    });
  },
);

export const handleWebhook = catchAsync(async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"];

  try {
    let event;

    // Get the raw body for signature verification
    const payload = req.body;

    // Verify the signature
    try {
      event = StripeService.constructWebhookEvent(payload, sig);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentSuccess(event.data.object);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentFailure(event.data.object);
        break;
      case "payment_intent.canceled":
        await handlePaymentCanceled(event.data.object);
        break;
      case "payment_intent.processing":
        break;
      case "payment_intent.requires_action":
        break;
      case "charge.succeeded":
        break;
      case "charge.updated":
        break;
      default:
        break;
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    res.status(400).send(`Webhook Error: ${error.message || "Unknown error"}`);
  }
});

export async function handlePaymentSuccess(
  paymentIntent: Stripe.PaymentIntent,
) {
  try {
    // Extract metadata from the unique payment link
    const metadata = paymentIntent.metadata;

    if (!metadata.tenantId || !metadata.receiptNumber) {
      throw new Error("Missing required payment metadata");
    }

    // Find the existing payment record by receipt number
    const existingPayment = await Payments.findOne({
      receiptNumber: metadata.receiptNumber,
    });

    if (!existingPayment) {
      throw new Error("Payment record not found");
    }

    // Check if payment already exists
    const duplicatePayment = await Payments.findOne({
      stripeTransactionId: paymentIntent.id,
    });

    if (duplicatePayment) {
      return;
    }

    // Update the existing payment record with Stripe transaction details
    await Payments.findByIdAndUpdate(
      existingPayment._id,
      {
        status: "PAID",
        paidDate: new Date(paymentIntent.created * 1000),
        paymentMethod: "ONLINE",
        transactionId: paymentIntent.id,
        stripeTransactionId: paymentIntent.id,
      },
      { new: true },
    );
  } catch (error: any) {
    console.error("Payment success handling error:", error);
    throw error;
  }
}

export async function handlePaymentFailure(
  paymentIntent: Stripe.PaymentIntent,
) {
  try {
    const metadata = paymentIntent.metadata;
    const receiptNumber = metadata.receiptNumber;

    if (receiptNumber) {
      // Update payment status to failed
      await Payments.findOneAndUpdate(
        { receiptNumber },
        { status: "CANCELLED" },
      );
    }
  } catch (error: any) {
    console.error("Payment failure handling error:", error);
  }
}

export async function handlePaymentCanceled(
  paymentIntent: Stripe.PaymentIntent,
) {
  try {
    const metadata = paymentIntent.metadata;
    const receiptNumber = metadata.receiptNumber;

    if (receiptNumber) {
      // Update payment status to cancelled
      await Payments.findOneAndUpdate(
        { receiptNumber },
        { status: "CANCELLED" },
      );
    }
  } catch (error: any) {
    console.error("Payment cancellation handling error:", error);
  }
}

// Sync payment history for a user
export const syncPaymentHistory = catchAsync(
  async (req: Request, res: Response) => {
    const { userId } = req.params;

    const user = await Users.findById(userId);
    if (!user) {
      return sendResponse(res, {
        statusCode: httpStatus.NOT_FOUND,
        success: false,
        message: "User not found",
        data: null,
      });
    }

    // Get user's active lease to find the property and Stripe account
    const { Leases } = await import("../leases/leases.schema");
    const activeLease = await Leases.findOne({
      tenantId: userId,
      leaseStatus: "ACTIVE",
      isDeleted: false,
    });

    if (!activeLease) {
      return sendResponse(res, {
        statusCode: httpStatus.NOT_FOUND,
        success: false,
        message: "No active lease found for user",
        data: null,
      });
    }

    // Get the Stripe account for this property
    const { StripeAccounts } = await import("./stripe-accounts.schema");
    const stripeAccount = await StripeAccounts.findOne({
      propertyIds: activeLease.propertyId,
      isActive: true,
      isVerified: true,
    });

    if (!stripeAccount) {
      return sendResponse(res, {
        statusCode: httpStatus.NOT_FOUND,
        success: false,
        message: "No active Stripe account found for property",
        data: null,
      });
    }

    const stripeService = new StripeService();
    await stripeService.syncStripePayments(
      stripeAccount.stripeAccountId || "",
      userId,
      stripeAccount.stripeSecretKey,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Payment history synced successfully",
      data: null,
    });
  },
);

// Webhook status check endpoint
export const webhookStatus = catchAsync(async (req: Request, res: Response) => {
  const timestamp = new Date().toISOString();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Webhook endpoint is active",
    data: {
      timestamp,
      status: "active",
      endpoint: "/api/v1.0/webhooks/webhook",
      environment: process.env.NODE_ENV || "development",
    },
  });
});

// Get account statistics for debugging
export const getAccountStatistics = catchAsync(
  async (req: Request, res: Response) => {
    const statistics = await getAccountStatisticsService();

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Account statistics retrieved successfully",
      data: statistics,
    });
  },
);

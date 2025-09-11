"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const config_1 = __importDefault(require("../../../config/config"));
const payment_enums_1 = require("../../../shared/enums/payment.enums");
const leases_schema_1 = require("../leases/leases.schema");
const properties_schema_1 = require("../properties/properties.schema");
const spots_schema_1 = require("../spots/spots.schema");
const users_schema_1 = require("../users/users.schema");
const payments_schema_1 = require("./payments.schema");
const getPaymentHistory = (tenantId) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield users_schema_1.Users.findOne({
        _id: tenantId,
        isDeleted: false,
        isActive: true,
    });
    if (!user) {
        return {
            payments: [],
            summary: {
                totalPaid: 0,
                totalPayments: 0,
                successRate: 0,
                overdueAmount: 0,
            },
        };
    }
    // Get payments from database
    const dbPayments = yield payments_schema_1.Payments.find({
        tenantId,
        isDeleted: false,
    }).populate("propertyId", "name");
    // If no payments found, return empty result
    if (dbPayments.length === 0) {
        return {
            payments: [],
            summary: {
                totalPaid: 0,
                totalPayments: 0,
                successRate: 0,
                overdueAmount: 0,
            },
        };
    }
    // Get Stripe payments for each payment record that has a stripePaymentLinkId
    const stripePayments = [];
    for (const payment of dbPayments) {
        if (payment.stripePaymentLinkId) {
            try {
                // Get the Stripe account for this payment
                const { StripeAccounts } = yield Promise.resolve().then(() => __importStar(require("../stripe/stripe.schema")));
                const stripeAccount = yield StripeAccounts.findById(payment.stripeAccountId);
                if (stripeAccount && stripeAccount.stripeSecretKey) {
                    // Temporarily disabled Stripe payment link transactions
                    // const stripePaymentData = await getPaymentLinkTransactions(
                    //   payment.stripePaymentLinkId,
                    //   stripeAccount.stripeSecretKey,
                    // );
                    // if (stripePaymentData.data) {
                    //   stripePayments.push(...stripePaymentData.data);
                    // }
                }
            }
            catch (error) {
                console.error(`Error fetching Stripe payments for payment ${payment._id}:`, error);
            }
        }
    }
    // Combine and merge data
    const combinedPayments = mergePaymentData(dbPayments, stripePayments);
    // Calculate summary
    const summary = calculateSummary(combinedPayments);
    return { payments: combinedPayments, summary };
});
const mergePaymentData = (dbPayments, stripePayments) => {
    var _a, _b;
    const mergedPayments = [];
    // Add database payments
    for (const dbPayment of dbPayments) {
        mergedPayments.push({
            id: dbPayment._id,
            datePaid: dbPayment.paidDate || dbPayment.createdAt,
            amount: dbPayment.totalAmount,
            status: dbPayment.status,
            method: dbPayment.paymentMethod || "ONLINE",
            confirmationId: dbPayment.stripeTransactionId || dbPayment.transactionId,
            propertyName: ((_a = dbPayment.propertyId) === null || _a === void 0 ? void 0 : _a.name) || "Unknown Property",
            description: dbPayment.description,
            receiptNumber: dbPayment.receiptNumber,
            source: "database",
        });
    }
    // Add Stripe payments that might not be in database
    for (const stripePayment of stripePayments) {
        const existingPayment = dbPayments.find(db => db.stripeTransactionId === stripePayment.id);
        if (!existingPayment && stripePayment.status === "succeeded") {
            mergedPayments.push({
                id: stripePayment.id,
                datePaid: new Date(stripePayment.created * 1000),
                amount: stripePayment.amount / 100,
                status: "PAID",
                method: "ONLINE",
                confirmationId: stripePayment.id,
                propertyName: ((_b = stripePayment.metadata) === null || _b === void 0 ? void 0 : _b.propertyName) || "Unknown Property",
                description: "Monthly Rent Payment",
                receiptNumber: `STRIPE-${stripePayment.id}`,
                source: "stripe",
            });
        }
    }
    // Sort by date (newest first)
    return mergedPayments.sort((a, b) => new Date(b.datePaid).getTime() - new Date(a.datePaid).getTime());
};
const calculateSummary = (payments) => {
    const totalPaid = payments
        .filter(p => p.status === "PAID")
        .reduce((sum, p) => sum + p.amount, 0);
    const totalPayments = payments.length;
    const paidPayments = payments.filter(p => p.status === "PAID").length;
    const successRate = totalPayments > 0 ? Math.round((paidPayments / totalPayments) * 100) : 0;
    const overdueAmount = payments
        .filter(p => p.status === "OVERDUE")
        .reduce((sum, p) => sum + p.amount, 0);
    return {
        totalPaid,
        totalPayments,
        successRate,
        overdueAmount,
    };
};
// Enhanced rent summary with shared payment calculation logic
const getRentSummaryEnhanced = (tenantId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Get active lease for the tenant
        const activeLease = yield leases_schema_1.Leases.findOne({
            tenantId: tenantId,
            leaseStatus: "ACTIVE",
            isDeleted: false,
        }).populate("propertyId spotId");
        if (!activeLease) {
            return {
                hasActiveLease: false,
                message: "No active lease found",
            };
        }
        // Get tenant, property, and spot information
        const tenant = yield users_schema_1.Users.findById(tenantId);
        const property = yield properties_schema_1.Properties.findById(activeLease.propertyId);
        const spot = yield spots_schema_1.Spots.findById(activeLease.spotId);
        if (!tenant || !property || !spot) {
            throw new Error("Tenant, property, or spot information not found");
        }
        // Check tenant status - simplified validation
        const isTenantDataComplete = (user, lease) => {
            // Check if user is a tenant
            if (user.role !== "TENANT") {
                return false;
            }
            // Check if tenant has an active lease
            if (!lease || lease.leaseStatus !== "ACTIVE") {
                return false;
            }
            // Simplified tenantStatus logic - only check lease-related fields
            const hasLeaseType = !!lease.leaseType;
            const hasLeaseDates = !!(lease.leaseStart &&
                (lease.leaseType === "MONTHLY" ||
                    (lease.leaseType === "FIXED_TERM" && lease.leaseEnd)));
            const hasRentAmount = typeof lease.rentAmount === "number" && lease.rentAmount > 0;
            const hasDepositAmount = typeof lease.depositAmount === "number" && lease.depositAmount >= 0;
            const hasOccupants = typeof lease.occupants === "number" && lease.occupants > 0;
            const hasLeaseAgreement = !!lease.leaseAgreement && lease.leaseAgreement.trim() !== "";
            // ALL conditions must be met for tenant status to be true
            return (hasLeaseType &&
                hasLeaseDates &&
                hasRentAmount &&
                hasDepositAmount &&
                hasOccupants &&
                hasLeaseAgreement);
        };
        // Check tenant status
        const tenantStatus = isTenantDataComplete(tenant, activeLease);
        // If tenant status is incomplete, return error
        if (!tenantStatus) {
            return {
                hasActiveLease: false,
                message: "Tenant profile is incomplete. Please complete your profile before accessing rent information.",
                tenantStatus: false,
                missingFields: {
                    leaseType: !activeLease.leaseType,
                    leaseDates: !(activeLease.leaseStart &&
                        (activeLease.leaseType === "MONTHLY" ||
                            (activeLease.leaseType === "FIXED_TERM" && activeLease.leaseEnd))),
                    rentAmount: !(typeof activeLease.rentAmount === "number" &&
                        activeLease.rentAmount > 0),
                    depositAmount: !(typeof activeLease.depositAmount === "number" &&
                        activeLease.depositAmount >= 0),
                    occupants: !(typeof activeLease.occupants === "number" &&
                        activeLease.occupants > 0),
                    leaseAgreement: !(!!activeLease.leaseAgreement &&
                        activeLease.leaseAgreement.trim() !== ""),
                },
            };
        }
        // Get payment history to determine if this is a first-time payment
        const paymentHistory = yield payments_schema_1.Payments.find({
            tenantId: tenantId,
            type: "RENT",
            status: "PAID", // Only count successful payments
            isDeleted: false,
        }).sort({ dueDate: 1 });
        // Calculate current date and months
        const currentDate = new Date();
        const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        // Defensive: ensure leaseStart is a Date
        const leaseStart = activeLease.leaseStart instanceof Date
            ? activeLease.leaseStart
            : new Date(activeLease.leaseStart);
        // Defensive: ensure rentAmount is a number
        const rentAmount = typeof activeLease.rentAmount === "number"
            ? activeLease.rentAmount
            : Number(activeLease.rentAmount);
        // Calculate total rent amount (base rent + additional rent)
        const additionalRentAmount = typeof activeLease.additionalRentAmount === "number"
            ? activeLease.additionalRentAmount
            : Number(activeLease.additionalRentAmount || 0);
        const totalRentAmount = rentAmount + additionalRentAmount;
        // Check current month payment status
        const currentMonthPayment = yield payments_schema_1.Payments.findOne({
            tenantId: tenantId,
            type: "RENT",
            dueDate: {
                $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
                $lt: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
            },
            isDeleted: false,
        });
        // Check next month payment status
        const nextMonthPayment = yield payments_schema_1.Payments.findOne({
            tenantId: tenantId,
            type: "RENT",
            dueDate: {
                $gte: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
                $lt: new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 1),
            },
            isDeleted: false,
        });
        // Get all pending/overdue payments
        const pendingPayments = yield payments_schema_1.Payments.find({
            tenantId: tenantId,
            type: "RENT",
            status: { $in: ["PENDING", "OVERDUE"] },
            isDeleted: false,
        }).sort({ dueDate: 1 });
        // Calculate overdue amounts and get detailed overdue info
        const overduePayments = pendingPayments.filter(payment => payment.status === "OVERDUE");
        const totalOverdueAmount = overduePayments.reduce((sum, payment) => sum + payment.totalAmount, 0);
        // Get detailed overdue payment information
        const overduePaymentsDetails = overduePayments.map(payment => {
            const daysOverdue = Math.floor((currentDate.getTime() - payment.dueDate.getTime()) /
                (1000 * 60 * 60 * 24));
            return {
                dueDate: payment.dueDate,
                amount: payment.totalAmount,
                description: payment.description,
                daysOverdue: Math.max(0, daysOverdue),
            };
        });
        // Determine if this is first-time payment
        const isFirstTimePayment = paymentHistory.length === 0;
        // Calculate current month amount due
        let currentMonthAmount = 0;
        let currentMonthDescription = "";
        let isProRated = false;
        let proRatedDays = 0;
        let proRatedRentAmount = 0;
        let fullMonthRentAmount = totalRentAmount;
        if (isFirstTimePayment) {
            // First-time payment: rent + deposit
            const leaseStartDay = leaseStart.getDate();
            if (leaseStartDay > 1) {
                // Pro-rated first month
                const daysInMonth = new Date(leaseStart.getFullYear(), leaseStart.getMonth() + 1, 0).getDate();
                const remainingDays = daysInMonth - leaseStartDay + 1;
                proRatedDays = remainingDays;
                proRatedRentAmount = Math.round((totalRentAmount / daysInMonth) * remainingDays);
                isProRated = true;
                currentMonthAmount = proRatedRentAmount + activeLease.depositAmount;
                currentMonthDescription = `Pro-rated First Month Rent (${remainingDays} days) + Deposit`;
            }
            else {
                // Full first month
                currentMonthAmount = totalRentAmount + activeLease.depositAmount;
                currentMonthDescription = "First Month Rent + Deposit";
            }
        }
        else if ((currentMonthPayment === null || currentMonthPayment === void 0 ? void 0 : currentMonthPayment.status) !== "PAID") {
            // Regular monthly payment
            currentMonthAmount = totalRentAmount;
            currentMonthDescription = `Monthly Rent - ${currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;
        }
        // Calculate total amount due
        const totalDue = currentMonthAmount + totalOverdueAmount;
        // Determine payment action and payment options
        let paymentAction = "NONE";
        let canPayNextMonth = false;
        let canPayCurrentAndOverdue = false;
        let warningMessage = "";
        // Build payment options array
        const paymentOptions = [];
        // Option 1: Current month payment (if not paid)
        if (currentMonthAmount > 0) {
            paymentOptions.push({
                type: "CURRENT_MONTH",
                amount: currentMonthAmount,
                description: `Current Month Rent - ${currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`,
                dueDate: currentMonth,
            });
        }
        // Option 2: Overdue payments (if any)
        if (overduePayments.length > 0) {
            const overdueMonths = overduePayments
                .map(payment => payment.dueDate.toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
            }))
                .join(", ");
            paymentOptions.push({
                type: "OVERDUE",
                amount: totalOverdueAmount,
                description: `Overdue Rent (${overdueMonths})`,
                dueDate: (_a = overduePayments[0]) === null || _a === void 0 ? void 0 : _a.dueDate,
            });
        }
        // Option 3: Combined current + overdue
        if (currentMonthAmount > 0 && overduePayments.length > 0) {
            const overdueMonths = overduePayments
                .map(payment => payment.dueDate.toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
            }))
                .join(", ");
            paymentOptions.push({
                type: "COMBINED",
                amount: currentMonthAmount + totalOverdueAmount,
                description: `Current Month + Overdue (${overdueMonths})`,
                dueDate: currentMonth,
            });
            canPayCurrentAndOverdue = true;
        }
        // Option 4: Next month (if current is paid and no next month payment)
        if ((currentMonthPayment === null || currentMonthPayment === void 0 ? void 0 : currentMonthPayment.status) === "PAID" && !nextMonthPayment) {
            paymentOptions.push({
                type: "NEXT_MONTH",
                amount: totalRentAmount,
                description: `Next Month Rent - ${nextMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`,
                dueDate: nextMonth,
            });
            canPayNextMonth = true;
        }
        if (isFirstTimePayment) {
            paymentAction = "FIRST_TIME_PAYMENT";
        }
        else if (leaseStart > currentDate) {
            // Lease starts in the future - check if first payments are made
            const hasFirstMonthPayment = paymentHistory.some(payment => payment.dueDate.getTime() === leaseStart.getTime());
            const hasSecondMonthPayment = paymentHistory.some(payment => {
                const secondMonth = new Date(leaseStart.getFullYear(), leaseStart.getMonth() + 1, 1);
                return payment.dueDate.getTime() === secondMonth.getTime();
            });
            if (hasFirstMonthPayment && hasSecondMonthPayment) {
                paymentAction = "PAYMENT_LIMIT_REACHED";
                const firstMonthName = leaseStart.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                });
                const secondMonthName = new Date(leaseStart.getFullYear(), leaseStart.getMonth() + 1, 1).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                });
                warningMessage = `You have already paid for ${firstMonthName} and ${secondMonthName}. You cannot pay more than one month ahead.`;
            }
            else if (hasFirstMonthPayment && !hasSecondMonthPayment) {
                paymentAction = "CAN_PAY_NEXT_MONTH";
                canPayNextMonth = true;
            }
            else {
                paymentAction = "CURRENT_MONTH_DUE";
            }
        }
        else if ((currentMonthPayment === null || currentMonthPayment === void 0 ? void 0 : currentMonthPayment.status) === "PAID" && !nextMonthPayment) {
            // Current month is paid, can pay next month
            paymentAction = "CAN_PAY_NEXT_MONTH";
            canPayNextMonth = true;
        }
        else if ((currentMonthPayment === null || currentMonthPayment === void 0 ? void 0 : currentMonthPayment.status) === "PAID" && nextMonthPayment) {
            // Already paid for current and next month
            paymentAction = "PAYMENT_LIMIT_REACHED";
            const currentMonthName = currentMonth.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
            });
            const nextMonthName = nextMonth.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
            });
            warningMessage = `You have already paid for ${currentMonthName} and ${nextMonthName}. You cannot pay more than one month ahead.`;
        }
        else if ((currentMonthPayment === null || currentMonthPayment === void 0 ? void 0 : currentMonthPayment.status) === "PENDING") {
            paymentAction = "CURRENT_MONTH_PENDING";
        }
        else if ((currentMonthPayment === null || currentMonthPayment === void 0 ? void 0 : currentMonthPayment.status) === "OVERDUE") {
            paymentAction = "CURRENT_MONTH_OVERDUE";
        }
        else if ((currentMonthPayment === null || currentMonthPayment === void 0 ? void 0 : currentMonthPayment.status) === payment_enums_1.PaymentStatus.CANCELLED ||
            (currentMonthPayment === null || currentMonthPayment === void 0 ? void 0 : currentMonthPayment.status) === payment_enums_1.PaymentStatus.REFUNDED) {
            // Handle cancelled/refunded payments
            paymentAction = "CURRENT_MONTH_DUE";
        }
        // Check lease expiration
        const isLeaseExpiringSoon = activeLease.leaseEnd
            ? Math.floor((activeLease.leaseEnd.getTime() - currentDate.getTime()) /
                (1000 * 60 * 60 * 24)) <= 30
            : false;
        // Return simplified single object
        return {
            hasActiveLease: true,
            tenantStatus: true, // Tenant status is complete
            // Property info
            propertyName: property.name,
            propertyAddress: property.address,
            spotNumber: spot.spotNumber || spot.lotIdentifier,
            // Lease info
            rentAmount: totalRentAmount, // Use total rent amount (base + additional)
            depositAmount: activeLease.depositAmount,
            leaseStart: activeLease.leaseStart,
            leaseEnd: activeLease.leaseEnd,
            isLeaseExpiringSoon,
            // Payment status
            isFirstTimePayment,
            currentMonthAmount,
            currentMonthDescription,
            totalOverdueAmount,
            totalDue,
            // Payment dates - handle future lease start dates
            currentMonthDueDate: (() => {
                // If lease starts in the future, don't show current month due date
                if (leaseStart > currentDate) {
                    return undefined;
                }
                // If current month is paid, don't show due date
                if ((currentMonthPayment === null || currentMonthPayment === void 0 ? void 0 : currentMonthPayment.status) === "PAID") {
                    return undefined;
                }
                return currentMonth;
            })(),
            nextMonthDueDate: (() => {
                // If lease starts in the future, don't show next month due date
                if (leaseStart > currentDate) {
                    return undefined;
                }
                // Only show if current month is paid and no next month payment
                if ((currentMonthPayment === null || currentMonthPayment === void 0 ? void 0 : currentMonthPayment.status) === "PAID" && !nextMonthPayment) {
                    return nextMonth;
                }
                return undefined;
            })(),
            overduePaymentsDetails,
            // Payment options
            canPayCurrentAndOverdue,
            paymentOptions,
            // Pro-rated payment details
            isProRated,
            proRatedDays,
            proRatedRentAmount,
            fullMonthRentAmount,
            // Payment action
            paymentAction,
            canPayNextMonth,
            // Warnings
            warningMessage,
            hasOverduePayments: overduePayments.length > 0,
            overdueCount: overduePayments.length,
            // Lease expiration warning
            leaseExpirationWarning: isLeaseExpiringSoon && activeLease.leaseEnd
                ? `Your lease expires on ${activeLease.leaseEnd.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                })}. Please contact management to renew.`
                : null,
        };
    }
    catch (error) {
        console.error("Error getting enhanced rent summary:", error);
        throw error;
    }
});
// Add this new function to verify payment link ownership
const verifyPaymentLinkOwnership = (paymentLinkId, tenantId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Find the payment record that owns this payment link
        const paymentRecord = yield payments_schema_1.Payments.findOne({
            stripePaymentLinkId: paymentLinkId,
            tenantId: tenantId,
            isDeleted: false,
        });
        if (!paymentRecord) {
            return {
                isValid: false,
                message: "Payment link not found or does not belong to this tenant",
                paymentRecord: null,
            };
        }
        // Check if payment is still pending
        if (paymentRecord.status !== "PENDING") {
            return {
                isValid: false,
                message: `Payment is no longer pending. Current status: ${paymentRecord.status}`,
                paymentRecord: null,
            };
        }
        // Check if payment link is not expired (optional - you can add expiration logic)
        const linkAge = Date.now() - paymentRecord.createdAt.getTime();
        const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
        if (linkAge > maxAge) {
            return {
                isValid: false,
                message: "Payment link has expired. Please create a new payment link.",
                paymentRecord: null,
            };
        }
        return {
            isValid: true,
            message: "Payment link is valid and belongs to this tenant",
            paymentRecord: paymentRecord,
        };
    }
    catch (error) {
        console.error("Error verifying payment link ownership:", error);
        return {
            isValid: false,
            message: "Error verifying payment link",
            paymentRecord: null,
        };
    }
});
// Add this function to get pending payment details
const getPendingPaymentDetails = (tenantId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const pendingPayment = yield payments_schema_1.Payments.findOne({
            tenantId: tenantId,
            status: "PENDING",
            type: "RENT",
            isDeleted: false,
        }).populate("propertyId spotId");
        if (!pendingPayment) {
            return null;
        }
        // Get tenant and property info for better description
        const tenant = yield users_schema_1.Users.findById(tenantId);
        const property = yield properties_schema_1.Properties.findById(pendingPayment.propertyId);
        const spot = yield spots_schema_1.Spots.findById(pendingPayment.spotId);
        return {
            paymentId: pendingPayment._id,
            paymentLinkId: pendingPayment.stripePaymentLinkId,
            paymentLinkUrl: pendingPayment.paymentLinkUrl,
            amount: pendingPayment.amount,
            dueDate: pendingPayment.dueDate,
            description: pendingPayment.description,
            createdAt: pendingPayment.createdAt,
            tenant: tenant ? { name: tenant.name, email: tenant.email } : null,
            property: property
                ? { name: property.name, address: property.address }
                : null,
            spot: spot
                ? { spotNumber: spot.spotNumber, lotIdentifier: spot.lotIdentifier }
                : null,
        };
    }
    catch (error) {
        console.error("Error getting pending payment details:", error);
        return null;
    }
});
const createPaymentWithLink = (paymentData) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // First, check if user already has a pending payment
        const pendingPaymentDetails = yield getPendingPaymentDetails(paymentData.tenantId);
        if (pendingPaymentDetails) {
            // Return the existing pending payment details instead of throwing an error
            return {
                hasPendingPayment: true,
                tenantStatus: true, // Tenant status is complete (since they have a pending payment)
                message: "You already have a pending payment. You can continue with the existing payment or cancel it first.",
                pendingPayment: pendingPaymentDetails,
                paymentLink: {
                    id: pendingPaymentDetails.paymentLinkId,
                    url: pendingPaymentDetails.paymentLinkUrl,
                },
                amount: pendingPaymentDetails.amount,
                dueDate: pendingPaymentDetails.dueDate,
                description: pendingPaymentDetails.description,
                createdAt: pendingPaymentDetails.createdAt,
            };
        }
        // Get active lease for the tenant
        const activeLease = yield leases_schema_1.Leases.findOne({
            tenantId: paymentData.tenantId,
            leaseStatus: "ACTIVE",
            isDeleted: false,
        }).populate("propertyId spotId");
        if (!activeLease) {
            throw new Error("No active lease found for this tenant");
        }
        // Get tenant, property, and spot information for payment description
        const tenant = yield users_schema_1.Users.findById(paymentData.tenantId);
        const property = yield properties_schema_1.Properties.findById(activeLease.propertyId);
        const spot = yield spots_schema_1.Spots.findById(activeLease.spotId);
        if (!tenant || !property || !spot) {
            throw new Error("Tenant, property, or spot information not found");
        }
        // Check tenant status - simplified validation
        const isTenantDataComplete = (user, lease) => {
            // Check if user is a tenant
            if (user.role !== "TENANT") {
                return false;
            }
            // Check if tenant has an active lease
            if (!lease || lease.leaseStatus !== "ACTIVE") {
                return false;
            }
            // Simplified tenantStatus logic - only check lease-related fields
            const hasLeaseType = !!lease.leaseType;
            const hasLeaseDates = !!(lease.leaseStart &&
                (lease.leaseType === "MONTHLY" ||
                    (lease.leaseType === "FIXED_TERM" && lease.leaseEnd)));
            const hasRentAmount = typeof lease.rentAmount === "number" && lease.rentAmount > 0;
            const hasDepositAmount = typeof lease.depositAmount === "number" && lease.depositAmount >= 0;
            const hasOccupants = typeof lease.occupants === "number" && lease.occupants > 0;
            const hasLeaseAgreement = !!lease.leaseAgreement && lease.leaseAgreement.trim() !== "";
            // ALL conditions must be met for tenant status to be true
            return (hasLeaseType &&
                hasLeaseDates &&
                hasRentAmount &&
                hasDepositAmount &&
                hasOccupants &&
                hasLeaseAgreement);
        };
        // Check tenant status
        const tenantStatus = isTenantDataComplete(tenant, activeLease);
        // If tenant status is incomplete, throw error
        if (!tenantStatus) {
            throw new Error("Tenant profile is incomplete. Please complete your profile before creating payments.");
        }
        // Get payment history to determine if this is a first-time payment
        const paymentHistory = yield payments_schema_1.Payments.find({
            tenantId: paymentData.tenantId,
            type: "RENT",
            status: "PAID", // Only count successful payments
            isDeleted: false,
        }).sort({ dueDate: 1 });
        // Calculate appropriate due date based on lease start and current date
        const effectiveCurrentDate = paymentData.currentDate
            ? new Date(paymentData.currentDate)
            : new Date();
        let paymentDueDate;
        let paymentAmount;
        let isFirstTimePayment = false;
        let paymentDescription;
        let includeDeposit = false;
        let warningMessage;
        // Defensive: ensure leaseStart is a Date
        const leaseStart = activeLease.leaseStart instanceof Date
            ? activeLease.leaseStart
            : new Date(activeLease.leaseStart);
        // Defensive: ensure rentAmount is a number
        const rentAmount = typeof activeLease.rentAmount === "number"
            ? activeLease.rentAmount
            : Number(activeLease.rentAmount);
        // Calculate total rent amount (base rent + additional rent)
        const additionalRentAmount = typeof activeLease.additionalRentAmount === "number"
            ? activeLease.additionalRentAmount
            : Number(activeLease.additionalRentAmount || 0);
        const totalRentAmount = rentAmount + additionalRentAmount;
        // Determine payment based on lease start and payment history
        if (paymentHistory.length === 0) {
            // First-time payment - use lease start date as due date
            isFirstTimePayment = true;
            includeDeposit = true;
            paymentDueDate = new Date(leaseStart);
            paymentAmount = totalRentAmount + activeLease.depositAmount;
            // Create organized payment description for Stripe checkout
            const monthYear = leaseStart.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
            });
            const propertyInfo = property.address
                ? `${property.name} - ${spot.spotNumber || spot.lotIdentifier}\n📍 Address: ${property.address}`
                : `${property.name} - ${spot.spotNumber || spot.lotIdentifier}`;
            if (leaseStart.getDate() > 1) {
                // Pro-rate the first month's rent
                const daysInMonth = new Date(leaseStart.getFullYear(), leaseStart.getMonth() + 1, 0).getDate();
                const remainingDays = daysInMonth - leaseStart.getDate() + 1;
                const proRatedRent = Math.round((totalRentAmount / daysInMonth) * remainingDays);
                paymentAmount = proRatedRent + activeLease.depositAmount;
                paymentDescription =
                    `📅 Pro-rated First Month (${remainingDays} days): $${proRatedRent}\n` +
                        `💰 Security Deposit: $${activeLease.depositAmount}\n` +
                        `📍 ${propertyInfo}`;
                console.log("📊 Pro-rated calculation:", {
                    daysInMonth,
                    remainingDays,
                    originalAmount: totalRentAmount,
                    proRatedAmount: proRatedRent,
                    depositAmount: activeLease.depositAmount,
                    totalAmount: paymentAmount,
                });
            }
            else {
                // If lease starts on the 1st of the month, charge full rent + deposit
                paymentAmount = totalRentAmount + activeLease.depositAmount;
                paymentDescription =
                    `📅 First Month Rent: $${totalRentAmount}\n` +
                        `💰 Security Deposit: $${activeLease.depositAmount}\n` +
                        `📍 ${propertyInfo}`;
                console.log("💰 Full rent + deposit charged:", {
                    amount: paymentAmount,
                });
            }
        }
        else {
            // Not first-time payment - check current month and next month
            const currentMonth = new Date(effectiveCurrentDate.getFullYear(), effectiveCurrentDate.getMonth(), 1);
            const nextMonth = new Date(effectiveCurrentDate.getFullYear(), effectiveCurrentDate.getMonth() + 1, 1);
            // Check if we already have a payment for current month
            const currentMonthPayment = paymentHistory.find(payment => {
                const dueDate = payment.dueDate instanceof Date
                    ? payment.dueDate
                    : new Date(payment.dueDate);
                if (isNaN(dueDate.getTime())) {
                    return false;
                }
                const paymentMonth = new Date(dueDate.getFullYear(), dueDate.getMonth(), 1);
                return paymentMonth.getTime() === currentMonth.getTime();
            });
            // Check if we already have a payment for next month
            const nextMonthPayment = paymentHistory.find(payment => {
                const dueDate = payment.dueDate instanceof Date
                    ? payment.dueDate
                    : new Date(payment.dueDate);
                if (isNaN(dueDate.getTime())) {
                    return false;
                }
                const paymentMonth = new Date(dueDate.getFullYear(), dueDate.getMonth(), 1);
                return paymentMonth.getTime() === nextMonth.getTime();
            });
            // Determine which month to create payment for
            if (!currentMonthPayment) {
                // No payment for current month - create current month payment
                paymentDueDate = currentMonth;
                paymentAmount = totalRentAmount;
                const monthYear = currentMonth.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                });
                const propertyInfo = property.address
                    ? `${property.name} - ${spot.spotNumber || spot.lotIdentifier}\n📍 Address: ${property.address}`
                    : `${property.name} - ${spot.spotNumber || spot.lotIdentifier}`;
                paymentDescription =
                    `📅 Monthly Rent: $${totalRentAmount}\n` + `📍 ${propertyInfo}`;
                console.log("💰 Creating payment for current month:", {
                    amount: paymentAmount,
                    dueDate: paymentDueDate.toISOString(),
                });
            }
            else if (currentMonthPayment.status === "PAID" && !nextMonthPayment) {
                // Current month is paid, no payment for next month - create next month payment
                paymentDueDate = nextMonth;
                paymentAmount = totalRentAmount;
                const monthYear = nextMonth.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                });
                const propertyInfo = property.address
                    ? `${property.name} - ${spot.spotNumber || spot.lotIdentifier}\n📍 Address: ${property.address}`
                    : `${property.name} - ${spot.spotNumber || spot.lotIdentifier}`;
                paymentDescription =
                    `📅 Monthly Rent: $${totalRentAmount}\n` + `📍 ${propertyInfo}`;
                console.log("💰 Creating payment for next month (one month ahead):", {
                    amount: paymentAmount,
                    dueDate: paymentDueDate.toISOString(),
                });
            }
            else if (currentMonthPayment.status === "PAID" && nextMonthPayment) {
                // Current month is paid AND next month already has payment - show warning
                const currentMonthName = new Date(effectiveCurrentDate.getFullYear(), effectiveCurrentDate.getMonth(), 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
                const nextMonthName = new Date(effectiveCurrentDate.getFullYear(), effectiveCurrentDate.getMonth() + 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
                throw new Error(`You have already paid for ${currentMonthName} and ${nextMonthName}. You cannot pay more than one month ahead.`);
            }
            else if (currentMonthPayment.status === "OVERDUE") {
                // Current month payment is overdue
                throw new Error("Rent payment for current month is overdue. Please pay the overdue amount first.");
            }
            else {
                // Fallback - should not reach here, but just in case
                throw new Error("Unable to determine payment scenario. Please contact support.");
            }
        }
        // Check if payment already exists for the calculated month
        const startOfMonth = new Date(paymentDueDate.getFullYear(), paymentDueDate.getMonth(), 1);
        const startOfNextMonth = new Date(paymentDueDate.getFullYear(), paymentDueDate.getMonth() + 1, 1);
        const existingPayment = yield payments_schema_1.Payments.findOne({
            tenantId: paymentData.tenantId,
            type: "RENT",
            dueDate: {
                $gte: startOfMonth,
                $lt: startOfNextMonth,
            },
            isDeleted: false,
        });
        if (existingPayment) {
            throw new Error("Rent payment for this month already exists");
        }
        // Defensive: propertyId and spotId
        let propertyId = undefined;
        let spotId = undefined;
        if (activeLease.propertyId &&
            typeof activeLease.propertyId === "object" &&
            "_id" in activeLease.propertyId) {
            propertyId = activeLease.propertyId._id.toString();
        }
        else if (typeof activeLease.propertyId === "string") {
            propertyId = activeLease.propertyId;
        }
        if (activeLease.spotId &&
            typeof activeLease.spotId === "object" &&
            "_id" in activeLease.spotId) {
            spotId = activeLease.spotId._id.toString();
        }
        else if (typeof activeLease.spotId === "string") {
            spotId = activeLease.spotId;
        }
        // Validate that required fields are present
        if (!propertyId) {
            throw new Error("Property ID is required for payment creation");
        }
        if (!spotId) {
            throw new Error("Spot ID is required for payment creation");
        }
        // Get the Stripe account for this property
        const { StripeAccounts } = yield Promise.resolve().then(() => __importStar(require("../stripe/stripe.schema")));
        // First, try to find a property-specific Stripe account
        let stripeAccount = yield StripeAccounts.findOne({
            propertyIds: propertyId,
            isActive: true,
            isVerified: true,
        }).select("+stripeSecretKey");
        // If no property-specific account found, try to find a default account
        if (!stripeAccount) {
            console.log("🔍 No property-specific Stripe account found, looking for default account...");
            stripeAccount = yield StripeAccounts.findOne({
                isDefaultAccount: true,
                isActive: true,
                isVerified: true,
            }).select("+stripeSecretKey");
        }
        // If still no account found, try to find any active and verified account
        if (!stripeAccount) {
            console.log("🔍 No default account found, looking for any active account...");
            stripeAccount = yield StripeAccounts.findOne({
                isActive: true,
                isVerified: true,
            }).select("+stripeSecretKey");
        }
        if (!stripeAccount) {
            throw new Error("No active Stripe account found for this property or as fallback");
        }
        // Debug: Check if secret key exists
        console.log("🔍 Stripe account found:", {
            accountId: stripeAccount._id,
            name: stripeAccount.name,
            hasSecretKey: !!stripeAccount.stripeSecretKey,
            secretKeyLength: ((_a = stripeAccount.stripeSecretKey) === null || _a === void 0 ? void 0 : _a.length) || 0,
            accountType: stripeAccount.isDefaultAccount
                ? "DEFAULT"
                : "PROPERTY_SPECIFIC",
            propertyIds: stripeAccount.propertyIds,
        });
        if (!stripeAccount.stripeSecretKey) {
            throw new Error("Stripe account secret key is not configured");
        }
        // Create Stripe payment link first (without saving payment record)
        const { createStripeInstance } = yield Promise.resolve().then(() => __importStar(require("../stripe/stripe.service")));
        console.log("🔧 Creating Stripe instance with secret key...");
        const stripe = createStripeInstance(stripeAccount.stripeSecretKey);
        // Create a temporary payment record to store metadata
        const tempPaymentRecord = yield payments_schema_1.Payments.create({
            tenantId: paymentData.tenantId,
            propertyId,
            spotId,
            amount: paymentAmount,
            type: "RENT",
            status: "PENDING",
            dueDate: paymentDueDate,
            description: paymentDescription,
            lateFeeAmount: 0,
            totalAmount: paymentAmount,
            createdBy: paymentData.createdBy,
            receiptNumber: `TEMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            // Store metadata for webhook processing
            stripeMetadata: {
                isFirstTimePayment,
                includeDeposit,
                paymentAmount: paymentAmount.toString(),
                paymentDueDate: paymentDueDate.toISOString(),
                paymentDescription,
                createdBy: paymentData.createdBy,
            },
        });
        // Create Stripe Payment Link
        const paymentLink = yield stripe.paymentLinks.create({
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: isFirstTimePayment
                                ? `Rent Payment - ${paymentDueDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })} + Deposit - ${property.name}`
                                : `Rent Payment - ${paymentDueDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })} - ${property.name}`,
                            description: paymentDescription,
                        },
                        unit_amount: Math.round(paymentAmount * 100),
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                paymentRecordId: tempPaymentRecord._id.toString(),
                tenantId: paymentData.tenantId,
                propertyId: propertyId,
                spotId: spotId,
            },
            payment_intent_data: {
                metadata: {
                    paymentRecordId: tempPaymentRecord._id.toString(),
                    tenantId: paymentData.tenantId,
                    propertyId: propertyId,
                    spotId: spotId,
                },
            },
            payment_method_types: ["card"],
            after_completion: {
                type: "redirect",
                redirect: {
                    url: `${config_1.default.client_url || "https://rentalportal01.netlify.app"}/payment-success?session_id={CHECKOUT_SESSION_ID}&accountId=${stripeAccount._id}`,
                },
            },
        });
        // Update the temporary payment record with payment link details
        yield payments_schema_1.Payments.findByIdAndUpdate(tempPaymentRecord._id, {
            stripePaymentLinkId: paymentLink.id,
            stripeAccountId: stripeAccount._id,
            paymentLinkUrl: paymentLink.url, // Save the payment link URL
            status: "PENDING",
        });
        console.log("✅ Payment link created successfully:", {
            paymentLinkId: paymentLink.id,
            tempPaymentId: tempPaymentRecord._id,
            amount: paymentAmount,
            isFirstTimePayment,
            includeDeposit,
        });
        return {
            hasPendingPayment: false,
            tenantStatus: true, // Tenant status is complete
            paymentLink: {
                id: paymentLink.id,
                url: paymentLink.url,
            },
            amount: paymentAmount,
            dueDate: paymentDueDate,
            description: paymentDescription,
            isFirstTimePayment,
            includeDeposit,
            warningMessage,
            lease: {
                id: activeLease._id,
                rentAmount: rentAmount,
                depositAmount: activeLease.depositAmount,
                leaseType: activeLease.leaseType,
                leaseStatus: activeLease.leaseStatus,
                leaseStart: leaseStart,
            },
        };
    }
    catch (error) {
        console.error("Error creating payment with link:", error);
        throw error;
    }
});
// Get payment link details
const getPaymentLinkDetails = (paymentLinkId, secretKey) => __awaiter(void 0, void 0, void 0, function* () {
    const { createStripeInstance } = yield Promise.resolve().then(() => __importStar(require("../stripe/stripe.service")));
    const stripe = createStripeInstance(secretKey);
    return yield stripe.paymentLinks.retrieve(paymentLinkId);
});
// TODO: we need to check and if it not using then delete this
// Get comprehensive tenant payment status with automatic payment creation
const getTenantPaymentStatusEnhanced = (paymentData) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Get active lease for the tenant
        const activeLease = yield leases_schema_1.Leases.findOne({
            tenantId: paymentData.tenantId,
            leaseStatus: "ACTIVE",
            isDeleted: false,
        }).populate("propertyId spotId");
        if (!activeLease) {
            throw new Error("No active lease found for this tenant");
        }
        // Get tenant information for status validation
        const tenant = yield users_schema_1.Users.findById(paymentData.tenantId);
        if (!tenant) {
            throw new Error("Tenant information not found");
        }
        // Check tenant status - simplified validation
        const isTenantDataComplete = (user, lease) => {
            // Check if user is a tenant
            if (user.role !== "TENANT") {
                return false;
            }
            // Check if tenant has an active lease
            if (!lease || lease.leaseStatus !== "ACTIVE") {
                return false;
            }
            // Simplified tenantStatus logic - only check lease-related fields
            const hasLeaseType = !!lease.leaseType;
            const hasLeaseDates = !!(lease.leaseStart &&
                (lease.leaseType === "MONTHLY" ||
                    (lease.leaseType === "FIXED_TERM" && lease.leaseEnd)));
            const hasRentAmount = typeof lease.rentAmount === "number" && lease.rentAmount > 0;
            const hasDepositAmount = typeof lease.depositAmount === "number" && lease.depositAmount >= 0;
            const hasOccupants = typeof lease.occupants === "number" && lease.occupants > 0;
            const hasLeaseAgreement = !!lease.leaseAgreement && lease.leaseAgreement.trim() !== "";
            // ALL conditions must be met for tenant status to be true
            return (hasLeaseType &&
                hasLeaseDates &&
                hasRentAmount &&
                hasDepositAmount &&
                hasOccupants &&
                hasLeaseAgreement);
        };
        // Check tenant status
        const tenantStatus = isTenantDataComplete(tenant, activeLease);
        // If tenant status is incomplete, throw error
        if (!tenantStatus) {
            throw new Error("Tenant profile is incomplete. Please complete your profile before accessing payment information.");
        }
        // Get payment history to determine if this is a first-time payment
        const paymentHistory = yield payments_schema_1.Payments.find({
            tenantId: paymentData.tenantId,
            type: "RENT",
            status: "PAID", // Only count successful payments
            isDeleted: false,
        }).sort({ dueDate: 1 });
        // Get current month's payment status
        const currentDate = new Date();
        const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        // Check if payment exists for current month
        const currentMonthPayment = yield payments_schema_1.Payments.findOne({
            tenantId: paymentData.tenantId,
            type: "RENT",
            dueDate: {
                $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
                $lt: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
            },
            isDeleted: false,
        });
        // Get all pending/overdue payments
        const pendingPayments = yield payments_schema_1.Payments.find({
            tenantId: paymentData.tenantId,
            type: "RENT",
            status: { $in: ["PENDING", "OVERDUE"] },
            isDeleted: false,
        }).sort({ dueDate: 1 });
        // Calculate overdue amounts
        const overduePayments = pendingPayments.filter(payment => payment.status === "OVERDUE");
        const totalOverdueAmount = overduePayments.reduce((sum, payment) => sum + payment.totalAmount, 0);
        // Calculate total amount due (current month + overdue)
        const totalRentAmount = activeLease.rentAmount + (activeLease.additionalRentAmount || 0);
        const currentMonthAmount = (currentMonthPayment === null || currentMonthPayment === void 0 ? void 0 : currentMonthPayment.totalAmount) || totalRentAmount;
        const totalDue = currentMonthAmount + totalOverdueAmount;
        // Calculate days overdue for current payment
        const daysOverdue = currentMonthPayment && currentMonthPayment.status === "OVERDUE"
            ? Math.floor((currentDate.getTime() - currentMonthPayment.dueDate.getTime()) /
                (1000 * 60 * 60 * 24))
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
                let paymentAmount = totalRentAmount;
                let paymentDescription = "First Month Rent Payment";
                // Check if lease started mid-month and adjust amount if needed
                const leaseStartDay = activeLease.leaseStart.getDate();
                if (leaseStartDay > 1) {
                    // Pro-rate the first month's rent
                    const daysInMonth = new Date(activeLease.leaseStart.getFullYear(), activeLease.leaseStart.getMonth() + 1, 0).getDate();
                    const remainingDays = daysInMonth - leaseStartDay + 1;
                    paymentAmount = Math.round((totalRentAmount / daysInMonth) * remainingDays);
                    paymentDescription = `Pro-rated First Month Rent (${remainingDays} days)`;
                }
                paymentAction = "CREATE_FIRST_TIME";
                try {
                    newPayment = yield createPaymentWithLink({
                        tenantId: paymentData.tenantId,
                        currentDate: new Date().toISOString(),
                        createdBy: paymentData.createdBy,
                    });
                    paymentLink = {
                        id: newPayment.paymentLink.id,
                        url: newPayment.paymentLink.url,
                    };
                }
                catch (error) {
                    console.error("Error creating first-time payment:", error);
                    paymentAction = "ERROR";
                }
            }
            else {
                // Not first-time payment - create for current month
                paymentAction = "CREATE_NEW";
                try {
                    newPayment = yield createPaymentWithLink({
                        tenantId: paymentData.tenantId,
                        currentDate: new Date().toISOString(),
                        createdBy: paymentData.createdBy,
                    });
                    paymentLink = {
                        id: newPayment.paymentLink.id,
                        url: newPayment.paymentLink.url,
                    };
                }
                catch (error) {
                    console.error("Error creating payment:", error);
                    paymentAction = "ERROR";
                }
            }
        }
        else if (currentMonthPayment.status === "PENDING") {
            // Payment exists but is pending - check if payment link exists
            paymentAction = "PENDING";
            if (currentMonthPayment.stripePaymentLinkId) {
                // Get existing payment link details
                try {
                    const { StripeAccounts } = yield Promise.resolve().then(() => __importStar(require("../stripe/stripe.schema")));
                    const stripeAccount = yield StripeAccounts.findOne({
                        _id: currentMonthPayment.stripeAccountId,
                        isActive: true,
                    }).select("+stripeSecretKey");
                    if (stripeAccount) {
                        const paymentLinkDetails = yield getPaymentLinkDetails(currentMonthPayment.stripePaymentLinkId, stripeAccount.stripeSecretKey);
                        paymentLink = {
                            id: paymentLinkDetails.id,
                            url: paymentLinkDetails.url,
                        };
                    }
                }
                catch (error) {
                    console.error("Error getting payment link details:", error);
                }
            }
        }
        else if (currentMonthPayment.status === "OVERDUE") {
            paymentAction = "OVERDUE";
        }
        else if (currentMonthPayment.status === "PAID") {
            paymentAction = "PAID";
        }
        // Get recent payment history
        const recentPayments = yield payments_schema_1.Payments.find({
            tenantId: paymentData.tenantId,
            type: "RENT",
            status: "PAID",
            isDeleted: false,
        })
            .sort({ dueDate: -1 })
            .limit(6);
        return {
            tenantId: paymentData.tenantId,
            tenantStatus: true, // Tenant status is complete
            lease: {
                id: activeLease._id,
                rentAmount: totalRentAmount, // Use total rent amount
                leaseType: activeLease.leaseType,
                leaseStatus: activeLease.leaseStatus,
                leaseStart: activeLease.leaseStart,
            },
            currentMonth: {
                dueDate: (currentMonthPayment === null || currentMonthPayment === void 0 ? void 0 : currentMonthPayment.dueDate) || currentMonth,
                rentAmount: totalRentAmount, // Use total rent amount
                status: (currentMonthPayment === null || currentMonthPayment === void 0 ? void 0 : currentMonthPayment.status) || "PENDING",
                paidDate: currentMonthPayment === null || currentMonthPayment === void 0 ? void 0 : currentMonthPayment.paidDate,
                daysOverdue: daysOverdue,
                lateFeeAmount: (currentMonthPayment === null || currentMonthPayment === void 0 ? void 0 : currentMonthPayment.lateFeeAmount) || 0,
                totalAmount: (currentMonthPayment === null || currentMonthPayment === void 0 ? void 0 : currentMonthPayment.totalAmount) || totalRentAmount, // Use total rent amount
                receiptNumber: currentMonthPayment === null || currentMonthPayment === void 0 ? void 0 : currentMonthPayment.receiptNumber,
            },
            paymentAction,
            paymentLink,
            isFirstTimePayment,
            summary: {
                totalOverdueAmount,
                totalDue,
                overdueCount: overduePayments.length,
                pendingCount: pendingPayments.length,
                totalPaidAmount: recentPayments.reduce((sum, payment) => sum + payment.totalAmount, 0),
                averagePaymentAmount: recentPayments.length > 0
                    ? recentPayments.reduce((sum, payment) => sum + payment.totalAmount, 0) / recentPayments.length
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
                daysOverdue: payment.status === "OVERDUE"
                    ? Math.floor((currentDate.getTime() - payment.dueDate.getTime()) /
                        (1000 * 60 * 60 * 24))
                    : 0,
            })),
        };
    }
    catch (error) {
        console.error("Error getting tenant payment status:", error);
        throw error;
    }
});
// Get receipt by Stripe session ID (more secure than receipt number)
const getReceiptBySessionId = (sessionId, accountId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        console.log("🔍 Retrieving receipt by session ID:", {
            sessionId,
            accountId,
        });
        // Import required modules
        const { StripeAccounts } = yield Promise.resolve().then(() => __importStar(require("../stripe/stripe.schema")));
        const { createStripeInstance } = yield Promise.resolve().then(() => __importStar(require("../stripe/stripe.service")));
        // Find the Stripe account to get the secret key
        let stripeAccount;
        let session = null;
        if (accountId) {
            // Use specific account if provided
            stripeAccount =
                yield StripeAccounts.findById(accountId).select("+stripeSecretKey");
            if (!stripeAccount) {
                throw new Error("Stripe account not found");
            }
            // Get session from the specified account
            const stripe = createStripeInstance(stripeAccount.stripeSecretKey);
            session = yield stripe.checkout.sessions.retrieve(sessionId);
        }
        else {
            // Try to find the account that can verify this session
            const accounts = yield StripeAccounts.find({
                isActive: true,
                isVerified: true,
            }).select("+stripeSecretKey");
            // Try each account until we find one that can retrieve the session
            for (const account of accounts) {
                try {
                    const stripe = createStripeInstance(account.stripeSecretKey);
                    session = yield stripe.checkout.sessions.retrieve(sessionId);
                    if (session) {
                        stripeAccount = account;
                        break;
                    }
                }
                catch (error) {
                    // Continue to next account
                    continue;
                }
            }
            if (!session || !stripeAccount) {
                throw new Error("Could not find valid Stripe account for this session");
            }
        }
        if (!session) {
            throw new Error("Stripe session not found");
        }
        // Get payment intent from session
        const paymentIntentId = session.payment_intent;
        if (!paymentIntentId) {
            throw new Error("No payment intent found in session");
        }
        // Retrieve payment intent to get metadata
        const stripe = createStripeInstance(stripeAccount.stripeSecretKey);
        const paymentIntent = yield stripe.paymentIntents.retrieve(paymentIntentId);
        if (!((_a = paymentIntent.metadata) === null || _a === void 0 ? void 0 : _a.paymentRecordId)) {
            throw new Error("Payment record ID not found in metadata");
        }
        // Find the payment record in our database
        let payment = yield payments_schema_1.Payments.findById(paymentIntent.metadata.paymentRecordId).populate([
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
            throw new Error("Payment record not found");
        }
        // Check if payment is completed or if we need to update it based on Stripe session
        if (payment.status !== payment_enums_1.PaymentStatus.PAID) {
            console.log("⚠️ Payment status is not PAID, checking Stripe session status...");
            // Check if the Stripe session is actually successful
            if (session.payment_status === "paid") {
                console.log("✅ Stripe session shows payment is successful, updating database...");
                // Update the payment status to PAID
                const updatedPayment = yield payments_schema_1.Payments.findByIdAndUpdate(payment._id, {
                    status: payment_enums_1.PaymentStatus.PAID,
                    paidDate: new Date(session.created * 1000),
                    paymentMethod: "ONLINE",
                    stripePaymentIntentId: paymentIntentId,
                    stripeTransactionId: session.payment_intent,
                    receiptNumber: `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                }, { new: true }).populate([
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
                if (updatedPayment) {
                    payment = updatedPayment;
                    console.log("✅ Payment status updated to PAID");
                    // Update rent summary to reflect the latest payment data
                    try {
                        yield exports.PaymentService.getRentSummary(payment.tenantId.toString());
                        console.log(`✅ Rent summary updated for tenant: ${payment.tenantId}`);
                    }
                    catch (error) {
                        console.error(`❌ Failed to update rent summary for tenant ${payment.tenantId}:`, error);
                        // Don't throw error here as payment was successful, just log the issue
                    }
                }
                else {
                    throw new Error("Failed to update payment status");
                }
            }
            else {
                throw new Error("Payment is not yet completed");
            }
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
            // Stripe session info
            stripeSessionId: sessionId,
            stripePaymentIntentId: paymentIntentId,
            // Tenant information
            tenant: {
                id: payment.tenantId._id,
                name: payment.tenantId.name,
                email: payment.tenantId.email,
                phone: payment.tenantId.phone,
            },
            // Property information
            property: {
                id: payment.propertyId._id,
                name: payment.propertyId.name,
                address: payment.propertyId.address,
                propertyType: payment.propertyId.propertyType,
                lotNumber: payment.propertyId.lotNumber,
                unitNumber: payment.propertyId.unitNumber,
            },
            // Parking spot information
            spot: payment.spotId
                ? {
                    id: payment.spotId._id,
                    spotNumber: payment.spotId.spotNumber,
                    spotType: payment.spotId.spotType,
                }
                : null,
            // Stripe account information
            stripeAccount: payment.stripeAccountId
                ? {
                    id: payment.stripeAccountId._id,
                    name: payment.stripeAccountId.name,
                }
                : null,
            createdAt: payment.createdAt,
            updatedAt: payment.updatedAt,
        };
        return paymentData;
    }
    catch (error) {
        console.error("❌ Error retrieving receipt by session ID:", error);
        throw error;
    }
});
exports.PaymentService = {
    getTenantPaymentStatusEnhanced,
    getPendingPaymentDetails,
    createPaymentWithLink,
    verifyPaymentLinkOwnership,
    getPaymentLinkDetails,
    getReceiptBySessionId,
    getPaymentHistory,
    getRentSummary: getRentSummaryEnhanced,
};

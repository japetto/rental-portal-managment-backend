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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
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
                rentSummary: undefined,
            };
        }
        // Get tenant, property, and spot information
        const tenant = yield users_schema_1.Users.findById(tenantId);
        const property = yield properties_schema_1.Properties.findById(activeLease.propertyId);
        const spot = yield spots_schema_1.Spots.findById(activeLease.spotId);
        if (!tenant || !property || !spot) {
            throw new Error("Tenant, property, or spot information not found");
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
        // Calculate overdue amounts
        const overduePayments = pendingPayments.filter(payment => payment.status === "OVERDUE");
        const totalOverdueAmount = overduePayments.reduce((sum, payment) => sum + payment.totalAmount, 0);
        // Calculate total amount due (current month + overdue)
        let currentMonthAmount = (currentMonthPayment === null || currentMonthPayment === void 0 ? void 0 : currentMonthPayment.totalAmount) || activeLease.rentAmount;
        // For first-time payments, use the first payment amount
        if (paymentHistory.length === 0) {
            const leaseStartDay = leaseStart.getDate();
            if (leaseStartDay > 1) {
                // Pro-rated first month
                const daysInMonth = new Date(leaseStart.getFullYear(), leaseStart.getMonth() + 1, 0).getDate();
                const remainingDays = daysInMonth - leaseStartDay + 1;
                const proRatedRent = Math.round((rentAmount / daysInMonth) * remainingDays);
                currentMonthAmount = proRatedRent + activeLease.depositAmount;
            }
            else {
                // Full first month
                currentMonthAmount = rentAmount + activeLease.depositAmount;
            }
        }
        const totalDue = currentMonthAmount + totalOverdueAmount;
        // Calculate days overdue for current payment
        const daysOverdue = currentMonthPayment && currentMonthPayment.status === "OVERDUE"
            ? Math.floor((currentDate.getTime() - currentMonthPayment.dueDate.getTime()) /
                (1000 * 60 * 60 * 24))
            : 0;
        // Determine payment action and next payment details
        let paymentAction = "NONE";
        let nextPaymentDetails = null;
        let isFirstTimePayment = false;
        let canPayNextMonth = false;
        if (paymentHistory.length === 0) {
            // First-time payment scenario
            isFirstTimePayment = true;
            paymentAction = "FIRST_TIME_PAYMENT";
            // Calculate first payment details
            let firstPaymentAmount = rentAmount + activeLease.depositAmount;
            let firstPaymentDescription = `First Month Rent + Deposit - ${tenant.name} - ${property.name} (${property.address}) - ${spot.spotNumber || spot.spotIdentifier}`;
            // Check if lease started mid-month
            const leaseStartDay = leaseStart.getDate();
            if (leaseStartDay > 1) {
                const daysInMonth = new Date(leaseStart.getFullYear(), leaseStart.getMonth() + 1, 0).getDate();
                const remainingDays = daysInMonth - leaseStartDay + 1;
                const proRatedRent = Math.round((rentAmount / daysInMonth) * remainingDays);
                firstPaymentAmount = proRatedRent + activeLease.depositAmount;
                firstPaymentDescription = `Pro-rated First Month Rent (${remainingDays} days) + Deposit - ${tenant.name} - ${property.name} (${property.address}) - ${spot.spotNumber || spot.spotIdentifier}`;
            }
            nextPaymentDetails = {
                amount: firstPaymentAmount,
                dueDate: leaseStart,
                description: firstPaymentDescription,
                includesDeposit: true,
                isProRated: leaseStartDay > 1,
                proRatedDays: leaseStartDay > 1
                    ? (() => {
                        const daysInMonth = new Date(leaseStart.getFullYear(), leaseStart.getMonth() + 1, 0).getDate();
                        return daysInMonth - leaseStartDay + 1;
                    })()
                    : null,
            };
        }
        else {
            // Regular payment scenarios
            if (!currentMonthPayment) {
                // No payment for current month
                paymentAction = "CURRENT_MONTH_DUE";
                nextPaymentDetails = {
                    amount: rentAmount,
                    dueDate: currentMonth,
                    description: `Monthly Rent Payment - ${tenant.name} - ${property.name} (${property.address}) - ${spot.spotNumber || spot.spotIdentifier}`,
                    includesDeposit: false,
                    isProRated: false,
                };
            }
            else if (currentMonthPayment.status === "PAID" && !nextMonthPayment) {
                // Current month is paid, can pay next month
                paymentAction = "CAN_PAY_NEXT_MONTH";
                canPayNextMonth = true;
                nextPaymentDetails = {
                    amount: rentAmount,
                    dueDate: nextMonth,
                    description: `Monthly Rent Payment (Next Month) - ${tenant.name} - ${property.name} (${property.address}) - ${spot.spotNumber || spot.spotIdentifier}`,
                    includesDeposit: false,
                    isProRated: false,
                };
            }
            else if (currentMonthPayment.status === "PAID" && nextMonthPayment) {
                // Already paid for current and next month - one month ahead limit reached
                paymentAction = "PAYMENT_LIMIT_REACHED";
                const currentMonthName = currentMonth.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                });
                const nextMonthName = nextMonth.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                });
                nextPaymentDetails = {
                    warning: `You have already paid for ${currentMonthName} and ${nextMonthName}. You cannot pay more than one month ahead.`,
                };
            }
            else if (currentMonthPayment.status === "PENDING") {
                paymentAction = "CURRENT_MONTH_PENDING";
                nextPaymentDetails = {
                    amount: currentMonthPayment.totalAmount,
                    dueDate: currentMonthPayment.dueDate,
                    description: currentMonthPayment.description,
                    status: "PENDING",
                };
            }
            else if (currentMonthPayment.status === "OVERDUE") {
                paymentAction = "CURRENT_MONTH_OVERDUE";
                nextPaymentDetails = {
                    amount: currentMonthPayment.totalAmount,
                    dueDate: currentMonthPayment.dueDate,
                    description: currentMonthPayment.description,
                    status: "OVERDUE",
                    daysOverdue: daysOverdue,
                };
            }
        }
        // Simplified rent summary
        const rentSummary = {
            // Basic property info
            property: {
                name: property.name,
                address: property.address,
            },
            spot: {
                spotNumber: spot.spotNumber || spot.spotIdentifier,
            },
            // Lease info
            lease: {
                rentAmount: activeLease.rentAmount,
                depositAmount: activeLease.depositAmount,
                leaseStart: activeLease.leaseStart,
                leaseEnd: activeLease.leaseEnd,
            },
            // Current month status
            currentMonth: {
                status: (currentMonthPayment === null || currentMonthPayment === void 0 ? void 0 : currentMonthPayment.status) || "PENDING",
                dueDate: (currentMonthPayment === null || currentMonthPayment === void 0 ? void 0 : currentMonthPayment.dueDate) || currentMonth,
                amount: (currentMonthPayment === null || currentMonthPayment === void 0 ? void 0 : currentMonthPayment.totalAmount) ||
                    (isFirstTimePayment ? currentMonthAmount : activeLease.rentAmount),
                daysOverdue: daysOverdue,
                // Add deposit information for first-time payments
                rentAmount: activeLease.rentAmount,
                depositAmount: isFirstTimePayment ? activeLease.depositAmount : 0,
                includesDeposit: isFirstTimePayment,
                isFirstTimePayment: isFirstTimePayment,
            },
            // Payment action and details
            paymentAction,
            canPayNextMonth,
            isFirstTimePayment,
            // Simple summary
            summary: {
                totalOverdueAmount,
                totalDue,
                overdueCount: overduePayments.length,
                pendingCount: pendingPayments.length,
            },
            // Recent payments (last 3 only)
            recentPayments: (yield payments_schema_1.Payments.find({
                tenantId: tenantId,
                type: "RENT",
                status: "PAID",
                isDeleted: false,
            })
                .sort({ dueDate: -1 })
                .limit(3)
                .lean()).map(payment => ({
                dueDate: payment.dueDate,
                amount: payment.totalAmount,
                status: payment.status,
            })),
            // Pending payments
            pendingPayments: pendingPayments.map(payment => ({
                dueDate: payment.dueDate,
                amount: payment.totalAmount,
                status: payment.status,
                daysOverdue: payment.status === "OVERDUE"
                    ? Math.floor((currentDate.getTime() - payment.dueDate.getTime()) /
                        (1000 * 60 * 60 * 24))
                    : 0,
            })),
        };
        return {
            hasActiveLease: true,
            rentSummary,
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
                ? { spotNumber: spot.spotNumber, spotIdentifier: spot.spotIdentifier }
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
        console.log("🚀 ~ createPaymentWithLink ~ paymentData:", paymentData);
        // First, check if user already has a pending payment
        const pendingPaymentDetails = yield getPendingPaymentDetails(paymentData.tenantId);
        if (pendingPaymentDetails) {
            // Return the existing pending payment details instead of throwing an error
            return {
                hasPendingPayment: true,
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
        // Determine payment based on lease start and payment history
        if (paymentHistory.length === 0) {
            // First-time payment - use lease start date as due date
            isFirstTimePayment = true;
            includeDeposit = true;
            paymentDueDate = new Date(leaseStart);
            paymentAmount = rentAmount + activeLease.depositAmount;
            paymentDescription = `First Month Rent + Deposit - ${tenant.name} - ${property.name} (${property.address}) - ${spot.spotNumber || spot.spotIdentifier}`;
            // Check if lease started mid-month and adjust amount if needed
            const leaseStartDay = leaseStart.getDate();
            console.log("🔍 Lease start analysis:", {
                leaseStart: leaseStart.toISOString(),
                leaseStartDay,
                rentAmount,
                depositAmount: activeLease.depositAmount,
                isFirstTimePayment,
            });
            if (leaseStartDay > 1) {
                // Pro-rate the first month's rent
                const daysInMonth = new Date(leaseStart.getFullYear(), leaseStart.getMonth() + 1, 0).getDate();
                const remainingDays = daysInMonth - leaseStartDay + 1;
                const proRatedRent = Math.round((rentAmount / daysInMonth) * remainingDays);
                paymentAmount = proRatedRent + activeLease.depositAmount;
                paymentDescription = `Pro-rated First Month Rent (${remainingDays} days) + Deposit - ${tenant.name} - ${property.name} (${property.address}) - ${spot.spotNumber || spot.spotIdentifier}`;
                console.log("📊 Pro-rated calculation:", {
                    daysInMonth,
                    remainingDays,
                    originalAmount: rentAmount,
                    proRatedAmount: proRatedRent,
                    depositAmount: activeLease.depositAmount,
                    totalAmount: paymentAmount,
                });
            }
            else {
                // If lease starts on the 1st of the month, charge full rent + deposit
                paymentAmount = rentAmount + activeLease.depositAmount;
                paymentDescription = `First Month Rent + Deposit - ${tenant.name} - ${property.name} (${property.address}) - ${spot.spotNumber || spot.spotIdentifier}`;
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
                paymentAmount = rentAmount;
                paymentDescription = `Monthly Rent Payment - ${tenant.name} - ${property.name} (${property.address}) - ${spot.spotNumber || spot.spotIdentifier}`;
                console.log("💰 Creating payment for current month:", {
                    amount: paymentAmount,
                    dueDate: paymentDueDate.toISOString(),
                });
            }
            else if (currentMonthPayment.status === "PAID" && !nextMonthPayment) {
                // Current month is paid, no payment for next month - create next month payment
                paymentDueDate = nextMonth;
                paymentAmount = rentAmount;
                paymentDescription = `Monthly Rent Payment (Next Month) - ${tenant.name} - ${property.name} (${property.address}) - ${spot.spotNumber || spot.spotIdentifier}`;
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
        const stripeAccount = yield StripeAccounts.findOne({
            propertyIds: propertyId,
            isActive: true,
            isVerified: true,
        }).select("+stripeSecretKey"); // Explicitly select the secret key
        if (!stripeAccount) {
            throw new Error("No active Stripe account found for this property");
        }
        // Debug: Check if secret key exists
        console.log("🔍 Stripe account found:", {
            accountId: stripeAccount._id,
            name: stripeAccount.name,
            hasSecretKey: !!stripeAccount.stripeSecretKey,
            secretKeyLength: ((_a = stripeAccount.stripeSecretKey) === null || _a === void 0 ? void 0 : _a.length) || 0,
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
                            name: paymentDescription,
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
                    url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/payment-success?payment_intent={CHECKOUT_SESSION_ID}`,
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
// Get transaction history for a payment link
const getPaymentLinkTransactions = (paymentLinkId, secretKey) => __awaiter(void 0, void 0, void 0, function* () {
    const { createStripeInstance } = yield Promise.resolve().then(() => __importStar(require("../stripe/stripe.service")));
    const stripe = createStripeInstance(secretKey);
    return yield stripe.paymentIntents.list({
        limit: 100,
    });
});
// Create payment record from Stripe data
const createPaymentFromStripe = (stripePayment, tenantId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const user = yield users_schema_1.Users.findOne({
        _id: tenantId,
        isDeleted: false,
        isActive: true,
    });
    if (!user)
        throw new Error("User not found or account is deactivated");
    // Find property by name from metadata
    const propertyName = (_a = stripePayment.metadata) === null || _a === void 0 ? void 0 : _a.propertyName;
    if (!propertyName)
        throw new Error("Property name not found in payment metadata");
    const property = yield properties_schema_1.Properties.findOne({ name: propertyName });
    if (!property) {
        // Cancel payment if property not found
        // Note: We need the secret key to cancel, but we don't have it here
        // This is a limitation - we'll need to handle this differently
        throw new Error(`Property not found: ${propertyName}`);
    }
    // Get the Stripe account for this property
    const { StripeAccounts } = yield Promise.resolve().then(() => __importStar(require("../stripe/stripe.schema")));
    const stripeAccount = yield StripeAccounts.findOne({
        propertyIds: property._id,
        isActive: true,
        isVerified: true,
    });
    // Create payment record
    return payments_schema_1.Payments.create({
        tenantId,
        propertyId: property._id,
        spotId: user.spotId,
        amount: stripePayment.amount / 100, // Convert from cents
        type: "RENT",
        status: "PAID",
        dueDate: new Date(),
        paidDate: new Date(stripePayment.created * 1000),
        paymentMethod: "ONLINE",
        transactionId: stripePayment.id,
        stripeTransactionId: stripePayment.id,
        stripeAccountId: stripeAccount === null || stripeAccount === void 0 ? void 0 : stripeAccount._id,
        receiptNumber: `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        description: "Monthly Rent Payment",
        totalAmount: stripePayment.amount / 100,
        createdBy: "SYSTEM",
    });
});
// Handle successful payment via webhook
const handleSuccessfulPayment = (stripePaymentIntent) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("🎉 Processing successful payment:", {
            paymentIntentId: stripePaymentIntent.id,
            amount: stripePaymentIntent.amount / 100,
            metadata: stripePaymentIntent.metadata,
        });
        // Extract payment record ID from metadata
        const { paymentRecordId } = stripePaymentIntent.metadata;
        if (!paymentRecordId) {
            console.error("❌ Missing paymentRecordId in metadata:", stripePaymentIntent.metadata);
            throw new Error("Missing payment record ID in metadata");
        }
        // Find the existing payment record
        const existingPayment = yield payments_schema_1.Payments.findById(paymentRecordId);
        if (!existingPayment) {
            console.error("❌ Payment record not found:", paymentRecordId);
            throw new Error("Payment record not found");
        }
        // Use stored metadata if available, otherwise use PaymentIntent data
        const storedMetadata = existingPayment.stripeMetadata || {};
        console.log("📋 Using stored metadata:", storedMetadata);
        // Update the payment record with successful payment details
        const updatedPayment = yield payments_schema_1.Payments.findByIdAndUpdate(paymentRecordId, {
            status: "PAID",
            paidDate: new Date(stripePaymentIntent.created * 1000),
            paymentMethod: "ONLINE",
            transactionId: stripePaymentIntent.id,
            stripeTransactionId: stripePaymentIntent.id,
            stripePaymentIntentId: stripePaymentIntent.id,
            receiptNumber: `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            // Update description if we have stored metadata
            description: storedMetadata.paymentDescription || existingPayment.description,
        }, { new: true });
        console.log("✅ Payment record updated successfully:", {
            paymentId: updatedPayment === null || updatedPayment === void 0 ? void 0 : updatedPayment._id,
            amount: updatedPayment === null || updatedPayment === void 0 ? void 0 : updatedPayment.totalAmount,
            status: updatedPayment === null || updatedPayment === void 0 ? void 0 : updatedPayment.status,
            description: updatedPayment === null || updatedPayment === void 0 ? void 0 : updatedPayment.description,
        });
        return updatedPayment;
    }
    catch (error) {
        console.error("❌ Error handling successful payment:", error);
        throw error;
    }
});
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
        const currentMonthAmount = (currentMonthPayment === null || currentMonthPayment === void 0 ? void 0 : currentMonthPayment.totalAmount) || activeLease.rentAmount;
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
                let paymentAmount = activeLease.rentAmount;
                let paymentDescription = "First Month Rent Payment";
                // Check if lease started mid-month and adjust amount if needed
                const leaseStartDay = activeLease.leaseStart.getDate();
                if (leaseStartDay > 1) {
                    // Pro-rate the first month's rent
                    const daysInMonth = new Date(activeLease.leaseStart.getFullYear(), activeLease.leaseStart.getMonth() + 1, 0).getDate();
                    const remainingDays = daysInMonth - leaseStartDay + 1;
                    paymentAmount = Math.round((activeLease.rentAmount / daysInMonth) * remainingDays);
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
            lease: {
                id: activeLease._id,
                rentAmount: activeLease.rentAmount,
                leaseType: activeLease.leaseType,
                leaseStatus: activeLease.leaseStatus,
                leaseStart: activeLease.leaseStart,
            },
            currentMonth: {
                dueDate: (currentMonthPayment === null || currentMonthPayment === void 0 ? void 0 : currentMonthPayment.dueDate) || currentMonth,
                rentAmount: activeLease.rentAmount,
                status: (currentMonthPayment === null || currentMonthPayment === void 0 ? void 0 : currentMonthPayment.status) || "PENDING",
                paidDate: currentMonthPayment === null || currentMonthPayment === void 0 ? void 0 : currentMonthPayment.paidDate,
                daysOverdue: daysOverdue,
                lateFeeAmount: (currentMonthPayment === null || currentMonthPayment === void 0 ? void 0 : currentMonthPayment.lateFeeAmount) || 0,
                totalAmount: (currentMonthPayment === null || currentMonthPayment === void 0 ? void 0 : currentMonthPayment.totalAmount) || activeLease.rentAmount,
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
exports.PaymentService = {
    getTenantPaymentStatusEnhanced,
    getPaymentLinkDetails,
    getPaymentHistory,
    getRentSummary: getRentSummaryEnhanced, // Changed to use the enhanced function
    createPaymentWithLink,
    handleSuccessfulPayment,
    verifyPaymentLinkOwnership,
    getPendingPaymentDetails,
};

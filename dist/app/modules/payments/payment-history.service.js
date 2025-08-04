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
exports.getRentSummary = exports.getPaymentSummary = exports.calculateSummary = exports.mergePaymentData = exports.getPaymentHistory = void 0;
const leases_schema_1 = require("../leases/leases.schema");
const properties_schema_1 = require("../properties/properties.schema");
const spots_schema_1 = require("../spots/spots.schema");
const stripe_service_1 = require("../stripe/stripe.service");
const users_schema_1 = require("../users/users.schema");
const payments_schema_1 = require("./payments.schema");
const getPaymentHistory = (tenantId) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield users_schema_1.Users.findById(tenantId);
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
                const { StripeAccounts } = yield Promise.resolve().then(() => __importStar(require("../stripe/stripe-accounts.schema")));
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
    const combinedPayments = (0, exports.mergePaymentData)(dbPayments, stripePayments);
    // Calculate summary
    const summary = (0, exports.calculateSummary)(combinedPayments);
    return { payments: combinedPayments, summary };
});
exports.getPaymentHistory = getPaymentHistory;
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
exports.mergePaymentData = mergePaymentData;
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
exports.calculateSummary = calculateSummary;
const getPaymentSummary = (tenantId) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield users_schema_1.Users.findById(tenantId);
    if (!user) {
        return {
            totalPaid: 0,
            totalPayments: 0,
            successRate: 0,
            overdueAmount: 0,
        };
    }
    // Get payments from database only for summary
    const dbPayments = yield payments_schema_1.Payments.find({
        tenantId,
        isDeleted: false,
    });
    return (0, exports.calculateSummary)(dbPayments.map(p => ({
        status: p.status,
        amount: p.totalAmount,
    })));
});
exports.getPaymentSummary = getPaymentSummary;
const getRentSummary = (tenantId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const user = yield users_schema_1.Users.findById(tenantId);
    if (!user) {
        throw new Error("User not found");
    }
    console.log("Looking for lease for tenant:", tenantId);
    // Get active lease
    const activeLease = yield leases_schema_1.Leases.findOne({
        tenantId,
        leaseStatus: "ACTIVE",
        isDeleted: false,
    }).populate("propertyId spotId");
    console.log("Active lease found:", activeLease ? "Yes" : "No");
    if (!activeLease) {
        // Check if there are any leases for this tenant (for debugging)
        const anyLease = yield leases_schema_1.Leases.findOne({ tenantId });
        console.log("Any lease found:", anyLease ? "Yes" : "No");
        if (anyLease) {
            console.log("Lease status:", anyLease.leaseStatus);
            console.log("Lease isDeleted:", anyLease.isDeleted);
        }
        return {
            hasActiveLease: false,
            message: "No active lease found",
            rentSummary: undefined,
        };
    }
    // Get property and spot details
    const property = yield properties_schema_1.Properties.findById(activeLease.propertyId);
    const spot = yield spots_schema_1.Spots.findById(activeLease.spotId);
    if (!property || !spot) {
        throw new Error("Property or spot not found");
    }
    // Get current month's rent payment
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    // Calculate due date (typically 1st of each month)
    const dueDate = new Date(currentYear, currentMonth, 1);
    // Get rent payment for current month
    const currentMonthPayment = yield payments_schema_1.Payments.findOne({
        tenantId,
        type: "RENT",
        dueDate: {
            $gte: new Date(currentYear, currentMonth, 1),
            $lt: new Date(currentYear, currentMonth + 1, 1),
        },
        isDeleted: false,
    });
    // Get all pending rent payments
    const pendingRentPayments = yield payments_schema_1.Payments.find({
        tenantId,
        type: "RENT",
        status: { $in: ["PENDING", "OVERDUE"] },
        isDeleted: false,
    }).sort({ dueDate: 1 });
    // Get recent paid rent payments (last 6 months)
    const recentPaidPayments = yield payments_schema_1.Payments.find({
        tenantId,
        type: "RENT",
        status: "PAID",
        isDeleted: false,
    })
        .sort({ dueDate: -1 })
        .limit(6);
    // Calculate overdue amount
    const overduePayments = pendingRentPayments.filter(payment => payment.status === "OVERDUE");
    const totalOverdueAmount = overduePayments.reduce((sum, payment) => sum + payment.totalAmount, 0);
    // Calculate days overdue for current payment
    const daysOverdue = currentMonthPayment && currentMonthPayment.status === "OVERDUE"
        ? Math.floor((currentDate.getTime() - currentMonthPayment.dueDate.getTime()) /
            (1000 * 60 * 60 * 24))
        : 0;
    // Create dynamic payment link for current month if payment is pending
    let currentMonthPaymentLink = null;
    if (currentMonthPayment && currentMonthPayment.status === "PENDING") {
        try {
            currentMonthPaymentLink = yield (0, stripe_service_1.createPaymentLink)({
                tenantId: currentMonthPayment.tenantId.toString(),
                propertyId: currentMonthPayment.propertyId.toString(),
                spotId: currentMonthPayment.spotId.toString(),
                amount: currentMonthPayment.amount,
                type: currentMonthPayment.type,
                dueDate: currentMonthPayment.dueDate,
                description: currentMonthPayment.description,
                lateFeeAmount: currentMonthPayment.lateFeeAmount,
                receiptNumber: currentMonthPayment.receiptNumber,
            });
        }
        catch (error) {
            console.error("Error creating payment link for current month:", error);
        }
    }
    const rentSummary = {
        // Payment link information - now dynamic for current month
        paymentLink: currentMonthPaymentLink
            ? {
                id: currentMonthPaymentLink.id,
                url: currentMonthPaymentLink.url,
            }
            : {
                id: undefined,
                url: undefined,
            },
        // Property and spot information
        property: {
            id: ((_a = property._id) === null || _a === void 0 ? void 0 : _a.toString()) || property._id,
            name: property.name,
            address: property.address,
        },
        spot: {
            id: ((_b = spot._id) === null || _b === void 0 ? void 0 : _b.toString()) || spot._id,
            spotNumber: spot.spotNumber,
            spotIdentifier: spot.spotIdentifier,
            amenities: spot.amenities,
            size: spot.size,
        },
        // Lease information
        lease: {
            id: ((_c = activeLease._id) === null || _c === void 0 ? void 0 : _c.toString()) || activeLease._id,
            leaseType: activeLease.leaseType,
            leaseStart: activeLease.leaseStart,
            leaseEnd: activeLease.leaseEnd,
            rentAmount: activeLease.rentAmount,
            depositAmount: activeLease.depositAmount,
            leaseStatus: activeLease.leaseStatus,
            paymentStatus: activeLease.paymentStatus,
        },
        // Current month payment
        currentMonth: {
            dueDate: dueDate,
            rentAmount: activeLease.rentAmount,
            status: (currentMonthPayment === null || currentMonthPayment === void 0 ? void 0 : currentMonthPayment.status) || "PENDING",
            paidDate: currentMonthPayment === null || currentMonthPayment === void 0 ? void 0 : currentMonthPayment.paidDate,
            paymentMethod: currentMonthPayment === null || currentMonthPayment === void 0 ? void 0 : currentMonthPayment.paymentMethod,
            lateFeeAmount: (currentMonthPayment === null || currentMonthPayment === void 0 ? void 0 : currentMonthPayment.lateFeeAmount) || 0,
            totalAmount: (currentMonthPayment === null || currentMonthPayment === void 0 ? void 0 : currentMonthPayment.totalAmount) || activeLease.rentAmount,
            daysOverdue: daysOverdue,
            receiptNumber: currentMonthPayment === null || currentMonthPayment === void 0 ? void 0 : currentMonthPayment.receiptNumber,
        },
        // Payment summary
        summary: {
            totalOverdueAmount,
            overdueCount: overduePayments.length,
            pendingCount: pendingRentPayments.length,
            totalPaidAmount: recentPaidPayments.reduce((sum, payment) => sum + payment.totalAmount, 0),
            averagePaymentAmount: recentPaidPayments.length > 0
                ? recentPaidPayments.reduce((sum, payment) => sum + payment.totalAmount, 0) / recentPaidPayments.length
                : 0,
        },
        // Recent payment history
        recentPayments: recentPaidPayments.map(payment => {
            var _a;
            return ({
                id: ((_a = payment._id) === null || _a === void 0 ? void 0 : _a.toString()) || payment._id,
                dueDate: payment.dueDate,
                paidDate: payment.paidDate,
                amount: payment.totalAmount,
                paymentMethod: payment.paymentMethod,
                receiptNumber: payment.receiptNumber,
                status: payment.status,
            });
        }),
        // Pending payments
        pendingPayments: pendingRentPayments.map(payment => {
            var _a;
            return ({
                id: ((_a = payment._id) === null || _a === void 0 ? void 0 : _a.toString()) || payment._id,
                dueDate: payment.dueDate,
                amount: payment.totalAmount,
                status: payment.status,
                daysOverdue: payment.status === "OVERDUE"
                    ? Math.floor((currentDate.getTime() - payment.dueDate.getTime()) /
                        (1000 * 60 * 60 * 24))
                    : 0,
            });
        }),
    };
    return {
        hasActiveLease: true,
        rentSummary,
    };
});
exports.getRentSummary = getRentSummary;

"use strict";
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
exports.PaymentHistoryService = void 0;
const leases_schema_1 = require("../leases/leases.schema");
const properties_schema_1 = require("../properties/properties.schema");
const spots_schema_1 = require("../spots/spots.schema");
const stripe_service_1 = require("../stripe/stripe.service");
const users_schema_1 = require("../users/users.schema");
const payments_schema_1 = require("./payments.schema");
class PaymentHistoryService {
    static getPaymentHistory(tenantId) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield users_schema_1.Users.findById(tenantId);
            if (!(user === null || user === void 0 ? void 0 : user.stripePaymentLinkId)) {
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
            // Get payments from Stripe
            const stripeService = new stripe_service_1.StripeService();
            const stripePayments = yield stripeService.getPaymentLinkTransactions(user.stripePaymentLinkId);
            // Combine and merge data
            const combinedPayments = this.mergePaymentData(dbPayments, stripePayments.data);
            // Calculate summary
            const summary = this.calculateSummary(combinedPayments);
            return { payments: combinedPayments, summary };
        });
    }
    static mergePaymentData(dbPayments, stripePayments) {
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
    }
    static calculateSummary(payments) {
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
    }
    static getPaymentSummary(tenantId) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield users_schema_1.Users.findById(tenantId);
            if (!(user === null || user === void 0 ? void 0 : user.stripePaymentLinkId)) {
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
            return this.calculateSummary(dbPayments.map(p => ({
                status: p.status,
                amount: p.totalAmount,
            })));
        });
    }
    static getRentSummary(tenantId) {
        return __awaiter(this, void 0, void 0, function* () {
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
            const rentSummary = {
                // Payment link information
                paymentLink: {
                    id: user.stripePaymentLinkId || undefined,
                    url: user.stripePaymentLinkUrl || undefined,
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
    }
}
exports.PaymentHistoryService = PaymentHistoryService;

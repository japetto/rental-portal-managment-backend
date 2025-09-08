"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaseType = exports.LeaseStatus = exports.PaymentMethod = exports.PaymentType = exports.PaymentStatus = void 0;
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "PENDING";
    PaymentStatus["PAID"] = "PAID";
    PaymentStatus["OVERDUE"] = "OVERDUE";
    PaymentStatus["CANCELLED"] = "CANCELLED";
    PaymentStatus["REFUNDED"] = "REFUNDED";
    PaymentStatus["PARTIAL"] = "PARTIAL";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var PaymentType;
(function (PaymentType) {
    PaymentType["RENT"] = "RENT";
    PaymentType["DEPOSIT"] = "DEPOSIT";
    PaymentType["LATE_FEE"] = "LATE_FEE";
    PaymentType["UTILITY"] = "UTILITY";
    PaymentType["MAINTENANCE"] = "MAINTENANCE";
    PaymentType["OTHER"] = "OTHER";
})(PaymentType || (exports.PaymentType = PaymentType = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CASH"] = "CASH";
    PaymentMethod["CHECK"] = "CHECK";
    PaymentMethod["CREDIT_CARD"] = "CREDIT_CARD";
    PaymentMethod["DEBIT_CARD"] = "DEBIT_CARD";
    PaymentMethod["BANK_TRANSFER"] = "BANK_TRANSFER";
    PaymentMethod["ONLINE"] = "ONLINE";
    PaymentMethod["MANUAL"] = "MANUAL";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var LeaseStatus;
(function (LeaseStatus) {
    LeaseStatus["ACTIVE"] = "ACTIVE";
    LeaseStatus["EXPIRED"] = "EXPIRED";
    LeaseStatus["CANCELLED"] = "CANCELLED";
    LeaseStatus["PENDING"] = "PENDING";
})(LeaseStatus || (exports.LeaseStatus = LeaseStatus = {}));
var LeaseType;
(function (LeaseType) {
    LeaseType["MONTHLY"] = "MONTHLY";
    LeaseType["FIXED_TERM"] = "FIXED_TERM";
})(LeaseType || (exports.LeaseType = LeaseType = {}));

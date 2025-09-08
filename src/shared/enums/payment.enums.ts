export enum PaymentStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  OVERDUE = "OVERDUE",
  CANCELLED = "CANCELLED",
  REFUNDED = "REFUNDED",
  PARTIAL = "PARTIAL",
}

export enum PaymentType {
  RENT = "RENT",
  DEPOSIT = "DEPOSIT",
  LATE_FEE = "LATE_FEE",
  UTILITY = "UTILITY",
  MAINTENANCE = "MAINTENANCE",
  OTHER = "OTHER",
}

export enum PaymentMethod {
  CASH = "CASH",
  CHECK = "CHECK",
  CREDIT_CARD = "CREDIT_CARD",
  DEBIT_CARD = "DEBIT_CARD",
  BANK_TRANSFER = "BANK_TRANSFER",
  ONLINE = "ONLINE",
  MANUAL = "MANUAL",
}

export enum LeaseStatus {
  ACTIVE = "ACTIVE",
  EXPIRED = "EXPIRED",
  CANCELLED = "CANCELLED",
  PENDING = "PENDING",
}

export enum LeaseType {
  MONTHLY = "MONTHLY",
  FIXED_TERM = "FIXED_TERM",
}

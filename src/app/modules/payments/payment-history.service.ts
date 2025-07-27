import { StripeService } from "../stripe/stripe.service";
import { Users } from "../users/users.schema";
import { Payments } from "./payments.schema";

export class PaymentHistoryService {
  static async getPaymentHistory(tenantId: string) {
    const user = await Users.findById(tenantId);

    if (!user?.stripePaymentLinkId) {
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
    const dbPayments = await Payments.find({
      tenantId,
      isDeleted: false,
    }).populate("propertyId", "name");

    // Get payments from Stripe
    const stripeService = new StripeService();
    const stripePayments = await stripeService.getPaymentLinkTransactions(
      user.stripePaymentLinkId,
    );

    // Combine and merge data
    const combinedPayments = this.mergePaymentData(
      dbPayments,
      stripePayments.data,
    );

    // Calculate summary
    const summary = this.calculateSummary(combinedPayments);

    return { payments: combinedPayments, summary };
  }

  static mergePaymentData(dbPayments: any[], stripePayments: any[]) {
    const mergedPayments = [];

    // Add database payments
    for (const dbPayment of dbPayments) {
      mergedPayments.push({
        id: dbPayment._id,
        datePaid: dbPayment.paidDate || dbPayment.createdAt,
        amount: dbPayment.totalAmount,
        status: dbPayment.status,
        method: dbPayment.paymentMethod || "ONLINE",
        confirmationId:
          dbPayment.stripeTransactionId || dbPayment.transactionId,
        propertyName: dbPayment.propertyId?.name || "Unknown Property",
        description: dbPayment.description,
        receiptNumber: dbPayment.receiptNumber,
        source: "database",
      });
    }

    // Add Stripe payments that might not be in database
    for (const stripePayment of stripePayments) {
      const existingPayment = dbPayments.find(
        db => db.stripeTransactionId === stripePayment.id,
      );

      if (!existingPayment && stripePayment.status === "succeeded") {
        mergedPayments.push({
          id: stripePayment.id,
          datePaid: new Date(stripePayment.created * 1000),
          amount: stripePayment.amount / 100,
          status: "PAID",
          method: "ONLINE",
          confirmationId: stripePayment.id,
          propertyName:
            stripePayment.metadata?.propertyName || "Unknown Property",
          description: "Monthly Rent Payment",
          receiptNumber: `STRIPE-${stripePayment.id}`,
          source: "stripe",
        });
      }
    }

    // Sort by date (newest first)
    return mergedPayments.sort(
      (a, b) => new Date(b.datePaid).getTime() - new Date(a.datePaid).getTime(),
    );
  }

  static calculateSummary(payments: any[]) {
    const totalPaid = payments
      .filter(p => p.status === "PAID")
      .reduce((sum, p) => sum + p.amount, 0);

    const totalPayments = payments.length;
    const paidPayments = payments.filter(p => p.status === "PAID").length;
    const successRate =
      totalPayments > 0 ? Math.round((paidPayments / totalPayments) * 100) : 0;

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

  static async getPaymentSummary(tenantId: string) {
    const user = await Users.findById(tenantId);

    if (!user?.stripePaymentLinkId) {
      return {
        totalPaid: 0,
        totalPayments: 0,
        successRate: 0,
        overdueAmount: 0,
      };
    }

    // Get payments from database only for summary
    const dbPayments = await Payments.find({
      tenantId,
      isDeleted: false,
    });

    return this.calculateSummary(
      dbPayments.map(p => ({
        status: p.status,
        amount: p.totalAmount,
      })),
    );
  }
}

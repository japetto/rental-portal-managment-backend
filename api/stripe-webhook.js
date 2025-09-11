// Dedicated Stripe webhook handler for Vercel (no Express)
const mongoose = require("mongoose");
const Stripe = require("stripe");
const { URL } = require("url");

// Import compiled modules from dist
const { Payments } = require("../dist/app/modules/payments/payments.schema.js");
const {
  StripeAccounts,
} = require("../dist/app/modules/stripe/stripe.schema.js");
const { PaymentStatus } = require("../dist/shared/enums/payment.enums.js");
const {
  PaymentService,
} = require("../dist/app/modules/payments/payment.service.js");

// Connect to MongoDB (reuse logic similar to api/index.js)
let mongoConnected = false;
async function connectDB() {
  if (mongoConnected) return;
  const uri = process.env.DATABASE_URL;
  if (!uri) {
    console.error("DATABASE_URL is not defined");
    return;
  }
  await mongoose.connect(uri);
  mongoConnected = true;
  console.log("🛢 Webhook DB Connected");
}

// Read raw body as Buffer
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

// Minimal handlers
async function handleSucceeded(paymentIntent, stripeAccountId) {
  console.log("🔔 Payment succeeded webhook triggered:", {
    paymentIntentId: paymentIntent.id,
    metadata: paymentIntent.metadata,
    stripeAccountId,
  });

  try {
    if (paymentIntent?.metadata?.paymentRecordId) {
      const paymentRecordId = paymentIntent.metadata.paymentRecordId;
      console.log("📝 Updating payment record:", paymentRecordId);

      // First, check if the payment record exists
      const existingPayment = await Payments.findById(paymentRecordId);
      if (!existingPayment) {
        console.error("❌ Payment record not found:", paymentRecordId);
        return;
      }

      console.log("📋 Found existing payment:", {
        id: existingPayment._id,
        currentStatus: existingPayment.status,
        amount: existingPayment.amount,
      });

      const updatedPayment = await Payments.findByIdAndUpdate(
        paymentRecordId,
        {
          status: PaymentStatus.PAID,
          paidDate: new Date(paymentIntent.created * 1000),
          paymentMethod: "ONLINE",
          stripePaymentIntentId: paymentIntent.id,
          stripeTransactionId:
            paymentIntent.charges?.data?.[0]?.id || paymentIntent.latest_charge,
          stripeMetadata: paymentIntent.metadata,
          receiptNumber: `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          stripeAccountId: stripeAccountId,
        },
        { new: true },
      );

      if (!updatedPayment) {
        console.error("❌ Failed to update payment record:", paymentRecordId);
        return;
      }

      console.log("✅ Payment updated successfully:", {
        paymentId: updatedPayment._id,
        status: updatedPayment.status,
        receiptNumber: updatedPayment.receiptNumber,
        paidDate: updatedPayment.paidDate,
      });

      // Update rent summary to reflect the latest payment data
      try {
        await PaymentService.getRentSummary(updatedPayment.tenantId.toString());
        console.log(
          `✅ Rent summary updated for tenant: ${updatedPayment.tenantId}`,
        );
      } catch (error) {
        console.error(
          `❌ Failed to update rent summary for tenant ${updatedPayment.tenantId}:`,
          error,
        );
        // Don't throw error here as payment was successful, just log the issue
      }

      return;
    }

    // Fallback: find by PaymentIntent ID
    console.log(
      "🔍 Trying fallback: searching by PaymentIntent ID:",
      paymentIntent.id,
    );
    const existing = await Payments.findOne({
      stripePaymentIntentId: paymentIntent.id,
    });

    if (existing) {
      console.log("📋 Found payment by PaymentIntent ID:", {
        id: existing._id,
        currentStatus: existing.status,
      });

      existing.status = PaymentStatus.PAID;
      existing.paidDate = new Date(paymentIntent.created * 1000);
      existing.stripeTransactionId =
        paymentIntent.charges?.data?.[0]?.id || paymentIntent.latest_charge;
      existing.stripeAccountId = stripeAccountId;

      const savedPayment = await existing.save();
      console.log("✅ Payment updated via fallback:", {
        paymentId: savedPayment._id,
        status: savedPayment.status,
        paidDate: savedPayment.paidDate,
      });

      // Update rent summary to reflect the latest payment data
      try {
        await PaymentService.getRentSummary(savedPayment.tenantId.toString());
        console.log(
          `✅ Rent summary updated for tenant: ${savedPayment.tenantId}`,
        );
      } catch (error) {
        console.error(
          `❌ Failed to update rent summary for tenant ${savedPayment.tenantId}:`,
          error,
        );
        // Don't throw error here as payment was successful, just log the issue
      }
    } else {
      console.error(
        "❌ No payment record found for PaymentIntent ID:",
        paymentIntent.id,
      );
    }
  } catch (error) {
    console.error("❌ Error in handleSucceeded:", {
      error: error.message,
      stack: error.stack,
      paymentIntentId: paymentIntent.id,
      metadata: paymentIntent.metadata,
    });
  }
}

async function handleFailed(paymentIntent, stripeAccountId) {
  const update = {
    status: PaymentStatus.PENDING,
    stripePaymentIntentId: paymentIntent.id,
    stripeMetadata: {
      ...(paymentIntent.metadata || {}),
      error: paymentIntent.last_payment_error?.message || "Payment failed",
    },
    stripeAccountId: stripeAccountId,
  };
  if (paymentIntent?.metadata?.paymentRecordId) {
    await Payments.findByIdAndUpdate(
      paymentIntent.metadata.paymentRecordId,
      update,
    );
    return;
  }
  await Payments.findOneAndUpdate(
    { stripePaymentIntentId: paymentIntent.id },
    update,
  );
}

async function handleCanceled(paymentIntent, stripeAccountId) {
  const update = {
    status: PaymentStatus.CANCELLED,
    stripePaymentIntentId: paymentIntent.id,
    stripeMetadata: {
      ...(paymentIntent.metadata || {}),
      error: "Payment was canceled",
    },
    stripeAccountId: stripeAccountId,
  };
  if (paymentIntent?.metadata?.paymentRecordId) {
    await Payments.findByIdAndUpdate(
      paymentIntent.metadata.paymentRecordId,
      update,
    );
    return;
  }
  await Payments.findOneAndUpdate(
    { stripePaymentIntentId: paymentIntent.id },
    update,
  );
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Allow", "POST");
    res.end("Method Not Allowed");
    return;
  }

  try {
    await connectDB();

    // Verify database connection
    if (!mongoConnected) {
      console.error("❌ Database not connected");
      res.statusCode = 500;
      res.end(JSON.stringify({ error: "Database connection failed" }));
      return;
    }
    console.log("✅ Database connection verified");

    const signature = req.headers["stripe-signature"];
    if (!signature) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "Missing Stripe signature" }));
      return;
    }

    const rawBody = await readRawBody(req);
    console.log("🔧 Webhook raw body length:", rawBody.length);

    // Try to identify account
    const url = new URL(req.url, `http://${req.headers.host}`);
    let accountId =
      url.searchParams.get("accountId") || req.headers["stripe-account-id"]; // may be undefined

    let stripeAccount = null;
    if (accountId) {
      stripeAccount = await StripeAccounts.findById(accountId).select(
        "+stripeSecretKey +webhookSecret",
      );
    }

    let event;
    // If account/secret unknown, iterate all
    if (!stripeAccount || !stripeAccount.webhookSecret) {
      const allAccounts = await StripeAccounts.find({
        webhookSecret: { $exists: true, $ne: null },
      }).select("+stripeSecretKey +webhookSecret name");

      for (const acc of allAccounts) {
        try {
          event = Stripe.webhooks.constructEvent(
            rawBody,
            signature,
            acc.webhookSecret,
          );
          stripeAccount = acc;
          accountId = acc._id.toString();
          console.log(`✅ Matched account ${acc.name} (${accountId})`);
          break;
        } catch (e) {
          // try next
        }
      }
    } else {
      // Verify with known account secret
      event = Stripe.webhooks.constructEvent(
        rawBody,
        signature,
        stripeAccount.webhookSecret,
      );
    }

    if (!event || !stripeAccount) {
      res.statusCode = 400;
      res.end(
        JSON.stringify({ error: "Webhook signature verification failed" }),
      );
      return;
    }

    console.log(`🔔 Webhook event: ${event.type}`, {
      eventId: event.id,
      accountId,
      stripeAccountName: stripeAccount?.name,
    });

    switch (event.type) {
      case "payment_intent.succeeded":
        console.log("💰 Processing payment_intent.succeeded");
        try {
          await handleSucceeded(event.data.object, accountId);
          console.log("✅ payment_intent.succeeded processed successfully");
        } catch (error) {
          console.error("❌ Error processing payment_intent.succeeded:", error);
        }
        break;
      case "payment_intent.payment_failed":
        console.log("❌ Processing payment_intent.payment_failed");
        try {
          await handleFailed(event.data.object, accountId);
          console.log(
            "✅ payment_intent.payment_failed processed successfully",
          );
        } catch (error) {
          console.error(
            "❌ Error processing payment_intent.payment_failed:",
            error,
          );
        }
        break;
      case "payment_intent.canceled":
        console.log("🚫 Processing payment_intent.canceled");
        try {
          await handleCanceled(event.data.object, accountId);
          console.log("✅ payment_intent.canceled processed successfully");
        } catch (error) {
          console.error("❌ Error processing payment_intent.canceled:", error);
        }
        break;
      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`);
        // no-op
        break;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ received: true }));
  } catch (err) {
    console.error("Webhook error:", err?.message || err);
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: `Webhook Error: ${err.message}` }));
  }
};

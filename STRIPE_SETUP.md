# Stripe Payment Integration Setup

## Environment Variables Required

Add these variables to your `.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Frontend URL (for payment redirects)
FRONTEND_URL=http://localhost:3000
```

## Setup Steps

### 1. Create Stripe Account
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Create an account for each property
3. Get the Account ID (starts with `acct_`)

### 2. Create Payment Links
1. In Stripe Dashboard, go to "Payment Links"
2. Create a payment link for each tenant with:
   - Amount: Monthly rent amount
   - Description: "Monthly Rent Payment"
   - Metadata: 
     - `propertyName`: Unique property name
     - `paymentType`: "monthly_rent"

### 3. Update Property
```typescript
PATCH /admin/properties/${propertyId}
{
  "stripeAccountId": "acct_1234567890",
  "propertyName": "Sunset RV Park"
}
```

### 4. Assign Payment Link to Tenant
```typescript
PATCH /admin/users/${userId}
{
  "stripePaymentLinkId": "plink_1234567890",
  "stripePaymentLinkUrl": "https://checkout.stripe.com/pay/..."
}
```

### 5. Setup Webhook
1. In Stripe Dashboard, go to "Webhooks"
2. Add endpoint: `https://your-domain.com/api/v1.0/webhooks/stripe`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
4. Copy the webhook secret to your `.env` file

## API Endpoints

### Webhook
- `POST /webhooks/stripe` - Stripe webhook handler

### Payment History
- `GET /users/payment-history` - Get user's payment history
- `POST /webhooks/sync-payment-history/:userId` - Sync payment history (admin only)

### User Profile
- `GET /users/me` - Get user profile with payment link

## Payment Flow

1. **Admin creates payment link** in Stripe Dashboard
2. **Admin assigns payment link** to tenant via API
3. **Tenant sees payment link** in `/me` route
4. **Tenant clicks payment link** and pays via Stripe
5. **Stripe webhook** creates payment record in database
6. **Tenant sees payment history** in dashboard

## Error Handling

- If property not found in webhook, payment is automatically canceled
- Invalid payment links are rejected during user updates
- Payment history syncs existing Stripe payments to database 
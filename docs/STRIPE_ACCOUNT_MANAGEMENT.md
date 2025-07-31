# Stripe Account Management System

## Overview

The Stripe Account Management System allows properties to have their own dedicated Stripe Connect accounts for processing payments. This ensures proper fund separation and compliance with Stripe's Connect platform requirements.

## Architecture

### Database Models

#### StripeAccounts Schema
```typescript
{
  name: string;                    // Account name
  description?: string;            // Optional description
  propertyId: ObjectId;           // Reference to Property
  stripeAccountId: string;        // Stripe Connect Account ID
  isActive: boolean;              // Account status
  isVerified: boolean;            // Verification status
  businessName?: string;          // Business name
  businessEmail?: string;         // Business email
  metadata?: any;                 // Additional data
  isDeleted: boolean;             // Soft delete flag
  deletedAt?: Date;               // Deletion timestamp
}
```

### Key Features

1. **Property-Specific Accounts**: Each property can have its own Stripe Connect account
2. **Account Verification**: Track verification status for compliance
3. **Soft Delete**: Maintain data integrity with soft deletion
4. **Validation**: Comprehensive input validation and error handling

## API Endpoints

### Stripe Account Management

#### 1. Create Stripe Account
```http
POST /api/v1.0/webhooks/accounts
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Sunset RV Park Account",
  "description": "Primary payment account for Sunset RV Park",
  "propertyId": "507f1f77bcf86cd799439011",
  "stripeAccountId": "acct_1234567890",
  "businessName": "Sunset RV Park LLC",
  "businessEmail": "payments@sunsetrvpark.com"
}
```

**Response:**
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Stripe account created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Sunset RV Park Account",
    "propertyId": "507f1f77bcf86cd799439011",
    "stripeAccountId": "acct_1234567890",
    "isActive": true,
    "isVerified": false,
    "businessName": "Sunset RV Park LLC",
    "businessEmail": "payments@sunsetrvpark.com",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### 2. Get All Stripe Accounts
```http
GET /api/v1/webhooks/accounts
Authorization: Bearer <admin_token>
```

#### 3. Get Stripe Account by ID
```http
GET /api/v1/webhooks/accounts/:accountId
Authorization: Bearer <admin_token>
```

#### 4. Get Stripe Account by Property
```http
GET /api/v1/webhooks/accounts/property/:propertyId
Authorization: Bearer <admin_token>
```

#### 5. Update Stripe Account
```http
PATCH /api/v1/webhooks/accounts/:accountId
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Updated Account Name",
  "businessEmail": "newemail@sunsetrvpark.com"
}
```

#### 6. Delete Stripe Account (Soft Delete)
```http
DELETE /api/v1/webhooks/accounts/:accountId
Authorization: Bearer <admin_token>
```

#### 7. Verify Stripe Account
```http
PATCH /api/v1/webhooks/accounts/:accountId/verify
Authorization: Bearer <admin_token>
```

### Payment Link Management

#### Create Payment with Link
```http
POST /api/v1/webhooks/create-payment-link
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "tenantId": "507f1f77bcf86cd799439013",
  "propertyId": "507f1f77bcf86cd799439011",
  "spotId": "507f1f77bcf86cd799439014",
  "amount": 500.00,
  "type": "RENT",
  "dueDate": "2024-02-01T00:00:00.000Z",
  "description": "Monthly Rent Payment",
  "lateFeeAmount": 25.00
}
```

**Response:**
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Payment created with payment link successfully",
  "data": {
    "payment": {
      "_id": "507f1f77bcf86cd799439015",
      "receiptNumber": "RCP-1705312200000-123",
      "status": "PENDING",
      "totalAmount": 525.00,
      "stripeAccountId": "507f1f77bcf86cd799439012"
    },
    "paymentLink": {
      "id": "plink_1234567890",
      "url": "https://checkout.stripe.com/pay/...",
      "expiresAt": 1705917000
    }
  }
}
```

## Workflow

### 1. Setup Stripe Connect Account

1. **Create Stripe Connect Account** in Stripe Dashboard
2. **Add Account to Database** using the API
3. **Complete Stripe Onboarding** for the Connect account
4. **Verify Account** using the verify endpoint

### 2. Property Configuration

1. **Link Property** to Stripe account during creation
2. **Validate Account** is active and verified
3. **Configure Fees** if needed

### 3. Payment Processing

1. **User Clicks Pay** → System validates lease and property
2. **Find Stripe Account** → Gets property-specific account
3. **Create Payment Link** → With rich metadata
4. **Process Payment** → Through correct Stripe account
5. **Update Records** → With transaction details

## Validation Rules

### Stripe Account Creation
- ✅ **Name**: Required, non-empty string
- ✅ **Property ID**: Required, valid ObjectId
- ✅ **Stripe Account ID**: Required, non-empty string
- ✅ **Business Email**: Optional, valid email format
- ✅ **Application Fee**: Optional, 0-100 range

### Payment Link Creation
- ✅ **Tenant ID**: Required, valid ObjectId
- ✅ **Property ID**: Required, valid ObjectId
- ✅ **Spot ID**: Required, valid ObjectId
- ✅ **Amount**: Required, positive number
- ✅ **Type**: Required, non-empty string
- ✅ **Due Date**: Required, valid date string
- ✅ **Description**: Required, non-empty string
- ✅ **Late Fee**: Optional, non-negative number

## Error Handling

### Common Error Responses

#### Property Not Found
```json
{
  "statusCode": 404,
  "success": false,
  "message": "Property not found",
  "data": null
}
```

#### Account Already Exists
```json
{
  "statusCode": 409,
  "success": false,
  "message": "Property already has a Stripe account",
  "data": null
}
```

#### No Active Lease
```json
{
  "statusCode": 400,
  "success": false,
  "message": "User does not have an active lease for this property",
  "data": null
}
```

#### No Stripe Account Found
```json
{
  "statusCode": 400,
  "success": false,
  "message": "No active Stripe account found for this property",
  "data": null
}
```

## Security Considerations

### Authentication
- ✅ **Admin Only**: All account management requires admin authentication
- ✅ **Property Validation**: Ensures accounts are linked to valid properties
- ✅ **Soft Delete**: Maintains data integrity and audit trail

### Data Protection
- ✅ **Stripe Account IDs**: Securely stored and validated
- ✅ **Metadata Encryption**: Sensitive data encrypted in Stripe
- ✅ **Webhook Verification**: All webhooks verified with Stripe signatures

## Integration with Existing Systems

### Property Management
- ✅ **Property Schema**: Updated with `stripeAccountId` field
- ✅ **Validation**: Ensures properties have valid Stripe accounts
- ✅ **Cascading**: Property deletion affects Stripe account status

### Payment Processing
- ✅ **Payment Schema**: Updated with `stripeAccountId` field
- ✅ **Lease Validation**: Ensures payments are linked to active leases
- ✅ **Metadata Tracking**: Rich metadata for payment tracking

### User Management
- ✅ **User Permissions**: Admin-only access to account management
- ✅ **Tenant Validation**: Ensures users have valid leases
- ✅ **Payment History**: Links payments to correct Stripe accounts

## Best Practices

### Account Management
1. **Verify Accounts**: Always verify Stripe accounts before use
2. **Monitor Status**: Regularly check account verification status
3. **Backup Accounts**: Consider multiple accounts for redundancy
4. **Fee Management**: Configure appropriate application fees

### Payment Processing
1. **Lease Validation**: Always validate active leases
2. **Account Selection**: Use property-specific accounts
3. **Metadata Tracking**: Include comprehensive metadata
4. **Error Handling**: Graceful handling of missing accounts

### Security
1. **Admin Access**: Restrict account management to admins
2. **Validation**: Comprehensive input validation
3. **Audit Trail**: Maintain complete audit logs
4. **Webhook Security**: Verify all webhook signatures

## Testing

### API Testing
```bash
# Create Stripe Account
curl -X POST http://localhost:3000/api/v1/webhooks/accounts \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Account",
    "propertyId": "507f1f77bcf86cd799439011",
    "stripeAccountId": "acct_test123"
  }'

# Create Payment Link
curl -X POST http://localhost:3000/api/v1/webhooks/create-payment-link \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "507f1f77bcf86cd799439013",
    "propertyId": "507f1f77bcf86cd799439011",
    "spotId": "507f1f77bcf86cd799439014",
    "amount": 500.00,
    "type": "RENT",
    "dueDate": "2024-02-01T00:00:00.000Z",
    "description": "Monthly Rent Payment"
  }'
```

### Webhook Testing
```bash
# Test webhook endpoint
curl -X POST http://localhost:3000/api/v1/webhooks/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment_intent.succeeded",
    "data": {
      "object": {
        "id": "pi_test123",
        "amount": 5000,
        "metadata": {
          "tenantId": "507f1f77bcf86cd799439013",
          "receiptNumber": "RCP-1705312200000-123"
        }
      }
    }
  }'
```

## Monitoring and Logging

### Key Metrics
- ✅ **Account Creation**: Track new account setups
- ✅ **Verification Status**: Monitor account verification rates
- ✅ **Payment Success**: Track successful payments per account
- ✅ **Error Rates**: Monitor failed payment attempts

### Logging
- ✅ **Account Operations**: Log all account CRUD operations
- ✅ **Payment Processing**: Log payment link creation and processing
- ✅ **Webhook Events**: Log all webhook events and processing
- ✅ **Error Tracking**: Comprehensive error logging

This system ensures that each property has its own dedicated Stripe Connect account, providing proper fund separation, compliance, and detailed payment tracking. 🎯 
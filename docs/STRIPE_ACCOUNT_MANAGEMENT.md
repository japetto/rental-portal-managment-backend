# Stripe Account Management API Documentation

## Overview

This document describes the Stripe Account Management API endpoints for managing Stripe Connect accounts, linking properties to accounts, and handling payment processing.

## Features

- **Multiple Properties per Account**: Each Stripe account can be linked to multiple properties
- **Default Account**: Set one account as default for automatic property assignment
- **Global Accounts**: Accounts that can be used across all properties
- **Property-Specific Accounts**: Accounts dedicated to specific properties
- **Duplicate Prevention**: Ensures properties are not assigned to multiple accounts
- **Auto-Assignment**: New properties can be automatically assigned to the default account

## Account Types

1. **Default Account**: Only one account can be set as default. New properties are automatically assigned to this account.
2. **Global Account**: Can be used for all properties regardless of specific assignments.
3. **Property-Specific Account**: Dedicated to specific properties only.

## API Endpoints

### 1. Create Stripe Account

**POST** `/api/v1.0/stripe/accounts`

Creates a new Stripe account with optional default or global settings.

**Request Body:**
```json
{
  "name": "Main Payment Account",
  "description": "Primary payment processing account",
  "stripeAccountId": "acct_1234567890",
  "businessName": "Rental Company LLC",
  "businessEmail": "payments@rentalcompany.com",
  "isGlobalAccount": false,
  "isDefaultAccount": false,
  "metadata": {
    "region": "US",
    "currency": "USD"
  }
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Stripe account created successfully",
  "data": {
    "_id": "account_id",
    "name": "Main Payment Account",
    "stripeAccountId": "acct_1234567890",
    "isDefaultAccount": false,
    "isGlobalAccount": false,
    "propertyIds": [],
    "isActive": true,
    "isVerified": false
  }
}
```

### 2. Link Properties to Account

**POST** `/api/v1.0/stripe/accounts/link-properties`

Links multiple properties to a Stripe account. Prevents duplicate assignments.

**Request Body:**
```json
{
  "accountId": "account_id",
  "propertyIds": ["property_id_1", "property_id_2", "property_id_3"]
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Properties linked to Stripe account successfully",
  "data": {
    "_id": "account_id",
    "name": "Main Payment Account",
    "propertyIds": [
      {
        "_id": "property_id_1",
        "name": "Property A",
        "address": "123 Main St"
      },
      {
        "_id": "property_id_2", 
        "name": "Property B",
        "address": "456 Oak Ave"
      }
    ]
  }
}
```

### 3. Unlink Properties from Account

**POST** `/api/v1.0/stripe/accounts/unlink-properties`

Removes properties from a Stripe account.

**Request Body:**
```json
{
  "accountId": "account_id",
  "propertyIds": ["property_id_1", "property_id_2"]
}
```

### 4. Set Default Account

**POST** `/api/v1.0/stripe/accounts/set-default`

Sets an account as the default account. Only one account can be default at a time.

**Request Body:**
```json
{
  "accountId": "account_id"
}
```

### 5. Get Default Account

**GET** `/api/v1.0/stripe/accounts/default`

Retrieves the current default account.

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Default account retrieved successfully",
  "data": {
    "_id": "account_id",
    "name": "Default Payment Account",
    "isDefaultAccount": true,
    "propertyIds": [...]
  }
}
```

### 6. Get All Stripe Accounts

**GET** `/api/v1.0/stripe/accounts`

Retrieves all Stripe accounts with their linked properties.

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Stripe accounts retrieved successfully",
  "data": [
    {
      "_id": "account_id_1",
      "name": "Default Account",
      "isDefaultAccount": true,
      "isGlobalAccount": false,
      "propertyIds": [...],
      "isActive": true,
      "isVerified": true
    },
    {
      "_id": "account_id_2", 
      "name": "Global Account",
      "isDefaultAccount": false,
      "isGlobalAccount": true,
      "propertyIds": [...],
      "isActive": true,
      "isVerified": true
    }
  ]
}
```

### 7. Get Available Accounts for Property

**GET** `/api/v1.0/stripe/accounts/available/:propertyId`

Retrieves all available Stripe accounts for a specific property.

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Available Stripe accounts retrieved successfully",
  "data": {
    "propertyAccounts": [...],
    "globalAccounts": [...],
    "defaultAccount": {...},
    "hasPropertyAccounts": true,
    "hasGlobalAccounts": true,
    "hasDefaultAccount": true
  }
}
```

### 8. Get Accounts by Property

**GET** `/api/v1.0/stripe/accounts/property/:propertyId`

Retrieves all Stripe accounts linked to a specific property.

### 9. Update Stripe Account

**PATCH** `/api/v1.0/stripe/accounts/:accountId`

Updates a Stripe account's details.

**Request Body:**
```json
{
  "name": "Updated Account Name",
  "description": "Updated description",
  "isActive": true,
  "isDefaultAccount": false
}
```

### 10. Delete Stripe Account

**DELETE** `/api/v1.0/stripe/accounts/:accountId`

Soft deletes a Stripe account.

### 11. Verify Stripe Account

**PATCH** `/api/v1.0/stripe/accounts/:accountId/verify`

Marks a Stripe account as verified.

## Edge Cases and Error Handling

### 1. Duplicate Property Assignment

When linking properties to an account, the system checks if any of the properties are already assigned to other accounts:

```json
{
  "success": false,
  "statusCode": 409,
  "message": "Some properties are already assigned to other accounts",
  "data": {
    "conflictingProperties": ["property_id_1", "property_id_2"]
  }
}
```

### 2. Multiple Default Accounts

Only one account can be set as default. Attempting to set another account as default will return:

```json
{
  "success": false,
  "statusCode": 409,
  "message": "Another account is already set as default",
  "data": null
}
```

### 3. Invalid Property IDs

When linking properties, if any property ID is invalid:

```json
{
  "success": false,
  "statusCode": 404,
  "message": "One or more properties not found",
  "data": null
}
```

### 4. Account Not Found

When referencing a non-existent account:

```json
{
  "success": false,
  "statusCode": 404,
  "message": "Stripe account not found",
  "data": null
}
```

## Auto-Assignment Logic

When a new property is created, the system automatically assigns it to the default account if:

1. A default account exists
2. The property is not already assigned to any account
3. The default account is active

## Account Priority for Property Assignment

When determining which account to use for a property, the system follows this priority:

1. **Property-Specific Accounts**: Accounts directly linked to the property
2. **Global Accounts**: Accounts marked as global
3. **Default Account**: The account marked as default
4. **No Account**: If no suitable account is found

## Database Schema

```typescript
interface IStripeAccount {
  name: string;
  description?: string;
  propertyIds: ObjectId[]; // Array of property IDs
  stripeAccountId: string;
  isActive: boolean;
  isVerified: boolean;
  isGlobalAccount: boolean;
  isDefaultAccount: boolean;
  businessName?: string;
  businessEmail?: string;
  metadata?: any;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

## Best Practices

1. **Set a Default Account**: Always set a default account for automatic property assignment
2. **Use Global Accounts Sparingly**: Reserve global accounts for truly universal payment processing
3. **Monitor Property Assignments**: Regularly check property assignments to ensure optimal distribution
4. **Verify Accounts**: Mark accounts as verified only after Stripe Connect onboarding is complete
5. **Handle Conflicts Gracefully**: Always check for existing assignments before linking properties

## Integration with Property Management

The Stripe account management system integrates with the property management system to:

- Automatically assign new properties to the default account
- Provide account recommendations for property payments
- Ensure payment processing continuity when accounts are updated
- Maintain audit trails of property-account relationships 
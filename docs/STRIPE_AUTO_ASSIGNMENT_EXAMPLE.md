# Stripe Account Auto-Assignment Example

## Overview

When you create a new property, the system automatically assigns it to the default Stripe account (if one exists). This ensures that new properties have payment processing capabilities without manual intervention.

## How It Works

### 1. Set a Default Account

First, set an account as default:

```bash
POST /api/v1.0/webhooks/accounts/set-default
Content-Type: application/json

{
  "accountId": "your_stripe_account_id"
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Default account set successfully",
  "data": {
    "_id": "account_id",
    "name": "Default Payment Account",
    "isDefaultAccount": true,
    "propertyIds": []
  }
}
```

### 2. Create a New Property

When you create a new property, it automatically gets assigned to the default account:

```bash
POST /api/v1.0/admin/properties
Content-Type: application/json

{
  "name": "Sunset RV Park",
  "description": "Beautiful RV park with ocean views",
  "address": {
    "street": "123 Sunset Blvd",
    "city": "Malibu",
    "state": "CA",
    "zip": "90265",
    "country": "USA"
  },
  "amenities": ["WiFi", "Pool", "Laundry"],
  "images": ["image1.jpg", "image2.jpg"],
  "rules": ["No pets", "Quiet hours 10PM-6AM"]
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Property created successfully",
  "data": {
    "_id": "new_property_id",
    "name": "Sunset RV Park",
    "description": "Beautiful RV park with ocean views",
    "address": {
      "street": "123 Sunset Blvd",
      "city": "Malibu",
      "state": "CA",
      "zip": "90265",
      "country": "USA"
    },
    "amenities": ["WiFi", "Pool", "Laundry"],
    "images": ["image1.jpg", "image2.jpg"],
    "rules": ["No pets", "Quiet hours 10PM-6AM"],
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 3. Verify Auto-Assignment

Check that the property was automatically assigned to the default account:

```bash
GET /api/v1.0/webhooks/accounts/default
```

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
    "propertyIds": [
      {
        "_id": "new_property_id",
        "name": "Sunset RV Park",
        "address": {
          "street": "123 Sunset Blvd",
          "city": "Malibu",
          "state": "CA",
          "zip": "90265"
        }
      }
    ]
  }
}
```

## Behind the Scenes

### 1. Property Creation Process

When a property is created, the system:

1. **Creates the property** in the database
2. **Calls auto-assignment function** with the new property ID
3. **Finds the default account** (if one exists)
4. **Checks for existing assignments** (prevents duplicates)
5. **Adds property to default account** if no conflicts exist

### 2. Auto-Assignment Logic

```typescript
// In AdminService.createProperty
const property = await Properties.create(propertyData);

// Auto-assign default Stripe account to the new property
try {
  const { autoAssignPropertyToDefaultAccount } = await import("../stripe/stripe.service");
  await autoAssignPropertyToDefaultAccount(property._id.toString());
} catch (stripeError) {
  // Log the error but don't fail the property creation
  console.error("Failed to auto-assign default Stripe account:", stripeError);
}
```

### 3. Assignment Function

```typescript
export const autoAssignPropertyToDefaultAccount = async (propertyId: string) => {
  // Find the default account
  const defaultAccount = await StripeAccounts.findOne({
    isDefaultAccount: true,
    isDeleted: false,
    isActive: true,
  });

  if (!defaultAccount) {
    console.log("No default Stripe account found for auto-assignment");
    return null;
  }

  // Check if property is already assigned to any account
  const existingAssignment = await StripeAccounts.findOne({
    propertyIds: propertyId,
    isDeleted: false,
  });

  if (existingAssignment) {
    console.log(`Property ${propertyId} is already assigned to account ${existingAssignment._id}`);
    return existingAssignment;
  }

  // Add property to default account
  const updatedAccount = await StripeAccounts.findByIdAndUpdate(
    defaultAccount._id,
    { $push: { propertyIds: propertyId } },
    { new: true },
  ).populate("propertyIds", "name address");

  console.log(`Property ${propertyId} auto-assigned to default account ${defaultAccount._id}`);
  return updatedAccount;
};
```

## Error Handling

### 1. No Default Account

If no default account is set, the property creation still succeeds, but no auto-assignment occurs:

```
"Failed to auto-assign default Stripe account: No default Stripe account found for auto-assignment"
```

### 2. Property Already Assigned

If the property is already assigned to another account, no action is taken:

```
"Property new_property_id is already assigned to account existing_account_id"
```

### 3. Database Errors

If there are database errors during assignment, the property creation still succeeds:

```
"Failed to auto-assign default Stripe account: [error details]"
```

## Best Practices

1. **Always Set a Default Account**: Ensure you have a default account before creating properties
2. **Monitor Logs**: Check logs for auto-assignment success/failure
3. **Verify Assignments**: Use the API to verify properties are correctly assigned
4. **Handle Errors Gracefully**: The system continues even if auto-assignment fails

## API Endpoints for Verification

### Check Default Account
```bash
GET /api/v1.0/webhooks/accounts/default
```

### Check Property's Stripe Account
```bash
GET /api/v1.0/webhooks/accounts/property/{propertyId}
```

### Get All Properties with Stripe Details
```bash
GET /api/v1.0/admin/properties-with-stripe-details
```

### Get Properties Without Stripe Accounts
```bash
GET /api/v1.0/admin/properties-without-stripe-accounts
```

## Migration from Old System

If you have existing properties with the old `stripeAccountId` field, you can migrate them:

1. **Export existing assignments** from the old system
2. **Create Stripe accounts** with the new structure
3. **Link properties** using the new API endpoints
4. **Remove old field** once migration is complete

The system maintains backward compatibility during the transition period. 
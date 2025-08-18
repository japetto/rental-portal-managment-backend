# Rent Amount Separation Implementation Summary

## Overview

This document summarizes the changes made to implement rent amount separation, where:

- **Admins** can see both base rent and additional rent separately
- **Tenants** see only the total combined rent amount
- **Payment calculations** use the total rent amount (base + additional)

## Key Changes Made

### 1. Database Schema Updates

- **File**: `src/app/modules/leases/leases.schema.ts`
  - Added `additionalRentAmount` field (optional, defaults to 0)
  - Added virtual property `totalRentAmount` (calculated as `rentAmount + additionalRentAmount`)
  - Updated pre-save middleware to handle additional rent validation
  - Updated `isLeaseInformationComplete()` method

### 2. Interface Updates

- **File**: `src/app/modules/leases/leases.interface.ts`
  - Added `additionalRentAmount` to `ILease`, `ICreateLease`, `IUpdateLease`
  - Added `totalRentAmount` virtual property

- **File**: `src/app/modules/users/users.interface.ts`
  - Added `additionalRentAmount` to `IUpdateTenantData` interface

### 3. Validation Updates

- **File**: `src/app/modules/leases/leases.validation.ts`
  - Added `additionalRentAmount` validation to create and update schemas

- **File**: `src/app/modules/users/users.validation.ts`
  - Added `additionalRentAmount` to `updateTenantDataValidationSchema`

### 4. Service Layer Updates

#### Leases Service

- **File**: `src/app/modules/leases/leases.service.ts`
  - Updated `createLease()` to handle default values for additional rent
  - Updated `getLeaseStatistics()` to include separate calculations for base, additional, and total rent

#### Payment Service

- **File**: `src/app/modules/payments/payment.service.ts`
  - Updated all payment calculations to use `totalRentAmount` instead of `rentAmount`
  - Added calculation of `totalRentAmount = rentAmount + additionalRentAmount`
  - Updated payment validation and amount calculations

#### Payment Schema

- **File**: `src/app/modules/payments/payments.schema.ts`
  - Updated payment validation to use `totalRentAmount` for payment amount limits

#### Users Service

- **File**: `src/app/modules/users/users.service.ts`
  - Updated tenant lease information to use `totalRentAmount`

#### Admin Service

- **File**: `src/app/modules/admin/admin.service.ts`
  - Updated `getAllTenants()` to show both base rent and additional rent separately
  - Added `totalRentAmount` calculation for admin view
  - Updated populate queries to include `additionalRentAmount`

### 5. Controller Updates

- **File**: `src/app/modules/leases/leases.controller.ts`
  - Added `formatLeaseData()` helper function for role-based response formatting
  - **Admin users** see:
    - `rentAmount`: Base rent amount
    - `additionalRentAmount`: Additional charges
    - `totalRentAmount`: Combined total
  - **Tenant users** see:
    - `rentAmount`: Total amount (base + additional combined)
    - `additionalRentAmount`: Hidden (undefined)
    - `totalRentAmount`: Same as rentAmount

## API Response Examples

### For Admin Users (`/admin/tenants`)

```json
{
  "lease": {
    "rentAmount": 800, // Base rent
    "additionalRentAmount": 150, // Additional charges
    "totalRentAmount": 950 // Combined total
  }
}
```

### For Tenant Users (lease endpoints)

```json
{
  "rentAmount": 950, // Total amount (base + additional)
  "additionalRentAmount": undefined, // Hidden from tenants
  "totalRentAmount": 950 // Same as rentAmount
}
```

## Payment System Behavior

- All payment calculations now use `totalRentAmount` (base + additional)
- Payment validation ensures amounts don't exceed total rent
- Pro-rated calculations are based on total rent amount
- Payment links and descriptions show total amount

## Key Benefits

1. **Admin Transparency**: Admins can see the breakdown of charges
2. **Tenant Simplicity**: Tenants see only what they need to pay
3. **Payment Accuracy**: All payments are calculated based on total amount
4. **Backward Compatibility**: Existing leases default additional rent to 0
5. **Data Integrity**: Proper validation at all levels

## Testing Recommendations

1. Test admin tenant list to verify separation is shown
2. Test tenant lease endpoints to verify total amount is shown
3. Test payment creation with additional rent amounts
4. Test payment validation with total rent amounts
5. Test lease creation/update with additional rent amounts
6. Verify statistics show proper breakdown for admins

## Migration Notes

- Existing leases will have `additionalRentAmount` default to 0
- `totalRentAmount` will equal `rentAmount` for existing records
- No data migration required
- All existing functionality remains intact

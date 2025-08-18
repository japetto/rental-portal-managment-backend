# Emergency Contact Update Endpoint

## Overview

A new endpoint has been added that allows tenants to update only their emergency contact information. This endpoint is restricted to tenants only and provides a focused way to update emergency contact details.

## Endpoint Details

### **PATCH** `/users/emergency-contact`

**Authentication:** Required (User Auth - Tenant Only)  
**Authorization:** Tenants only (SUPER_ADMIN users cannot use this endpoint)

## Request

### Headers

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Body

```json
{
  "name": "John Doe",
  "phone": "+1234567890",
  "relationship": "Spouse"
}
```

### Validation Rules

- **name**: Required string, minimum 1 character
- **phone**: Required string, minimum 1 character
- **relationship**: Required string, minimum 1 character

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Emergency contact updated successfully",
  "data": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "name": "John Doe",
    "email": "tenant@example.com",
    "role": "TENANT",
    "phoneNumber": "+1234567890",
    "preferredLocation": "Dothan, AL",
    "emergencyContact": {
      "name": "John Doe",
      "phone": "+1234567890",
      "relationship": "Spouse"
    },
    "isActive": true,
    "isDeleted": false,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T11:45:00.000Z"
  }
}
```

### Error Responses

#### 400 Bad Request - Validation Error

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Emergency contact name, phone, and relationship are required",
  "data": null
}
```

#### 401 Unauthorized - Not Authenticated

```json
{
  "success": false,
  "statusCode": 401,
  "message": "User not authenticated",
  "data": null
}
```

#### 403 Forbidden - Not a Tenant

```json
{
  "success": false,
  "statusCode": 403,
  "message": "Only tenants can update emergency contact information",
  "data": null
}
```

#### 404 Not Found - User Not Found

```json
{
  "success": false,
  "statusCode": 404,
  "message": "User not found",
  "data": null
}
```

## Implementation Details

### Files Modified:

1. **`src/app/modules/users/users.interface.ts`**
   - Added `IUpdateEmergencyContact` interface

2. **`src/app/modules/users/users.service.ts`**
   - Added `updateEmergencyContact` function
   - Added import for `IUpdateEmergencyContact`

3. **`src/app/modules/users/users.validation.ts`**
   - Added `updateEmergencyContactValidationSchema`
   - Added validation to `UserValidation` export

4. **`src/app/modules/users/users.controller.ts`**
   - Added `updateEmergencyContact` controller function
   - Added to `UserController` export

5. **`src/app/modules/users/users.router.ts`**
   - Added route: `PATCH /emergency-contact`

### Security Features:

- **Authentication Required**: Uses `userAuth` middleware
- **Role Restriction**: Only tenants can access this endpoint
- **Input Validation**: Zod schema validation for all fields
- **Data Sanitization**: Trims whitespace from all input fields
- **Password Exclusion**: Returns user data without password field

### Business Logic:

1. **User Verification**: Checks if user exists and is a tenant
2. **Data Validation**: Ensures all required fields are provided
3. **Data Sanitization**: Trims whitespace from input fields
4. **Database Update**: Updates only the emergency contact fields
5. **Response**: Returns updated user data (excluding password)

## Usage Examples

### cURL Example

```bash
curl -X PATCH \
  http://localhost:5000/api/v1/users/emergency-contact \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith",
    "phone": "+1987654321",
    "relationship": "Parent"
  }'
```

### JavaScript/Fetch Example

```javascript
const response = await fetch("/api/v1/users/emergency-contact", {
  method: "PATCH",
  headers: {
    Authorization: "Bearer <your_jwt_token>",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "Jane Smith",
    phone: "+1987654321",
    relationship: "Parent",
  }),
});

const result = await response.json();
```

## Notes

- This endpoint is specifically designed for tenants to update their emergency contact information
- It's separate from the general tenant data update endpoint to provide a focused, secure way to update emergency contacts
- The endpoint automatically handles data validation and sanitization
- Only the emergency contact fields are updated; other user data remains unchanged

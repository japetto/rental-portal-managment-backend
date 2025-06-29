# RV Park Management System - API Documentation

## Base URL

```
http://localhost:5000/api/v1
```

## Authentication

Most admin routes require JWT token authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

---

## 🔐 Authentication APIs

### 1. User Registration

**POST** `/users/register`

- **Description**: Register a new user (public access)
- **Authentication**: Not required
- **Request Body**:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "confirmPassword": "password123",
  "phoneNumber": "1234567890",
  "role": "TENANT",
  "preferredLocation": "Mountain View"
}
```

- **Response**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Registration Successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "userData": "eyJfaWQiOiI2NGYxMjM0NTY3ODkwYWJjZGVmMTIzNDUiLCJuYW1lIjoiSm9obiBEb2UiLCJlbWFpbCI6ImpvaG5AZXhhbXBsZS5jb20iLCJyb2xlIjoiVEVOQU5UIiwiaXNWZXJpZmllZCI6dHJ1ZX0="
  }
}
```

### 2. User Login

**POST** `/users/login`

- **Description**: Login with email and password
- **Authentication**: Not required
- **Request Body**:

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

- **Response**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Login Successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "userData": "eyJfaWQiOiI2NGYxMjM0NTY3ODkwYWJjZGVmMTIzNDUiLCJuYW1lIjoiSm9obiBEb2UiLCJlbWFpbCI6ImpvaG5AZXhhbXBsZS5jb20iLCJyb2xlIjoiVEVOQU5UIiwiaXNWZXJpZmllZCI6dHJ1ZX0="
  }
}
```

### 3. Set Password (for Invited Users)

**POST** `/users/set-password`

- **Description**: Set password for invited users
- **Authentication**: Not required
- **Request Body**:

```json
{
  "email": "invited@example.com",
  "password": "newpassword123",
  "confirmPassword": "newpassword123"
}
```

- **Response**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Password set successfully",
  "data": {
    "message": "Password set successfully. You can now login."
  }
}
```

### 4. Check User Invitation Status

**GET** `/users/check-status/:email`

- **Description**: Check if user is invited, verified, and has password
- **Authentication**: Not required
- **Response**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "User invitation status retrieved successfully",
  "data": {
    "isInvited": true,
    "isVerified": false,
    "hasPassword": false
  }
}
```

---

## 👥 User Management APIs (Admin Only)

### 5. Get All Users (Admin)

**GET** `/admin/users`

- **Description**: Get all users in the system
- **Authentication**: Required (SUPER_ADMIN)
- **Response**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Users retrieved successfully",
  "data": [
    {
      "_id": "64f1234567890abcdef12345",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "TENANT",
      "phoneNumber": "1234567890",
      "preferredLocation": "Mountain View",
      "propertyId": {
        "_id": "64f1234567890abcdef12346",
        "name": "Sunset RV Park",
        "description": "Beautiful mountain view RV park",
        "address": {
          "street": "123 Mountain Road",
          "city": "Mountain View",
          "state": "CA",
          "zip": "94041",
          "country": "USA"
        },
        "amenities": ["WiFi", "Shower", "Laundry"],
        "totalLots": 50,
        "availableLots": 45,
        "isActive": true,
        "images": ["image1.jpg", "image2.jpg"],
        "rules": ["No pets", "Quiet hours 10PM-6AM"]
      },
      "spotId": {
        "_id": "64f1234567890abcdef12347",
        "spotNumber": "A-15",
        "status": "OCCUPIED",
        "size": {
          "length": 40,
          "width": 12
        },
        "amenities": ["Full Hookup", "Shade Tree"],
        "hookups": {
          "water": true,
          "electricity": true,
          "sewer": true,
          "wifi": true
        },
        "price": {
          "daily": 45,
          "weekly": 280,
          "monthly": 1200
        },
        "description": "Premium spot with mountain view",
        "images": ["spot1.jpg"],
        "isActive": true
      },
      "emergencyContact": {
        "name": "Jane Doe",
        "phone": "0987654321",
        "relationship": "Spouse"
      },
      "specialRequests": ["ADA accessible"],
      "isInvited": false,
      "isVerified": true,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### 6. Get User by ID (Admin)

**GET** `/admin/users/:userId`

- **Description**: Get specific user details
- **Authentication**: Required (SUPER_ADMIN)
- **Response**: Same structure as individual user object from "Get All Users"

### 7. Update User (Admin)

**PATCH** `/admin/users/:userId`

- **Description**: Update user information (admin only)
- **Authentication**: Required (SUPER_ADMIN)
- **Request Body**:

```json
{
  "name": "Updated Name",
  "phoneNumber": "1234567890",
  "preferredLocation": "New Location",
  "bio": "Updated bio",
  "profileImage": "https://example.com/image.jpg",
  "emergencyContact": {
    "name": "Emergency Contact",
    "phone": "0987654321",
    "relationship": "Spouse"
  },
  "specialRequests": ["ADA accessible", "Quiet area"],
  "role": "TENANT",
  "isVerified": true,
  "isInvited": false
}
```

- **Response**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "User updated successfully",
  "data": {
    // Updated user object
  }
}
```

### 8. Delete User (Admin)

**DELETE** `/admin/users/:userId`

- **Description**: Delete a user (cannot delete self)
- **Authentication**: Required (SUPER_ADMIN)
- **Response**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "User deleted successfully",
  "data": {
    "message": "User deleted successfully"
  }
}
```

### 9. Get All Tenants

**GET** `/users/tenants`

- **Description**: Get only tenants with property and spot data
- **Authentication**: Required (SUPER_ADMIN)
- **Response**: Same structure as "Get All Users" but only includes users with role "TENANT"

### 10. Get User by ID

**GET** `/users/:userId`

- **Description**: Get specific user with property and spot data
- **Authentication**: Required (SUPER_ADMIN)
- **Response**: Same structure as individual user object from "Get All Users"

### 11. Update User Information

**PATCH** `/users/:userId`

- **Description**: Update user information (admin only)
- **Authentication**: Required (SUPER_ADMIN)
- **Request Body**:

```json
{
  "name": "Updated Name",
  "phoneNumber": "1234567890",
  "preferredLocation": "New Location",
  "bio": "Updated bio",
  "profileImage": "https://example.com/image.jpg",
  "emergencyContact": {
    "name": "Emergency Contact",
    "phone": "0987654321",
    "relationship": "Spouse"
  },
  "specialRequests": ["ADA accessible", "Quiet area"]
}
```

- **Response**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "User information updated successfully",
  "data": {
    // Updated user object with property and spot data
  }
}
```

### 12. Delete User

**DELETE** `/users/:userId`

- **Description**: Delete a user (cannot delete self)
- **Authentication**: Required (SUPER_ADMIN)
- **Response**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "User deleted successfully",
  "data": {
    "message": "User deleted successfully"
  }
}
```

---

## 🏠 Property Management APIs (Admin Only)

### 13. Get All Properties

**GET** `/admin/properties`

- **Description**: Get all properties
- **Authentication**: Required (SUPER_ADMIN)
- **Response**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Properties retrieved successfully",
  "data": [
    {
      "_id": "64f1234567890abcdef12346",
      "name": "Sunset RV Park",
      "description": "Beautiful mountain view RV park",
      "address": {
        "street": "123 Mountain Road",
        "city": "Mountain View",
        "state": "CA",
        "zip": "94041",
        "country": "USA"
      },
      "amenities": ["WiFi", "Shower", "Laundry"],
      "totalLots": 50,
      "availableLots": 45,
      "occupiedLots": 5,
      "isActive": true,
      "images": ["image1.jpg", "image2.jpg"],
      "rules": ["No pets", "Quiet hours 10PM-6AM"],
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### 14. Get Property by ID

**GET** `/admin/properties/:propertyId`

- **Description**: Get specific property
- **Authentication**: Required (SUPER_ADMIN)

### 15. Create Property

**POST** `/admin/properties`

- **Description**: Create a new property
- **Authentication**: Required (SUPER_ADMIN)
- **Request Body**:

```json
{
  "name": "New RV Park",
  "description": "A beautiful RV park",
  "address": {
    "street": "456 Park Avenue",
    "city": "Park City",
    "state": "UT",
    "zip": "84060",
    "country": "USA"
  },
  "amenities": ["WiFi", "Shower", "Laundry", "Pool"],
  "totalLots": 30,
  "availableLots": 30,
  "images": ["park1.jpg", "park2.jpg"],
  "rules": ["No pets", "Quiet hours 10PM-6AM"]
}
```

### 16. Update Property

**PATCH** `/admin/properties/:propertyId`

- **Description**: Update property information
- **Authentication**: Required (SUPER_ADMIN)

### 17. Delete Property

**DELETE** `/admin/properties/:propertyId`

- **Description**: Delete a property (only if no tenants or spots assigned)
- **Authentication**: Required (SUPER_ADMIN)

---

## 🚗 Spot Management APIs (Admin Only)

### 18. Get All Spots

**GET** `/admin/spots`

- **Description**: Get all spots with property data
- **Authentication**: Required (SUPER_ADMIN)
- **Response**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Spots retrieved successfully",
  "data": [
    {
      "_id": "64f1234567890abcdef12347",
      "spotNumber": "A-15",
      "propertyId": {
        "_id": "64f1234567890abcdef12346",
        "name": "Sunset RV Park",
        "description": "Beautiful mountain view RV park"
      },
      "status": "OCCUPIED",
      "size": {
        "length": 40,
        "width": 12
      },
      "amenities": ["Full Hookup", "Shade Tree"],
      "hookups": {
        "water": true,
        "electricity": true,
        "sewer": true,
        "wifi": true
      },
      "price": {
        "daily": 45,
        "weekly": 280,
        "monthly": 1200
      },
      "description": "Premium spot with mountain view",
      "images": ["spot1.jpg"],
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### 19. Get Spots by Property

**GET** `/admin/spots/property/:propertyId`

- **Description**: Get all spots for a specific property
- **Authentication**: Required (SUPER_ADMIN)

### 20. Create Spot

**POST** `/admin/spots`

- **Description**: Create a new spot
- **Authentication**: Required (SUPER_ADMIN)
- **Request Body**:

```json
{
  "spotNumber": "B-20",
  "propertyId": "64f1234567890abcdef12346",
  "status": "AVAILABLE",
  "size": {
    "length": 35,
    "width": 10
  },
  "amenities": ["Full Hookup"],
  "hookups": {
    "water": true,
    "electricity": true,
    "sewer": true,
    "wifi": false
  },
  "price": {
    "daily": 40,
    "weekly": 250,
    "monthly": 1000
  },
  "description": "Standard RV spot",
  "images": ["spot2.jpg"]
}
```

### 21. Update Spot

**PATCH** `/admin/spots/:spotId`

- **Description**: Update spot information
- **Authentication**: Required (SUPER_ADMIN)

### 22. Delete Spot

**DELETE** `/admin/spots/:spotId`

- **Description**: Delete a spot (only if not occupied)
- **Authentication**: Required (SUPER_ADMIN)

---

## 👥 Tenant Management APIs (Admin Only)

### 23. Invite Tenant

**POST** `/admin/tenants/invite`

- **Description**: Invite a new tenant to a property and spot
- **Authentication**: Required (SUPER_ADMIN)
- **Request Body**:

```json
{
  "name": "New Tenant",
  "email": "tenant@example.com",
  "phoneNumber": "1234567890",
  "preferredLocation": "Mountain View",
  "propertyId": "64f1234567890abcdef12346",
  "spotId": "64f1234567890abcdef12347",
  "emergencyContact": {
    "name": "Emergency Contact",
    "phone": "0987654321",
    "relationship": "Spouse"
  },
  "specialRequests": ["ADA accessible"]
}
```

- **Response**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Tenant invited successfully",
  "data": {
    "user": {
      // User object with property and spot data
    },
    "inviteUrl": "https://your-frontend.com/set-password?data=eyJuYW1lIjoiTmV3IFRlbmFudCIsImVtYWlsIjoidGVuYW50QGV4YW1wbGUuY29tIiwicHJvcGVydHlJZCI6IjY0ZjEyMzQ1Njc4OTBhYmNkZWYxMjM0NiIsInNwb3RJZCI6IjY0ZjEyMzQ1Njc4OTBhYmNkZWYxMjM0NyJ9"
  }
}
```

---

## 📊 Payment Management APIs (Admin Only)

### 24. Get All Payments

**GET** `/admin/payments`

- **Description**: Get all payments with user and spot data
- **Authentication**: Required (SUPER_ADMIN)

### 25. Get Payments by User

**GET** `/admin/payments/user/:userId`

- **Description**: Get payments for a specific user
- **Authentication**: Required (SUPER_ADMIN)

### 26. Create Payment

**POST** `/admin/payments`

- **Description**: Create a new payment record
- **Authentication**: Required (SUPER_ADMIN)

---

## 📢 Announcement Management APIs

### 27. Get All Announcements (Admin)

**GET** `/announcements`

- **Description**: Get all announcements with property and read data
- **Authentication**: Required (SUPER_ADMIN)
- **Response**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Announcements retrieved successfully",
  "data": [
    {
      "_id": "64f1234567890abcdef12348",
      "title": "Pool Maintenance",
      "content": "Pool will be closed for maintenance from 2-4 PM",
      "type": "MAINTENANCE",
      "priority": "HIGH",
      "propertyId": {
        "_id": "64f1234567890abcdef12346",
        "name": "Sunset RV Park",
        "description": "Beautiful mountain view RV park",
        "address": {
          "street": "123 Mountain Road",
          "city": "Mountain View",
          "state": "CA",
          "zip": "94041",
          "country": "USA"
        }
      },
      "isActive": true,
      "publishDate": "2024-01-15T10:30:00.000Z",
      "expiryDate": "2024-01-20T10:30:00.000Z",
      "createdBy": "64f1234567890abcdef12345",
      "attachments": ["https://example.com/maintenance-notice.pdf"],
      "readBy": [
        {
          "_id": "64f1234567890abcdef12349",
          "name": "John Doe",
          "email": "john@example.com"
        }
      ],
      "targetAudience": "TENANTS_ONLY",
      "sendNotification": true,
      "tags": ["pool", "maintenance", "facility"],
      "isExpired": false,
      "isCurrentlyActive": true,
      "readCount": 1,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### 28. Get Active Announcements (Public)

**GET** `/announcements/active`

- **Description**: Get active announcements for tenants (public access)
- **Authentication**: Not required
- **Query Parameters**:
  - `propertyId` (optional): Filter by specific property
- **Response**: Same structure as above but only active, non-expired announcements

### 29. Create Announcement (Admin)

**POST** `/announcements`

- **Description**: Create a new announcement
- **Authentication**: Required (SUPER_ADMIN)
- **Request Body**:

```json
{
  "title": "New Announcement",
  "content": "This is the announcement content",
  "type": "GENERAL",
  "priority": "MEDIUM",
  "propertyId": "64f1234567890abcdef12346",
  "expiryDate": "2024-02-01T10:30:00.000Z",
  "attachments": ["https://example.com/document.pdf"],
  "targetAudience": "TENANTS_ONLY",
  "sendNotification": true,
  "tags": ["important", "general"]
}
```

- **Response**: Created announcement object

### 30. Get Announcement by ID

**GET** `/announcements/:announcementId`

- **Description**: Get specific announcement details
- **Authentication**: Required (SUPER_ADMIN)
- **Response**: Single announcement object

### 31. Update Announcement (Admin)

**PATCH** `/announcements/:announcementId`

- **Description**: Update announcement information
- **Authentication**: Required (SUPER_ADMIN)
- **Request Body**: Same as create but all fields optional
- **Response**: Updated announcement object

### 32. Delete Announcement (Admin)

**DELETE** `/announcements/:announcementId`

- **Description**: Delete an announcement
- **Authentication**: Required (SUPER_ADMIN)
- **Response**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Announcement deleted successfully",
  "data": {
    "message": "Announcement deleted successfully"
  }
}
```

### 33. Mark Announcement as Read

**POST** `/announcements/mark-read`

- **Description**: Mark an announcement as read by a user
- **Authentication**: Not required
- **Request Body**:

```json
{
  "userId": "64f1234567890abcdef12349",
  "announcementId": "64f1234567890abcdef12348"
}
```

- **Response**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Announcement marked as read",
  "data": {
    "message": "Announcement marked as read"
  }
}
```

### 34. Get Announcements by Property (Admin)

**GET** `/announcements/property/:propertyId`

- **Description**: Get announcements for a specific property
- **Authentication**: Required (SUPER_ADMIN)
- **Response**: Array of announcements for the property

### 35. Get Announcements by Type (Admin)

**GET** `/announcements/type/:type`

- **Description**: Get announcements by type (GENERAL, MAINTENANCE, EVENT, EMERGENCY, RULE_UPDATE)
- **Authentication**: Required (SUPER_ADMIN)
- **Response**: Array of announcements of the specified type

### 36. Get Announcements by Priority (Admin)

### 37. Get Announcements by Priority (Admin)

**GET** `/announcements/priority/:priority`

- **Description**: Get announcements by priority (LOW, MEDIUM, HIGH, URGENT)
- **Authentication**: Required (SUPER_ADMIN)
- **Response**: Array of announcements with the specified priority

### 38. Get Unread Announcements for User

**GET** `/announcements/unread/:userId`

- **Description**: Get unread announcements for a specific user
- **Authentication**: Not required
- **Query Parameters**:
  - `propertyId` (optional): Filter by specific property
- **Response**: Array of unread announcements for the user

---

## 🔧 Service Request Management APIs (Admin Only)

### 39. Get All Service Requests

**GET** `/admin/service-requests`

- **Description**: Get all service requests with user data
- **Authentication**: Required (SUPER_ADMIN)

### 40. Create Service Request

**POST** `/admin/service-requests`

- **Description**: Create a new service request
- **Authentication**: Required (SUPER_ADMIN)

---

## 🚨 Error Responses

All APIs return consistent error responses:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Error message here",
  "errorMessages": [
    {
      "path": "email",
      "message": "Email is required"
    }
  ],
  "stack": "Error stack trace (only in development)"
}
```

## 📝 Common HTTP Status Codes

- **200**: Success
- **201**: Created
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (invalid/missing token)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found
- **409**: Conflict (duplicate data)
- **500**: Internal Server Error

## 🔑 JWT Token Usage

1. **Get token** from login/register response
2. **Include in headers** for admin routes:
   ```
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
3. **Token expires** after configured time (check config)
4. **Refresh token** by logging in again

## 📱 Frontend Integration Tips

### For Invited Users:

1. Use `/users/check-status/:email` to check invitation status
2. If `isInvited: true` and `hasPassword: false`, show set password form
3. Use `/users/set-password` to set initial password
4. Then redirect to login

### For Property/Spot Data:

1. Use `/users/tenants` to get all tenants with complete property/spot info
2. Use `/admin/properties` and `/admin/spots` for management
3. Property data includes address, amenities, lot counts
4. Spot data includes size, hookups, pricing, status

### For Real-time Updates:

1. Poll endpoints periodically for updates
2. Consider implementing WebSocket for real-time notifications
3. Cache data locally to reduce API calls

---

## 🧪 Testing with Postman

1. **Set up environment variables**:
   - `baseUrl`: `http://localhost:5000/api/v1`
   - `token`: JWT token from login

2. **Use Authorization header**:

   ```
   Authorization: Bearer {{token}}
   ```

3. **Test flow**:
   - Register/Login → Get token
   - Use token for admin routes
   - Test CRUD operations

---

_Last updated: January 2024_

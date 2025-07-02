# Announcements API Documentation

## Overview

The Announcements API provides comprehensive functionality for managing announcements in the RV Park Management System. It supports creating, reading, updating, and deleting announcements with advanced filtering and read tracking capabilities.

## Base URL

```
http://localhost:5000/api/v1/announcements
```

## Authentication

- **Admin Routes**: Require JWT token with SUPER_ADMIN role
- **Public Routes**: No authentication required
- **Header Format**: `Authorization: Bearer <your-jwt-token>`

---

## 📋 Data Models

### Announcement Object

```json
{
  "_id": "64f1234567890abcdef12348",
  "title": "Pool Maintenance Notice",
  "content": "The pool will be closed for maintenance from 2-4 PM today.",
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
  "attachments": [
    "https://example.com/maintenance-notice.pdf",
    "https://example.com/pool-schedule.jpg"
  ],
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
```

### Field Descriptions

| Field              | Type     | Required | Description                                                                         |
| ------------------ | -------- | -------- | ----------------------------------------------------------------------------------- |
| `title`            | String   | Yes      | Announcement title (max 200 chars)                                                  |
| `content`          | String   | Yes      | Announcement content (max 5000 chars)                                               |
| `type`             | Enum     | Yes      | Type: GENERAL, MAINTENANCE, EVENT, EMERGENCY, RULE_UPDATE, BILLING, SECURITY, OTHER |
| `priority`         | Enum     | No       | Priority: LOW, MEDIUM, HIGH, URGENT (default: MEDIUM)                               |
| `propertyId`       | ObjectId | No       | Property ID (null for system-wide)                                                  |
| `isActive`         | Boolean  | No       | Active status (default: true)                                                       |
| `publishDate`      | Date     | No       | Publish date (default: current date)                                                |
| `expiryDate`       | Date     | No       | Expiry date (optional)                                                              |
| `createdBy`        | String   | Yes      | Admin who created the announcement                                                  |
| `attachments`      | Array    | No       | Array of attachment URLs                                                            |
| `readBy`           | Array    | No       | Array of user IDs who read it                                                       |
| `targetAudience`   | Enum     | No       | ALL, TENANTS_ONLY, ADMINS_ONLY, PROPERTY_SPECIFIC                                   |
| `sendNotification` | Boolean  | No       | Send notification flag (optional)                                                   |
| `tags`             | Array    | No       | Array of tags for categorization                                                    |

### Virtual Fields

- `isExpired`: Boolean - True if announcement has expired
- `isCurrentlyActive`: Boolean - True if active and not expired
- `readCount`: Number - Number of users who read the announcement

---

## 🔐 Public Routes (No Authentication Required)

### 1. Get Active Announcements

**GET** `/announcements/active`

Get all active, non-expired announcements that are relevant to tenants.

**Query Parameters:**

- `propertyId` (optional): Filter by specific property

**Response:**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Active announcements retrieved successfully",
  "data": [
    {
      "_id": "64f1234567890abcdef12348",
      "title": "Pool Maintenance",
      "content": "Pool will be closed for maintenance",
      "type": "MAINTENANCE",
      "priority": "HIGH",
      "propertyId": {
        "_id": "64f1234567890abcdef12346",
        "name": "Sunset RV Park"
      },
      "isActive": true,
      "publishDate": "2024-01-15T10:30:00.000Z",
      "expiryDate": "2024-01-20T10:30:00.000Z",
      "targetAudience": "TENANTS_ONLY",
      "tags": ["pool", "maintenance"],
      "isExpired": false,
      "isCurrentlyActive": true,
      "readCount": 5
    }
  ]
}
```

**Example Usage:**

```bash
# Get all active announcements
GET /announcements/active

# Get active announcements for specific property
GET /announcements/active?propertyId=64f1234567890abcdef12346
```

### 2. Get Unread Announcements for User

**GET** `/announcements/unread/:userId`

Get unread announcements for a specific user.

**Path Parameters:**

- `userId`: User ID to get unread announcements for

**Query Parameters:**

- `propertyId` (optional): Filter by specific property

**Response:**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Unread announcements retrieved successfully",
  "data": [
    {
      "_id": "64f1234567890abcdef12348",
      "title": "New Rule Update",
      "content": "Please review the updated park rules",
      "type": "RULE_UPDATE",
      "priority": "MEDIUM",
      "isCurrentlyActive": true,
      "readCount": 0
    }
  ]
}
```

**Example Usage:**

```bash
# Get unread announcements for user
GET /announcements/unread/64f1234567890abcdef12349

# Get unread announcements for user in specific property
GET /announcements/unread/64f1234567890abcdef12349?propertyId=64f1234567890abcdef12346
```

### 3. Mark Announcement as Read

**POST** `/announcements/mark-read`

Mark an announcement as read by a specific user.

**Request Body:**

```json
{
  "userId": "64f1234567890abcdef12349",
  "announcementId": "64f1234567890abcdef12348"
}
```

**Response:**

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

**Example Usage:**

```bash
POST /announcements/mark-read
Content-Type: application/json

{
  "userId": "64f1234567890abcdef12349",
  "announcementId": "64f1234567890abcdef12348"
}
```

---

## 👑 Admin Routes (SUPER_ADMIN Authentication Required)

### 4. Create Announcement

**POST** `/announcements`

Create a new announcement.

**Headers:**

```
Authorization: Bearer <admin-jwt-token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "title": "Emergency Water Shutdown",
  "content": "Water will be temporarily shut off for maintenance from 10 AM to 2 PM today.",
  "type": "EMERGENCY",
  "priority": "URGENT",
  "propertyId": "64f1234567890abcdef12346",
  "expiryDate": "2024-01-16T14:00:00.000Z",
  "attachments": ["https://example.com/emergency-notice.pdf"],
  "targetAudience": "TENANTS_ONLY",
  "sendNotification": true,
  "tags": ["emergency", "water", "maintenance"]
}
```

**Response:**

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Announcement created successfully",
  "data": {
    "_id": "64f1234567890abcdef12350",
    "title": "Emergency Water Shutdown",
    "content": "Water will be temporarily shut off for maintenance from 10 AM to 2 PM today.",
    "type": "EMERGENCY",
    "priority": "URGENT",
    "propertyId": {
      "_id": "64f1234567890abcdef12346",
      "name": "Sunset RV Park"
    },
    "isActive": true,
    "publishDate": "2024-01-15T10:30:00.000Z",
    "expiryDate": "2024-01-16T14:00:00.000Z",
    "createdBy": "64f1234567890abcdef12345",
    "attachments": ["https://example.com/emergency-notice.pdf"],
    "readBy": [],
    "targetAudience": "TENANTS_ONLY",
    "sendNotification": true,
    "tags": ["emergency", "water", "maintenance"],
    "isExpired": false,
    "isCurrentlyActive": true,
    "readCount": 0,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 5. Get All Announcements

**GET** `/announcements`

Get all announcements with populated property and read data.

**Headers:**

```
Authorization: Bearer <admin-jwt-token>
```

**Response:**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Announcements retrieved successfully",
  "data": [
    {
      "_id": "64f1234567890abcdef12348",
      "title": "Pool Maintenance",
      "content": "Pool will be closed for maintenance",
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
      "tags": ["pool", "maintenance"],
      "isExpired": false,
      "isCurrentlyActive": true,
      "readCount": 1,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### 6. Get Announcement by ID

**GET** `/announcements/:announcementId`

Get a specific announcement by ID.

**Headers:**

```
Authorization: Bearer <admin-jwt-token>
```

**Path Parameters:**

- `announcementId`: ID of the announcement

**Response:** Single announcement object (same structure as above)

### 7. Update Announcement

**PATCH** `/announcements/:announcementId`

Update an existing announcement.

**Headers:**

```
Authorization: Bearer <admin-jwt-token>
Content-Type: application/json
```

**Path Parameters:**

- `announcementId`: ID of the announcement to update

**Request Body:** (All fields optional)

```json
{
  "title": "Updated Pool Maintenance Notice",
  "content": "Pool maintenance has been rescheduled to tomorrow",
  "priority": "MEDIUM",
  "isActive": false,
  "expiryDate": "2024-01-21T10:30:00.000Z",
  "tags": ["pool", "maintenance", "rescheduled"]
}
```

**Response:** Updated announcement object

### 8. Delete Announcement

**DELETE** `/announcements/:announcementId`

Delete an announcement.

**Headers:**

```
Authorization: Bearer <admin-jwt-token>
```

**Path Parameters:**

- `announcementId`: ID of the announcement to delete

**Response:**

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

---

## 🔍 Filter Routes (Admin Only)

### 9. Get Announcements by Property

**GET** `/announcements/property/:propertyId`

Get all announcements for a specific property (including system-wide announcements).

**Headers:**

```
Authorization: Bearer <admin-jwt-token>
```

**Path Parameters:**

- `propertyId`: Property ID to filter by

**Response:** Array of announcements for the property

### 10. Get Announcements by Type

**GET** `/announcements/type/:type`

Get announcements by type.

**Headers:**

```
Authorization: Bearer <admin-jwt-token>
```

**Path Parameters:**

- `type`: Announcement type (GENERAL, MAINTENANCE, EVENT, EMERGENCY, RULE_UPDATE)

**Response:** Array of announcements of the specified type

### 11. Get Announcements by Priority

**GET** `/announcements/priority/:priority`

Get announcements by priority level.

**Headers:**

```
Authorization: Bearer <admin-jwt-token>
```

**Path Parameters:**

- `priority`: Priority level (LOW, MEDIUM, HIGH, URGENT)

**Response:** Array of announcements with the specified priority

---

## 📊 Enum Values

### Announcement Types

- `GENERAL` - General announcements
- `MAINTENANCE` - Maintenance-related announcements
- `EVENT` - Event announcements
- `EMERGENCY` - Emergency announcements
- `RULE_UPDATE` - Rule update announcements

### Priority Levels

- `LOW` - Low priority
- `MEDIUM` - Medium priority (default)
- `HIGH` - High priority
- `URGENT` - Urgent priority

### Target Audience

- `ALL` - All users (default)
- `TENANTS_ONLY` - Only tenants
- `ADMINS_ONLY` - Only administrators
- `PROPERTY_SPECIFIC` - Specific property only

---

## 🚨 Error Responses

### Validation Error

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation Error",
  "errorMessages": [
    {
      "path": "title",
      "message": "Title is required"
    },
    {
      "path": "type",
      "message": "Type must be one of: GENERAL, MAINTENANCE, EVENT, EMERGENCY, RULE_UPDATE, BILLING, SECURITY, OTHER"
    }
  ]
}
```

### Authentication Error

```json
{
  "success": false,
  "statusCode": 401,
  "message": "Access denied. Admin privileges required"
}
```

### Not Found Error

```json
{
  "success": false,
  "statusCode": 404,
  "message": "Announcement not found"
}
```

### Forbidden Error

```json
{
  "success": false,
  "statusCode": 403,
  "message": "Only super admins can create announcements"
}
```

---

## 📱 Frontend Integration Examples

### React/JavaScript Example

```javascript
// Get active announcements
const getActiveAnnouncements = async (propertyId = null) => {
  const url = propertyId
    ? `/announcements/active?propertyId=${propertyId}`
    : "/announcements/active";

  const response = await fetch(url);
  const data = await response.json();
  return data.data;
};

// Mark announcement as read
const markAsRead = async (userId, announcementId) => {
  const response = await fetch("/announcements/mark-read", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userId, announcementId }),
  });
  return await response.json();
};

// Create announcement (admin only)
const createAnnouncement = async (announcementData, token) => {
  const response = await fetch("/announcements", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(announcementData),
  });
  return await response.json();
};
```

### Postman Collection Example

```json
{
  "info": {
    "name": "Announcements API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Get Active Announcements",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/announcements/active"
      }
    },
    {
      "name": "Create Announcement",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/announcements",
        "headers": {
          "Authorization": "Bearer {{adminToken}}",
          "Content-Type": "application/json"
        },
        "body": {
          "mode": "raw",
          "raw": "{\n  \"title\": \"Test Announcement\",\n  \"content\": \"This is a test announcement\",\n  \"type\": \"GENERAL\",\n  \"priority\": \"MEDIUM\"\n}"
        }
      }
    }
  ]
}
```

---

## 🔧 Best Practices

### For Frontend Developers:

1. **Cache active announcements** to reduce API calls
2. **Implement real-time updates** for urgent announcements
3. **Show unread count** in navigation
4. **Filter by property** when user is assigned to specific property
5. **Handle expired announcements** gracefully

### For Backend Integration:

1. **Use proper error handling** for all API calls
2. **Implement retry logic** for failed requests
3. **Cache responses** when appropriate
4. **Validate all inputs** before sending to API
5. **Handle authentication tokens** properly

---

## 📈 Performance Considerations

- **Pagination**: Consider implementing pagination for large announcement lists
- **Caching**: Cache active announcements for better performance
- **Indexing**: Database is optimized with proper indexes
- **Filtering**: Use query parameters to reduce data transfer
- **Compression**: Enable gzip compression for responses

---

_Last updated: January 2024_

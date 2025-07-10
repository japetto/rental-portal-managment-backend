# User Endpoints API Documentation

This document describes the endpoints available for authenticated users/tenants to access their service requests and announcements.

## Authentication

All user endpoints require authentication using the `userAuth` middleware. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Service Request Endpoints

### Get User's Service Requests

**Endpoint:** `GET /api/users/me/service-requests`

**Description:** Retrieve all service requests created by the authenticated user.

**Query Parameters:**
- `status` (optional): Filter by status - "PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"
- `priority` (optional): Filter by priority - "LOW", "MEDIUM", "HIGH", "URGENT"
- `type` (optional): Filter by type - "MAINTENANCE", "UTILITY", "SECURITY", "CLEANING", "OTHER"
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of items per page (default: 10)
- `sortBy` (optional): Sort field - "requestedDate", "priority", "status", "type" (default: "requestedDate")
- `sortOrder` (optional): Sort order - "asc" or "desc" (default: "desc")

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Service requests retrieved successfully",
  "data": {
    "serviceRequests": [
      {
        "_id": "service-request-id",
        "title": "Leaky Faucet",
        "description": "Kitchen faucet is leaking",
        "type": "MAINTENANCE",
        "priority": "MEDIUM",
        "status": "PENDING",
        "requestedDate": "2024-01-15T10:30:00Z",
        "images": ["image-url-1", "image-url-2"],
        "tenantNotes": "Please fix as soon as possible"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

### Get User's Specific Service Request

**Endpoint:** `GET /api/users/me/service-requests/:id`

**Description:** Retrieve a specific service request by ID (only if created by the authenticated user).

**Path Parameters:**
- `id`: Service request ID

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Service request retrieved successfully",
  "data": {
    "_id": "service-request-id",
    "title": "Leaky Faucet",
    "description": "Kitchen faucet is leaking",
    "type": "MAINTENANCE",
    "priority": "MEDIUM",
    "status": "IN_PROGRESS",
    "requestedDate": "2024-01-15T10:30:00Z",
    "completedDate": "2024-01-16T14:20:00Z",
    "assignedTo": "John Smith",
    "estimatedCost": 150,
    "actualCost": 120,
    "images": ["image-url-1", "image-url-2"],
    "adminNotes": "Technician scheduled for tomorrow",
    "tenantNotes": "Please fix as soon as possible"
  }
}
```

## Announcement Endpoints

### Get User's Announcements

**Endpoint:** `GET /api/users/me/announcements`

**Description:** Retrieve all active announcements relevant to the authenticated user.

**Query Parameters:**
- `propertyId` (optional): Filter announcements by specific property

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Announcements retrieved successfully",
  "data": [
    {
      "_id": "announcement-id",
      "title": "Scheduled Maintenance",
      "content": "Water will be shut off tomorrow from 9 AM to 2 PM for maintenance",
      "type": "MAINTENANCE",
      "priority": "HIGH",
      "propertyId": "property-id",
      "expiryDate": "2024-01-20T23:59:59Z",
      "attachments": ["attachment-url-1"],
      "targetAudience": "TENANTS_ONLY",
      "tags": ["maintenance", "water"],
      "isRead": false,
      "createdAt": "2024-01-15T08:00:00Z"
    }
  ]
}
```

### Get User's Specific Announcement

**Endpoint:** `GET /api/users/me/announcements/:announcementId`

**Description:** Retrieve a specific announcement by ID.

**Path Parameters:**
- `announcementId`: Announcement ID

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Announcement retrieved successfully",
  "data": {
    "_id": "announcement-id",
    "title": "Scheduled Maintenance",
    "content": "Water will be shut off tomorrow from 9 AM to 2 PM for maintenance",
    "type": "MAINTENANCE",
    "priority": "HIGH",
    "propertyId": "property-id",
    "expiryDate": "2024-01-20T23:59:59Z",
    "attachments": ["attachment-url-1"],
    "targetAudience": "TENANTS_ONLY",
    "tags": ["maintenance", "water"],
    "isRead": false,
    "createdAt": "2024-01-15T08:00:00Z",
    "createdBy": {
      "_id": "admin-id",
      "name": "Property Manager"
    }
  }
}
```

### Mark Announcement as Read

**Endpoint:** `POST /api/users/me/announcements/mark-read`

**Description:** Mark a specific announcement as read by the authenticated user.

**Request Body:**
```json
{
  "announcementId": "announcement-id"
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Announcement marked as read",
  "data": {
    "_id": "read-record-id",
    "userId": "user-id",
    "announcementId": "announcement-id",
    "readAt": "2024-01-15T10:30:00Z"
  }
}
```

## Error Responses

### Unauthorized (401)
```json
{
  "success": false,
  "statusCode": 401,
  "message": "User not authenticated",
  "data": null
}
```

### Not Found (404)
```json
{
  "success": false,
  "statusCode": 404,
  "message": "Service request not found",
  "data": null
}
```

### Validation Error (400)
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "data": {
    "errors": [
      {
        "field": "status",
        "message": "Status must be one of: PENDING, IN_PROGRESS, COMPLETED, CANCELLED"
      }
    ]
  }
}
```

## Notes

1. Users can only access their own service requests
2. Users can only see announcements that are relevant to them based on their property and the announcement's target audience
3. All endpoints require valid JWT authentication
4. Pagination is available for service requests with configurable page size and sorting options
5. The mark as read functionality helps track which announcements have been viewed by users 
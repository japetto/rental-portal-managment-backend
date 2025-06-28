# Service Requests API Documentation

## Overview

The Service Requests API allows tenants to create and manage service requests for their RV park properties. Admins can view, update, and manage all service requests across the system.

## Base URL

```
/api/v1/service-requests
```

## Authentication

All endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

---

## Endpoints

### 1. Create Service Request

**POST** `/api/v1/service-requests`

Creates a new service request. Only tenants can create service requests.

**Request Body:**

```json
{
  "title": "Water leak in bathroom",
  "description": "There's a water leak under the sink in the bathroom. Water is pooling on the floor.",
  "type": "MAINTENANCE",
  "priority": "HIGH",
  "images": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg"
  ],
  "tenantNotes": "Please fix as soon as possible"
}
```

**Field Descriptions:**

- `title` (required): Brief description of the issue (max 100 characters)
- `description` (required): Detailed description of the problem (max 1000 characters)
- `type` (required): Type of service request
  - `MAINTENANCE`: General maintenance issues
  - `UTILITY`: Water, electricity, sewer issues
  - `SECURITY`: Security-related concerns
  - `CLEANING`: Cleaning requests
  - `OTHER`: Other miscellaneous requests
- `priority` (optional): Priority level (default: MEDIUM)
  - `LOW`: Non-urgent issues
  - `MEDIUM`: Standard priority
  - `HIGH`: Important issues
  - `URGENT`: Critical issues requiring immediate attention
- `images` (optional): Array of image URLs showing the issue
- `tenantNotes` (optional): Additional notes from tenant (max 2000 characters)

**Response (201 Created):**

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Service request created successfully",
  "data": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "title": "Water leak in bathroom",
    "description": "There's a water leak under the sink in the bathroom. Water is pooling on the floor.",
    "type": "MAINTENANCE",
    "priority": "HIGH",
    "status": "PENDING",
    "requestedDate": "2024-01-15T10:30:00.000Z",
    "images": ["https://example.com/image1.jpg"],
    "tenantNotes": "Please fix as soon as possible",
    "tenantId": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
      "name": "John Doe",
      "email": "john@example.com",
      "phoneNumber": "+1234567890"
    },
    "propertyId": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d2",
      "name": "Sunset RV Park",
      "address": {
        "street": "123 Main St",
        "city": "Anytown",
        "state": "CA",
        "zip": "12345"
      }
    },
    "spotId": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d3",
      "spotNumber": "A-15",
      "status": "OCCUPIED"
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**

- `400 Bad Request`: Invalid data or user not assigned to property/spot
- `401 Unauthorized`: Invalid or missing authentication token
- `403 Forbidden`: User is not a tenant

---

### 2. Get Service Request by ID

**GET** `/api/v1/service-requests/:id`

Retrieves a specific service request by ID. Tenants can only view their own requests, admins can view any request.

**Response (200 OK):**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Service request retrieved successfully",
  "data": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "title": "Water leak in bathroom",
    "description": "There's a water leak under the sink in the bathroom.",
    "type": "MAINTENANCE",
    "priority": "HIGH",
    "status": "IN_PROGRESS",
    "requestedDate": "2024-01-15T10:30:00.000Z",
    "completedDate": null,
    "assignedTo": "Mike Johnson",
    "estimatedCost": 150,
    "actualCost": null,
    "images": ["https://example.com/image1.jpg"],
    "adminNotes": "Plumber scheduled for tomorrow",
    "tenantNotes": "Please fix as soon as possible",
    "tenantId": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
      "name": "John Doe",
      "email": "john@example.com",
      "phoneNumber": "+1234567890"
    },
    "propertyId": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d2",
      "name": "Sunset RV Park",
      "address": {
        "street": "123 Main St",
        "city": "Anytown",
        "state": "CA",
        "zip": "12345"
      }
    },
    "spotId": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d3",
      "spotNumber": "A-15",
      "status": "OCCUPIED"
    }
  }
}
```

**Error Responses:**

- `400 Bad Request`: Invalid service request ID
- `401 Unauthorized`: Invalid or missing authentication token
- `403 Forbidden`: Access denied (tenant trying to view another tenant's request)
- `404 Not Found`: Service request not found

---

### 3. Get Service Requests (with filters and pagination)

**GET** `/api/v1/service-requests`

Retrieves a list of service requests with optional filtering and pagination. Tenants see only their own requests, admins see all requests.

**Query Parameters:**

- `status` (optional): Filter by status (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`)
- `priority` (optional): Filter by priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`)
- `type` (optional): Filter by type (`MAINTENANCE`, `UTILITY`, `SECURITY`, `CLEANING`, `OTHER`)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `sortBy` (optional): Sort field (`requestedDate`, `priority`, `status`, `type`)
- `sortOrder` (optional): Sort order (`asc`, `desc`)

**Example Request:**

```
GET /api/v1/service-requests?status=PENDING&priority=HIGH&page=1&limit=5&sortBy=requestedDate&sortOrder=desc
```

**Response (200 OK):**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Service requests retrieved successfully",
  "data": {
    "serviceRequests": [
      {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
        "title": "Water leak in bathroom",
        "description": "There's a water leak under the sink in the bathroom.",
        "type": "MAINTENANCE",
        "priority": "HIGH",
        "status": "PENDING",
        "requestedDate": "2024-01-15T10:30:00.000Z",
        "tenantId": {
          "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
          "name": "John Doe",
          "email": "john@example.com",
          "phoneNumber": "+1234567890"
        },
        "propertyId": {
          "_id": "64f8a1b2c3d4e5f6a7b8c9d2",
          "name": "Sunset RV Park",
          "address": {
            "street": "123 Main St",
            "city": "Anytown",
            "state": "CA",
            "zip": "12345"
          }
        },
        "spotId": {
          "_id": "64f8a1b2c3d4e5f6a7b8c9d3",
          "spotNumber": "A-15",
          "status": "OCCUPIED"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 5,
      "total": 25,
      "totalPages": 5
    }
  }
}
```

---

### 4. Update Service Request

**PATCH** `/api/v1/service-requests/:id`

Updates a service request. Tenants can only update their own requests and only certain fields when status is PENDING. Admins can update any request and all fields.

**Request Body (Tenant):**

```json
{
  "title": "Updated title",
  "description": "Updated description",
  "priority": "URGENT",
  "images": ["https://example.com/new-image.jpg"],
  "tenantNotes": "Updated notes"
}
```

**Request Body (Admin):**

```json
{
  "title": "Updated title",
  "description": "Updated description",
  "type": "UTILITY",
  "priority": "URGENT",
  "status": "IN_PROGRESS",
  "completedDate": "2024-01-16T14:00:00.000Z",
  "assignedTo": "Mike Johnson",
  "estimatedCost": 200,
  "actualCost": 180,
  "images": ["https://example.com/new-image.jpg"],
  "adminNotes": "Work completed successfully",
  "tenantNotes": "Updated notes"
}
```

**Field Descriptions (Admin-only fields):**

- `status`: Current status of the request
- `completedDate`: When the work was completed
- `assignedTo`: Person assigned to handle the request
- `estimatedCost`: Estimated cost of the work
- `actualCost`: Actual cost of the completed work
- `adminNotes`: Notes from admin about the request

**Response (200 OK):**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Service request updated successfully",
  "data": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "title": "Updated title",
    "description": "Updated description",
    "type": "MAINTENANCE",
    "priority": "URGENT",
    "status": "IN_PROGRESS",
    "requestedDate": "2024-01-15T10:30:00.000Z",
    "completedDate": null,
    "assignedTo": "Mike Johnson",
    "estimatedCost": 200,
    "actualCost": null,
    "images": ["https://example.com/new-image.jpg"],
    "adminNotes": null,
    "tenantNotes": "Updated notes",
    "tenantId": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
      "name": "John Doe",
      "email": "john@example.com",
      "phoneNumber": "+1234567890"
    },
    "propertyId": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d2",
      "name": "Sunset RV Park",
      "address": {
        "street": "123 Main St",
        "city": "Anytown",
        "state": "CA",
        "zip": "12345"
      }
    },
    "spotId": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d3",
      "spotNumber": "A-15",
      "status": "OCCUPIED"
    },
    "updatedAt": "2024-01-15T15:30:00.000Z"
  }
}
```

**Error Responses:**

- `400 Bad Request`: Invalid data or cannot update non-PENDING request (tenants)
- `401 Unauthorized`: Invalid or missing authentication token
- `403 Forbidden`: Access denied
- `404 Not Found`: Service request not found

---

### 5. Delete Service Request

**DELETE** `/api/v1/service-requests/:id`

Deletes a service request. Only PENDING requests can be deleted.

**Response (200 OK):**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Service request deleted successfully",
  "data": null
}
```

**Error Responses:**

- `400 Bad Request`: Cannot delete non-PENDING request
- `401 Unauthorized`: Invalid or missing authentication token
- `403 Forbidden`: Access denied
- `404 Not Found`: Service request not found

---

### 6. Get Service Request Statistics (Admin Only)

**GET** `/api/v1/service-requests/stats/overview`

Retrieves statistics about service requests. Only available to admins.

**Response (200 OK):**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Service request statistics retrieved successfully",
  "data": {
    "total": 150,
    "pending": 25,
    "urgent": 8,
    "byStatus": [
      {
        "_id": "PENDING",
        "count": 25
      },
      {
        "_id": "IN_PROGRESS",
        "count": 15
      },
      {
        "_id": "COMPLETED",
        "count": 100
      },
      {
        "_id": "CANCELLED",
        "count": 10
      }
    ],
    "byPriority": [
      {
        "_id": "LOW",
        "count": 30
      },
      {
        "_id": "MEDIUM",
        "count": 80
      },
      {
        "_id": "HIGH",
        "count": 35
      },
      {
        "_id": "URGENT",
        "count": 5
      }
    ],
    "byType": [
      {
        "_id": "MAINTENANCE",
        "count": 60
      },
      {
        "_id": "UTILITY",
        "count": 40
      },
      {
        "_id": "SECURITY",
        "count": 20
      },
      {
        "_id": "CLEANING",
        "count": 25
      },
      {
        "_id": "OTHER",
        "count": 5
      }
    ]
  }
}
```

**Error Responses:**

- `401 Unauthorized`: Invalid or missing authentication token
- `403 Forbidden`: User is not an admin

---

## Status Flow

Service requests follow this status progression:

1. **PENDING** - Initial status when request is created
2. **IN_PROGRESS** - Work has started on the request
3. **COMPLETED** - Work has been finished
4. **CANCELLED** - Request has been cancelled

## Business Rules

### For Tenants:

- Can only create service requests if assigned to a property and spot
- Can only view and update their own service requests
- Can only update requests that are in PENDING status
- Can only update certain fields (title, description, type, priority, images, tenantNotes)
- Can only delete requests that are in PENDING status

### For Admins:

- Can view all service requests across all properties
- Can update any service request and all fields
- Can change status, assign workers, and track costs
- Can view comprehensive statistics

### General Rules:

- Service requests are automatically linked to the tenant's assigned property and spot
- Images must be valid URLs
- Costs cannot be negative or exceed $100,000
- Completed dates must be after requested dates

---

## Error Codes

| Code | Description                                            |
| ---- | ------------------------------------------------------ |
| 400  | Bad Request - Invalid data or business rule violation  |
| 401  | Unauthorized - Invalid or missing authentication token |
| 403  | Forbidden - Insufficient permissions                   |
| 404  | Not Found - Resource not found                         |
| 409  | Conflict - Resource already exists                     |
| 500  | Internal Server Error - Server error                   |

---

## Frontend Integration Tips

1. **Real-time Updates**: Consider implementing WebSocket connections for real-time status updates
2. **Image Upload**: Implement image upload functionality before creating requests
3. **Status Badges**: Use color-coded badges for different statuses and priorities
4. **Filtering**: Implement client-side filtering for better user experience
5. **Pagination**: Handle pagination on the frontend for large datasets
6. **Form Validation**: Implement client-side validation matching server validation rules
7. **Notifications**: Send notifications to tenants when request status changes

---

## Rate Limiting

- Create requests: 10 per minute per user
- Update requests: 30 per minute per user
- Get requests: 100 per minute per user
- Delete requests: 5 per minute per user

---

## Security Considerations

1. **Authentication**: All endpoints require valid JWT tokens
2. **Authorization**: Role-based access control (tenant vs admin)
3. **Data Validation**: Input validation on all fields
4. **SQL Injection**: Protected through Mongoose ODM
5. **XSS**: Sanitize user inputs, especially for notes and descriptions
6. **File Upload**: Validate image URLs and implement proper security measures

# Admin Service Request Management API Documentation

## Overview

The Admin Service Request Management APIs provide comprehensive control and visibility over all service requests across the RV park system. Admins can view detailed information about tenants, properties, spots, and manage request statuses with full administrative privileges.

## Base URL

```
/api/v1/admin/service-requests
```

## Authentication

All endpoints require JWT authentication with SUPER_ADMIN role. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

---

## Endpoints

### 1. Get All Service Requests (Admin Only)

**GET** `/api/v1/admin/service-requests`

Retrieves all service requests with full details including tenant, property, and spot information.

**Query Parameters:**

- `status` (optional): Filter by status (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`)
- `priority` (optional): Filter by priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`)
- `type` (optional): Filter by type (`MAINTENANCE`, `UTILITY`, `SECURITY`, `CLEANING`, `OTHER`)
- `propertyId` (optional): Filter by specific property
- `tenantId` (optional): Filter by specific tenant
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `sortBy` (optional): Sort field (`requestedDate`, `priority`, `status`, `type`)
- `sortOrder` (optional): Sort order (`asc`, `desc`)

**Example Request:**

```
GET /api/v1/admin/service-requests?status=PENDING&priority=HIGH&page=1&limit=5&sortBy=requestedDate&sortOrder=desc
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
        "completedDate": null,
        "assignedTo": null,
        "estimatedCost": null,
        "actualCost": null,
        "images": ["https://example.com/image1.jpg"],
        "adminNotes": null,
        "tenantNotes": "Please fix as soon as possible",
        "tenantId": {
          "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
          "name": "John Doe",
          "email": "john@example.com",
          "phoneNumber": "+1234567890",
          "profileImage": "https://example.com/profile.jpg",
          "bio": "Long-term RV enthusiast",
          "preferredLocation": "California",
          "emergencyContact": {
            "name": "Jane Doe",
            "phone": "+1234567891",
            "relationship": "Spouse"
          }
        },
        "propertyId": {
          "_id": "64f8a1b2c3d4e5f6a7b8c9d2",
          "name": "Sunset RV Park",
          "description": "Beautiful RV park with mountain views",
          "address": {
            "street": "123 Main St",
            "city": "Anytown",
            "state": "CA",
            "zip": "12345",
            "country": "USA"
          },
          "amenities": ["WiFi", "Pool", "Laundry", "Showers"],
          "totalLots": 50,
          "availableLots": 5,
          "isActive": true,
          "images": ["https://example.com/park1.jpg"],
          "rules": ["Quiet hours 10 PM - 8 AM", "No pets in pool area"]
        },
        "spotId": {
          "_id": "64f8a1b2c3d4e5f6a7b8c9d3",
          "spotNumber": "A-15",
          "status": "OCCUPIED",
          "size": {
            "length": 40,
            "width": 12
          },
          "amenities": ["Water", "Electricity", "Sewer"],
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
          "description": "Pull-through spot with full hookups",
          "images": ["https://example.com/spot1.jpg"],
          "isActive": true
        },
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
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

### 2. Get Service Request by ID (Admin Only)

**GET** `/api/v1/admin/service-requests/:id`

Retrieves a specific service request with complete details.

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
    "adminNotes": "Plumber scheduled for tomorrow morning",
    "tenantNotes": "Please fix as soon as possible",
    "tenantId": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
      "name": "John Doe",
      "email": "john@example.com",
      "phoneNumber": "+1234567890",
      "profileImage": "https://example.com/profile.jpg",
      "bio": "Long-term RV enthusiast",
      "preferredLocation": "California",
      "emergencyContact": {
        "name": "Jane Doe",
        "phone": "+1234567891",
        "relationship": "Spouse"
      }
    },
    "propertyId": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d2",
      "name": "Sunset RV Park",
      "description": "Beautiful RV park with mountain views",
      "address": {
        "street": "123 Main St",
        "city": "Anytown",
        "state": "CA",
        "zip": "12345",
        "country": "USA"
      },
      "amenities": ["WiFi", "Pool", "Laundry", "Showers"],
      "totalLots": 50,
      "availableLots": 5,
      "isActive": true,
      "images": ["https://example.com/park1.jpg"],
      "rules": ["Quiet hours 10 PM - 8 AM", "No pets in pool area"]
    },
    "spotId": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d3",
      "spotNumber": "A-15",
      "status": "OCCUPIED",
      "size": {
        "length": 40,
        "width": 12
      },
      "amenities": ["Water", "Electricity", "Sewer"],
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
      "description": "Pull-through spot with full hookups",
      "images": ["https://example.com/spot1.jpg"],
      "isActive": true
    }
  }
}
```

---

### 3. Update Service Request (Admin Only)

**PATCH** `/api/v1/admin/service-requests/:id`

Updates service request status and administrative details.

**Request Body:**

```json
{
  "status": "IN_PROGRESS",
  "priority": "URGENT",
  "assignedTo": "Mike Johnson",
  "estimatedCost": 200,
  "actualCost": 180,
  "completedDate": "2024-01-16T14:00:00.000Z",
  "adminNotes": "Work completed successfully. All leaks fixed.",
  "images": ["https://example.com/after-repair.jpg"]
}
```

**Field Descriptions:**

- `status`: Update request status (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`)
- `priority`: Update priority level (`LOW`, `MEDIUM`, `HIGH`, `URGENT`)
- `assignedTo`: Assign worker to handle the request
- `estimatedCost`: Estimated cost of the work
- `actualCost`: Actual cost after completion
- `completedDate`: When work was completed (auto-set if status = COMPLETED)
- `adminNotes`: Administrative notes about the request
- `images`: Additional images (before/after photos)

**Response (200 OK):**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Service request updated successfully",
  "data": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "title": "Water leak in bathroom",
    "description": "There's a water leak under the sink in the bathroom.",
    "type": "MAINTENANCE",
    "priority": "URGENT",
    "status": "COMPLETED",
    "requestedDate": "2024-01-15T10:30:00.000Z",
    "completedDate": "2024-01-16T14:00:00.000Z",
    "assignedTo": "Mike Johnson",
    "estimatedCost": 200,
    "actualCost": 180,
    "images": [
      "https://example.com/image1.jpg",
      "https://example.com/after-repair.jpg"
    ],
    "adminNotes": "Work completed successfully. All leaks fixed.",
    "tenantNotes": "Please fix as soon as possible",
    "tenantId": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
      "name": "John Doe",
      "email": "john@example.com",
      "phoneNumber": "+1234567890",
      "profileImage": "https://example.com/profile.jpg",
      "bio": "Long-term RV enthusiast",
      "preferredLocation": "California",
      "emergencyContact": {
        "name": "Jane Doe",
        "phone": "+1234567891",
        "relationship": "Spouse"
      }
    },
    "propertyId": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d2",
      "name": "Sunset RV Park",
      "description": "Beautiful RV park with mountain views",
      "address": {
        "street": "123 Main St",
        "city": "Anytown",
        "state": "CA",
        "zip": "12345",
        "country": "USA"
      },
      "amenities": ["WiFi", "Pool", "Laundry", "Showers"],
      "totalLots": 50,
      "availableLots": 5,
      "isActive": true,
      "images": ["https://example.com/park1.jpg"],
      "rules": ["Quiet hours 10 PM - 8 AM", "No pets in pool area"]
    },
    "spotId": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d3",
      "spotNumber": "A-15",
      "status": "OCCUPIED",
      "size": {
        "length": 40,
        "width": 12
      },
      "amenities": ["Water", "Electricity", "Sewer"],
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
      "description": "Pull-through spot with full hookups",
      "images": ["https://example.com/spot1.jpg"],
      "isActive": true
    },
    "updatedAt": "2024-01-16T14:00:00.000Z"
  }
}
```

---

### 4. Add Admin Comment (Admin Only)

**POST** `/api/v1/admin/service-requests/:id/comment`

Adds a timestamped comment to the service request.

**Request Body:**

```json
{
  "comment": "Plumber arrived and assessed the issue. Parts ordered for tomorrow."
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Comment added successfully",
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
    "adminNotes": "Plumber scheduled for tomorrow morning\n[2024-01-15T16:30:00.000Z] Plumber arrived and assessed the issue. Parts ordered for tomorrow.\n",
    "tenantNotes": "Please fix as soon as possible",
    "tenantId": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
      "name": "John Doe",
      "email": "john@example.com",
      "phoneNumber": "+1234567890",
      "profileImage": "https://example.com/profile.jpg",
      "bio": "Long-term RV enthusiast",
      "preferredLocation": "California",
      "emergencyContact": {
        "name": "Jane Doe",
        "phone": "+1234567891",
        "relationship": "Spouse"
      }
    },
    "propertyId": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d2",
      "name": "Sunset RV Park",
      "description": "Beautiful RV park with mountain views",
      "address": {
        "street": "123 Main St",
        "city": "Anytown",
        "state": "CA",
        "zip": "12345",
        "country": "USA"
      },
      "amenities": ["WiFi", "Pool", "Laundry", "Showers"],
      "totalLots": 50,
      "availableLots": 5,
      "isActive": true,
      "images": ["https://example.com/park1.jpg"],
      "rules": ["Quiet hours 10 PM - 8 AM", "No pets in pool area"]
    },
    "spotId": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d3",
      "spotNumber": "A-15",
      "status": "OCCUPIED",
      "size": {
        "length": 40,
        "width": 12
      },
      "amenities": ["Water", "Electricity", "Sewer"],
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
      "description": "Pull-through spot with full hookups",
      "images": ["https://example.com/spot1.jpg"],
      "isActive": true
    },
    "updatedAt": "2024-01-15T16:30:00.000Z"
  }
}
```

---

### 5. Get Service Requests by Property (Admin Only)

**GET** `/api/v1/admin/properties/:propertyId/service-requests`

Retrieves all service requests for a specific property.

**Query Parameters:**

- `status` (optional): Filter by status
- `priority` (optional): Filter by priority
- `type` (optional): Filter by type
- `page` (optional): Page number
- `limit` (optional): Items per page
- `sortBy` (optional): Sort field
- `sortOrder` (optional): Sort order

**Response (200 OK):**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Service requests by property retrieved successfully",
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
          "phoneNumber": "+1234567890",
          "profileImage": "https://example.com/profile.jpg",
          "bio": "Long-term RV enthusiast",
          "preferredLocation": "California",
          "emergencyContact": {
            "name": "Jane Doe",
            "phone": "+1234567891",
            "relationship": "Spouse"
          }
        },
        "propertyId": {
          "_id": "64f8a1b2c3d4e5f6a7b8c9d2",
          "name": "Sunset RV Park",
          "description": "Beautiful RV park with mountain views",
          "address": {
            "street": "123 Main St",
            "city": "Anytown",
            "state": "CA",
            "zip": "12345",
            "country": "USA"
          },
          "amenities": ["WiFi", "Pool", "Laundry", "Showers"],
          "totalLots": 50,
          "availableLots": 5,
          "isActive": true,
          "images": ["https://example.com/park1.jpg"],
          "rules": ["Quiet hours 10 PM - 8 AM", "No pets in pool area"]
        },
        "spotId": {
          "_id": "64f8a1b2c3d4e5f6a7b8c9d3",
          "spotNumber": "A-15",
          "status": "OCCUPIED",
          "size": {
            "length": 40,
            "width": 12
          },
          "amenities": ["Water", "Electricity", "Sewer"],
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
          "description": "Pull-through spot with full hookups",
          "images": ["https://example.com/spot1.jpg"],
          "isActive": true
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 15,
      "totalPages": 2
    }
  }
}
```

---

### 6. Get Service Requests by Tenant (Admin Only)

**GET** `/api/v1/admin/tenants/:tenantId/service-requests`

Retrieves all service requests for a specific tenant.

**Response (200 OK):**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Service requests by tenant retrieved successfully",
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
          "phoneNumber": "+1234567890",
          "profileImage": "https://example.com/profile.jpg",
          "bio": "Long-term RV enthusiast",
          "preferredLocation": "California",
          "emergencyContact": {
            "name": "Jane Doe",
            "phone": "+1234567891",
            "relationship": "Spouse"
          }
        },
        "propertyId": {
          "_id": "64f8a1b2c3d4e5f6a7b8c9d2",
          "name": "Sunset RV Park",
          "description": "Beautiful RV park with mountain views",
          "address": {
            "street": "123 Main St",
            "city": "Anytown",
            "state": "CA",
            "zip": "12345",
            "country": "USA"
          },
          "amenities": ["WiFi", "Pool", "Laundry", "Showers"],
          "totalLots": 50,
          "availableLots": 5,
          "isActive": true,
          "images": ["https://example.com/park1.jpg"],
          "rules": ["Quiet hours 10 PM - 8 AM", "No pets in pool area"]
        },
        "spotId": {
          "_id": "64f8a1b2c3d4e5f6a7b8c9d3",
          "spotNumber": "A-15",
          "status": "OCCUPIED",
          "size": {
            "length": 40,
            "width": 12
          },
          "amenities": ["Water", "Electricity", "Sewer"],
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
          "description": "Pull-through spot with full hookups",
          "images": ["https://example.com/spot1.jpg"],
          "isActive": true
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 8,
      "totalPages": 1
    }
  }
}
```

---

### 7. Get Urgent Service Requests (Admin Only)

**GET** `/api/v1/admin/service-requests/urgent`

Retrieves all urgent (HIGH/URGENT priority) and non-completed service requests.

**Query Parameters:**

- `page` (optional): Page number
- `limit` (optional): Items per page

**Response (200 OK):**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Urgent service requests retrieved successfully",
  "data": {
    "serviceRequests": [
      {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
        "title": "Water leak in bathroom",
        "description": "There's a water leak under the sink in the bathroom.",
        "type": "MAINTENANCE",
        "priority": "URGENT",
        "status": "PENDING",
        "requestedDate": "2024-01-15T10:30:00.000Z",
        "tenantId": {
          "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
          "name": "John Doe",
          "email": "john@example.com",
          "phoneNumber": "+1234567890",
          "profileImage": "https://example.com/profile.jpg",
          "bio": "Long-term RV enthusiast",
          "preferredLocation": "California",
          "emergencyContact": {
            "name": "Jane Doe",
            "phone": "+1234567891",
            "relationship": "Spouse"
          }
        },
        "propertyId": {
          "_id": "64f8a1b2c3d4e5f6a7b8c9d2",
          "name": "Sunset RV Park",
          "description": "Beautiful RV park with mountain views",
          "address": {
            "street": "123 Main St",
            "city": "Anytown",
            "state": "CA",
            "zip": "12345",
            "country": "USA"
          },
          "amenities": ["WiFi", "Pool", "Laundry", "Showers"],
          "totalLots": 50,
          "availableLots": 5,
          "isActive": true,
          "images": ["https://example.com/park1.jpg"],
          "rules": ["Quiet hours 10 PM - 8 AM", "No pets in pool area"]
        },
        "spotId": {
          "_id": "64f8a1b2c3d4e5f6a7b8c9d3",
          "spotNumber": "A-15",
          "status": "OCCUPIED",
          "size": {
            "length": 40,
            "width": 12
          },
          "amenities": ["Water", "Electricity", "Sewer"],
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
          "description": "Pull-through spot with full hookups",
          "images": ["https://example.com/spot1.jpg"],
          "isActive": true
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

---

### 8. Get Service Request Dashboard Statistics (Admin Only)

**GET** `/api/v1/admin/service-requests/dashboard-stats`

Retrieves comprehensive statistics for the service request dashboard.

**Response (200 OK):**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Service request dashboard statistics retrieved successfully",
  "data": {
    "overview": {
      "total": 150,
      "pending": 25,
      "inProgress": 15,
      "completed": 100,
      "urgent": 8
    },
    "byType": [
      {
        "_id": "MAINTENANCE",
        "count": 60,
        "pending": 10,
        "inProgress": 8,
        "completed": 42
      },
      {
        "_id": "UTILITY",
        "count": 40,
        "pending": 8,
        "inProgress": 4,
        "completed": 28
      },
      {
        "_id": "SECURITY",
        "count": 20,
        "pending": 3,
        "inProgress": 2,
        "completed": 15
      },
      {
        "_id": "CLEANING",
        "count": 25,
        "pending": 4,
        "inProgress": 1,
        "completed": 20
      },
      {
        "_id": "OTHER",
        "count": 5,
        "pending": 0,
        "inProgress": 0,
        "completed": 5
      }
    ],
    "byProperty": [
      {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d2",
        "propertyName": "Sunset RV Park",
        "count": 80,
        "pending": 15,
        "urgent": 5
      },
      {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d3",
        "propertyName": "Mountain View RV Resort",
        "count": 45,
        "pending": 8,
        "urgent": 2
      },
      {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d4",
        "propertyName": "Lakeside RV Park",
        "count": 25,
        "pending": 2,
        "urgent": 1
      }
    ],
    "recentActivity": [
      {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
        "title": "Water leak in bathroom",
        "type": "MAINTENANCE",
        "priority": "HIGH",
        "status": "PENDING",
        "requestedDate": "2024-01-15T10:30:00.000Z",
        "tenantId": {
          "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "propertyId": {
          "_id": "64f8a1b2c3d4e5f6a7b8c9d2",
          "name": "Sunset RV Park"
        },
        "spotId": {
          "_id": "64f8a1b2c3d4e5f6a7b8c9d3",
          "spotNumber": "A-15"
        },
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

---

## Admin Capabilities

### **Full Visibility:**

- **Tenant Details**: Name, email, phone, profile image, bio, emergency contacts
- **Property Details**: Name, description, address, amenities, rules, lot counts
- **Spot Details**: Spot number, status, size, hookups, pricing, images
- **Request History**: Complete timeline with timestamps

### **Complete Control:**

- **Status Management**: Change request status (PENDING → IN_PROGRESS → COMPLETED/CANCELLED)
- **Priority Updates**: Adjust priority levels based on urgency
- **Assignment**: Assign workers to handle requests
- **Cost Tracking**: Set estimated and actual costs
- **Comment System**: Add timestamped comments for tracking
- **Image Management**: Add before/after photos

### **Advanced Filtering:**

- **By Property**: View all requests for specific properties
- **By Tenant**: View all requests from specific tenants
- **By Status**: Filter by current status
- **By Priority**: Focus on urgent requests
- **By Type**: Categorize by request type

### **Dashboard Analytics:**

- **Overview Statistics**: Total, pending, in-progress, completed, urgent counts
- **Type Breakdown**: Distribution by request type with status breakdown
- **Property Analysis**: Request distribution across properties
- **Recent Activity**: Latest requests for quick review

---

## Business Workflow

### **Request Lifecycle:**

1. **Tenant Creates Request** → Status: PENDING
2. **Admin Reviews** → Assigns worker, sets priority, estimates cost
3. **Work Begins** → Status: IN_PROGRESS
4. **Work Completed** → Status: COMPLETED, actual cost recorded
5. **Optional**: Request cancelled if not feasible

### **Admin Actions:**

- **Immediate Response**: View urgent requests first
- **Resource Allocation**: Assign appropriate workers
- **Cost Management**: Track estimated vs actual costs
- **Communication**: Add comments for tenant updates
- **Quality Control**: Review completed work with photos

---

## Error Codes

| Code | Description                                            |
| ---- | ------------------------------------------------------ |
| 400  | Bad Request - Invalid data or business rule violation  |
| 401  | Unauthorized - Invalid or missing authentication token |
| 403  | Forbidden - User is not a SUPER_ADMIN                  |
| 404  | Not Found - Service request not found                  |
| 500  | Internal Server Error - Server error                   |

---

## Frontend Integration Tips

1. **Dashboard Widgets**: Display overview statistics prominently
2. **Urgent Alerts**: Highlight urgent requests with notifications
3. **Detailed Views**: Show full tenant/property/spot information
4. **Status Workflow**: Visual status progression indicators
5. **Comment Thread**: Display admin comments with timestamps
6. **Image Gallery**: Show before/after photos
7. **Filter Panels**: Advanced filtering options
8. **Export Features**: Generate reports for management
9. **Real-time Updates**: WebSocket for live status changes
10. **Mobile Responsive**: Ensure admin can manage from mobile devices

---

## Security Considerations

1. **Role-based Access**: Only SUPER_ADMIN can access these endpoints
2. **Data Validation**: Comprehensive input validation
3. **Audit Trail**: All changes are timestamped
4. **Cost Limits**: Maximum cost validation ($100,000)
5. **Image Security**: Validate image URLs
6. **Comment Sanitization**: Prevent XSS in comments

This comprehensive admin system provides full visibility and control over all service requests, enabling efficient management of RV park maintenance and tenant satisfaction.

# Rental Portal Management Backend - Complete API Endpoints Documentation

## Base URL
```
http://localhost:5000/api/v1.0
```

## Authentication Headers

### For User Authentication
```
Authorization: Bearer <user-jwt-token>
```

### For Admin Authentication
```
Authorization: Bearer <admin-jwt-token>
```

---

## 🔐 Authentication & User Management (`/users`)

### Public Routes (No Authentication Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/users/register` | Register a new user |
| `POST` | `/users/login` | User login |
| `POST` | `/users/set-password` | Set password for invited users |
| `GET` | `/users/check-status/:email` | Check user invitation status |

### Admin Routes (Requires Admin Authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/users` | Get all users |
| `GET` | `/users/tenants` | Get all tenants |
| `GET` | `/users/:userId` | Get user by ID |
| `PATCH` | `/users/:userId` | Update user information |
| `DELETE` | `/users/:userId` | Delete user |

### User Routes (Requires User Authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/users/me` | Get user's own profile |
| `GET` | `/users/service-requests` | Get user's service requests |
| `GET` | `/users/service-requests/:id` | Get user's specific service request |
| `GET` | `/users/announcements` | Get user's announcements |
| `GET` | `/users/announcements/:announcementId` | Get user's specific announcement |
| `POST` | `/users/announcements/mark-read` | Mark announcement as read |

---

## 👨‍💼 Admin Management (`/admin`)

### Tenant Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/admin/invite-tenant` | Invite a new tenant |
| `GET` | `/admin/tenants` | Get all tenants |

### Property Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/admin/properties` | Create a new property |
| `GET` | `/admin/properties` | Get all properties |
| `GET` | `/admin/properties/:id` | Get property by ID |
| `PATCH` | `/admin/properties/:id` | Update property |
| `DELETE` | `/admin/properties/:id` | Delete property |
| `PATCH` | `/admin/properties/:id/archive` | Archive property |
| `PATCH` | `/admin/properties/:id/restore` | Restore archived property |
| `GET` | `/admin/properties/archived` | Get archived properties |

### Spot Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/admin/spots` | Create a new spot |
| `GET` | `/admin/properties/:propertyId/spots` | Get spots by property |
| `GET` | `/admin/spots/:id` | Get spot by ID |
| `PATCH` | `/admin/spots/:id` | Update spot |
| `DELETE` | `/admin/spots/:id` | Delete spot |
| `PATCH` | `/admin/spots/:id/archive` | Archive spot |
| `PATCH` | `/admin/spots/:id/restore` | Restore archived spot |
| `GET` | `/admin/spots/archived` | Get archived spots |

### Service Request Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin/service-requests` | Get all service requests |
| `GET` | `/admin/service-requests/urgent` | Get urgent service requests |
| `GET` | `/admin/service-requests/dashboard-stats` | Get service request dashboard statistics |
| `GET` | `/admin/service-requests/:id` | Get service request by ID |
| `PATCH` | `/admin/service-requests/:id` | Update service request |
| `POST` | `/admin/service-requests/:id/comment` | Add admin comment to service request |
| `GET` | `/admin/properties/:propertyId/service-requests` | Get service requests by property |
| `GET` | `/admin/tenants/:tenantId/service-requests` | Get service requests by tenant |

### User Management (Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin/users` | Get all users |
| `GET` | `/admin/users/:userId` | Get user by ID |
| `PATCH` | `/admin/users/:userId` | Update user |
| `DELETE` | `/admin/users/:userId` | Delete user |

### Utility

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin/test-email` | Test email functionality |

---

## 📢 Announcements (`/announcements`)

### Public Routes (No Authentication Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/announcements/active` | Get active announcements |
| `GET` | `/announcements/unread/:userId` | Get unread announcements for user |
| `POST` | `/announcements/mark-read` | Mark announcement as read |

### Admin Routes (Requires Admin Authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/announcements` | Create new announcement |
| `GET` | `/announcements` | Get all announcements |
| `GET` | `/announcements/:announcementId` | Get announcement by ID |
| `PATCH` | `/announcements/:announcementId` | Update announcement |
| `DELETE` | `/announcements/:announcementId` | Delete announcement |
| `PATCH` | `/announcements/:announcementId/archive` | Archive announcement |
| `PATCH` | `/announcements/:announcementId/restore` | Restore archived announcement |
| `GET` | `/announcements/archived` | Get archived announcements |

### Filter Routes (Admin Only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/announcements/property/:propertyId` | Get announcements by property |
| `GET` | `/announcements/type/:type` | Get announcements by type |
| `GET` | `/announcements/priority/:priority` | Get announcements by priority |

---

## 🔧 Service Requests (`/service-requests`)

### User Routes (Requires User Authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/service-requests` | Create new service request |
| `GET` | `/service-requests` | Get service requests with filters |
| `GET` | `/service-requests/:id` | Get service request by ID |
| `PATCH` | `/service-requests/:id` | Update service request |
| `DELETE` | `/service-requests/:id` | Delete service request |
| `PATCH` | `/service-requests/:id/archive` | Archive service request |
| `PATCH` | `/service-requests/:id/restore` | Restore archived service request |

### Admin Routes (Requires Admin Authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/service-requests/archived` | Get archived service requests |
| `GET` | `/service-requests/stats/overview` | Get service request statistics |

---

## 📊 Summary by Module

### Total Endpoints: 67

- **Authentication & User Management**: 15 endpoints
- **Admin Management**: 32 endpoints
- **Announcements**: 15 endpoints
- **Service Requests**: 9 endpoints

### Authentication Requirements

- **Public Routes**: 7 endpoints (no authentication required)
- **User Authentication**: 16 endpoints (requires user JWT token)
- **Admin Authentication**: 44 endpoints (requires admin JWT token)

### HTTP Methods Distribution

- **GET**: 39 endpoints (58%)
- **POST**: 12 endpoints (18%)
- **PATCH**: 13 endpoints (19%)
- **DELETE**: 3 endpoints (4%)

---

## 🔒 Security Notes

1. **Admin Routes**: All admin routes require SUPER_ADMIN role authentication
2. **User Routes**: User-specific routes require valid user JWT token
3. **Public Routes**: Limited to essential operations like registration, login, and viewing active announcements
4. **Soft Delete**: Most delete operations use soft delete (archiving) instead of permanent deletion
5. **Validation**: All endpoints use Zod validation schemas for request validation

---

## 📝 Usage Examples

### User Registration
```bash
curl -X POST http://localhost:5000/api/v1.0/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "confirmPassword": "password123",
    "phoneNumber": "1234567890",
    "role": "TENANT"
  }'
```

### User Login
```bash
curl -X POST http://localhost:5000/api/v1.0/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Get User Profile (with authentication)
```bash
curl -X GET http://localhost:5000/api/v1.0/users/me \
  -H "Authorization: Bearer <your-jwt-token>"
```

### Create Service Request (tenant only)
```bash
curl -X POST http://localhost:5000/api/v1.0/service-requests \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Water leak",
    "description": "Kitchen faucet is leaking",
    "type": "MAINTENANCE",
    "priority": "HIGH"
  }'
```

### Get All Properties (admin only)
```bash
curl -X GET http://localhost:5000/api/v1.0/admin/properties \
  -H "Authorization: Bearer <admin-jwt-token>"
```

---

## 🚀 Quick Reference

### Most Common Endpoints

1. **User Authentication**: `/users/login`, `/users/register`
2. **User Profile**: `/users/me`
3. **Service Requests**: `/service-requests` (user), `/admin/service-requests` (admin)
4. **Properties**: `/admin/properties`
5. **Spots**: `/admin/spots`
6. **Announcements**: `/announcements/active` (public), `/announcements` (admin)

### Error Handling

All endpoints return consistent error responses:
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Error description",
  "errorDetails": {}
}
```

### Success Responses

All endpoints return consistent success responses:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation successful",
  "data": {}
}
``` 
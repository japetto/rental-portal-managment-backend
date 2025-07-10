# Simple User API Documentation

## Authentication
Include your JWT token in the header:
```
Authorization: Bearer <your-token>
```

---

## 📢 Announcements

### Get My Announcements
```
GET /api/users/announcements
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "title": "Pool Maintenance",
      "content": "Pool closed for cleaning",
      "type": "MAINTENANCE",
      "priority": "HIGH"
    }
  ]
}
```

---

## 🔧 Service Requests

### Get My Service Requests
```
GET /api/users/service-requests
```

**Response:**
```json
{
  "success": true,
  "data": {
    "serviceRequests": [
      {
        "title": "Leaky Faucet",
        "description": "Kitchen faucet leaking",
        "status": "PENDING",
        "priority": "MEDIUM"
      }
    ],
    "pagination": {
      "page": 1,
      "total": 5
    }
  }
}
```

### Get Specific Service Request
```
GET /api/users/service-requests/:id
```

---

## 👤 User Profile

### Get My Profile
```
GET /api/users/me
```

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "1234567890",
    "role": "TENANT"
  }
}
```

---

## 📝 Mark Announcement as Read
```
POST /api/users/announcements/mark-read
```

**Body:**
```json
{
  "announcementId": "announcement-id"
}
``` 
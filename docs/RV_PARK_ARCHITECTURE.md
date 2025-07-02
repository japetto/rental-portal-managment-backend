# RV Park Management System Architecture

## Overview

This backend system is designed to manage multiple RV park properties and their tenants in a scalable way. The system supports multiple properties, each with multiple lots/spots, and comprehensive tenant management with service requests, announcements, and payment tracking.

## Database Schema Design

### 1. Users Module (`/src/app/modules/users/`)

**Purpose**: Manages all users in the system (tenants and super admin)

**Key Features**:

- User authentication and authorization
- Role-based access control (SUPER_ADMIN, TENANT)
- Profile management
- Tenant-specific information (RV details, emergency contacts, etc.)

**Schema Fields**:

- `name`, `email`, `phoneNumber` - Basic user info
- `role` - User role in the system
- `isInvited`, `isVerified` - Account status
- `profileImage`, `bio` - Profile details
- `preferredLocation` - User's preferred location
- **Tenant-specific fields**:
  - `propertyId` - Which property the tenant belongs to
  - `spotId` - Which spot the tenant is assigned to
  - `rvInfo` - RV specifications (make, model, year, length, license)
  - `emergencyContact` - Emergency contact information
  - `pets` - Pet information
  - `specialRequests` - Special accommodation requests

### 2. Properties Module (`/src/app/modules/properties/`)

**Purpose**: Manages RV park properties

**Key Features**:

- Multiple property support
- Property details and amenities
- Lot capacity management
- Property rules and policies

**Schema Fields**:

- `name`, `description` - Property details
- `address` - Complete address (street, city, state, zip, country)
- `amenities` - Available amenities
- `totalLots`, `availableLots` - Capacity management
- `images`, `rules` - Property media and policies
- `isActive` - Property status

### 3. Spots Module (`/src/app/modules/spots/`)

**Purpose**: Manages individual RV spots/lots within properties

**Key Features**:

- Spot-specific pricing (daily, weekly, monthly)
- Hookup availability (water, electricity, sewer, wifi)
- Spot status management
- Size specifications

**Schema Fields**:

- `spotNumber` - Unique spot identifier within property
- `propertyId` - Reference to parent property
- `status` - AVAILABLE, OCCUPIED, MAINTENANCE, RESERVED
- `size` - Length and width in feet
- `hookups` - Available utilities
- `price` - Pricing structure
- `amenities` - Spot-specific amenities
- `description`, `images` - Spot details

### 4. Service Requests Module (`/src/app/modules/service-requests/`)

**Purpose**: Manages tenant service requests

**Key Features**:

- Multiple request types (maintenance, utility, security, cleaning)
- Priority levels and status tracking
- Cost estimation and tracking
- Admin assignment and notes

**Schema Fields**:

- `tenantId`, `propertyId`, `spotId` - References to related entities
- `title`, `description` - Request details
- `type` - Request type (MAINTENANCE, UTILITY, SECURITY, CLEANING, OTHER)
- `priority` - Priority level (LOW, MEDIUM, HIGH, URGENT)
- `status` - Request status (PENDING, IN_PROGRESS, COMPLETED, CANCELLED)
- `requestedDate`, `completedDate` - Timeline tracking
- `estimatedCost`, `actualCost` - Cost tracking
- `images` - Photos of the issue
- `adminNotes`, `tenantNotes` - Communication

### 5. Announcements Module (`/src/app/modules/announcements/`)

**Purpose**: Manages system-wide and property-specific announcements

**Key Features**:

- System-wide and property-specific announcements
- Multiple announcement types and priority levels
- Expiry dates and read tracking
- File attachments support

**Schema Fields**:

- `title`, `content` - Announcement details
- `type` - Announcement type (GENERAL, MAINTENANCE, EVENT, EMERGENCY, RULE_UPDATE, BILLING, SECURITY, OTHER)
- `priority` - Priority level (LOW, MEDIUM, HIGH, URGENT)
- `propertyId` - Optional property reference (null for system-wide)
- `isActive`, `publishDate`, `expiryDate` - Publication control
- `createdBy` - Admin who created the announcement
- `attachments` - File attachments
- `readBy` - Array of users who have read the announcement

### 6. Payments Module (`/src/app/modules/payments/`)

**Purpose**: Manages tenant payment tracking and history

**Key Features**:

- Multiple payment types (rent, deposit, late fees, utilities)
- Payment status tracking and overdue management
- Multiple payment methods
- Receipt generation and transaction tracking

**Schema Fields**:

- `tenantId`, `propertyId`, `spotId` - References to related entities
- `amount`, `lateFeeAmount`, `totalAmount` - Financial details
- `type` - Payment type (RENT, DEPOSIT, LATE_FEE, UTILITY, MAINTENANCE, OTHER)
- `status` - Payment status (PENDING, PAID, OVERDUE, CANCELLED, REFUNDED)
- `dueDate`, `paidDate` - Payment timeline
- `paymentMethod` - Payment method used
- `transactionId`, `receiptNumber` - Transaction tracking
- `description`, `notes` - Payment details
- `createdBy` - Admin who created the payment record

## Scalability Features

### 1. Multi-Property Support

- Each property is independent with its own spots and tenants
- Super admin manages all properties centrally
- Property-specific announcements and service requests

### 2. Flexible Spot Management

- Different spot types with varying amenities and pricing
- Dynamic spot availability tracking
- Maintenance scheduling support

### 3. Comprehensive Tenant Management

- Tenant-specific information and preferences
- Service request tracking
- Payment history and overdue management
- Announcement read tracking

### 4. Role-Based Access Control

- **SUPER_ADMIN**: Full system access to all properties and tenants
- **TENANT**: View and manage own information, requests, and payments

## Database Relationships

```
Users (1) ←→ (Many) Properties (via propertyId)
Properties (1) ←→ (Many) Spots (via propertyId)
Users (1) ←→ (Many) Spots (via spotId)
Users (1) ←→ (Many) ServiceRequests (via tenantId)
Users (1) ←→ (Many) Payments (via tenantId)
Properties (1) ←→ (Many) Announcements (via propertyId)
```

## API Structure

### Admin Routes (Super Admin Only)

- `/api/admin/properties` - Property management
- `/api/admin/spots` - Spot management
- `/api/admin/tenants` - Tenant management
- `/api/admin/service-requests` - Service request management
- `/api/admin/announcements` - Announcement management
- `/api/admin/payments` - Payment management

### Tenant Routes

- `/api/tenant/profile` - Profile management
- `/api/tenant/service-requests` - Service request creation and tracking
- `/api/tenant/payments` - Payment history and status
- `/api/tenant/announcements` - View announcements

### Public Routes

- `/api/auth` - Authentication (login, register, etc.)

## Future Scalability Considerations

### 1. Additional Modules to Consider

- **Maintenance Module**: Scheduled maintenance tracking
- **Notifications Module**: Email/SMS notifications
- **Reports Module**: Analytics and reporting
- **Reviews Module**: Tenant reviews and ratings

### 2. Advanced Features

- **Reservation System**: Advance booking for spots
- **Dynamic Pricing**: Seasonal or demand-based pricing
- **Integration APIs**: Payment gateways, mapping services
- **Mobile App Support**: Real-time updates and notifications

### 3. Performance Optimizations

- Database indexing on frequently queried fields
- Caching for property and spot availability
- Pagination for large datasets
- Image optimization and CDN integration

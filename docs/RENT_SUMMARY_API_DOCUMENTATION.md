# Rent Summary API Documentation

## Get Rent Summary for Tenant

**GET** `/api/v1/users/rent-summary`

### Description
Get comprehensive rent summary for the authenticated tenant, including property details, lot number, rent amount, due dates, and payment status.

### Authentication
- **Required**: Yes (User must be logged in as a tenant)
- **Authorization Header**: `Authorization: Bearer <your-jwt-token>`

### Request
- **Method**: GET
- **URL**: `/api/v1/users/rent-summary`
- **Headers**:
  ```
  Authorization: Bearer <your-jwt-token>
  Content-Type: application/json
  ```

### Response

#### Success Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Rent summary retrieved successfully",
  "data": {
    "hasActiveLease": true,
    "rentSummary": {
      "property": {
        "id": "64f1234567890abcdef12346",
        "name": "Sunset RV Park",
        "address": {
          "street": "123 Mountain Road",
          "city": "Mountain View",
          "state": "CA",
          "zip": "94041",
          "country": "USA"
        }
      },
      "spot": {
        "id": "64f1234567890abcdef12347",
        "spotNumber": "A-15",
        "spotIdentifier": "Premium Mountain View",
        "amenities": ["Full Hookup", "WiFi", "Cable TV", "Laundry"],
        "size": {
          "length": 40,
          "width": 12
        }
      },
      "lease": {
        "id": "64f1234567890abcdef12348",
        "leaseType": "MONTHLY",
        "leaseStart": "2024-01-01T00:00:00.000Z",
        "leaseEnd": null,
        "rentAmount": 500.00,
        "depositAmount": 500.00,
        "leaseStatus": "ACTIVE",
        "paymentStatus": "PENDING"
      },
      "currentMonth": {
        "dueDate": "2024-01-01T00:00:00.000Z",
        "rentAmount": 500.00,
        "status": "PENDING",
        "paidDate": null,
        "paymentMethod": null,
        "lateFeeAmount": 0,
        "totalAmount": 500.00,
        "daysOverdue": 0,
        "receiptNumber": null
      },
      "summary": {
        "totalOverdueAmount": 0,
        "overdueCount": 0,
        "pendingCount": 1,
        "totalPaidAmount": 1500.00,
        "averagePaymentAmount": 500.00
      },
      "recentPayments": [
        {
          "id": "64f1234567890abcdef12349",
          "dueDate": "2023-12-01T00:00:00.000Z",
          "paidDate": "2023-12-01T10:30:00.000Z",
          "amount": 500.00,
          "paymentMethod": "ONLINE",
          "receiptNumber": "RCP-1701433800000-123",
          "status": "PAID"
        },
        {
          "id": "64f1234567890abcdef12350",
          "dueDate": "2023-11-01T00:00:00.000Z",
          "paidDate": "2023-11-01T09:15:00.000Z",
          "amount": 500.00,
          "paymentMethod": "ONLINE",
          "receiptNumber": "RCP-1698837300000-124",
          "status": "PAID"
        }
      ],
      "pendingPayments": [
        {
          "id": "64f1234567890abcdef12351",
          "dueDate": "2024-01-01T00:00:00.000Z",
          "amount": 500.00,
          "status": "PENDING",
          "daysOverdue": 0
        }
      ]
    }
  }
}
```

#### No Active Lease Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "No active lease found",
  "data": {
    "hasActiveLease": false,
    "message": "No active lease found",
    "rentSummary": null
  }
}
```

#### Error Response (401 Unauthorized)

```json
{
  "success": false,
  "statusCode": 401,
  "message": "User not authenticated",
  "data": null
}
```

### Response Fields

#### Property Information
- `property.id`: Property unique identifier
- `property.name`: Property name
- `property.address`: Complete property address

#### Spot Information
- `spot.id`: Spot unique identifier
- `spot.spotNumber`: Lot/spot number (e.g., "A-15")
- `spot.spotIdentifier`: Spot description (e.g., "Premium Mountain View")
- `spot.amenities`: Array of available amenities
- `spot.size`: Spot dimensions (length and width in feet)

#### Lease Information
- `lease.id`: Lease unique identifier
- `lease.leaseType`: Type of lease ("MONTHLY" or "FIXED_TERM")
- `lease.leaseStart`: Lease start date
- `lease.leaseEnd`: Lease end date (null for monthly leases)
- `lease.rentAmount`: Monthly rent amount
- `lease.depositAmount`: Security deposit amount
- `lease.leaseStatus`: Current lease status
- `lease.paymentStatus`: Overall payment status

#### Current Month Payment
- `currentMonth.dueDate`: Due date for current month's rent
- `currentMonth.rentAmount`: Base rent amount
- `currentMonth.status`: Payment status for current month
- `currentMonth.paidDate`: Date when payment was made (if paid)
- `currentMonth.paymentMethod`: Method used for payment
- `currentMonth.lateFeeAmount`: Late fees applied
- `currentMonth.totalAmount`: Total amount due (rent + late fees)
- `currentMonth.daysOverdue`: Number of days overdue
- `currentMonth.receiptNumber`: Receipt number for payment

#### Payment Summary
- `summary.totalOverdueAmount`: Total amount overdue across all payments
- `summary.overdueCount`: Number of overdue payments
- `summary.pendingCount`: Number of pending payments
- `summary.totalPaidAmount`: Total amount paid in recent payments
- `summary.averagePaymentAmount`: Average payment amount

#### Recent Payments
Array of the last 6 paid rent payments with:
- Payment details (ID, dates, amounts)
- Payment method used
- Receipt numbers
- Payment status

#### Pending Payments
Array of all pending and overdue payments with:
- Due dates
- Amounts due
- Days overdue (for overdue payments)
- Payment status

### Use Cases

1. **Tenant Dashboard**: Display current rent status and payment history
2. **Payment Reminders**: Show overdue amounts and due dates
3. **Financial Summary**: Provide overview of payment patterns
4. **Property Information**: Show current property and spot details
5. **Lease Management**: Display active lease terms and conditions

### Notes

- The endpoint requires an active lease to return rent summary data
- If no active lease exists, the response indicates this clearly
- All amounts are returned in the base currency (typically USD)
- Dates are returned in ISO 8601 format
- The endpoint automatically calculates overdue days and late fees
- Recent payments are limited to the last 6 months for performance 
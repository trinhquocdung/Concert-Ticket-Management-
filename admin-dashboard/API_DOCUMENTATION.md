# QuickShow Ticket - Admin API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### Get Token
```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@quickshow.com",
  "password": "Password123!"
}
```

---

## 1. User Management API

### Get All Users (Admin)
```http
GET /users?page=1&limit=20&role=CUS&search=john
Authorization: Bearer <token>
```

Query Parameters:
| Param | Type | Description |
|-------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20) |
| role | string | Filter by role: ADMIN, ORG, STAFF, CUS |
| search | string | Search by name, email, username |
| status | string | Filter by status: ACTIVE, INACTIVE, BANNED |

### Get User Stats (Admin)
```http
GET /users/stats
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": {
    "total": 100,
    "byRole": {
      "ADMIN": 2,
      "ORG": 5,
      "STAFF": 10,
      "CUS": 83
    },
    "newThisMonth": 15
  }
}
```

### Create User (Admin)
```http
POST /users
Authorization: Bearer <token>
Content-Type: application/json

{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "Password123!",
  "fullName": "New User",
  "phone": "0123456789",
  "role": "STAFF"
}
```

### Update User (Admin)
```http
PUT /users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "fullName": "Updated Name",
  "phone": "0987654321",
  "status": "ACTIVE"
}
```

### Delete User (Admin)
```http
DELETE /users/:id
Authorization: Bearer <token>
```

### Lock/Unlock User (Admin)
```http
PUT /users/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "BANNED" // or "ACTIVE"
}
```

### Reset User Password (Admin)
```http
POST /users/:id/reset-password
Authorization: Bearer <token>
```

---

## 2. Concert/Event Management API

### Get All Concerts
```http
GET /concerts?page=1&limit=20&status=PUB&category=music
```

Query Parameters:
| Param | Type | Description |
|-------|------|-------------|
| page | number | Page number |
| limit | number | Items per page |
| status | string | DRAFT, PUB, SOLDOUT, CANCEL, COMPLETED |
| category | string | music, theater, sport, other |
| search | string | Search title/description |
| featured | boolean | Featured events only |

### Get Concert by ID
```http
GET /concerts/:id
```

### Create Concert (Admin/Organizer)
```http
POST /concerts
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Concert Name",
  "description": "Concert description",
  "category": "music",
  "genre": "pop",
  "start_time": "2024-06-15T19:00:00Z",
  "end_time": "2024-06-15T23:00:00Z",
  "venue": "<venue_id>",
  "artists": ["<artist_id>"],
  "thumbnail": "https://example.com/image.jpg",
  "status": "DRAFT",
  "policies": {
    "minAge": 18,
    "refundPolicy": "100% refund if cancelled 7 days before",
    "rules": ["No cameras", "No food/drinks"]
  }
}
```

### Update Concert (Admin/Organizer)
```http
PUT /concerts/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "status": "PUB"
}
```

### Delete Concert (Admin)
```http
DELETE /concerts/:id
Authorization: Bearer <token>
```

---

## 3. Artist Management API

### Get All Artists
```http
GET /artists?page=1&limit=20&search=artist
```

### Create Artist (Admin)
```http
POST /artists
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Artist Name",
  "bio": "Artist biography",
  "genre": ["pop", "rock"],
  "image": "https://example.com/artist.jpg",
  "social": {
    "facebook": "https://facebook.com/artist",
    "instagram": "https://instagram.com/artist"
  }
}
```

### Update Artist (Admin)
```http
PUT /artists/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "bio": "Updated bio"
}
```

### Delete Artist (Admin)
```http
DELETE /artists/:id
Authorization: Bearer <token>
```

---

## 4. Venue Management API

### Get All Venues
```http
GET /venues?page=1&limit=20&city=Hanoi
```

### Get Venue with Zones
```http
GET /venues/:id
```

Response includes venue details and all zones with seat counts.

### Create Venue (Admin)
```http
POST /venues
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "National Convention Center",
  "address": "123 Main Street",
  "city": "Hanoi",
  "total_capacity": 5000,
  "description": "Large venue for concerts",
  "facilities": ["Parking", "Food court", "VIP lounge"],
  "google_maps_url": "https://maps.google.com/...",
  "contact": {
    "phone": "0123456789",
    "email": "venue@example.com"
  }
}
```

### Update Venue (Admin)
```http
PUT /venues/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Venue Name",
  "total_capacity": 6000
}
```

### Delete Venue (Admin)
```http
DELETE /venues/:id
Authorization: Bearer <token>
```

---

## 5. Zone & Seat Management API

### Create Zone for Venue (Admin)
```http
POST /venues/:venueId/zones
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "VIP Section",
  "capacity": 100,
  "color": "#8B5CF6",
  "description": "Premium seating area"
}
```

### Update Zone (Admin)
```http
PUT /venues/:venueId/zones/:zoneId
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Zone Name",
  "color": "#3B82F6"
}
```

### Delete Zone (Admin)
```http
DELETE /venues/:venueId/zones/:zoneId
Authorization: Bearer <token>
```

### Generate Seats for Zone (Admin)
```http
POST /venues/:venueId/zones/:zoneId/generate-seats
Authorization: Bearer <token>
Content-Type: application/json

{
  "rows": 10,
  "seatsPerRow": 15,
  "startRow": "A"
}
```

### Get Zone Seats
```http
GET /venues/:venueId/zones/:zoneId/seats
```

Response:
```json
{
  "success": true,
  "data": {
    "zone": {...},
    "seatsByRow": {
      "A": [{...seat}, {...seat}],
      "B": [{...seat}, {...seat}]
    },
    "totalSeats": 150
  }
}
```

---

## 6. Ticket Class Management API

### Get Ticket Classes for Concert
```http
GET /ticket-classes?concert=<concertId>
Authorization: Bearer <token>
```

### Create Ticket Class (Admin/Organizer)
```http
POST /ticket-classes
Authorization: Bearer <token>
Content-Type: application/json

{
  "concert": "<concert_id>",
  "zone": "<zone_id>",
  "name": "VIP",
  "price": 2000000,
  "quota": 100,
  "open_time": "2024-05-01T00:00:00Z",
  "close_time": "2024-06-14T18:00:00Z",
  "open_time": "2024-05-01T00:00:00Z",
  "close_time": "2024-06-14T18:00:00Z"
}
```

### Update Ticket Class (Admin/Organizer)
```http
PUT /ticket-classes/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "price": 2500000,
  "quota": 150
}
```

### Delete Ticket Class (Admin)
```http
DELETE /ticket-classes/:id
Authorization: Bearer <token>
```

---

## 7. Order Management API

### Get All Orders (Admin)
```http
GET /orders/admin/all?page=1&limit=20&status=PAID&concert=<id>
Authorization: Bearer <token>
```

Query Parameters:
| Param | Type | Description |
|-------|------|-------------|
| page | number | Page number |
| limit | number | Items per page |
| status | string | PENDING, PAID, CANCELLED, REFUNDED, EXPIRED |
| concert | string | Filter by concert ID |
| customer | string | Filter by customer ID |
| startDate | date | Filter by date range start |
| endDate | date | Filter by date range end |

### Get Order by ID (Admin)
```http
GET /orders/:id
Authorization: Bearer <token>
```

### Get Order Statistics (Admin)
```http
GET /orders/admin/stats?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalOrders": 500,
      "totalRevenue": 1500000000,
      "avgOrderValue": 3000000
    },
    "byStatus": [...],
    "revenueByDay": [...],
    "topConcerts": [...]
  }
}
```

### Get Cancellation Requests (Admin)
```http
GET /orders/admin/cancellations?cancellationStatus=PENDING
Authorization: Bearer <token>
```

### Process Refund (Admin)
```http
PUT /orders/:id/refund
Authorization: Bearer <token>
Content-Type: application/json

{
  "approve": true,
  "refundAmount": 1500000,
  "adminNote": "Approved per policy"
}
```

---

## 8. Voucher Management API

### Get All Vouchers (Admin)
```http
GET /vouchers?page=1&limit=20&active=true
Authorization: Bearer <token>
```

### Create Voucher (Admin)
```http
POST /vouchers
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "SUMMER2024",
  "discount_percent": 15,
  "max_uses": 100,
  "min_order_amount": 500000,
  "max_discount_amount": 200000,
  "valid_from": "2024-06-01T00:00:00Z",
  "valid_to": "2024-08-31T23:59:59Z",
  "description": "Summer sale 15% off"
}
```

### Update Voucher (Admin)
```http
PUT /vouchers/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "discount_percent": 20,
  "active": true
}
```

### Delete Voucher (Admin)
```http
DELETE /vouchers/:id
Authorization: Bearer <token>
```

### Toggle Voucher Status (Admin)
```http
PUT /vouchers/:id/toggle
Authorization: Bearer <token>
```

---

## 9. Ticket / Check-in API

### Verify Ticket (Staff)
```http
POST /tickets/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "ticketCode": "TKT123ABC"
}
// OR
{
  "qrHash": "abc123hash..."
}
```

### Check-in Ticket (Staff)
```http
POST /tickets/:id/check-in
Authorization: Bearer <token>
```

### Check-in by QR (Staff)
```http
POST /tickets/check-in-qr
Authorization: Bearer <token>
Content-Type: application/json

{
  "qrHash": "abc123hash..."
}
```

### Get Check-in List (Staff/Admin)
```http
GET /tickets/concert/:concertId/check-in-list?status=pending&page=1
Authorization: Bearer <token>
```

---

## 10. Staff Management API

### Create Staff User (Admin)
```http
POST /users/staff
Authorization: Bearer <token>
Content-Type: application/json

{
  "username": "staff_john",
  "email": "staff@quickshow.com",
  "password": "Password123!",
  "fullName": "John Staff",
  "phone": "0123456789",
  "permissions": ["check_in", "view_attendees", "manage_guests"]
}
```

### Assign Events to Staff (Admin)
```http
POST /users/:staffId/assign-events
Authorization: Bearer <token>
Content-Type: application/json

{
  "eventIds": ["<concert_id_1>", "<concert_id_2>"]
}
```

---

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {...}
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": [...] // Optional validation errors
}
```

### Pagination Response
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5
    }
  }
}
```

---

## Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Server Error |

---

## Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@quickshow.com | Password123! |
| Organizer | organizer@quickshow.com | Password123! |
| Staff | staff@quickshow.com | Password123! |
| Customer | customer@quickshow.com | Password123! |

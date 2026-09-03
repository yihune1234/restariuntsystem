# Paperless Restaurant & Cafeteria Management System — Backend

> A production-ready, high-concurrency, multi-branch RESTful API and real-time Socket.IO backend for modern paperless restaurant operations.

---

## 1. System Overview

The **Paperless Restaurant & Cafeteria Management System** eliminates paper tickets, physical receipts, and manual cashier errors. It connects customers, cashiers, kitchen staff, waiters, managers, and restaurant owners through a centralized, event-driven backend.

### The Complete Business Workflow
```
Customer Scans Table QR Code
      │
      ▼
Create Customer Session (Table & Branch Identified)
      │
      ▼
Browse Hierarchical Menu (Meal Period → Category → Food)
      │
      ▼
Place Order (Prices & Stock Calculated Server-Side)
      │
      ├───────────────────────────────┬───────────────────────────────┐
      ▼                                                               ▼
1. Pay via Chapa Online (Telebirr/CBE/Cards)             2. Pay at Cashier (Cash/Card POS)
      │                                                               │
Server Verifies Webhook (Idempotent)                     Cashier Confirms Payment in App
      │                                                               │
      └───────────────────────────────┬───────────────────────────────┘
                                      │
                                      ▼
                        Payment Marked PAID (Transaction Session)
                        Order Marked CONFIRMED
                        Daily Stock Deducted Atomically (Race Condition Safe)
                        Audit Log Created
                        MongoDB Transaction Committed
                                      │
                                      ▼
                        Kitchen Display System (KDS) Receives Order in Real-Time
                                      │
                                      ▼
                        Kitchen Starts Cooking → Status: PREPARING
                                      │
                                      ▼
                        Kitchen Finishes Dish → Status: READY
                                      │
                                      ▼
                        Waiters Notified in Real-Time
                                      │
                                      ▼
                        Waiter Claims Food → Status: TAKEN_BY_WAITER
                                      │
                                      ▼
                        Waiter Serves Table → Status: DELIVERED → Status: COMPLETED
                                      │
                                      ▼
                        Customer Tracks Entire Lifecycle in Real-Time
```

---

## 2. Core Architectural Principles

- **Backend is the Source of Truth**: Food prices, order subtotals, tax rates, service charges, discounts, and final totals are calculated exclusively on the server from database snapshots. The frontend can never dictate prices or payment status.
- **Strict Multi-Branch Isolation**: Every branch document is partitioned by `branchId` and `organizationId`. Middleware enforces that managers and staff can only access their assigned branch.
- **ACID MongoDB Transactions**: Cashier confirmations, Chapa webhooks, stock deductions, and order cancellations run inside `mongoose.startSession()` transactions.
- **Atomic Concurrency Protection**: Stock quantities use atomic decrement operations (`$inc: { remainingQuantity: -qty }, remainingQuantity: { $gte: qty }`) preventing race conditions where two customers attempt to purchase the final item concurrently.
- **Kitchen Invariant**: Unpaid orders **never** enter the kitchen queue. Orders only enter when `paymentStatus = PAID` and `orderStatus = CONFIRMED`.
- **Post-Commit Event Emission**: Real-time Socket.IO events are emitted **only** after database transactions successfully commit.

---

## 3. Technology Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js (v18+) |
| **Web Framework** | Express.js |
| **Database & ODM** | MongoDB with Mongoose ODM |
| **Real-Time Engine** | Socket.IO (Authenticated namespaces and rooms) |
| **Authentication** | JWT Access & Refresh Token rotation + bcryptjs |
| **Validation** | Joi |
| **API Documentation** | Swagger / OpenAPI 3.0 via `swagger-ui-express` & `swagger-jsdoc` |
| **Image Storage** | Cloudinary CDN (via streaming memory buffers) |
| **Payment Gateway** | Chapa (Ethiopia Telebirr, CBEBirr, Cards) |
| **Logging** | Winston structured logging + Morgan HTTP stream |
| **Security** | Helmet, CORS whitelist, Express Rate Limit, Mongo query sanitization |
| **Testing** | Jest + Supertest |

---

## 4. User Roles & Permission Matrix

| Role | Permissions & Scoping |
|---|---|
| **OWNER** | Full cross-branch access, organization analytics, branch setup, staff management |
| **MANAGER** | Assigned to one branch: menu management, food pricing, image uploads, daily stock preparation, staff management, branch sales reports |
| **CASHIER** | Assigned to one branch: view unpaid orders, confirm cash/card payments, create walk-in orders |
| **KITCHEN** | Assigned to one branch: view confirmed & paid orders, start preparation, mark food ready |
| **WAITER** | Assigned to one branch: view ready orders, claim food for delivery, deliver food to table |
| **CUSTOMER** | Paperless QR access, temporary token-scoped session, real-time order tracking |

---

## 5. Directory Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── env.js                  # Joi-validated environment configuration
│   │   ├── database.js             # Mongoose connection & event lifecycle
│   │   ├── cloudinary.js           # Cloudinary SDK client
│   │   ├── chapa.js                # Chapa HTTP client & config
│   │   ├── socket.js               # Socket.IO instance manager
│   │   ├── swagger.js              # OpenAPI 3.0 JSDoc spec
│   │   ├── logger.js               # Winston structured logger
│   │   └── seed.js                 # Complete database demo seeder
│   │
│   ├── modules/
│   │   ├── auth/                   # Staff login, refresh tokens, logout, me, password change
│   │   ├── organizations/          # Organization settings, branches listing & creation
│   │   ├── branches/               # Multi-branch management & soft deletion
│   │   ├── users/                  # Staff users CRUD & RBAC
│   │   ├── tables/                 # Table management & secure QR token generation
│   │   ├── customer-sessions/      # QR Scan sessions with auto-expiring tokens
│   │   ├── menu/
│   │   │   ├── meal-period/        # Breakfast, Lunch, Dinner, All-Day
│   │   │   ├── category/           # Categories within Meal Periods
│   │   │   ├── food/               # Food items with price, availability & image refs
│   │   │   └── public-menu.controller.js # Public hierarchical menu tree
│   │   ├── uploads/                # Cloudinary image upload/delete handlers
│   │   ├── inventory/              # Daily stock preparation, atomic deduction & sold-out triggers
│   │   ├── orders/                 # Central order engine & finite state machine
│   │   ├── payments/               # Payment processing, Chapa webhook/verify, Cashier confirm
│   │   ├── kitchen/                # Kitchen queue, start preparing, mark ready
│   │   ├── waiter/                 # Ready orders queue, take order, mark delivered
│   │   ├── reports/                # Branch & Org analytics: sales, stock, velocity, cashier logs
│   │   ├── shifts/                 # Staff shifts & attendance tracking
│   │   └── audit/                  # Immutable audit logs for compliance & forensics
│   │
│   ├── middleware/
│   │   ├── auth.middleware.js      # JWT authentication (staff) & customer session auth
│   │   ├── role.middleware.js      # Role-based access control (RBAC)
│   │   ├── branch.middleware.js    # Multi-tenant branch isolation & ownership check
│   │   ├── validation.middleware.js# Joi schema validation for body, query, params
│   │   ├── upload.middleware.js    # Multer memory storage & MIME/size validation
│   │   ├── rate-limit.middleware.js# IP & endpoint rate limiting
│   │   ├── error.middleware.js     # Centralized error handler & formatting
│   │   └── not-found.middleware.js # 404 Route Not Found handler
│   │
│   ├── sockets/
│   │   ├── socket.server.js        # Socket.IO connection handling & role room joins
│   │   ├── socket.auth.js          # Socket handshake auth (JWT staff + sessionToken customer)
│   │   ├── rooms.js                # Room name constants
│   │   ├── events.js               # Event name constants
│   │   └── socket.emitter.js       # Safe emitter wrapper (called post-DB commit)
│   │
│   ├── utils/
│   │   ├── response.js             # Standardized ApiResponse helper
│   │   ├── errors.js               # Custom error classes (AppError, BadRequestError, etc.)
│   │   ├── pagination.js           # Reusable pagination parser & metadata builder
│   │   ├── order-number.js         # Atomic daily sequential order number generator
│   │   ├── security-code.js        # Cryptographically secure 4-digit code generator
│   │   ├── date.js                 # Business date formatting (YYYY-MM-DD) & timezone utils
│   │   └── async-handler.js        # Express async exception wrapper
│   │
│   ├── routes/
│   │   └── index.js                # Master v1 router aggregating all module routes
│   │
│   ├── app.js                      # Express application setup
│   └── server.js                   # HTTP server & Socket.IO initialization with graceful shutdown
│
├── tests/
│   ├── unit/                       # State machine, calculations, custom errors
│   ├── integration/                # Auth, Health, Full Order Flow lifecycle
│
├── Dockerfile                      # Multi-stage production container
├── docker-compose.yml              # Backend + MongoDB replica set container setup
├── package.json
└── README.md
```

---

## 6. Installation & Quick Start

### 1. Prerequisites
- Node.js >= 18.0.0
- MongoDB >= 6.0 (running locally or MongoDB Atlas)

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure `MONGODB_URI`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET` are configured.

### 4. Seed Database with Demo Restaurant Data
Populates a full restaurant organization, Bole & Piazza branches, demo staff accounts, tables with QR tokens, menu hierarchy, and daily stock:
```bash
node src/config/seed.js
```

### 5. Start Development Server
```bash
npm run dev
```

The server will start at `http://localhost:5000`.

---

## 7. Interactive API Documentation (Swagger)

Open your browser and navigate to:
```
http://localhost:5000/api-docs
```

All endpoints, headers (`Authorization: Bearer <token>`, `x-session-token`), request bodies, and responses can be tested interactively.

---

## 8. Seeded Demo Accounts (Password for all: `Password123!`)

| Role | Email | Branch Scope |
|---|---|---|
| **OWNER** | `owner@habesha.com` | All Branches |
| **MANAGER** | `manager.bole@habesha.com` | Bole Branch |
| **CASHIER** | `cashier.bole@habesha.com` | Bole Branch |
| **KITCHEN** | `kitchen.bole@habesha.com` | Bole Branch |
| **WAITER** | `waiter.bole@habesha.com` | Bole Branch |

**Sample Table 1 QR Token**: `demo_qr_token_bole_table_01`

---

## 9. Running Tests

Execute the automated unit and end-to-end integration test suites:
```bash
# Run all test suites
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration
```

---

## 10. Real-Time Socket.IO Channels

### Connection Handshake Authentication
Connect via Socket.IO client by passing credentials in the auth payload:
- **Staff Client**: `{ auth: { token: "Bearer <accessToken>" } }`
- **Customer Client**: `{ auth: { sessionToken: "<customerSessionToken>" } }`

### Role-Scoped Rooms
- `branch:{branchId}` — General branch announcements
- `branch:{branchId}:cashiers` — Unpaid orders awaiting payment confirmation
- `branch:{branchId}:kitchen` — Paid & confirmed orders for the kitchen queue
- `branch:{branchId}:waiters` — Ready food orders ready for delivery
- `branch:{branchId}:managers` — High-level operational events
- `order:{orderId}` — Specific order status tracking
- `customer-session:{sessionId}` — Customer session-specific updates

### Real-Time Event Types
- `order:payment-required` — Emitted to Cashiers when a new order is placed
- `order:confirmed` — Emitted to Kitchen when payment is confirmed
- `order:preparing` — Emitted when Kitchen starts preparation
- `order:ready` — Emitted to Waiters when food is ready for delivery
- `order:taken` — Emitted when Waiter takes order
- `order:delivered` — Emitted when order is delivered to table
- `food:sold-out` — Emitted when daily stock hits 0

---

## 11. Production Deployment & Docker

Run the entire backend stack with MongoDB replica set via Docker:
```bash
docker-compose up -d --build
```
Verify container health:
```bash
curl http://localhost:5000/api/v1/health
```

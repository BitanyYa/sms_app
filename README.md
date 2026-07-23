# SMS Warranty Notification App

An internal admin dashboard and external webhook endpoint for a mobile repair shop. When a warranty is registered either manually through the dashboard or automatically by an external warranty management system the customer receives an SMS confirmation with their warranty ID and service details.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Prerequisites](#prerequisites)
4. [Environment Variables](#environment-variables)
5. [Installation](#installation)
6. [Running Locally](#running-locally)
7. [API Endpoint Documentation](#api-endpoint-documentation)
8. [Deployment Instructions](#deployment-instructions)
9. [Integration Notes](#integration-notes)
10. [Folder Structure](#folder-structure)
11. [Troubleshooting](#troubleshooting)
12. [Future Improvements](#future-improvements)

---

## Project Overview

The app serves two audiences:

- **External warranty system**  posts warranty data to a webhook endpoint (`POST /api/warranty/send`). The app creates a customer/warranty record in the database, sends a bilingual (Amharic + English) SMS to the customer via AfroMessage, and logs the result.
- **Admin staff** — use a protected dashboard to view customers, warranties, and SMS logs. Failed messages can be retried manually.

Key behaviours:
- Duplicate detection: if a `warrantyId` has already been processed and an SMS was sent, the webhook returns a `200 duplicate` response instead of sending a second message.
- Soft-delete for SMS logs records are never physically removed, only flagged with a `deletedAt` timestamp.
- Cookie-based session auth (HS256 JWT, 7-day expiry) guards all dashboard routes and internal API endpoints.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Database | PostgreSQL (hosted on Supabase) |
| ORM | Prisma 7 |
| SMS provider | AfroMessage |
| Auth | Custom JWT via `jose`, `bcryptjs` |
| UI | React 19, Tailwind CSS 4, shadcn/ui |
| Forms | React Hook Form + Zod |
| Runtime | Node.js |

---

## Prerequisites

- Node.js 20 or later
- npm 10 or later (comes with Node 20)
- A PostgreSQL database (Supabase, Railway, or self-hosted)
- An [AfroMessage](https://afromessage.com) account with an API token, identifier, and sender name

---

## Environment Variables

Create a `.env` file in the `sms_app/` directory (next to `package.json`). The file is already present in the repo as a template — fill in your own values before running.

```env
# PostgreSQL connection string
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"

# AfroMessage credentials
AFROMESSAGE_TOKEN=<your-afromessage-bearer-token>
AFROMESSAGE_IDENTIFIER=<your-afromessage-sender-identifier-uuid>
AFROMESSAGE_SENDER=<your-sender-name>

# JWT secret — must be a long random string in production
# Generate one: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=<64-char-hex-string>

# API key used by the external warranty system to authenticate webhook calls
API_KEY=<random-hex-string>
```

> **Important:** Never commit real secrets to version control. Add `.env` to `.gitignore` (already done in this repo).

---

## Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd sms_app/sms_app

# 2. Install dependencies
npm install

# 3. Apply database migrations
npx prisma migrate deploy

# 4. (Optional) Seed the database with a default admin user
npm run seed
```

The seed script creates an initial admin user. Check `prisma/seed.ts` for the default credentials and change them immediately after first login.

---

## Running Locally

```bash
# Start the development server
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

- `/login` — admin login page
- `/dashboard` — main dashboard (requires authentication)

Other useful commands:

```bash
npm run build   # Production build
npm run start   # Start production server (after build)
npm run lint    # Run ESLint
npm run seed    # Re-run the database seed
```

To explore the database visually:

```bash
npx prisma studio
```

---

## API Endpoint Documentation

All responses follow the shape `{ success: boolean, data?: any, message?: string }`.

### Authentication

Session is stored in an `httpOnly` cookie named `admin_session`.

#### `POST /api/auth/login`

Authenticates an admin user and sets the session cookie.

**Auth required:** No

**Request body:**
```json
{
  "email": "admin@example.com",
  "password": "yourpassword"
}
```

**Responses:**
- `200` — success, cookie set, returns `{ id, name, email, role }`
- `401` — invalid credentials
- `400` — validation error

---

#### `POST /api/auth/logout`

Clears the session cookie.

**Auth required:** Yes (cookie)

**Responses:**
- `200` — `{ success: true }`

---

#### `GET /api/auth/me`

Returns the currently authenticated user's profile.

**Auth required:** Yes (cookie)

**Responses:**
- `200` — `{ id, name, email, role, createdAt, updatedAt }`
- `401` — not authenticated

---

### Dashboard

#### `GET /api/dashboard`

Returns summary statistics and the 10 most recent SMS logs.

**Auth required:** Yes (cookie)

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalSms": 120,
      "smsSent": 110,
      "smsFailed": 8,
      "smsPending": 2,
      "smsSentToday": 5
    },
    "recentSmsLogs": [ /* last 10 SmsLog records with warranty + customer */ ]
  }
}
```

---

### Customers

#### `GET /api/customers`

Lists all customers. Supports optional search.

**Auth required:** Yes (cookie)

**Query params:**
| Param | Type | Description |
|---|---|---|
| `search` | string | Filter by name or phone (case-insensitive) |

**Response:** Array of customers, each including warranty count and most recent warranty.

---

### Warranties

#### `GET /api/warranties`

Lists warranties with pagination.

**Auth required:** Yes (cookie)

**Query params:**
| Param | Type | Default | Description |
|---|---|---|---|
| `search` | string | — | Filter by customer name, phone, brand, model, or IMEI |
| `page` | number | `1` | Page number (20 per page) |

**Response:**
```json
{
  "success": true,
  "data": [ /* warranty records */ ],
  "meta": { "total": 100, "page": 1, "limit": 20 }
}
```

---

#### `POST /api/warranties`

Creates a new warranty manually. Upserts the customer by phone number.

**Auth required:** Yes (cookie)

**Request body:**
```json
{
  "customerName": "Abebe Kebede",
  "customerPhone": "0912345678",
  "customerEmail": "abebe@example.com",
  "brand": "Samsung",
  "model": "Galaxy A56",
  "imei": "356789123456789",
  "warrantyPeriod": "2 Years",
  "workItem": "Hardware & Software Warranty"
}
```

**Responses:**
- `201` — warranty created, returns warranty with customer
- `400` — validation error
- `401` — unauthorized

---

#### `GET /api/warranties/[id]`

Returns a single warranty by ID.

**Auth required:** Yes (cookie)

---

#### `PATCH /api/warranties/[id]`

Updates an existing warranty.

**Auth required:** Yes (cookie)

---

### SMS Logs

#### `GET /api/sms`

Lists SMS logs with filtering and pagination.

**Auth required:** Yes (cookie)

**Query params:**
| Param | Type | Default | Description |
|---|---|---|---|
| `search` | string | — | Text to search |
| `searchBy` | `all` \| `name` \| `phone` \| `imei` \| `product` \| `warrantyId` | `all` | Field to search in |
| `status` | `ALL` \| `SENT` \| `FAILED` \| `PENDING` | `ALL` | Filter by SMS status |
| `page` | number | `1` | Page number (20 per page) |

**Response:**
```json
{
  "success": true,
  "data": [ /* SmsLog records with warranty + customer */ ],
  "pagination": { "page": 1, "pageSize": 20, "total": 80, "totalPages": 4 }
}
```

---

#### `GET /api/sms/[id]`

Returns a single SMS log.

**Auth required:** Yes (cookie)

---

#### `DELETE /api/sms/[id]`

Soft-deletes an SMS log (sets `deletedAt`). Admin role required.

**Auth required:** Yes (cookie, ADMIN role only)

---

#### `POST /api/sms/[id]/retry`

Retries sending an SMS for a log with `status: FAILED`. Updates the log record in place.

**Auth required:** Yes (cookie)

**Responses:**
- `200` — updated log record
- `400` — log is not in FAILED state
- `404` — log not found

---

#### `GET /api/sms/[id]/status`

Returns the current status of a specific SMS log.

**Auth required:** Yes (cookie)

---

### Settings

#### `PATCH /api/settings/profile`

Updates the authenticated user's name and/or email.

**Auth required:** Yes (cookie)

**Request body:**
```json
{
  "name": "New Name",
  "email": "new@example.com"
}
```

---

#### `PATCH /api/settings/password`

Changes the authenticated user's password.

**Auth required:** Yes (cookie)

**Request body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123",
  "confirmPassword": "newpassword123"
}
```

---

### Warranty Webhook (External Integration)

#### `POST /api/warranty/send`

The primary integration endpoint. Called by an external warranty management system when a new warranty is registered. Does not use cookie auth — uses an API key header instead.

**Auth:** `x-api-key` header must match the `API_KEY` environment variable.

**Request body:**
```json
{
  "warrantyId":     "482913",
  "name":           "Abebe Kebede",
  "phone":          "0912345678",
  "brand":          "Samsung",
  "model":          "Galaxy A56",
  "imei":           "356789123456789",
  "warrantyPeriod": "2 Years",
  "workItem":       "Hardware & Software Warranty"
}
```

**Responses:**

| Status | Meaning |
|---|---|
| `201` | Warranty registered and SMS sent (or attempted) |
| `200` with `"duplicate": true` | `warrantyId` already processed — no second SMS sent |
| `400` | Request body failed validation |
| `401` | Missing or invalid `x-api-key` |
| `500` | Internal error |

**201 response example:**
```json
{
  "success": true,
  "message": "Warranty registered",
  "data": {
    "warranty": { /* Warranty record */ },
    "smsLog":   { /* SmsLog record */ }
  }
}
```

---

## Deployment Instructions

The app is a standard Next.js application and can be deployed on any platform that supports Node.js.

### Vercel (recommended)

1. Push the repository to GitHub/GitLab.
2. Import the project in [vercel.com](https://vercel.com). Set the **root directory** to `sms_app`.
3. Add all environment variables from the [Environment Variables](#environment-variables) section in the Vercel project settings.
4. Deploy. Vercel will run `next build` automatically.
5. Run the migration against the production database once before going live:
   ```bash
   DATABASE_URL="<prod-url>" npx prisma migrate deploy
   ```

### Other platforms (Railway, Render, VPS)

```bash
# Build
npm run build

# Start
npm run start
```

Set all environment variables on the platform before starting. Make sure `DATABASE_URL` points to the production database and run `npx prisma migrate deploy` on first deploy.

---

## Integration Notes

### AfroMessage

- **Endpoint:** `POST https://api.afromessage.com/api/send`
- **Auth:** Bearer token (`AFROMESSAGE_TOKEN`)
- **Sender identification:** Uses both `from` (the identifier UUID) and `sender` (display name) fields.
- **Error handling:** The AfroMessage API can return HTTP 200 with an error body. The `lib/afromessage.ts` wrapper checks `acknowledge === "error"`, `response.errors.length > 0`, and `status === "error"` to catch this case.
- If SMS sending fails, the warranty record is still created and a `SmsLog` with `status: FAILED` is saved. The admin can retry from the SMS dashboard.

### External Warranty System

- The external system must call `POST /api/warranty/send` with the `x-api-key` header.
- Deduplication is keyed on `warrantyId` (the external system's ID), not IMEI. The same device can be re-registered under a new warranty without being blocked.
- The endpoint is idempotent for the same `warrantyId` — safe to retry on network failures.

---

## Folder Structure

```
sms_app/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/        # POST /api/auth/login
│   │   │   ├── logout/       # POST /api/auth/logout
│   │   │   └── me/           # GET  /api/auth/me
│   │   ├── customers/        # GET  /api/customers
│   │   │   └── [id]/         # GET/PATCH/DELETE /api/customers/:id
│   │   ├── dashboard/        # GET  /api/dashboard
│   │   ├── settings/
│   │   │   ├── profile/      # PATCH /api/settings/profile
│   │   │   └── password/     # PATCH /api/settings/password
│   │   ├── sms/              # GET  /api/sms
│   │   │   └── [id]/
│   │   │       ├── retry/    # POST /api/sms/:id/retry
│   │   │       └── status/   # GET  /api/sms/:id/status
│   │   ├── warranties/       # GET/POST /api/warranties
│   │   │   └── [id]/         # GET/PATCH/DELETE /api/warranties/:id
│   │   └── warranty/
│   │       └── send/         # POST /api/warranty/send  ← webhook
│   ├── dashboard/
│   │   ├── customers/        # Customers list page
│   │   ├── settings/         # Profile & password settings
│   │   ├── sms/              # SMS logs page
│   │   ├── warranties/       # Warranties list page
│   │   ├── layout.tsx        # Dashboard shell (sidebar + header)
│   │   └── page.tsx          # Dashboard home / stats
│   ├── login/                # Login page
│   ├── types/                # Shared TypeScript types
│   ├── globals.css
│   └── layout.tsx            # Root layout
├── components/
│   ├── layout/
│   │   ├── header.tsx
│   │   └── sidebar.tsx
│   └── ui/                   # shadcn/ui components
├── lib/
│   ├── afromessage.ts        # SMS send helper
│   ├── auth.ts               # JWT sign/verify, session cookie helpers
│   ├── prisma.ts             # Prisma client singleton
│   └── utils.ts              # Shared utilities (cn, etc.)
├── prisma/
│   ├── migrations/           # SQL migration history
│   ├── schema.prisma         # Database schema
│   ├── seed.ts               # Default admin user seed
│   ├── check-login.ts        # Dev utility — test a login from CLI
│   └── reset-password.ts     # Dev utility — reset a password from CLI
├── middleware.ts             # Route protection (redirects unauthenticated users)
├── next.config.ts
├── package.json
└── .env                      # Local environment variables (not committed)
```

---

## Troubleshooting

**SMS is not being sent**
- Check that `AFROMESSAGE_TOKEN`, `AFROMESSAGE_IDENTIFIER`, and `AFROMESSAGE_SENDER` are set correctly.
- Look at server logs for `[AfroMessage]` prefixed lines — the wrapper logs both the HTTP status and the full response body.
- If the SMS log shows `FAILED`, use the retry button in the SMS dashboard or call `POST /api/sms/:id/retry`.

**Webhook returns 401**
- Confirm that the `x-api-key` header sent by the external system matches the `API_KEY` env var exactly.

**"Warranty already processed" response (duplicate: true)**
- The `warrantyId` in the request matches an existing record that already has an SMS log. This is by design. If a new SMS must be sent for the same `warrantyId`, delete the existing SMS log via the admin dashboard first, or use the retry endpoint.

**Database migration errors**
- Run `npx prisma migrate status` to see which migrations are pending.
- Run `npx prisma migrate deploy` to apply them.
- If schema and database are out of sync in development, `npx prisma db push` can force-sync without creating a migration file.

**Login redirects in a loop**
- Clear browser cookies and try again.
- Check that `JWT_SECRET` is set and is at least 32 characters.

**Build fails with type errors**
- Run `npx tsc --noEmit` to see all type errors before building.
- Regenerate the Prisma client after schema changes: `npx prisma generate`.

---

## Future Improvements

- **Role-based access control** — currently all authenticated users share the same permissions. A `USER` role exists in the schema but is not enforced in the dashboard UI yet.
- **SMS templates** — allow admins to customise the message content from the dashboard instead of editing source code.
- **Webhook event log** — record all inbound webhook calls (including failures) for auditability.
- **Pagination on customers page** — the customers endpoint currently returns all records; large datasets will need server-side pagination.
- **Email notifications** — send a confirmation email in addition to SMS where a customer email is available.
- **Metrics / charts** — add time-series charts to the dashboard for SMS volume trends.
- **Multi-tenant support** — support multiple shops/branches under one deployment.
- **Automated tests** — add unit tests for the AfroMessage wrapper and integration tests for the webhook endpoint.
- **Rate limiting** — add rate limiting to the webhook and auth endpoints to prevent abuse.
- **Two-factor authentication** — add 2FA for admin accounts to improve security.

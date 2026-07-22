# Yonas Mobile — SMS Warranty System

A Next.js admin dashboard for managing customer warranties and automated SMS notifications via [AfroMessage](https://afromessage.com).

---

## Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** PostgreSQL via Supabase + Prisma ORM
- **SMS Provider:** AfroMessage
- **Auth:** JWT (jose) — cookie-based session
- **UI:** Tailwind CSS v4 + shadcn/ui components

---

## Prerequisites

- Node.js 20+
- A PostgreSQL database (Supabase or self-hosted)
- An AfroMessage account with a sender ID and API token

---

## Environment Variables

Create a `.env` file in the project root with the following keys:

```env
# Database
DATABASE_URL="postgresql://..."

# Auth
JWT_SECRET="<64-byte random hex — run: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\">"

# AfroMessage
AFROMESSAGE_TOKEN="<bearer token>"
AFROMESSAGE_IDENTIFIER="<identifier id>"
AFROMESSAGE_SENDER="<sender name>"

# External webhook auth
API_KEY="<strong random key>"
```

---

## Getting Started

```bash
# Install dependencies
npm install

# Push schema to database and generate Prisma client
npx prisma migrate deploy
npx prisma generate

# Seed the initial admin user
npm run seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/dashboard` and prompted to log in.

Default seed credentials:
- **Email:** admin@yonasmobile.com
- **Password:** admin123456

> Change the password immediately after first login via Settings → Change Password.

---

## Production Deployment

```bash
npm run build
npm run start
```

Ensure all environment variables are set in your hosting environment. The `.env` file must **not** be committed — it is git-ignored by default.

---

## Project Structure

```
app/
  api/              # API routes (auth, customers, sms, warranties, settings)
  dashboard/        # Admin UI pages (dashboard, customers, sms, warranties, settings)
  login/            # Login page
  layout.tsx        # Root layout with font and toaster setup
  page.tsx          # Root redirect → /dashboard
components/
  layout/           # Header and sidebar
  ui/               # shadcn/ui primitives (button, card, dialog, etc.)
lib/
  auth.ts           # JWT sign/verify + session cookie helpers
  afromessage.ts    # AfroMessage SMS API wrapper
  prisma.ts         # Prisma client singleton
  utils.ts          # Tailwind cn() utility
middleware.ts       # Route protection — redirects unauthenticated users from /dashboard
prisma/
  schema.prisma     # Database schema (User, Customer, Warranty, SmsLog)
  seed.ts           # Seeds initial admin user
```

---

## External Webhook

The endpoint `POST /api/warranty/send` is called by the external warranty registration software. It is authenticated via the `x-api-key` header (value must match the `API_KEY` env var), not the browser session cookie.

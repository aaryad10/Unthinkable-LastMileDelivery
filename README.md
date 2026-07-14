# Last-Mile Delivery Tracker

A full-stack delivery management platform with role-based access for **Customers**, **Delivery Agents**, and **Admins**. Supports auto-calculated shipping charges, zone-based agent assignment, immutable order tracking, and email notifications on every status change.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| Database | SQLite (via `better-sqlite3`) |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` password hashing |
| Email | Nodemailer (SMTP), console-log fallback if unconfigured |

## Project Structure

```
LastMileDeli/
├── Backend/
│   ├── db/
│   │   ├── schema.sql        # Table definitions
│   │   ├── connect.js        # SQLite connection + schema bootstrap
│   │   └── seed.js           # Seed data: zones, rate cards, users, sample orders
│   ├── middleware/
│   │   └── auth.js           # JWT verification + role gating
│   ├── routes/
│   │   ├── auth.js           # register / login / me
│   │   ├── orders.js         # quote / create / list / assign / status / reschedule
│   │   └── admin.js          # zones / rate cards / agents / customers
│   ├── services/
│   │   ├── rateEngine.js     # Charge calculation
│   │   ├── assignmentEngine.js  # Agent auto-assignment
│   │   └── emailService.js   # Status-change emails
│   └── server.js
└── Frontend/
    └── src/
        ├── views/             # AuthView, CustomerView, AgentView, AdminView
        ├── components/        # OrderCard, StatusBadge, Timeline, NavigationLayout
        ├── context/AppContext.tsx
        └── api.ts             # API client
```

## Setup Guide

### Prerequisites
- Node.js 18+
- npm

### 1. Backend

```bash
cd Backend
npm install
cp .env.example .env
```

Edit `.env`:

```env
JWT_SECRET=replace-with-a-long-random-string
PORT=5000

# Optional — omit to fall back to console-logged emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_FROM=your-email@gmail.com
```

> **Note:** `SMTP_PASS` must be a [Gmail App Password](https://myaccount.google.com/apppasswords), not your regular Gmail password (requires 2FA enabled on the account).

Seed the database (creates tables + sample zones, rate cards, users, and orders):

```bash
npm run seed
```

Start the server:

```bash
npm run dev
```

API runs at `http://localhost:5000`.

**Seeded login credentials:**

| Role | Email | Password |
|---|---|---|
| Admin | admin@gmail.com | Admin@123 |
| Customer | customer@gmail.com | Customer@123 |
| Agent (×5) | agent1@gmail.com … agent5@gmail.com | Agent1 … Agent5 |

### 2. Frontend

```bash
cd Frontend
npm install
cp .env.example .env
```

Edit `.env`:

```env
VITE_API_URL=http://localhost:5000
```

Start the dev server:

```bash
npm run dev
```

Frontend runs at `http://localhost:3000`.

## Database Schema

| Table | Purpose |
|---|---|
| `users` | All accounts — `role` is `customer` / `agent` / `admin`, enforced by DB `CHECK` |
| `zones` | Named delivery zones (e.g. "Kothrud-Bawdhan & Warje-Karvenagar") |
| `zone_areas` | Maps a pincode to exactly one zone (`UNIQUE` on pincode) |
| `rate_cards` | Rate per kg, keyed by `(route_type, order_type)` — i.e. intra/inter-zone × B2B/B2C |
| `cod_surcharge` | Flat COD surcharge, keyed by `order_type` |
| `agents` | Links a `user` (role=agent) to a home `zone` and an `availability` state (`available`/`busy`/`offline`) |
| `orders` | Full order record — addresses, dimensions, computed weights, computed charge, current `status`, assigned agent |
| `order_status_history` | **Append-only** log — every status change is a new row with `status`, `actor_user_id`, `actor_label`, and `timestamp`. Never updated or deleted, so it forms an immutable audit trail per order. |

All foreign keys are enforced (`PRAGMA foreign_keys = ON`), and every enum-like field (`role`, `route_type`, `order_type`, `payment_type`, `status`, `availability`) is constrained with a SQL `CHECK` clause — invalid values are rejected at the database layer, not just in application code.

## Rate Calculation Logic

Given a package's dimensions, weight, pickup/drop pincodes, order type, and payment type, the engine (`services/rateEngine.js`) computes the charge in five steps:

1. **Zone detection** — look up each pincode's zone via `zone_areas`. If either pincode isn't mapped to a zone, the request fails with a `ZONE_NOT_FOUND` error telling the admin to map it first.
2. **Route type** — `intra_zone` if pickup and drop zones match, otherwise `inter_zone`.
3. **Volumetric weight** — `(Length × Breadth × Height in cm) / 5000`.
4. **Chargeable weight** — `max(actual weight, volumetric weight)`.
5. **Rate lookup + surcharge** — the rate is read live from `rate_cards` for the `(route_type, order_type)` pair (never hardcoded), and a COD surcharge from `cod_surcharge` is added if `payment_type = COD`.

Final charge = `chargeable_weight × rate_per_kg + COD_surcharge` (rounded to 2 decimals).

This logic is exposed standalone via `POST /orders/quote` so the frontend can show the price **before** the customer confirms, without creating an order.

## API Reference

All endpoints except `/auth/register` and `/auth/login` require `Authorization: Bearer <token>`.

### Auth
| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Registers a new customer account |
| POST | `/auth/login` | Public | Returns JWT + user object |
| GET | `/auth/me` | Any authenticated user | Returns the current user from the token |

### Orders
| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/orders/quote` | Customer, Admin | Calculates charge without creating an order |
| POST | `/orders` | Customer, Admin | Creates an order (admin may pass `customerId` to create on a customer's behalf) |
| GET | `/orders` | Any (role-scoped) | Lists orders — customers see their own, agents see assigned, admins see all. Supports `?status=&zoneId=&agentId=` filters |
| GET | `/orders/:id` | Any (access-checked) | Full order detail + timeline |
| PATCH | `/orders/:id/assign` | Admin | Body `{ agentId }` for manual assignment, or `{ auto: true }` for auto-assignment |
| PATCH | `/orders/:id/status` | Agent (own orders), Admin (any) | Updates status, logs history, emails customer, releases agent on terminal states |
| POST | `/orders/:id/reschedule` | Customer | Reschedules a `Failed` order, reassigns an agent |

### Admin
| Method | Path | Description |
|---|---|---|
| GET | `/admin/customers` | List all customers |
| GET / POST | `/admin/zones` | List / create zones |
| POST | `/admin/zones/:id/areas` | Map a pincode to a zone |
| GET | `/admin/rate-cards` | View rate cards + COD surcharge |
| PUT | `/admin/rate-cards` | Update a rate (`routeType`, `orderType`, `ratePerKg`) |
| PUT | `/admin/cod-surcharge` | Update COD surcharge for an order type |
| GET | `/admin/agents` | List agents with zone + availability |
| PATCH | `/admin/agents/:id` | Update an agent's zone or availability |

## Known Limitations

- Auto-assignment uses the agent's home **zone** as a proxy for "nearest" — there is no live GPS/lat-long distance tracking of agents.
- Status transitions are not sequence-validated (an admin/agent can set any valid status regardless of current state); this is intentional to allow admin overrides but means the agent-side flow has no client-side guardrail against skipping steps.
- SMS notifications are not yet implemented — only email.
- SQLite is file-based; for production deployment on serverless hosts (Vercel), a persistent-disk host (Render/Railway) or a migration to Postgres is required.
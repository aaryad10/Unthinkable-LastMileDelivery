# Last-Mile Delivery Tracker

A full-stack delivery management platform with role-based access for **Customers**, **Delivery Agents**, and **Admins**. Supports auto-calculated shipping charges, zone-based agent assignment, immutable order tracking, and email + SMS notifications on every status change.

## 🔗 Live Links

| | |
|---|---|
| **Frontend (app)** | [unthinkable-last-mile-delivery.vercel.app](https://unthinkable-last-mile-delivery.vercel.app/) |
| **Backend (API health check)** | [unthinkable-lastmiledelivery.onrender.com](https://unthinkable-lastmiledelivery.onrender.com/) |

> ⚠️ **Cold starts:** the backend is hosted on Render's free tier, which spins the server down after ~15 minutes of inactivity. If the app has been idle, the **first request can take 30–60 seconds** while the server wakes up — login or the first data fetch may look stuck or slow. Subsequent requests are fast. This is a hosting-tier limitation, not an application bug.

## 📸 Screenshots

<!-- Replace each placeholder below with an actual screenshot. Recommended: PNG, ~1280px wide. -->

### Auth
| Login | Register |
|---|---|
| ![Login screen](<img width="567" height="882" alt="image" src="https://github.com/user-attachments/assets/4e2093a6-7593-4a2a-96ce-c8227d143638" />) | ![Register screen](<img width="572" height="851" alt="image" src="https://github.com/user-attachments/assets/cd621653-2fc1-485b-a030-4086547c9a67" />) |

### Customer
| Book an order (quote preview) | Order tracking timeline |
|---|---|
| ![Customer booking flow](<img width="1912" height="903" alt="image" src="https://github.com/user-attachments/assets/572fdd3e-f6e2-49ef-8a03-7425a964a3de" />) | ![Order tracking timeline](<img width="1918" height="908" alt="image" src="https://github.com/user-attachments/assets/c662b758-66d4-4986-a3e1-3ed838f97bf1" />) |

### Delivery Agent
| Assigned orders | Update status |
|---|---|
| ![Agent order list](<img width="1918" height="896" alt="image" src="https://github.com/user-attachments/assets/65dd1a31-66a2-4a6e-a6e1-b46fa8635e66" />) | ![Agent status update](<img width="1918" height="906" alt="image" src="https://github.com/user-attachments/assets/b6a49fe3-dd38-4a11-a5dd-12f444f52505" />) |

### Admin
| Dashboard | Create order on behalf of customer |
|---|---|
| ![Admin dashboard](<img width="1918" height="908" alt="image" src="https://github.com/user-attachments/assets/560632fb-75c8-4db7-b722-5868ea3438a5" />) | ![Admin dispatch form](<img width="1918" height="902" alt="image" src="https://github.com/user-attachments/assets/183df5d4-bdc0-45ea-ba2b-49a47b7ef3af" />) |

| Zones & rate cards | Agent roster |
|---|---|
| ![Zones and rate cards](<img width="1918" height="906" alt="image" src="https://github.com/user-attachments/assets/a61209e9-0da6-4eb4-b33a-eca5f862eff2" />) | ![Agent roster](<img width="1918" height="905" alt="image" src="https://github.com/user-attachments/assets/0bc51cc2-ebb9-46ff-aeb4-d9392c27fdd4" />) |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| Database | SQLite (via `better-sqlite3`) |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` password hashing |
| Email | Nodemailer (SMTP), console-log fallback if unconfigured |
| SMS | Free-tier SMS provider integration, console-log fallback if unconfigured |
| Hosting | Vercel (frontend), Render (backend) |

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
│   │   ├── rateEngine.js         # Charge calculation
│   │   ├── assignmentEngine.js   # Agent auto-assignment
│   │   ├── emailService.js       # Status-change emails
│   │   └── smsService.js         # Status-change SMS
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

# Optional — omit to fall back to console-logged SMS
SMS_API_KEY=your-sms-provider-key
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

## Order Status Lifecycle

Status moves through a fixed state machine (`services`/`routes/orders.js`):

```
Created → Picked Up → In Transit → Out for Delivery → Delivered
                                                      ↘ Failed → (reschedule) → Picked Up
```

Agents can only move an order to the next allowed status — skipping steps or moving backward is rejected. Admins can override any order to any status regardless of the current state. Every transition — agent-driven or admin override — is appended to `order_status_history` and never edited or deleted, forming a full immutable audit trail per order.

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
| PATCH | `/orders/:id/status` | Agent (own orders, sequence-enforced), Admin (any, override) | Updates status, logs history, emails + SMSes customer, releases agent on terminal states |
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
| POST | `/admin/agents` | Onboard a new delivery agent |
| PATCH | `/admin/agents/:id` | Update an agent's zone or availability |

## Known Limitations

- Auto-assignment uses the agent's home **zone** as a proxy for "nearest" — there is no live GPS/lat-long distance tracking of agents as of now.
- Auth trusts the role embedded in the JWT for the life of the token rather than re-checking the user's current role in the database on every request.
- `GET /orders` returns the full result set for the caller's scope with no pagination — fine at current data volumes, but would need `?page=&limit=` for a larger dataset.
- SQLite is file-based; the Render free-tier disk is ephemeral on redeploys, so seeded/demo data may reset when the backend service is redeployed. A persistent-disk plan or a migration to Postgres would be needed for durable production data.

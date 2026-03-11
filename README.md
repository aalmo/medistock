# MediStock 💊

A production-ready web application for monitoring patients' medication schedules and inventory.  
Built with **Next.js 14**, **Prisma ORM**, **SQLite** (dev) / **PostgreSQL** (prod), and **Tailwind CSS**.

> ⚕️ **Medical Disclaimer** — MediStock is a medication **tracking tool only**, not a substitute for medical advice. Always consult a qualified healthcare professional before making any changes to medication regimens.

---

## 📋 Table of Contents

1. [Features](#-features)
2. [Tech Stack](#-tech-stack)
3. [Prerequisites](#-prerequisites)
4. [Installation](#-installation)
5. [Environment Variables](#-environment-variables)
6. [Database Setup](#-database-setup)
7. [Running in Development](#-running-in-development)
8. [Running in Production](#-running-in-production)
9. [Drug Database Configuration](#-drug-database-configuration)
10. [Email Alerts (SMTP)](#-email-alerts-smtp)
11. [Internationalisation](#-internationalisation)
12. [Project Structure](#-project-structure)
13. [Data Model](#-data-model)
14. [Available Scripts](#-available-scripts)
15. [Background Jobs (Cron)](#-background-jobs-cron)
16. [Deployment (Vercel)](#-deployment-vercel)
17. [Core Algorithms](#-core-algorithms)
18. [Known Issues & Fixes](#-known-issues--fixes)
19. [License](#-license)

---

## ✨ Features

- **Patient Management** — Add, edit, remove patients with demographics; per-patient KPI dashboard
- **Medication Tracking** — Auto-fill from RxNorm/OpenFDA (US) or ChEMBL/EMBL-EBI (EU); supports pills, tablets, inhalations, mL, drops, patches, injections
- **Schedule & Dose Logging** — Flexible regimens (once daily → QID), per-day-of-week, fractional doses, weekly calendar view
- **Inventory** — Real-time stock tracking, days-remaining estimate, low-stock threshold alerts
- **Auto-Complete** — Un-logged doses auto-marked TAKEN at midnight; stock decremented automatically
- **Dashboard** — Floating KPI cards, animated progress ring, 7-day adherence area chart, inventory donut charts
- **Notifications** — In-app notification centre with unread badge; 30-min dose reminders; low-stock alerts
- **Email Alerts** — HTML emails via SMTP (Strato, Gmail, Mailgun, etc.) with per-patient medication summaries
- **Multi-language** — English 🇬🇧 · Deutsch 🇩🇪 · العربية 🇾🇪 (RTL supported)
- **Settings** — Timezone, alert thresholds, email preferences, drug database selector (US / EU)

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 + Radix UI primitives |
| Database (dev) | SQLite via Prisma 5 |
| Database (prod) | PostgreSQL (Neon / Supabase / Railway) |
| Auth | NextAuth v4 — credentials provider |
| Charts | Recharts 2 |
| Icons | Lucide React |
| Drug API — US | RxNorm (NLM) + OpenFDA — no key required |
| Drug API — EU | ChEMBL REST API (EMBL-EBI) — no key required |
| Date utilities | date-fns 4 |
| Email | Nodemailer (SMTP — any provider) |

---

## ✅ Prerequisites

| Tool | Minimum version | Check |
|---|---|---|
| Node.js | **18.x** | `node -v` |
| npm | **9.x** | `npm -v` |
| Git | any | `git --version` |

> **macOS / Linux** — no additional setup needed.  
> **Windows** — use WSL 2 or Git Bash for the shell commands below.

---

## 📦 Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-org/medistock.git
cd medistock
```

### 2. Install dependencies

```bash
npm install --legacy-peer-deps
```

> `--legacy-peer-deps` is required because some Radix UI packages declare peer-dependency ranges that conflict with React 18's exact version pins. This flag is safe and well-understood.

---

## 🔐 Environment Variables

Create **two** files in the project root:

### `.env` — used by the Prisma CLI only

```dotenv
DATABASE_URL="file:./prisma/prisma/dev.db"
```

### `.env.local` — used by Next.js at runtime

```dotenv
# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL="file:./prisma/prisma/dev.db"   # SQLite for local dev
# DATABASE_URL="postgresql://user:pass@host/dbname?sslmode=require"  # ← prod

# ── NextAuth ──────────────────────────────────────────────────────────────────
NEXTAUTH_URL="http://localhost:3000"          # change to your prod URL in production
NEXTAUTH_SECRET="replace-with-random-string" # generate: openssl rand -base64 32

# ── Cron jobs ─────────────────────────────────────────────────────────────────
CRON_SECRET="replace-with-random-string"     # protects /api/cron/* endpoints

# ── Email (SMTP) — optional, see "Email Alerts" section ───────────────────────
SMTP_HOST="smtp.strato.de"
SMTP_PORT="587"
SMTP_USER="you@yourdomain.com"
SMTP_PASS="yourpassword"
EMAIL_FROM="MediStock <noreply@yourdomain.com>"
```

> If `SMTP_*` variables are **not set**, email features silently fall back to **Ethereal** (a test inbox). A preview URL is printed in the terminal console — no emails actually leave your machine.

Generate a secure secret with:

```bash
openssl rand -base64 32
```

---

## 🗄 Database Setup

### Development (SQLite — default)

```bash
# 1. Push the schema to the local SQLite file (creates tables)
npx prisma db push

# 2. (Optional) Seed demo data — adds sample patients, medications & schedules
npm run db:seed

# 3. (Optional) Open the visual database browser
npx prisma studio        # → http://localhost:5555
```

### Production (PostgreSQL)

1. Provision a PostgreSQL database (e.g. [Neon](https://neon.tech), [Supabase](https://supabase.com), [Railway](https://railway.app) — all have free tiers).
2. Update `prisma/schema.prisma`:

```diff
 datasource db {
-  provider = "sqlite"
+  provider = "postgresql"
   url      = env("DATABASE_URL")
 }
```

3. Set `DATABASE_URL` in your hosting environment to the PostgreSQL connection string.
4. Run the migration:

```bash
npx prisma migrate deploy
```

---

## 💻 Running in Development

```bash
npm run dev
```

- Opens at **http://localhost:3000**
- Hot-reload enabled — changes are reflected instantly
- Uses local SQLite database at `prisma/prisma/dev.db`
- SMTP falls back to Ethereal if env vars are not set

**Demo login** (after seeding):

| Field | Value |
|---|---|
| Email | `demo@medistock.app` |
| Password | `demo1234` |

---

## 🚀 Running in Production

### Step-by-step

```bash
# 1. Install dependencies (if not already done)
npm install --legacy-peer-deps

# 2. Generate the Prisma client
npx prisma generate

# 3. Build the Next.js application
npm run build

# 4. Start the production server
npm run start
```

The production server listens on **port 3000** by default.  
To use a different port:

```bash
npm run start -- -p 8080
```

### Environment checklist before going live

- [ ] `DATABASE_URL` points to a **PostgreSQL** instance (SQLite is not recommended in production)
- [ ] `NEXTAUTH_URL` is set to your **public HTTPS URL** (e.g. `https://medistock.yourdomain.com`)
- [ ] `NEXTAUTH_SECRET` is a **random 32-byte base64 string** (`openssl rand -base64 32`)
- [ ] `CRON_SECRET` is a **random string** — used to authenticate cron job requests
- [ ] SMTP variables are configured if you want email alerts
- [ ] Schema is migrated: `npx prisma migrate deploy`

---

## 💊 Drug Database Configuration

MediStock supports two drug databases, switchable per-user in **Settings → Drug Database**:

| Option | Source | Coverage | API Key |
|---|---|---|---|
| 🇺🇸 **US Database** | RxNorm (NLM) + OpenFDA | US brand & generic drugs | None required |
| 🇪🇺 **EU Database** | ChEMBL (EMBL-EBI) | European INN & brand names + ATC codes | None required |

The selected database is stored per user in the database (`drugDatabase` field on `User`).  
You can also toggle per-search using the **US / EU** badge in the medication search box.

Both APIs are **completely free** and require no registration or API key.

---

## 📧 Email Alerts (SMTP)

MediStock sends email alerts using **any standard SMTP server** — no third-party email service account needed.

### Supported providers

| Provider | SMTP Host | Port |
|---|---|---|
| Strato | `smtp.strato.de` | `587` |
| Gmail | `smtp.gmail.com` | `587` |
| Mailgun | `smtp.mailgun.org` | `587` |
| Brevo (Sendinblue) | `smtp-relay.brevo.com` | `587` |
| Outlook / Office 365 | `smtp.office365.com` | `587` |

### Configuration

Add these to `.env.local`:

```dotenv
SMTP_HOST="smtp.strato.de"
SMTP_PORT="587"
SMTP_USER="you@yourdomain.com"
SMTP_PASS="yourpassword"
EMAIL_FROM="MediStock <noreply@yourdomain.com>"
```

### Testing

Use the **Send Test Email** button in **Settings → Email Notifications** to verify delivery without waiting for a real alert.

### Alert levels

| Level | Icon | When email is sent |
|---|---|---|
| Off | 🔇 | Never |
| Critical only | 🔴 | Stock ≤ low-stock threshold (days) |
| Low + Critical | 🟡 | Stock ≤ 2× threshold |

---

## 🌐 Internationalisation

The app ships with three languages. The language picker is in the **Sidebar** (bottom-left).

| Code | Language | Flag | Direction |
|---|---|---|---|
| `en` | English | 🇬🇧 | LTR |
| `de` | Deutsch | 🇩🇪 | LTR |
| `ar` | العربية | 🇾🇪 | RTL |

### Adding a new language

1. Create `lib/i18n/locales/<code>.ts` implementing the `Translation` interface from `lib/i18n/types.ts`
2. Register it in `lib/i18n/locales/index.ts`:

```ts
import fr from "./fr"

export const LOCALES = {
  // ...existing entries...
  fr: { label: "Français", flag: "🇫🇷", dir: "ltr" },
}

export const translations = { en, de, ar, fr }
```

That's it — the language picker in the Sidebar and all `useT()` hooks update automatically.

---

## 📁 Project Structure

```
medistock/
├── app/
│   ├── (app)/                    # Protected routes (require auth)
│   │   ├── dashboard/            # KPIs, adherence chart, inventory chart, upcoming doses
│   │   ├── patients/             # Patient list · [id] detail · [id]/edit · new
│   │   ├── medications/          # Medication catalog with search & delete
│   │   ├── schedules/            # Weekly calendar + schedule list
│   │   ├── inventory/            # Stock levels + restock modal
│   │   ├── notifications/        # In-app notification centre
│   │   ├── packages/             # Medication package management
│   │   └── settings/             # User preferences, timezone, thresholds, drug DB
│   ├── (auth)/                   # Public routes
│   │   ├── login/
│   │   └── register/
│   └── api/                      # Next.js Route Handlers
│       ├── auth/                 # NextAuth + /register
│       ├── patients/             # CRUD + [id]
│       ├── medications/          # CRUD + [id]
│       ├── schedules/            # CRUD + dose log generation
│       ├── inventory/            # Restock + adjustment
│       ├── notifications/        # List + mark read + test-email
│       ├── packages/             # Package CRUD
│       ├── settings/             # GET + PATCH user preferences
│       ├── dashboard/            # Aggregate KPI data
│       ├── search/               # RxNorm + OpenFDA + EMA search
│       └── cron/                 # Background jobs (reminders, decrement, auto-complete)
├── components/
│   ├── ui/                       # Base components (Button, Input, Badge, Dialog …)
│   ├── layout/                   # Sidebar, Navbar, BottomNav, NotificationBell
│   ├── dashboard/                # AdherenceChart, InventoryStatusChart, KPICard
│   ├── patients/                 # AddMedicationDialog, EditMedicationDialog
│   ├── medications/              # MedicationSearchCombobox
│   └── schedules/                # ScheduleCard
├── lib/
│   ├── auth.ts                   # NextAuth config
│   ├── prisma.ts                 # Prisma client singleton
│   ├── calculations.ts           # avgDailyPills, daysRemaining, adherence rate
│   ├── email.ts                  # HTML email builder + Nodemailer sender
│   ├── rxnorm.ts                 # RxNorm API integration (US)
│   ├── openfda.ts                # OpenFDA API integration (US)
│   ├── ema.ts                    # ChEMBL API integration (EU)
│   ├── utils.ts                  # cn(), formatDate(), formatDateTime()
│   ├── i18n/                     # Internationalisation
│   │   ├── context.tsx           # useT() React context + LanguageProvider
│   │   ├── types.ts              # Translation interface (add keys here)
│   │   └── locales/              # en.ts · de.ts · ar.ts · index.ts
│   └── validations/              # Zod schemas for all models
├── prisma/
│   ├── schema.prisma             # Database schema
│   ├── seed.ts                   # Demo data seeder
│   └── prisma/dev.db             # SQLite database file (auto-created)
├── hooks/
│   └── use-toast.ts              # Global toast hook
├── types/
│   └── index.ts                  # Shared TypeScript types
├── middleware.ts                 # Auth-guard redirect for protected routes
├── next.config.js                # Next.js config
├── vercel.json                   # Vercel Cron job schedule definitions
├── .env                          # Prisma CLI env (DATABASE_URL)
└── .env.local                    # Next.js runtime env (secrets, SMTP …)
```

---

## 🗃 Data Model

```
User ──< Patient ──< PatientMedication >── Medication
                           │
                           ├──< Schedule ──< DoseLog
                           ├──< InventoryEvent
                           └──< MedicationPackage

User    ──< Notification
Patient ──< Notification
```

| Model | Key fields |
|---|---|
| `User` | email, passwordHash, timezone, emailNotifs, emailAlertLevel, lowStockDays, expiryAlertDays, drugDatabase |
| `Patient` | name, dob, gender, phone, userId |
| `Medication` | name, brandName, genericName, strength, form, rxcui, ingredients |
| `PatientMedication` | pillsInStock, unitType, dosesPerContainer, containersInStock, lowStockThreshold |
| `Schedule` | timesOfDay (JSON), daysOfWeek (JSON), pillsPerDose, startDate, endDate |
| `DoseLog` | scheduledAt, takenAt, status (PENDING / TAKEN / MISSED / SKIPPED), pillsDecremented |
| `InventoryEvent` | type (RESTOCK / DECREMENT / ADJUSTMENT), quantity, reason |
| `MedicationPackage` | expiryDate, quantity, batchNumber |
| `Notification` | type, message, read, metadata (JSON) |

---

## 📝 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start **development** server with hot-reload on port 3000 |
| `npm run build` | Run `prisma generate` then build optimised **production** bundle |
| `npm run start` | Start **production** server (requires `npm run build` first) |
| `npm run lint` | ESLint check across all source files |
| `npm run db:push` | Push Prisma schema to the database (no migration files created) |
| `npm run db:seed` | Seed demo patients, medications, schedules, and inventory |
| `npx prisma studio` | Open visual database browser at http://localhost:5555 |
| `npx prisma generate` | Regenerate the Prisma client after schema changes |
| `npx prisma migrate deploy` | Apply pending migrations (production / PostgreSQL) |

---

## 🔄 Background Jobs (Cron)

All jobs are protected by `x-cron-secret: <CRON_SECRET>` header.  
In **local dev**, `auto-complete` runs inline whenever the dashboard is loaded.  
In **production** (Vercel), jobs run on the schedule defined in `vercel.json`.

| Endpoint | Schedule | What it does |
|---|---|---|
| `POST /api/cron/reminders` | Every 30 min | Creates in-app reminder for doses due within 30 min |
| `POST /api/cron/decrement` | Every 15 min | Auto-marks current-window doses TAKEN + decrements stock |
| `POST /api/cron/auto-complete` | Daily at 23:55 | Marks all remaining PENDING doses TAKEN + decrements stock + fires low-stock notifications |
| `POST /api/cron/expiry-check` | Daily at 08:00 | Checks package expiry dates and fires expiry notifications |

To trigger a job manually in dev:

```bash
curl -X POST http://localhost:3000/api/cron/auto-complete \
  -H "x-cron-secret: <your CRON_SECRET>"
```

---

## 🌐 Deployment (Vercel)

### Quick deploy

1. Push the repository to GitHub
2. Import the project at [vercel.com/new](https://vercel.com/new)
3. Set all environment variables in the Vercel dashboard (Settings → Environment Variables):

```
DATABASE_URL          postgresql://...  (Neon / Supabase / Railway)
NEXTAUTH_URL          https://your-app.vercel.app
NEXTAUTH_SECRET       <openssl rand -base64 32>
CRON_SECRET           <random string>
SMTP_HOST             smtp.yourdomain.com      (optional)
SMTP_PORT             587                      (optional)
SMTP_USER             you@yourdomain.com       (optional)
SMTP_PASS             yourpassword             (optional)
EMAIL_FROM            MediStock <no-reply@yourdomain.com>  (optional)
```

4. Switch to PostgreSQL in `prisma/schema.prisma`:

```diff
 datasource db {
-  provider = "sqlite"
+  provider = "postgresql"
   url      = env("DATABASE_URL")
 }
```

5. Run `npx prisma migrate deploy` once after first deploy (or add it to your build command)
6. Vercel Cron picks up jobs from `vercel.json` automatically

### Other platforms (Railway, Render, Fly.io)

- Set the same environment variables
- Build command: `npm run build`
- Start command: `npm run start`
- Add a PostgreSQL add-on and set `DATABASE_URL` accordingly

---

## 🧮 Core Algorithms

### Average daily units

```
avgDailyPills = (activeDaysPerWeek / 7) × timesPerDay × pillsPerDose
```

### Days remaining

```
daysRemaining = pillsInStock / avgDailyPills
```

### Adherence rate

```
adherence% = takenCount / (takenCount + missedCount) × 100
```

### Stock status thresholds

| Status | Condition |
|---|---|
| 🔴 Critical | `daysRemaining ≤ lowStockDays` |
| 🟡 Low | `daysRemaining ≤ lowStockDays × 2` |
| 🟢 OK | `daysRemaining > lowStockDays × 2` |

### Inhalation inventory

```
totalUnits = containersInStock × dosesPerContainer
```

---

## 🐛 Known Issues & Fixes Applied

| Issue | Fix applied |
|---|---|
| `skipDuplicates` not supported on SQLite | Replaced with manual pre-filter query |
| Webpack `ENOENT .pack.gz_` on macOS | `compression: false` in `next.config.js` webpack config |
| Dashboard empty on first load | Auto-regeneration of dose logs on each dashboard API call |
| `timesOfDay.join is not a function` | All JSON string fields parsed with `parseJsonArray()` helper |
| Foreign key error on patient create | User scoping fixed in `POST /api/patients` |
| Email not sent in dev without SMTP vars | Falls back to Ethereal — preview URL logged to console |
| `drugDatabase` field not in Prisma client | Run `npx prisma generate` after any schema change |

---

## 📄 License

MIT — free for personal and commercial use.

---

*Built with ❤️ — MediStock helps caregivers stay on top of medication schedules so patients never miss a dose.*


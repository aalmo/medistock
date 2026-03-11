# MediStock 💊

A production-ready web application for monitoring patients' medication schedules and inventory. Built with **Next.js 14**, **Prisma**, **SQLite**, and **Tailwind CSS**.

---

> ⚕️ **Medical Disclaimer**
> MediStock is a medication **tracking tool only** — not a substitute for medical advice. Always consult a qualified healthcare professional before making any changes to medication regimens.

---

## ✨ Features

### 🧑‍⚕️ Patient Management
- Add, edit, and remove patients with demographics (DOB, gender, phone, email, notes)
- Per-patient dashboard with KPIs, adherence trends, and medication cards

### 💊 Medication Tracking
- Search drugs via **RxNorm (NLM)** + **OpenFDA** — no API key required
- Brand name, generic name, strength, form, manufacturer, and active ingredients auto-filled
- Support for multiple unit types: **Pills, Tablets, Inhalations, mL, Drops, Patches, Injections**
- Inhalation support: configure **doses per container** × **containers in stock** = total units
- User-uploaded medication photos with fallback initials icon

### 📅 Schedule & Dose Management
- Flexible regimens: Once daily, BID, TID, QID, or any custom times of day
- Per-day-of-week scheduling (e.g. Mon/Wed/Fri only)
- Fractional doses supported (e.g. 0.5 pills per dose)
- Weekly calendar view with ← / Today / → navigation
- Colour-coded dose status: ✓ Taken · ⚠ Missed · ✗ Skipped · 🕐 Pending

### 📦 Inventory
- Real-time stock tracking with per-patient inventory events (restock, decrement, manual adjustment)
- **Days remaining** estimate: `pillsInStock ÷ avgDailyPills`
- Low-stock threshold alerts (in days or pill count)
- Add pills in 0.5 increments

### 🤖 Auto-Complete (End-of-Day)
- Any dose that was **not manually logged by midnight** is automatically marked **TAKEN**
- Inventory is decremented accordingly
- An inventory audit event is created with reason `"Auto-completed (end-of-day)"`
- Fires a **LOW_STOCK** notification if stock drops below threshold

### 📊 Dashboard
- **Floating KPI cards** — Total Patients, Doses Due Today, Adherence Rate, Low Stock Alerts
- **Today's Progress** — animated SVG ring + segmented progress bar (Taken / Pending / Missed)
- **Adherence Trend** — 7-day area chart with gradient fill and dashed average reference line
- **Inventory Status** — animated donut rings per medication, colour-coded rows (Critical → Good), threshold needle, days-remaining estimate

### 🔔 Notifications
- In-app notification centre with unread badge, date grouping, and All / Unread filter
- **Reminder** — upcoming doses within 30 minutes
- **Low Stock** — stock drops below threshold (in-app + optional email)
- **Auto-complete** — doses auto-marked at end of day
- Click any notification to mark it read; "Mark all read" button

### 📧 Email Alerts (Low Stock)
- Beautiful **HTML email** with KPI cards per medication: pill count, days left, threshold, status badge, and colour-coded progress bar
- Alert level choices: **Off**, **Critical only** (🔴), or **Low + Critical** (🟡+🔴)
- Configurable threshold slider (1–30 days) in Settings
- Batched per patient — one email per patient per day maximum
- Uses **Resend** (free tier: 100 emails/day, no credit card)
- **Test email** button in Settings to verify delivery before going live
- Falls back to `console.log` in dev if `RESEND_API_KEY` is not configured

### 🔍 Drug Search
- Search-as-you-type with debounce
- Sources: **RxNorm API** (NLM) + **OpenFDA drug label API** (no key required)
- Shows brand name, generic name, strength, form, manufacturer
- Results cached in local DB — works offline after first search

### 🔐 Authentication
- Email + password registration and login
- Secure session via **NextAuth v4** with JWT
- All data scoped to the authenticated user

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 + Radix UI |
| Forms | React Hook Form + Zod validation |
| Database | SQLite (local) via Prisma 5 |
| Auth | NextAuth v4 (credentials) |
| Charts | Recharts 2 |
| Icons | Lucide React |
| Drug APIs | RxNorm (NLM) + OpenFDA (free, no key) |
| Date utils | date-fns 4 |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 9+

### 1. Clone & install
```bash
cd medistock
npm install --legacy-peer-deps
```

### 2. Configure environment
```bash
# .env  (Prisma CLI only)
DATABASE_URL="file:./prisma/dev.db"

# .env.local  (Next.js runtime)
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"   # openssl rand -base64 32
CRON_SECRET="any-random-string"

# Email alerts — Resend (free, optional)
# Get API key at https://resend.com/api-keys
RESEND_API_KEY="re_your_key_here"
EMAIL_FROM="MediStock <noreply@yourdomain.com>"
```

### 3. Set up the database
```bash
npx prisma db push        # create tables
npm run db:seed           # seed demo data
```

### 4. Start the dev server
```bash
npm run dev               # → http://localhost:3000
```

### 5. Login with demo credentials
| Field    | Value                |
|----------|----------------------|
| Email    | `demo@medistock.app` |
| Password | `demo1234`           |

---

## 📁 Project Structure

```
medistock/
├── app/
│   ├── (app)/                    # Protected routes (require auth)
│   │   ├── dashboard/            # Main dashboard — KPIs, charts, upcoming doses
│   │   ├── patients/             # Patient list, detail, edit pages
│   │   ├── medications/          # Medication catalog with delete
│   │   ├── schedules/            # Weekly calendar + schedule list
│   │   ├── inventory/            # Stock levels + restock UI
│   │   ├── notifications/        # In-app notification centre
│   │   └── settings/             # User preferences, timezone, thresholds
│   ├── (auth)/                   # Public auth routes
│   │   ├── login/
│   │   └── register/
│   └── api/                      # API routes (Next.js Route Handlers)
│       ├── auth/                 # NextAuth + /register
│       ├── patients/             # Patient CRUD + [id]
│       ├── medications/          # Medication catalog CRUD + [id]
│       ├── schedules/            # Schedule create/list + dose log generation
│       ├── inventory/            # Restock + manual adjustment
│       ├── notifications/        # Notification list + mark read
│       │   └── test-email/       # Send test email to current user
│       ├── settings/             # GET + PATCH user preferences
│       ├── dashboard/            # Aggregate KPI data (auto-completes stale doses)
│       ├── search/               # Combined RxNorm + OpenFDA endpoint
│       │   └── rxnorm/           # RxNorm-specific search
│       └── cron/                 # Background jobs
│           ├── reminders/        # Fires 30-min-ahead reminders (every 30 min)
│           ├── decrement/        # Auto-decrement past-due doses (every 15 min)
│           └── auto-complete/    # Mark un-logged doses as TAKEN (daily at 23:55)
├── components/
│   ├── ui/                       # Base components: Button, Input, Badge, Dialog…
│   ├── layout/                   # Sidebar, Navbar, NotificationBell
│   ├── dashboard/                # AdherenceChart, InventoryStatusChart
│   ├── patients/                 # AddMedicationDialog, PatientCard
│   ├── medications/              # MedicationSearchCombobox
│   ├── notifications/            # NotificationList
│   └── schedules/                # ScheduleCard
├── lib/
│   ├── auth.ts                   # NextAuth config (credentials provider)
│   ├── prisma.ts                 # Prisma client singleton
│   ├── calculations.ts           # Core: avgDailyPills, daysRemaining, adherence, generateDoseTimes
│   ├── email.ts                  # HTML email builder + Resend sender (sendLowStockEmail)
│   ├── rxnorm.ts                 # RxNorm API integration
│   ├── openfda.ts                # OpenFDA API integration
│   ├── utils.ts                  # cn(), formatDate(), formatDateTime()
│   └── validations/              # Zod schemas for all models
├── prisma/
│   ├── schema.prisma             # SQLite schema (User, Patient, Medication, Schedule, DoseLog…)
│   ├── dev.db                    # Local SQLite database (auto-created)
│   └── seed.ts                   # Demo data seeder
├── hooks/
│   └── use-toast.ts              # Global toast notification hook
├── next.config.js                # Next.js config (webpack cache fix for macOS)
├── vercel.json                   # Vercel Cron job definitions
├── middleware.ts                 # Route protection (redirect unauthenticated users)
├── .env                          # Prisma CLI env (DATABASE_URL)
└── .env.local                    # Next.js env (NEXTAUTH_*, CRON_SECRET)
```

---

## 🗃 Data Model

```
User ──< Patient ──< PatientMedication >── Medication
                          │
                          ├──< Schedule ──< DoseLog
                          └──< InventoryEvent

User ──< Notification
Patient ──< Notification
```

| Model | Key fields |
|-------|-----------|
| `User` | email, passwordHash, timezone, emailNotifs, emailAlertLevel, lowStockDays |
| `Patient` | name, dob, gender, phone, userId |
| `Medication` | name, brandName, genericName, strength, form, rxcui, ingredients |
| `PatientMedication` | pillsInStock, unitType, dosesPerContainer, containersInStock, lowStockThreshold |
| `Schedule` | timesOfDay (JSON), daysOfWeek (JSON), pillsPerDose, startDate, endDate |
| `DoseLog` | scheduledAt, takenAt, status (PENDING/TAKEN/MISSED/SKIPPED), pillsDecremented |
| `InventoryEvent` | type (RESTOCK/DECREMENT/ADJUSTMENT), quantity, reason |
| `Notification` | type, message, read, metadata (JSON string) |

---

## 🔧 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Prisma generate + Next.js production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint check |
| `npm run db:push` | Push schema to SQLite (no migration files) |
| `npm run db:seed` | Seed demo patients, medications, and schedules |
| `npx prisma studio` | Visual database browser on port 5555 |

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
adherence% = taken / (taken + missed) × 100
```

### Stock status
| Status | Condition |
|--------|-----------|
| 🔴 **Critical** | pills ≤ threshold (in pills) |
| 🟡 **Low** | pills ≤ threshold × 2 |
| 🔵 **OK** | pills ≤ threshold × 4 |
| 🟢 **Good** | pills > threshold × 4 |

### Inhalation inventory
```
totalUnits = containersInStock × dosesPerContainer
e.g. 10 bottles × 100 inhalations = 1000 total doses
```

---

## 🔄 Background Jobs (Cron)

| Job | Schedule | What it does |
|-----|----------|-------------|
| `POST /api/cron/reminders` | Every 30 min | Sends in-app reminder for doses due in next 30 min |
| `POST /api/cron/decrement` | Every 15 min | Auto-marks current-window doses as TAKEN + decrements stock |
| `POST /api/cron/auto-complete` | Daily at 23:55 | Marks ALL remaining PENDING doses as TAKEN + decrements stock |

All jobs require `x-cron-secret` header matching `CRON_SECRET` env var.
In local dev, `auto-complete` runs inline whenever the dashboard is loaded.

---

## 🌐 Deployment (Vercel)

1. Push to GitHub and import in [Vercel](https://vercel.com)
2. Set environment variables:
   ```
   DATABASE_URL=postgresql://...        # Neon / Supabase / Railway
   NEXTAUTH_URL=https://your-app.vercel.app
   NEXTAUTH_SECRET=<openssl rand -base64 32>
   CRON_SECRET=<random string>
   ```
3. Switch DB provider in `prisma/schema.prisma`:
   ```diff
   - provider = "sqlite"
   + provider = "postgresql"
   ```
4. Remove `@default(cuid())` workarounds if needed, run `prisma migrate deploy`
5. Vercel Cron picks up the jobs defined in `vercel.json` automatically

---

## 🐛 Known Issues & Fixes Applied

| Issue | Fix |
|-------|-----|
| `skipDuplicates` error on SQLite | Replaced with manual pre-filter query |
| Webpack `ENOENT .pack.gz_` on macOS | `compression: false` in `next.config.js` webpack config |
| Dashboard empty (no dose logs) | Auto-regeneration loop in dashboard API on each load |
| Schedules calendar blank | Schedules API now includes `doseLogs` and scopes by user |
| `timesOfDay.join is not a function` | All JSON string fields parsed with `parseJsonArray()` helper |
| Foreign key error on patient create | User scoping fixed in POST `/api/patients` |
| Email not sent in dev | Falls back to `console.log` if `RESEND_API_KEY` not set |

---

## 📄 License

MIT — free for personal and commercial use.

# 🎁 SearchFriend — Anonymous Secret Santa Notifier

> Send instant, 100% anonymous WhatsApp notifications for Secret Santa gift deliveries.  
> Built with **Next.js 16 (App Router) + MySQL (XAMPP)** for local use, ready to migrate to **Supabase + Vercel**.

---

## ✨ Features

- 🎭 **Total sender anonymity** — the gifter never enters their name or phone number
- 📲 **Instant WhatsApp delivery** via Baileys bot (scan QR once in the admin panel)
- 🔒 **Weekly limit rule** — 1 notification per person per week, auto-resets every Monday at 00:00
- 🔓 **Admin unlock** — override the weekly limit for any student at any time
- 🌸💙 **Pink / Blue kawaii theme** toggle (NihonGO gachapon machine style)
- 🎰 Physics-animated gift boxes inside a glass sphere
- 🛡️ **Admin panel** at `/admin` protected by PIN

---

## 🗂️ Project Structure

```
e:\buscaamigo\
├── app/
│   ├── page.tsx              # Student-facing home (gift sender UI)
│   ├── consultar/page.tsx    # Code lookup page
│   ├── admin/page.tsx        # Admin panel (PIN protected)
│   ├── api/
│   │   ├── estudiantes/      # GET list of students with weekly status
│   │   ├── entregas/         # POST new delivery, GET by code
│   │   ├── status/           # GET system health
│   │   └── admin/            # Admin-only routes (auth, CRUD, unlock, WhatsApp)
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── Navbar.tsx
│   └── Footer.tsx
├── lib/
│   ├── db/
│   │   ├── index.ts          # DB facade (switches MySQL ↔ Supabase via env)
│   │   ├── mysql.ts          # MySQL adapter (XAMPP / local)
│   │   └── supabase.ts       # Supabase adapter (production)
│   ├── whatsapp-baileys.ts   # Baileys WhatsApp bot singleton
│   ├── whatsapp.ts           # WhatsApp provider router
│   ├── auth.ts               # PIN auth with HMAC tokens
│   └── types.ts              # Shared TypeScript types
├── database.sql              # MySQL schema + seed data (19 students)
├── .env.local                # ⚠️ NOT committed — see setup below
└── whatsapp_auth/            # ⚠️ NOT committed — Baileys session keys
```

---

## 🚀 Local Setup (XAMPP + MySQL)

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18 |
| XAMPP | Any recent (MySQL/MariaDB) |
| Git | Any |

---

### Step 1 — Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/searchfriend.git
cd searchfriend
```

---

### Step 2 — Install dependencies

```bash
npm install
```

---

### Step 3 — Create the `.env.local` file

Create a file called `.env.local` in the project root with this content:

```env
# ── Database ────────────────────────────────────────────
DB_PROVIDER=mysql

# MySQL connection (XAMPP defaults — adjust if yours differ)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=searchfriend

# ── Admin Panel ─────────────────────────────────────────
ADMIN_PIN=your_secret_pin_here

# ── WhatsApp Provider ───────────────────────────────────
# Options: baileys | cloudapi | mock
WHATSAPP_PROVIDER=baileys

# Only needed if WHATSAPP_PROVIDER=cloudapi:
# WHATSAPP_TOKEN=
# WHATSAPP_PHONE_ID=
```

> **Tip:** Change `ADMIN_PIN` to something only you know before sharing the app.

---

### Step 4 — Start XAMPP MySQL

1. Open **XAMPP Control Panel**
2. Click **Start** next to **MySQL**
3. Verify it shows green / port 3306

---

### Step 5 — Create the database

Open **phpMyAdmin** at `http://localhost/phpmyadmin`, click **SQL**, paste and run:

```sql
-- Or just import the file: database.sql
```

Or run directly from terminal:

**Windows (PowerShell):**
```powershell
cmd /c "C:\xampp\mysql\bin\mysql.exe -u root < database.sql"
```

**macOS / Linux:**
```bash
mysql -u root < database.sql
```

This creates the `searchfriend` database with 2 tables and 19 pre-loaded students.

---

### Step 6 — Run the development server

```bash
npm run dev
```

Or build and run production:

```bash
npm run build
npm run start
```

Open **[http://localhost:3000](http://localhost:3000)**

---

### Step 7 — Link the WhatsApp Bot (optional, for real messages)

1. Go to **[http://localhost:3000/admin](http://localhost:3000/admin)**
2. Enter PIN: the one you set as `ADMIN_PIN` in `.env.local`
3. Click the **"Link WhatsApp Bot (QR)"** tab
4. Click **"Initialize / Reconnect Bot"**
5. Scan the QR code with the **central WhatsApp number** (the bot's phone)
6. Done — all gift notifications now send instantly from that single number

> The WhatsApp session is saved in `whatsapp_auth/` (gitignored). You only need to scan once per device.

---

## 📋 Admin Panel Features (`/admin`)

| Feature | Description |
|---------|-------------|
| Student list | Add, edit phone numbers, delete students |
| Weekly unlock | Unblock a specific student or all students at once |
| WhatsApp bot | QR scan, connection status, reconnect |
| Delivery log | See all deliveries with timestamps and WhatsApp status |
| Re-send | Re-send the WhatsApp notification for any delivery |

---

## 📱 How It Works (User Flow)

```
Student opens http://localhost:3000
    → Selects the recipient from the pill buttons
    → Writes an anonymous hint message
    → Clicks "Send Secret Gift! 🎁"
    → Gachapon machine animates 🎰
    → Secret code is generated (e.g. SF-TY3785)
    → WhatsApp message sent INSTANTLY to recipient's phone
    → Sender sees the code — anonymity preserved ✅
```

---

## 🔁 Weekly Limit Rule

- Each student can receive **at most 1 gift notification per week**
- The week resets **every Monday at 00:00** automatically
- Blocked students show a **🔒 Monday** badge in the selector
- **Admin can override** at any time via the admin panel

---

## 🌐 Migrating to Production (Supabase + Vercel)

1. Create a Supabase project and run `database.sql` in the SQL editor (convert `AUTO_INCREMENT` → `SERIAL`, `TINYINT` → `BOOLEAN`)
2. Change `.env.local`:
   ```env
   DB_PROVIDER=supabase
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
3. Deploy to Vercel — it reads `.env` from the Vercel dashboard
4. For WhatsApp on production, use `WHATSAPP_PROVIDER=cloudapi` with the Meta WhatsApp Cloud API

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.4 (App Router, Turbopack) |
| UI | React 19 + Tailwind CSS v4 |
| Database (local) | MySQL 10.4 via XAMPP |
| Database (prod) | Supabase (PostgreSQL) |
| WhatsApp (local) | Baileys ([@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys)) |
| WhatsApp (prod) | Meta WhatsApp Cloud API |
| Auth | HMAC PIN tokens (cookies) |
| Animations | canvas-confetti + CSS + Web Audio API |
| Icons | lucide-react |

---

## ⚠️ Important Notes

- **Never commit `.env.local`** — it contains your PIN and DB credentials
- **Never commit `whatsapp_auth/`** — it contains your WhatsApp session keys (already gitignored)
- The `PROTOTIPO` badge in the UI is intentional — remove the label in `components/Navbar.tsx` for production
- The app is designed for **classroom/small group use** — not for high-volume production without further hardening

---

## 📄 License

MIT — free to use, modify, and share.

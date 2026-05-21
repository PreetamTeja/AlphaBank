# Banking Management System

A multi-bank management platform built with React and Firebase. Supports two independently deployed bank instances sharing a common interbank hub for cross-bank transfers, KYC processing, loan management, and real-time notifications.

---

## Tech Stack

**Frontend**
- React 18 with Vite
- Material UI
- React Router v6
- React Hook Form with Zod validation
- Firebase SDK v10

**Backend (Email Service)**
- Node.js with Express
- Nodemailer (SMTP via Gmail)

**Database and Auth**
- Firebase Firestore (one private project per bank + one shared hub)
- Firebase Authentication

---

## Architecture

Each bank runs as a separate frontend deployment, pointed at its own private Firebase project. A shared hub Firebase project acts as the interbank message bus — it carries only transfer routing metadata, never account balances.

```
Bank A App                  Shared Hub                  Bank B App
(alpha-bank Firebase)       (sharedhub Firebase)        (beta-bank Firebase)

accounts/                   interbank_transfers/         accounts/
transactions/    --write-->  { fromBankId, toBankId,  --read-->  transactions/
customers/                    amount, status }                    customers/
staff/                                                            staff/
```

---

## Prerequisites

- Node.js 18 or higher
- A Google account for Firebase Console access
- Gmail account with App Passwords enabled (for email notifications)

---

## Firebase Setup

You need three Firebase projects before running anything.

### Step 1 — Create three Firebase projects

Go to [console.firebase.google.com](https://console.firebase.google.com) and create:

| Project | Purpose |
|---------|---------|
| `bms-bank-a` | Alpha Bank private database |
| `bms-bank-b` | Beta Bank private database |
| `bms-hub` | Shared interbank hub |

For each project, disable Google Analytics and click Create.

### Step 2 — Enable Firestore

For all three projects: Firestore Database > Create database > Start in test mode > choose your nearest region > Enable.

### Step 3 — Enable Authentication

For all three projects: Authentication > Get started > Sign-in providers > Email/Password > Enable > Save.

### Step 4 — Create hub auth users

In `bms-hub` > Authentication > Users tab, add two users:

| Email | Password |
|-------|----------|
| `banka@bms-hub.local` | `BankA@Hub2024!` |
| `bankb@bms-hub.local` | `BankB@Hub2024!` |

Copy the UIDs after creating them — you will need them in the next step.

### Step 5 — Register hub users in Firestore

In `bms-hub` > Firestore, create collection `hub_users` with two documents.

Document ID = UID of `banka@bms-hub.local`:
```
bankId: "bank_a"
email:  "banka@bms-hub.local"
```

Document ID = UID of `bankb@bms-hub.local`:
```
bankId: "bank_b"
email:  "bankb@bms-hub.local"
```

### Step 6 — Register banks in hub Firestore

In `bms-hub` > Firestore, create collection `banks` with two documents.

Document ID `bank_a`:
```
bankId:     "bank_a"
bankName:   "Alpha Bank"
ifscPrefix: "BANK"
isActive:   true
```

Document ID `bank_b`:
```
bankId:     "bank_b"
bankName:   "Beta Bank"
ifscPrefix: "BANK"
isActive:   true
```

### Step 7 — Create the first admin user per bank

For `bms-bank-a`: Authentication > Add user — email `admin@banka.local`, password `Admin@BankA!`. Copy the UID.

Then in `bms-bank-a` > Firestore, create collection `staff`, document ID = that UID:
```
uid:       "<paste uid>"
name:      "Admin User"
email:     "admin@banka.local"
role:      "admin"
bankId:    "bank_a"
isActive:  true
createdAt: <timestamp>
```

Repeat for `bms-bank-b` using email `admin@bankb.local` and password `Admin@BankB!`, with `bankId: "bank_b"`.

### Step 8 — Get Firebase config keys

For each of the three projects: Project Settings > General > Your apps > Add app > Web. Register a web app and copy the `firebaseConfig` values.

---

## Environment Variables

The project uses two `.env` files at the root — one per bank.

**`.env` (Bank A — active by default)**

```env
VITE_BANK_ID=bank_a
VITE_BANK_NAME=Alpha Bank
VITE_IFSC_CODE=BANKA0001
VITE_BANK_COLOR=blue

# From bms-bank-a Firebase project
VITE_PRIVATE_API_KEY=
VITE_PRIVATE_AUTH_DOMAIN=
VITE_PRIVATE_PROJECT_ID=
VITE_PRIVATE_STORAGE_BUCKET=
VITE_PRIVATE_MESSAGING_SENDER_ID=
VITE_PRIVATE_APP_ID=

# From bms-hub Firebase project (same for both banks)
VITE_HUB_API_KEY=
VITE_HUB_AUTH_DOMAIN=
VITE_HUB_PROJECT_ID=
VITE_HUB_STORAGE_BUCKET=
VITE_HUB_MESSAGING_SENDER_ID=
VITE_HUB_APP_ID=

# Hub auth credentials (match what you created in Step 4)
VITE_HUB_BANK_EMAIL=banka@bms-hub.local
VITE_HUB_BANK_PASSWORD=BankA@Hub2024!
```

Create a `.env.bank-b` with the same structure but pointing to `bms-bank-b` and using the Bank B hub credentials.

**`server/.env` (Email service)**

```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-bank-email@gmail.com
MAIL_PASS=your-16-char-app-password
MAIL_FROM="Alpha Bank <your-bank-email@gmail.com>"
PORT=3001
ALLOWED_ORIGIN=http://localhost:5173
```

To get the Gmail app password: Google Account > Security > 2-Step Verification > App Passwords.

---

## Local Development

Install frontend dependencies:

```bash
npm install
```

Install server dependencies:

```bash
cd server && npm install && cd ..
```

Run Bank A (port 5173):

```bash
npm run dev:banka
```

Run Bank B (port 5174) in a separate terminal:

```bash
npm run dev:bankb
```

Run the email server in a separate terminal:

```bash
npm run server
```

Login at `http://localhost:5173` with `admin@banka.local` / `Admin@BankA!`.

---

## Deploying to Netlify

Each bank deploys as a separate Netlify site. Because Vite bakes environment variables into the bundle at build time, you set them once in Netlify's dashboard and trigger a build — no local build step needed.

### Option A — Drag and drop (fastest)

Build locally with your `.env` already filled in:

```bash
npm run build
```

Drag the `dist/` folder into your Netlify site's deploy zone at [app.netlify.com](https://app.netlify.com). The `_redirects` file inside `dist/` handles client-side routing automatically.

### Option B — Connect GitHub (recommended for ongoing updates)

1. Push this repository to GitHub.
2. In Netlify: Add new site > Import an existing project > Connect to GitHub > Select your repo.
3. Set build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Go to Site settings > Environment variables and add every `VITE_` key from your `.env` file.
5. Click Deploy. Netlify rebuilds automatically on every push to `main`.

To deploy a second site for Bank B, repeat steps 2–5 using the Bank B environment variables.

### Netlify environment variables to add

Copy all keys from your `.env` file into Netlify's environment variables panel. The `netlify.toml` in the repo handles routing — no extra configuration needed.

---

## Deploying the Email Server

The email server (`server/`) is a Node.js Express app and must be hosted separately from the Netlify frontend.

**Railway (recommended)**

1. Create a new project at [railway.app](https://railway.app)
2. Connect your GitHub repo
3. Set the root directory to `server`
4. Add the variables from `server/.env` in Railway's environment panel
5. Railway detects Node automatically and runs `npm start`

Once deployed, update `ALLOWED_ORIGIN` in Railway's environment to your Netlify site URL.

---

## Project Structure

```
.
├── src/
│   ├── components/
│   │   ├── layout/          # App shell, sidebar, header
│   │   ├── shared/          # ProtectedRoute, StaffRoute, AdminRoute
│   │   └── ui/              # Shared UI primitives
│   ├── config/
│   │   ├── constants.js     # Bank identity and shared constants
│   │   ├── firebaseHub.js   # Shared hub Firebase instance
│   │   └── firebasePrivate.js  # Bank-specific Firebase instance
│   ├── context/
│   │   ├── AuthContext.jsx
│   │   └── NotificationContext.jsx
│   ├── pages/
│   │   ├── auth/            # Login, Register
│   │   ├── accounts/        # Account list, create, detail
│   │   ├── admin/           # Admin dashboard
│   │   ├── kyc/             # KYC document upload
│   │   ├── loans/           # Loan management
│   │   ├── notifications/
│   │   ├── portfolio/
│   │   ├── transactions/
│   │   └── transfer/        # Send money (internal + interbank)
│   ├── services/            # Firestore query logic per domain
│   ├── utils/               # Formatters, validators, transfer router
│   └── theme.js             # MUI theme per bank color
├── server/
│   ├── index.js             # Express app, /api/send-email endpoint
│   └── services/
│       └── emailService.js  # Nodemailer templates
├── .env                     # Bank A environment (not committed)
├── netlify.toml             # Netlify build and redirect config
└── vite.config.js
```

---

## Common Issues

**Hub write failed** — The hub auth credentials in `.env` do not match what was created in Firebase Authentication. Check `VITE_HUB_BANK_EMAIL` and `VITE_HUB_BANK_PASSWORD`.

**No staff record found** — The user exists in Firebase Auth but has no matching document in Firestore `staff/{uid}`. Create it manually following Step 7.

**Balance not updating on Bank B** — The `onSnapshot` listener on the hub requires hub auth. Check the browser console for hub auth warnings.

**Missing or insufficient permissions** — Firestore security rules are blocking the request. Verify that `hub_users/{uid}.bankId` matches `VITE_BANK_ID` in your environment.

**Page 404 on refresh in Netlify** — The `_redirects` file must be present in `dist/`. It is copied automatically from `public/_redirects` during build. If missing, add `/* /index.html 200` to `public/_redirects` and rebuild.

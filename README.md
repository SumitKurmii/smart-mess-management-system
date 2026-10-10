# Smart Mess Management & Food Waste Reduction System

A data-driven web application and IoT telemetry platform designed for hostel messes to accurately estimate meal demand, reduce plate and kitchen food waste, gather student satisfaction feedback, and resolve mess complaints.

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────┐
│               Client Tier (React 18 + Vite)            │
│  - Student Portal (Dashboards, Booking, Feedback)      │
│  - Administrator Console (Menus, Waste, Analytics)     │
│  - Session Storage: httpOnly Cookies + Origin CSRF     │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS / Credentials (CORS)
                            ▼
┌────────────────────────────────────────────────────────┐
│          Application Tier (Node.js + Express 4)        │
│  - Health, Auth, Role-Based Access Control (RBAC)      │
│  - Operational Timezone Engine (Asia/Kolkata)          │
│  - Deterministic Aggregation Pipelines                │
│  - IoT Telemetry Ingestion (Aggregate Load Cell)       │
│  - Gemini AI Advisory Service (Backend-only)           │
└───────────────────────────┬────────────────────────────┘
                            │ Mongoose ODM
                            ▼
┌────────────────────────────────────────────────────────┐
│                 Database Tier (MongoDB)                │
│  - Users, Rules, Menus, Bookings, WasteLogs, Feedback  │
└────────────────────────────────────────────────────────┘
```

---

## Technology Stack

- **Frontend:** React 18, Vite 6, Tailwind CSS v3, React Router v6, Axios, Lucide Icons.
- **Backend:** Node.js, Express 4, Mongoose 8, Zod, Luxon, Bcryptjs, JsonWebToken, Cookie-Parser, CORS.
- **Database:** MongoDB.
- **Security:** `httpOnly` session cookies, Origin/CSRF header validation, password hashing with salt rounds = 10, strict server-side RBAC.
- **Operational Timezone:** Standardized on `Asia/Kolkata` (UTC+05:30) with canonical `YYYY-MM-DD` date keys.

---

## Repository Structure

```
Smart Mess Project/
├── .gitignore                    # Root gitignore rules
├── README.md                     # Project documentation & setup instructions
├── backend/
│   ├── .env.example              # Documented environment variable template
│   ├── package.json              # Backend dependencies and scripts
│   ├── src/
│   │   ├── config/               # DB connection, env parser, constants
│   │   ├── controllers/          # Request handlers (auth, health, menu, booking, rules)
│   │   ├── middleware/           # Auth (cookie/bearer), RBAC, CSRF/Origin, Validation
│   │   ├── models/               # Mongoose schemas (User, Menu, MealBooking, SystemRule)
│   │   ├── routes/               # API routes (/api/health, /api/auth, /api/menu, /api/bookings, /api/config/rules)
│   │   ├── scripts/              # Initial admin seeder & reset utility (seedAdmin.js, resetAdminPassword.js)
│   │   ├── utils/                # Date/timezone engine, standard API response
│   │   ├── app.js                # Express app configuration
│   │   └── server.js             # Server runner & graceful shutdown
│   └── tests/                    # Integration and unit test suites
│       ├── health.test.js
│       ├── auth.test.js
│       ├── dateBoundary.test.js
│       ├── menu.test.js
│       ├── booking.test.js
│       └── seedAdmin.test.js
└── frontend/
    ├── .env.example              # Frontend environment template
    ├── package.json              # Frontend dependencies and scripts
    ├── vite.config.js            # Vite configuration
    ├── tailwind.config.js        # Tailwind CSS configuration
    ├── postcss.config.js         # PostCSS configuration
    ├── index.html                # HTML entry point
    └── src/
        ├── api/                  # Axios client with credentials and CSRF header
        ├── components/           # Navbar, ProtectedRoute
        ├── context/              # AuthContext
        ├── pages/                # Login, Register, Dashboards, WeeklyMealPlanner, MenuManagement
        ├── App.jsx               # Route configuration
        ├── main.jsx              # Application mount point
        └── index.css             # Tailwind base styles
```

---

## Prerequisites

- **Node.js:** v18.0.0 or later (v25+ supported)
- **NPM:** v9.0.0 or later
- **MongoDB:** v6.0 or later (local daemon or remote MongoDB Atlas cluster)

---

## Setup & Installation

### 1. Clone & Initialize Environment

```bash
# Clone or navigate to the project directory
cd "Smart Mess Project"

# Initialize Git (if not already initialized)
git init
```

### 2. Configure Backend

```bash
cd backend

# Copy environment template
cp .env.example .env
# On Windows PowerShell:
# Copy-Item .env.example .env

# Install backend dependencies
npm install
```

Configure your `backend/.env` file:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/smart_mess_db
JWT_SECRET=your_jwt_secret_min_32_characters_long_for_security
JWT_EXPIRES_IN=24h
FRONTEND_URL=http://localhost:5173
MESS_TIMEZONE=Asia/Kolkata

# Initial Administrator Provisioning Credentials
ADMIN_INITIAL_NAME=System Administrator
ADMIN_INITIAL_EMAIL=admin@mess.local
ADMIN_INITIAL_PASSWORD=Admin@SecurePass2026!
```

### 3. Provision Initial Administrator

Administrative accounts **cannot** be created through public registration. Run the secure CLI provisioning script:

```bash
npm run seed:admin
```

This script safely checks whether an admin account exists and creates the administrative account using the credentials defined in `.env`.

### 4. Configure Frontend

```bash
cd ../frontend

# Copy environment template
cp .env.example .env
# On Windows PowerShell:
# Copy-Item .env.example .env

# Install frontend dependencies
npm install
```

---

## Running the Application

### Start Backend Development Server
```bash
cd backend
npm run dev
# Server runs at http://localhost:5000
# Health endpoint: http://localhost:5000/api/health
```

### Start Frontend Development Server
```bash
cd frontend
npm run dev
# Vite runs at http://localhost:5173
```

---

## Running Automated Tests

The backend test suite executes automated integration tests verifying:
- System health and timezone reporting.
- Date boundary and booking cutoff logic (at $T - 1\text{s}$, $T$, and $T + 1\text{s}$ in `Asia/Kolkata`).
- Public registration role lock (asserting `role: 'student'` is unconditionally enforced).
- CSRF Origin verification on cookie sessions.
- Server-side role-based access control (asserting 403 Forbidden for students accessing admin routes).

```bash
cd backend
npm test
```

---

## Security Policies & Architectural Boundaries

1. **Session & Cookie Security:**
   - Default browser sessions use an `httpOnly`, `SameSite: Lax` cookie named `auth_token` (`Secure: true` in production).
   - State-changing requests (`POST`, `PUT`, etc.) validate the `Origin` header against the trusted frontend origin to prevent CSRF attacks.
   - Bearer-token authentication (`Authorization: Bearer <token>`) is supported exclusively for automated tests and programmatic IoT devices.

2. **Role-Based Access Control (RBAC):**
   - Public registration strictly and unconditionally provisions `'student'` accounts. Any client-supplied `role` key is stripped by the server.
   - Protected routes enforce role checks on the backend (`roleMiddleware(['admin'])`), never relying on frontend UI visibility alone.

3. **IoT Load Cell Measurement Boundary:**
   - The ESP32 + HX711 scale platform measures **aggregate collected food waste per meal session** at the central mess scrap bin.
   - The system does **not** claim or infer individual dish-level waste weights from the aggregate scale. Dish-level feedback is obtained strictly through student ratings and complaint reports.

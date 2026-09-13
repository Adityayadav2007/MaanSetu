# Maansetu — Legal Metrology Online Verification System

A government-level platform for online verification and digital certification of weighing and measuring instruments under the **Legal Metrology Act, 2009** and the **Legal Metrology (General) Rules, 2011**.

---

## Project Overview

**Maansetu** digitizes the verification ecosystem for weighing and measuring instruments used in trade or protection across India. It replaces manual, paper-based processes with a unified online platform that connects instrument users (businesses), Legal Metrology Officers (LMOs), Government Approved Test Centres (GATCs), and State department administrators.

### Core Capabilities

- **Stakeholder registration**: Online account creation for businesses, LMOs, GATCs and administrators
- **Instrument registration**: Digital repository of every notified instrument with its statutory identity (make, model, serial number, capacity, accuracy class)
- **Verification workflow**: Application submission, scheduling, field/lab inspection, and digital stamping
- **QR-authenticated certificates**: Every certificate carries a QR code linking to the public verification record — scannable by any consumer without login
- **Lifecycle management**: Automated expiry reminders at 60, 30, 15, 7 and 1 day before validity lapses
- **Role-based dashboards**: Tailored portals for each stakeholder with their workload, queue and compliance standing
- **Public verification portal**: Any consumer can scan a QR code or enter a certificate number to confirm an instrument's standing — no registration required

---

## Technology Stack

### Frontend (Task 1 — Completed)
- **React 18.3** + **Vite 5.2** — fast, modern build toolchain
- **React Router 6** — client-side routing with protected route guards
- **Tailwind CSS 3.4** — utility-first styling with government design tokens
- **Lucide React** — icon library
- **html5-qrcode** — camera-based QR scanner for the public portal
- **Axios** — HTTP client (ready for backend integration)

### Backend (Planned — Task 2)
- **Node.js** + **Express** — RESTful API server
- **JWT + httpOnly cookies** — session management
- **Bcrypt** — password hashing
- **Multer** — document upload (model approval certificates, instrument photos)
- **QR code generation** — each certificate embeds a unique verification URL

### Database (Planned — Task 3)
- **PostgreSQL** — ACID-compliant relational database for statutory records
- **Schema**: `users`, `instruments`, `applications`, `verifications`, `certificates`, `audit_log`
- **Constraints**: foreign keys, check constraints for accuracy classes and validity periods
- **Indexing**: certificate number, instrument serial number, GSTIN, application status

### API Layer (Planned — Task 4)
- RESTful endpoints under `/api/v1/*`
- OpenAPI 3.0 specification for auto-generated docs
- Rate limiting (per-IP and per-account)
- Request validation with **Joi** or **Zod**
- Error responses follow RFC 7807 (Problem Details)

### Security (Planned — Task 5)
- **Authentication**: Passwords hashed with bcrypt (cost factor 12+); sessions in httpOnly, Secure, SameSite=Strict cookies
- **Authorization**: every privileged endpoint re-checks the user's role server-side (client-side guards are UX only)
- **Input validation**: parameterized queries (no SQL injection); file upload MIME and magic-byte checks; max file size 5 MB
- **Audit trail**: every certificate issuance, revocation and data amendment logged with user ID, timestamp and IP
- **HTTPS**: enforce TLS 1.2+ in production
- **CSP**: Content-Security-Policy header to mitigate XSS
- **Secrets**: environment variables for DB credentials, JWT secret; never committed to version control

---

## Current Build Status

### ✅ Completed (Frontend-only demonstrable build)

**Task 1 — Frontend structure and UI**
- [x] React + Vite project scaffolded with Tailwind
- [x] Government-style design system (GIGW-inspired headers, tricolour accents, accessible focus rings)
- [x] Public portal: landing page, business login, officer login (3-tab sub-login for LMO/GATC/Admin)
- [x] Business registration flow with Legal Metrology field validation
- [x] QR scanner (camera-based, works on mobile)
- [x] Public certificate verification (no login required)
- [x] Help page with consumer guidance and validity reference table

**Task 2 — Business portal (instrument user)**
- [x] Dashboard with compliance summary and action-required banners
- [x] Instrument register with validity tracking
- [x] Instrument registration form (Rule 10 document requirements)
- [x] Application tracker
- [x] Digital certificate repository with QR display

**Task 3 — Officer portals (3 roles)**
- [x] **LMO portal**: field verification queue, inspection recording form (Rule 12 observation sheet with working-standard traceability)
- [x] **GATC portal**: test centre dashboard, instrument intake queue, reference standards register
- [x] **Admin portal**: state-wide monitoring, district pendency heatmap, enforcement activity log

**Task 4 — Routing and navigation**
- [x] React Router configuration with public, business and officer routes
- [x] Protected route guards (client-side; server-side auth pending backend)
- [x] Role-based sidebar navigation
- [x] 404 handler and "coming soon" placeholders for unimplemented sections

**Task 5 — Domain layer**
- [x] Legal Metrology constants: instrument categories, accuracy classes, application statuses, verification results, validity periods (all sourced from the 2011 Rules)
- [x] `services/api.js` — typed endpoint client for every backend route
- [x] `hooks/useApi.js` — loading / error / refetch shared by every data page
- [x] `components/common/AsyncState.jsx` — consistent loading, error and empty states

**Task 6 — Backend (see `backend/README.md`)**
- [x] Express API: auth, instruments, applications, verifications, certificates, admin
- [x] PostgreSQL schema, seed data, and an embedded dev database
- [x] JWT session in an httpOnly cookie; bcrypt password hashing
- [x] QR code generation per certificate
- [x] Integration tests against a real PostgreSQL, plus a static wiring check

---

## Folder Structure

```
C:\MaanSetu\
├── frontend/               # React + Vite frontend (CURRENT DELIVERABLE)
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/       # GovHeader, GovFooter, StatusPill, FormField, Captcha, ProtectedRoute
│   │   │   └── layout/       # PublicLayout, PortalLayout (role-agnostic sidebar shell)
│   │   ├── constants/        # legalMetrology.js (domain constants from the Act & Rules)
│   │   ├── context/          # AuthContext (session from the httpOnly cookie via GET /api/auth/me)
│   │   ├── pages/
│   │   │   ├── public/       # LandingPage, BusinessLogin, BusinessRegister, ScanQR, VerifyCertificate, HelpPage
│   │   │   ├── business/     # BusinessDashboard, MyInstruments, InstrumentRegister, MyApplications, MyCertificates
│   │   │   ├── officer/      # LMODashboard, RecordInspection, GATCDashboard, AdminDashboard, OfficerLogin
│   │   │   └── common/       # ComingSoon (placeholder), NotFound (404)
│   │   ├── hooks/            # useApi (loading / error / refetch for every data page)
│   │   ├── services/         # api.js (axios client), format.js (date + status helpers)
│   │   ├── App.jsx           # Root router
│   │   ├── main.jsx          # React entry point
│   │   └── index.css         # Tailwind directives + global styles
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
├── backend/                # (Planned) Express API server
├── database/               # (Planned) PostgreSQL schema and migrations
├── api/                    # (Planned) OpenAPI spec and Postman collection
├── security/               # (Planned) HTTPS config, CSP headers, rate-limiting rules
└── Logo.png
```

---

## Getting Started

### Prerequisites
- **Node.js 18+** and **npm 9+**
- A modern browser (Chrome, Firefox, Edge, Safari — the QR scanner requires camera API support)

### Installation

**Important**: My Linux shell cannot reach your drives due to a Windows update from Sept 8, so I can't run `npm install` or `npm run dev` for you. You'll need to execute these commands yourself in a terminal.

```bash
cd C:\MaanSetu\frontend
npm install
npm run dev
```

The dev server starts at `http://localhost:3000`.

### Demo Credentials

Accounts are seeded into PostgreSQL by `backend`'s `npm run db:seed`. Password for all of them: `demo1234`.

#### Business / Instrument User Portal
- **ID**: `business@demo.in`
- **Password**: `demo1234`
- Demonstrates: instrument register, application tracker, certificate repository

#### Legal Metrology Officer (LMO)
- **ID**: `LMO/UP/0417`
- **Password**: `demo1234`
- Demonstrates: verification queue, field inspection recording (Rule 12 observation sheet)

#### Government Approved Test Centre (GATC)
- **ID**: `GATC/UP/031`
- **Password**: `demo1234`
- Demonstrates: test centre dashboard, instrument intake, reference standards register

#### Department Administrator
- **ID**: `admin@legalmetrology.gov.in`
- **Password**: `demo1234`
- Demonstrates: state-wide monitoring, district pendency, enforcement log

### Public (No-Login) Features

These work without signing in:

- **Scan QR Code**: `/scan` — camera-based scanner (mobile-friendly)
- **Verify Certificate**: `/verify` — enter a certificate number to check validity
- **Sample certificate numbers** (paste into the verify page):
  - `LM/UP/KNR/2025/004417` — Valid
  - `LM/UP/KNR/2024/000913` — Expired
  - `LM/UP/GZB/2025/118840` — Revoked

---

## Key Design Decisions

### 1. Public verification is deliberately open
Any consumer must be able to confirm that an instrument is lawfully verified, which is the core consumer-protection purpose of the Legal Metrology Act, 2009. Requiring login would defeat that. The QR scanner and certificate lookup work without registration.

### 2. Client-side role guards are UX only
`ProtectedRoute` prevents rendering a screen for the wrong role, but anyone can bypass it by editing client state. Every API endpoint must independently re-check the user's role. The guard is a usability affordance, not a security control.

### 3. One API client, one place that encodes reference numbers
`services/api.js` is the only module that talks to the backend. It sets `withCredentials: true` (the session is an httpOnly cookie, so the browser must send it) and `encodeURIComponent`s every reference number used as a path segment.

That second point is easy to get wrong: application and certificate numbers contain forward slashes (`LM/UP/KNX/2026/006603`). Used raw in a URL they become extra path segments and match no route, so the request 404s. Pages pass plain strings; the client encodes.

### 4. Validity periods are State-specific
Rule 6 of the Legal Metrology (General) Rules, 2011 lets each State notify its own re-verification periodicity. The `defaultValidityMonths` values in `legalMetrology.js` are indicative — the backend must store per-State overrides and the frontend must display the period from the actual certificate, not the constant.

### 5. No token in JavaScript at all
The session lives in an httpOnly cookie set by the server. `AuthContext` never sees the token and stores nothing in `localStorage` or `sessionStorage` — both are readable by any injected script (XSS), so a token kept there is a token an attacker can steal and replay. On reload the profile is re-fetched from `GET /api/auth/me`, which the browser can answer because it still holds the cookie.

### 6. Document upload is client-validated, server-verified
File type and size checks in the instrument registration form are convenience only. The server must independently validate MIME type, magic bytes, and scan for malware before storing anything.

### 7. Certificate QR payloads are URLs, not raw data
Each QR encodes `https://maansetu.gov.in/verify/<certificateNo>`, not the certificate data itself. This lets the system revoke a certificate server-side (a consumer scanning it will see "revoked"), and prevents a malicious QR from redirecting off-site.

---

## Backend

The backend lives in `backend/` at the repository root — see `backend/README.md`.

Run it alongside this frontend:

```bash
cd backend
cp .env.example .env        # set a real JWT_SECRET
npm install
npm run dev:db              # terminal 1 — embedded PostgreSQL, if you have none installed
npm run db:setup && npm run db:seed
npm run dev                 # API on :5000

cd ../MaanSetu/frontend
npm install
npm run dev                 # portal on :3000, proxying /api to :5000
```

Demo password for every seeded account is `demo1234`. Businesses sign in with
their email; officers, GATCs and administrators sign in with their service
identifier (`LMO/UP/0417`, `GATC/UP/031`, `ADM-UP-001`).

### Task 4 — API Documentation
1. OpenAPI 3.0 spec describing every endpoint, request/response shape, and error code
2. Auto-generated docs with Swagger UI or Redoc
3. Postman collection for manual testing

### Task 5 — Security Hardening
1. HTTPS enforcement (redirect HTTP → HTTPS, HSTS header)
2. Helmet.js for security headers (CSP, X-Frame-Options, X-Content-Type-Options)
3. Rate limiting: 100 req/15min per IP for public endpoints, 500 req/15min for authenticated
4. CORS: whitelist only the official domain
5. Input validation: Joi or Zod schema on every request body
6. Audit logging: every certificate issuance, revocation, and data amendment logged to `audit_log` with user ID, timestamp, IP

### Task 6 — Mobile App (Optional)
React Native or Flutter app for field officers, with offline inspection recording and sync when connectivity returns.

---

## Compliance Notes

This build is structured to align with:

- **Legal Metrology Act, 2009** — Section 24 (use of unverified instruments is an offence), Section 14 (powers of LMOs)
- **Legal Metrology (General) Rules, 2011** — Rule 6 (verification periodicity), Rule 8 (working standards traceability), Rule 10 (application documents), Rule 12 (stamping and certificate issuance)
- **Guidelines for Indian Government Websites (GIGW)** — accessibility (keyboard navigation, ARIA labels, skip-to-content link), bilingual support placeholder (English / Hindi toggle in header), light mode design

### Accessibility
- Every form control is label-associated with `htmlFor` and `id`
- Validation errors are announced via `aria-invalid` and `aria-describedby`
- Focus rings are visible on all interactive elements (3px solid outline)
- Skip-to-content link appears on keyboard focus
- Status pills carry the label in text (colour alone never conveys meaning)
- Tables have `<caption>` for screen readers

---

## Known Limitations (Current Build)

1. **No payment gateway**: verification fees are recorded but not collected
2. **No actual payment gateway**: fee payment buttons are placeholders
3. **No SMS/email alerts**: the reminder system is UI-only
4. **No digital signature integration**: officer observation sheets would be DSC-signed in production
5. **No Aadhaar eSign**: business registration would verify identity via Aadhaar in the live system
6. **No MeghRaj Cloud deployment**: this is a local dev build
7. **Camera permission flow**: QR scanner assumes permission is granted; production needs graceful handling of denied permissions
8. **Offline mode**: the mobile-friendly UI is fully online; the field officer app would cache data for offline use

---

## Project Submission Checklist

- [x] Frontend folder with complete React + Vite project
- [x] README with setup instructions and demo credentials
- [x] Government-style UI with GIGW-aligned accessibility
- [x] Two login portals: business (public) and officer (3-role tabs)
- [x] QR scanner (no login required)
- [x] Public certificate verification (no login required)
- [x] Business portal: dashboard, instrument register, application tracker, certificate repository
- [x] Officer portals: LMO (field verification), GATC (lab testing), Admin (state-wide monitoring)
- [x] Domain constants sourced from Legal Metrology Act, 2009 and Rules, 2011
- [x] Role-based routing with protected routes
- [x] Help page with consumer guidance
- [x] 404 handler and placeholders for unimplemented sections
- [ ] Backend API (planned — Task 2)
- [ ] PostgreSQL database (planned — Task 3)
- [ ] OpenAPI spec (planned — Task 4)
- [ ] Security hardening (planned — Task 5)

---

## Contact & Support

This is a demonstrable frontend build for evaluation. For backend integration, database schema design, or deployment to MeghRaj Cloud, the next phase is ready to begin.

**Technical documentation**:
- Frontend source: `C:\MaanSetu\frontend\src\`
- Domain constants: `frontend\src\constants\legalMetrology.js` (statutory source references in comments)
- API client: `frontend/src/services/api.js` (relative URLs, credentials, reference-number encoding)
- Backend: `backend/README.md` (routes, conventions, tests)

**Architecture notes**:
- The `ProtectedRoute` component is UX only — server-side auth must independently verify every request
- Certificate QR payloads are URLs (`/verify/:certNo`), not raw data, so revocations propagate
- Validity periods are State-specific per Rule 6 — the backend must store overrides, the frontend must read from the certificate

---

## License

This project is built for the Government of India under the Legal Metrology Act, 2009. All code and documentation are subject to the licensing terms set by the Department of Consumer Affairs.

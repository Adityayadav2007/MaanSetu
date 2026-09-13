# MaanSetu Backend

REST API for the Legal Metrology verification portal — instrument registration,
verification applications, field inspection records, QR-enabled digital
certificates, and departmental administration.

Built on **Express** and **PostgreSQL**, with the session held in an httpOnly
cookie.

---

## Quick start

```bash
cd backend
cp .env.example .env        # then set a real JWT_SECRET
npm install
```

### Option A — you already have PostgreSQL

```bash
createdb maansetu           # or however you manage databases
npm run db:setup            # create the schema (drops existing tables)
npm run db:seed             # load demo accounts and sample records
npm run dev                 # start the API on :5000
```

### Option B — no PostgreSQL installed

`npm run dev:db` starts a real PostgreSQL server from a data directory inside
the project (`backend/.pgdata`), so you can run the whole stack without
installing anything. It is the same engine the test suite uses.

```bash
npm run dev:db              # terminal 1 — leave running
npm run db:setup            # terminal 2
npm run db:seed
npm run dev
```

> `dev:db` is a development convenience. Point a real deployment at a managed
> PostgreSQL instance — a data directory in the project tree has no backups,
> no replication and no access control.

Then start the frontend (`cd ../MaanSetu/frontend && npm run dev`) and open
`http://localhost:3000`.

---

## Demo accounts

Password for all of them is `demo1234`.

Businesses log in with their **email**; officers, GATCs and administrators log
in with their **service identifier**.

| Role     | Identifier                    | Who                          |
| -------- | ----------------------------- | ---------------------------- |
| BUSINESS | `business@demo.in`            | Ramesh Traders               |
| BUSINESS | `sharma.fuel@demo.in`         | Sharma Fuel Station          |
| LMO      | `LMO/UP/0417`                 | Sunita Verma                 |
| GATC     | `GATC/UP/031`                 | Ganga Test Laboratory        |
| ADMIN    | `ADM-UP-001`                  | Controller of Legal Metrology |

---

## Scripts

| Script              | Purpose                                                     |
| ------------------- | ----------------------------------------------------------- |
| `npm run dev`       | Start the API with auto-restart on change                    |
| `npm start`         | Start the API                                                |
| `npm run dev:db`    | Run an embedded PostgreSQL (`--wipe` to start from scratch)  |
| `npm run db:setup`  | Create the schema. **Drops existing tables.**                |
| `npm run db:seed`   | Load demo accounts, instruments, applications, certificates  |
| `npm run db:reset`  | `db:setup` followed by `db:seed`                             |
| `npm test`          | Integration + consistency tests against a real PostgreSQL    |
| `npm run check`     | Static wiring check (no database needed)                     |

---

## Layout

```
server.js               Bootstrap: validate env, verify DB, bind, shut down cleanly
app.js                  Express app factory (middleware chain + routes)
config/
  database.js           Connection pool, query(), withTransaction()
  env.js                Environment parsing and validation
routes/                 One file per resource; the single answer to "what does
                        this API expose?"
controllers/            Request handling and SQL
middleware/
  auth.js               JWT cookie auth, role gates, audit-log writer
  validation.js         Joi validation, error handler, 404 handler
  rateLimit.js          Separate budgets for login, public lookup, everything else
  upload.js             Multer config for Rule 10 supporting documents
utils/
  serializers.js        The only place snake_case becomes the API's camelCase
  references.js         Application / certificate / instrument number generators
  workflow.js           The application state machine, in one place
validators/             Joi schemas, plus codes.js (shared enum lists)
scripts/                Schema setup, seed, embedded dev DB, wiring check
test/                   Integration tests against a real PostgreSQL
```

---

## API surface

All routes are under `/api`. Responses are JSON.

### Authentication

| Method | Path                        | Access  |
| ------ | --------------------------- | ------- |
| POST   | `/auth/login`               | public  |
| POST   | `/auth/register/business`   | public  |
| POST   | `/auth/logout`              | any     |
| GET    | `/auth/me`                  | auth    |

### Instruments (BUSINESS)

| Method | Path                          |
| ------ | ----------------------------- |
| GET    | `/instruments`                |
| GET    | `/instruments/summary`        |
| GET    | `/instruments/:instrumentId`  |
| POST   | `/instruments`                |
| PATCH  | `/instruments/:instrumentId`  |
| DELETE | `/instruments/:instrumentId`  |

### Applications

| Method | Path                                        | Access          |
| ------ | ------------------------------------------- | --------------- |
| GET    | `/applications`                             | BUSINESS        |
| GET    | `/applications/summary`                     | BUSINESS        |
| POST   | `/applications`                             | BUSINESS        |
| PATCH  | `/applications/:no/respond`                 | BUSINESS        |
| GET    | `/applications/queue`                       | LMO, GATC       |
| GET    | `/applications/pending`                     | LMO, ADMIN      |
| PATCH  | `/applications/:no/allot`                   | LMO, ADMIN      |
| PATCH  | `/applications/:no/query`                   | LMO, GATC, ADMIN|
| PATCH  | `/applications/:no/status`                  | LMO, GATC, ADMIN|
| GET    | `/applications/:no`                         | any auth        |

### Verifications

| Method | Path                        | Access      |
| ------ | --------------------------- | ----------- |
| POST   | `/verifications`            | LMO, GATC   |
| GET    | `/verifications/:no`        | any auth    |

### Certificates

| Method | Path                                  | Access            |
| ------ | ------------------------------------- | ----------------- |
| GET    | `/certificates/verify/:identifier`    | **public**        |
| GET    | `/certificates`                       | any auth          |
| GET    | `/certificates/:no`                   | any auth          |
| GET    | `/certificates/:no/qr`                | any auth          |
| POST   | `/certificates/issue`                 | LMO, GATC, ADMIN  |
| PATCH  | `/certificates/:no/revoke`            | **ADMIN only**    |

### Administration (ADMIN)

`/admin/stats` · `/admin/pendency` · `/admin/enforcement` (GET, POST) · `/admin/audit`

Also, outside `/api`: `GET /health` returns service status.

---

## Conventions worth knowing before you edit

**Reference numbers contain forward slashes.**
Application and certificate numbers look like `LM/UP/KNX/2026/006603`. Used raw
in a URL path they become extra segments and match no route, so **every path
parameter carrying one must be `encodeURIComponent`-ed**. The frontend's
`services/api.js` does this centrally; the backend also exposes a splat route at
`/certificates/verify/*` because a scanned QR code produces the un-encoded form.

**`req.user.userId`, never `req.user.id`.**
The JWT subject is `userId`. Reading `req.user.id` yields `undefined`, which
becomes `WHERE user_id = NULL` — no error, just an empty result and a confusing
"No profile linked" response.

**Postgres lower-cases unquoted SQL aliases.**
`SELECT COUNT(*) AS actionNeeded` arrives as `actionneeded`. Keep SQL aliases
snake_case and translate in the controller, or quote them.

**ESM only.** `package.json` sets `"type": "module"`. `require()` and
`module.exports` throw at import time. Relative imports need their `.js`
extension. `npm run check` catches all of this.

**Multi-statement operations are transactions.** Certificate issuance, allotment
and verification recording use `withTransaction`, so a certificate, the
instrument's validity dates and the application status move together or not at
all.

**The audit log never breaks the operation it describes.** `writeAudit` logs and
swallows errors: a certificate that was genuinely issued is still issued even if
the audit insert fails.

---

## Application lifecycle

```
DRAFT → SUBMITTED → UNDER_SCRUTINY → ALLOTTED → SCHEDULED
      → INSPECTED → APPROVED → CERTIFIED
```

A query raised during scrutiny sends the application back to the applicant
(`QUERY_RAISED`); their reply returns it to `UNDER_SCRUTINY`. `CERTIFIED` and
`REJECTED` are terminal.

Transitions are defined once in `utils/workflow.js` and enforced on every status
change. `CERTIFIED` cannot be set directly — it is reached only through
`POST /certificates/issue`, which performs the stamping checks and allocates the
certificate number.

---

## Tests

```bash
npm test
```

The suite boots a **real PostgreSQL** instance (embedded, throwaway data
directory), builds the schema with the production `setupDatabase.js`, seeds it
with the production `seedDatabase.js`, and drives the production Express app
through supertest. Nothing is mocked.

Three files:

- **`test/api.test.js`** — the statutory lifecycle end to end: register, apply,
  allot, verify, certify, verify publicly, revoke. Plus the authorisation
  boundaries (a business cannot read the officer queue; an LMO cannot record a
  result for a GATC's application; an LMO cannot revoke a certificate).
- **`test/consistency.test.js`** — asserts the four copies of each code list
  (Postgres enums, Joi validators, workflow state machine, frontend constants)
  agree. These have no compile-time link to each other, so drift would otherwise
  surface as a runtime enum error or a status pill with no label.
- **`test/rateLimit.test.js`** — the limiters are pass-throughs under
  `NODE_ENV=test`, so this builds one with a small budget and checks it.

`npm run check` is the fast static counterpart: no CommonJS in an ESM package,
no route referencing an unimported handler, no import of a name a module does
not export, entry points present, dependencies declared.

---

## Security notes

- **Session is an httpOnly cookie.** JavaScript never sees the token. This is
  deliberate: a token in `localStorage` is readable by any injected script.
- **CORS uses an explicit allowlist.** `credentials: true` is incompatible with
  a wildcard origin, and echoing the request's Origin would let any site drive a
  logged-in officer's session. Set `CORS_ORIGINS` in production.
- **Passwords** are bcrypt-hashed (cost 12) via `bcryptjs` — pure JavaScript,
  so `npm install` needs no C toolchain. The hash format is the standard `$2b$`.
- **Public certificate lookup returns a narrow projection.** No proprietor phone
  number, email, GSTIN, PAN or full postal address. The endpoint is
  unauthenticated by design and is rate-limited per IP.
- **Client-side role checks are UX only.** Every privileged action is
  re-authorised server-side.
- **Uploaded files are renamed on disk.** The original filename is
  attacker-controlled; using it would allow path traversal or overwriting
  another applicant's document.

## Environment

See `.env.example` for every variable. The two that most often bite:

- **`JWT_SECRET`** — at least 32 characters. The server refuses to start without
  a valid one rather than signing tokens with a fallback.
- **`COOKIE_SECURE`** — set `true` only over HTTPS. A `Secure` cookie is never
  sent over plain HTTP, which would silently log everyone out.

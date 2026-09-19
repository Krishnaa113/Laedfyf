# Leadyfy OS

## Owner login

Go to [http://localhost:3000/login](http://localhost:3000/login)

- **Email:** `owner@leadyfy.local`
- **Password:** `Leadyfy@123`

If this account is missing, run `npm run seed`.

**Two logins**

- Staff (owner / admin / employee): `/login` → email + password
- Client: `/portal/login` → **client name** + portal password

Do not mix them.

---

## Create a client

1. Login as owner.
2. **Clients** → **Add client**.
3. Fill name, company, email, and portal password (8+ letters).
4. Save.

Client login: `/portal/login` with **name + portal password**.

To change the password later: open the client → **Portal password** → type new password twice → **Set password**. No OTP.

The client can see their orders, scripts, videos, invoices, and tickets. They cannot see staff, creators, or prices.

---

## Create an admin

1. Login as owner.
2. **Users** → **Add user**.
3. Set role to `admin`. Add name, email, password.
4. Save. Sign out.
5. Login at `/login` with the admin email and password.

Admin can run day-to-day work. Only owner can open **Users**.

---

## Create an employee

1. Login as owner.
2. **Employees** → **Add employee**.
3. Add name, email, password, and a job type:
   - **Sales** — clients and orders
   - **Script Writer** — scripts
   - **Shoot Manager** — creators and shoots
   - **Editor** — videos
4. Save. Sign out.
5. Login at `/login` with the employee email and password.

Then assign work: open the client → **Edit** → **Assigned employee** → save. If you skip this, the employee sees no clients.

To change their password: open the employee → **Login password** → **Set password**. No OTP.

---

## Start the app

1. Copy `.env.example` to `.env.local`.
2. Add `MONGODB_URI` and `NEXTAUTH_SECRET`.
3. Run `npm run seed` then `npm run dev`.
4. Open [http://localhost:3000](http://localhost:3000).

```bash
npm run dev
npm test
npm run seed
```

GraphQL (read only, same login and RBAC as REST): `POST /api/graphql` with `{ "query": "{ me { email } dashboard { pendingScripts } }" }`. REST stays the main API.


------App to run the agency: clients, orders, scripts, shoots, videos, money, and a client portal.

## What this project is

Leadyfy OS is the internal operations system for a UGC and digital marketing agency. It replaces scattered work in spreadsheets, WhatsApp, and separate tools with one place to run a job from first lead to payout and reports.

Staff (owner, admin, employee) work in the internal app. Clients use a separate portal. Clients cannot see staff, creators, or costs.

**What it does today**

- Roles and access: Owner, Admin (optional extra permissions), Employee (Sales, Script Writer, Shoot Manager, Editor), Client
- Clients, packages/orders, scripts, creators, shoots, videos
- Client portal for script review, video review, invoices, deliveries, and support tickets
- Money: payments, expenses, creator payouts
- Dashboard KPIs, analytics, tasks, employees, users, in-app alerts
- REST APIs for the app, plus a signed-in GraphQL read API

**Theme:** charcoal `#111111`, white, amber `#F59E0B`.

## What we used

| Layer | Tool |
| --- | --- |
| App | Next.js 16 (App Router), React 19, TypeScript |
| UI | Tailwind CSS v4, Geist font |
| Auth | NextAuth v4 JWT, bcryptjs passwords, two doors (`/login` and `/portal/login`) |
| Database | MongoDB + Mongoose 9 |
| Validation | Zod |
| APIs | REST under `/api/*` (main). GraphQL read-only at `POST /api/graphql` |
| Tests | Vitest |
| Seed | `tsx` + `npm run seed` (owner account) |

Other notes: RBAC lives in `lib/rbac.ts` and `lib/roles.ts`. Pages are `app/(internal)` for staff and `app/(portal)` for clients. Env keys are in `.env.example` (`MONGODB_URI`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`).

## Complete operational lifecycle

This is the full path a job takes in Leadyfy OS.

**Lead / Client → Onboarding → Package / Order → Scripting → Creator Match → Shoot → Editing → Client Review → Revisions → Final Delivery → Payout & Reports**

### 1. Lead / Client

Sales or owner adds the person in **Clients**. Status starts at **Lead**, then **New**.

Fill name, company, email, phone, WhatsApp, brand, industry, GST, source, assigned employee, and a portal password.

### 2. Onboarding

Move the client to **Onboarding**, then **Active**. Add brand kits and assets on the client page. Give them the portal login: **client name + portal password** at `/portal/login`.

### 3. Package / Order

On the client (or **Orders**), add a package: video count, price, GST, dates, team. Status: **New → Onboarding → In Production → Partially Delivered → Completed**.

The live counter tracks ordered, assigned, completed, delivered, and remaining videos.

### 4. Scripting

A script writer adds a script on **Scripts**: client, order, video #, language, text, links, deadline. Status: **Draft → Assigned → In Review → Sent to Client**.

The client opens the portal, reads the script, and **Approves** or asks for a **Revision**. When it is approved, mark it **Ready for Shoot**.

### 5. Creator Match

On **Creators**, pick a creator by niche, language, location, and availability (**Available / Booked / Unavailable / On Hold**). Set availability windows so two shoots cannot book the same person at the same time. Tag the creator on the script, shoot, and later the video.

### 6. Shoot

On **Shoots**, book date, place, creator, cameraman, shoot manager, assistant, and approved scripts. Use the day / week / month calendar.

Complete the pre-shoot checklist (script approved, creator confirmed, location, product, briefing). After the shoot: footage uploaded, raw file check, reshoot flag if needed. Status can be **Scheduled, Confirmed, In Progress, Completed, Cancelled, Reshoot Required**.

### 7. Editing

On **Videos**, the editor takes the job. Pipeline: **Script Approved → Shoot Pending → Raw Footage Received → Video Editing → Internal QA**. The editor dashboard sorts by overdue, due today, due tomorrow.

### 8. Client Review

Move the video to **Client Review**. The client watches it in the portal and **Approves** or **Request Revision**, with timestamped comments.

### 9. Revisions

A revision sets status to **Revision**, adds 1 to the revision count, and sends the video back to the editor. Repeat until the client is happy.

### 10. Final Delivery

After approval the video is **Delivered** (blocked if the invoice is **Unpaid** or **Overdue**). The order counter goes up. The client sees the final Drive / cloud link under portal **Deliveries**.

### 11. Payout & Reports

- **Payments:** invoice amount, received, balance, Unpaid / Partially Paid / Paid / Overdue
- **Expenses:** salaries, office, studio, equipment, fuel, payouts
- **Payouts:** pay the creator per video (no double pay)
- **Analytics** and the **Dashboard:** revenue, expenses, creator payouts, net profit, receivables, new clients, pending scripts, task urgency, pending approvals

---

On Render: `npm install && npm run build`, start with `npm start`. Set `NEXTAUTH_URL=https://laedfyf.onrender.com` (not localhost), `NEXTAUTH_SECRET`, `MONGODB_URI`, `SEED_OWNER_EMAIL`, and `SEED_OWNER_PASSWORD`. In Atlas Network Access allow `0.0.0.0/0`. If login still returns 401, the owner is missing or Mongo is blocked. Uploads on the server disk are lost on restart. Back up MongoDB in Atlas.


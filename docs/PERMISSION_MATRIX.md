# Permission matrix

Generated directly from `backend/src/routes/*.js` (every `requireRole(...)` call) plus a
manual check of the controllers most likely to need per-record ownership checks on top of
the role check. This is the source of truth for "who can hit which endpoint" — if a route
below has no listed role, it only requires `authenticate` (any logged-in account/patient).

**Headline finding: every route in the app already has a role check.** There is no route
that's missing `requireRole` entirely. The remaining work is narrower than a full RBAC
build-out — it's the object-level ("can THIS doctor act on THIS specific record") layer on
top of the role check, and that's mostly already handled too (see "Ownership checks" below).

## Route → role table

| Route | Method | Roles allowed |
|---|---|---|
| `/ambulance-requests` | GET | receptionist, admin |
| `/ambulance-requests/:id/status` | PATCH | receptionist, admin |
| `/analytics/overview` | GET | admin |
| `/announcements` | GET/POST | admin |
| `/announcements/:id/toggle` | PATCH | admin |
| `/announcements/:id` | DELETE | admin |
| `/appointments` | POST | patient |
| `/appointments/for-patient` | POST | receptionist, admin |
| `/appointments/:id/checkin` (line 29-31) | POST | receptionist, admin |
| `/appointments/available-slots` | GET | *any authenticated* |
| `/appointments/cancel-reasons` | GET | *any authenticated* |
| `/appointments/mine` | GET | *any authenticated* (filtered by ownership inside the controller) |
| `/appointments/lookup/:code` | GET | *any authenticated* (patients blocked inside the controller) |
| `/appointments` | GET | admin, receptionist |
| `/appointments/:id/status` | PATCH | admin, doctor, nurse, receptionist |
| `/appointments/:id/assign-doctor` | PATCH | admin, receptionist |
| `/appointments/:id/assign` | PATCH | admin, receptionist |
| `/appointments/:id` | DELETE (cancel) | *any authenticated* — ownership enforced inside (patient/doctor can only cancel their own; receptionist/admin/nurse can cancel any) |
| `/audit-logs` | GET | admin |
| `/billing` | POST | receptionist, admin |
| `/billing/my-bills` | GET | patient |
| `/billing` | GET | receptionist, admin |
| `/billing/:id` | GET | receptionist, admin |
| `/billing/:id/pay` | PATCH | receptionist, admin |
| `/departments` | POST | admin |
| `/departments/:id/assign-doctor` | PATCH | admin |
| `/departments/:id/remove-doctor` | PATCH | admin |
| `/encounters` | POST | doctor |
| `/encounters/:id` | PATCH | doctor, admin — ownership enforced inside (only the doctor who wrote it, or admin) |
| `/encounters/mine` | GET | patient |
| `/encounters/patient/:patientId` | GET | doctor, nurse, admin — **any** clinical staff can view **any** patient's history (by design in most hospital systems, but worth confirming with the stakeholder — see below) |
| `/finance/cashflow` | GET | admin |
| `/finance/salary-slips` | GET/POST | admin |
| `/finance/salary-slips/:id/pay` | PATCH | admin |
| `/ipd/wards` | POST/PATCH/DELETE | admin |
| `/ipd/wards` | GET | doctor, nurse, receptionist, admin |
| `/ipd/wards/:id/beds*` | POST/PATCH/DELETE | admin |
| `/ipd/wards/:id/beds/:bedId/status` | PATCH | admin, nurse |
| `/ipd/admissions` | POST | doctor, receptionist, admin |
| `/ipd/admissions` | GET | doctor, nurse, receptionist, admin |
| `/ipd/admissions/:id/transfer` | PATCH | doctor, nurse, admin |
| `/ipd/admissions/:id/discharge` | PATCH | doctor, admin |
| `/ipd/admissions/:id/bill` | POST | receptionist, admin |
| `/leave` | POST | doctor, nurse, receptionist, pharmacist |
| `/leave/mine` | GET | *any authenticated* (filtered by ownership inside the controller) |
| `/leave` (pending) | GET | admin |
| `/leave/history` | GET | admin |
| `/leave/:id/conflicts` | GET | admin |
| `/leave/:id/approve` | PATCH | admin |
| `/leave/:id/reject` | PATCH | admin |
| `/patients/me` | GET/PATCH | patient |
| `/patients/:id` | GET | doctor, nurse, receptionist, admin |
| `/patients/search` | GET | doctor, nurse, receptionist, admin |
| `/patients` | POST | receptionist, admin |
| `/pharmacy/prescriptions` | POST | doctor |
| `/pharmacy/prescriptions/:id` | GET | doctor, pharmacist, nurse, receptionist, admin |
| `/pharmacy/my-prescriptions` | GET | patient |
| `/pharmacy/prescriptions/:id/availability` | PATCH | pharmacist |
| `/pharmacy/medicines` | POST | pharmacist |
| `/pharmacy/medicines` | GET | *any authenticated* |
| `/pharmacy/medicines/expiring` | GET | pharmacist, receptionist, admin |
| `/pharmacy/medicines/:id` | PATCH/DELETE | pharmacist |
| `/pharmacy/medicines/:id/batches*` | POST/PATCH | pharmacist |
| `/queries` | POST | patient |
| `/queries/on-behalf` | POST | receptionist, admin |
| `/queries/mine` | GET | patient |
| `/queries/:id/patient-reply` | PATCH | patient |
| `/queries/:id` (staff view) | GET | doctor, nurse, receptionist, pharmacist |
| `/queries` (all) | GET | admin |
| `/queries/:id/manage` | PATCH | admin |
| `/queries/:id/reply` | PATCH | admin, doctor, nurse, receptionist, pharmacist |
| `/queue/join` | POST | patient |
| `/queue/:id/status` | PATCH | doctor, nurse, receptionist, admin |
| `/schedule/available` | GET | patient |
| `/schedule/mine` | GET | doctor |
| `/schedule/doctor/:doctorId` | GET/PUT | admin |
| `/staff` | POST/GET | admin |
| `/staff/:id` | PATCH/DELETE | admin |
| `/staff-messages` | POST/GET/DELETE | any staff role (doctor, nurse, receptionist, pharmacist, admin) |
| `/auth/*` | — | public / self-service (see `routes/auth.js` directly — login, OTP, refresh, logout, sessions) |
| `/captcha/*` | — | public |
| `/chatbot/*` | — | public (rate-limited) |

## Ownership checks already in place (verified in controllers, not just routes)

These matter more than the route-level role check for hospital data, and are already correct:

- **`cancelAppointment`** — a patient can only cancel their own; a doctor can only cancel
  their own; receptionist/admin/nurse can cancel any (front-desk duty).
- **`updateEncounter`** — only the doctor who wrote the encounter, or admin, can edit it.
- **`getMyAppointments` / `getMyLeaveRequests` / `getMyPrescriptions` / `getMyEncounters` /
  `getMyBills` / `getMyQueries`** — all filter by `req.user._id` server-side, not a
  client-supplied id, so nobody can pass someone else's id to see their records.
- **`getAppointmentByCode`** — explicitly blocks the `patient` role from using it, so a
  patient can't browse other patients' appointments by guessing codes.

## Open item worth a product decision, not a bug fix

- **`GET /encounters/patient/:patientId`** and **`GET /patients/:id`** — any doctor, nurse,
  or receptionist/admin can pull up *any* patient's full record by id, not just patients
  they're currently treating. This is standard in most hospital-management systems (a
  patient can be seen by any on-duty clinician, especially in emergencies), so it's very
  likely intentional — but if HeartStone wants to restrict this to "only doctors with an
  appointment/admission tied to this patient," that's a real (larger) change, not a quick
  fix, and should be a deliberate decision rather than something to silently tighten.

## What's genuinely still open from the original work order

- Redis-backed rate limiting (current limiters are in-process only — fine for one API
  instance, not safe across multiple).
- Automated regression tests for the ownership checks above (they're correct today, but
  nothing fails CI if a future edit removes one).
- Live-MongoDB concurrency verification — can't be run from this sandbox (no network
  access to Atlas/a real cluster); needs to happen against your actual infrastructure.

# Admin-Driven Bus Assignment at Approval Time

## Problem

Today, when a department submits a bus request (`POST /api/reservations/request`), the
backend immediately round-robin-assigns specific bus number(s) and pushes a LINE
notification to the assigned driver(s) — before any admin has reviewed the request.
Admin approval only flips `status` to `approved`; it never chooses the vehicle.

This is backwards for how the university actually wants to operate: admin should be
the one deciding which bus goes to which request, at approval time, based on their own
judgement (e.g. maintenance schedules, driver availability the auto-assignment can't see).

## Goals

- Move bus-number assignment from request time to approval time.
- Admin picks the bus(es) manually when approving a request.
- Driver LINE notification fires only once a bus is actually assigned (at approval).
- Daily quota enforcement (max 3 reservations/day) stays at request time, unchanged.
- Multi-bus requests (`bus_count` up to 3) are approved as a single unit — admin picks
  all buses for the request and approves once, not one bus at a time.

## Non-goals

- No change to the daily-quota logic itself (still `MAX_PER_DAY = 3`, checked at
  request time).
- No dropdown pre-filtering of already-booked buses in the admin UI — the server
  validates on submit and returns a clear error instead. Filtering can be added later
  as a UX enhancement if it turns out to matter.
- Rejecting a request always rejects the whole group (all buses in the request), not
  individual bus slots. There is no assigned bus yet at pending state, so a
  per-bus reject has no meaningful target. **Assumption** — flagged for the user, not
  independently confirmed with a dedicated question.

## Data model change

`bus_reservations.bus_number` becomes nullable. A pending row has no bus assigned yet;
an approved row always has one.

```sql
-- backend/migrations/008_bus_number_nullable.sql
ALTER TABLE bus_reservations MODIFY bus_number VARCHAR(10) NULL;
```

The existing `UNIQUE KEY uq_bus_date (bus_number, reserved_date)` is unaffected: MySQL
treats every `NULL` in a unique index as distinct from every other `NULL`, so multiple
pending rows on the same date (all with `bus_number = NULL`) do not collide.

`reservation_group` (already exists, `CHAR(36)`) becomes the unit that ties a whole
multi-bus request together for both request-time insert and approval-time update —
this was already used for round-robin bookkeeping; it is now also the join key for
grouped approval.

## Backend: `POST /api/reservations/request` (`routes/reservations.js`)

- Remove the round-robin bus-picking logic entirely: `available`, `totalMap`, the
  sort/slice that produces `assignedBuses`.
- Keep the daily quota check exactly as-is (`COUNT(*) ... WHERE reserved_date = ? AND
  status IN ('pending','approved')` against `MAX_PER_DAY`), including the existing
  clamp of `bus_count` to remaining quota.
- Insert `actualCount` rows, each with `bus_number = NULL`, `status = 'pending'`,
  sharing one `reservation_group` UUID — same insert loop structure as today, minus
  the bus-number value and minus the per-row driver LINE push (that push moves to
  approval, see below).
- Admin-facing LINE Notify (sent once per request, unchanged trigger point) drops the
  "รถที่จัดสรร: ..." line and instead states the requested count, e.g.
  `🚍 ขอรถ: 2 คัน (รอ admin เลือกรถ)`.
- JSON response drops `assigned_buses` (nothing is assigned yet). Success message
  becomes generic: `ส่งคำขอจองรถเรียบร้อยแล้ว รอ admin ตรวจสอบและเลือกรถ`.

## Frontend: `BusRequestModal.tsx`

- Success step (`step === 'success'`) removes the "รถที่ระบบจัดสรรให้" block that reads
  `assignedBuses` — that data no longer exists. Keep the rest of the success screen
  (checkmark, "รอ admin ตรวจสอบและแจ้งผลให้ทราบ", close button) unchanged.

## Backend: `GET /admin/reservations` (`routes/pages.js`)

- Query still selects `reservation_group` (already does, via `SELECT id, bus_number,
  department, ... status, admin_note, created_by, created_at` — add
  `reservation_group` to the column list).
- After fetching, group the `pending` rows by `reservation_group` in JS before passing
  to the template: one card per request (not per bus). Each group carries: the shared
  fields (department, reserved_date, note, requester/coordinator info, document_path),
  the list of row `id`s in the group, and the count (`group.length`) — the number of
  bus dropdowns to render.
- `approved`/`rejected` rows in the main table stay ungrouped, one row per bus, exactly
  as today (they already have a concrete `bus_number`).

## Backend: `POST /admin/reservations/approve` (`routes/pages.js`)

Signature changes from `{ id, admin_note }` to `{ reservation_group, bus_numbers[],
admin_note }`.

1. Look up all `pending` rows for the given `reservation_group` server-side (never
   trust a client-submitted list of row ids for which rows to touch).
2. If no pending rows remain for that group (e.g. another admin already
   approved/rejected/deleted it), redirect with an error — no update happens.
3. Validate `bus_numbers.length === pendingRows.length`; every entry non-empty.
4. Validate no duplicate values within `bus_numbers` itself (same request can't get
   the same bus twice).
5. Inside a transaction: re-check, for each candidate bus number, that no *other*
   reservation (`status IN ('pending','approved')`, same `reserved_date`, different
   `reservation_group`) already holds that bus number. This re-check happens inside
   the same transaction as the update (not just as an earlier read) to close the race
   window between two admins approving conflicting requests concurrently. If any
   conflict is found, roll back and redirect with an error naming the conflicting bus
   number(s).
6. If clear: `UPDATE` each row in the group — `SET bus_number = ?, status =
   'approved', admin_note = ?, created_by = ? WHERE id = ?` — one call per row,
   pairing `bus_numbers[i]` with `pendingRows[i].id`. Commit.
7. After commit, for each newly-assigned bus, look up its current driver (same
   join query used today) and send the LINE push — same message content as the
   current request-time push, just fired here instead.

## Backend: `POST /admin/reservations/reject` (`routes/pages.js`)

Changes from `{ id, admin_note }` to `{ reservation_group, admin_note }`. Updates every
`pending` row in the group to `status = 'rejected'` in one query
(`WHERE reservation_group = ? AND status = 'pending'`).

## Backend: `POST /admin/reservations/delete`

Unchanged — still operates on a single row `id`. This path is for individual
historical rows (including admin-direct bookings, which always have a concrete
`bus_number` and never share a `reservation_group`).

## Template: `admin_reservations.ejs`

- Pending list section iterates over the JS-grouped requests instead of raw rows.
- Each card's approve `<form>` gets a hidden `reservation_group` field (replacing the
  current hidden `id`) plus `group.length` `<select name="bus_numbers[]">` dropdowns,
  each listing all 30 buses (`busList`) — no client-side filtering of already-booked
  buses.
- Each card's reject `<form>` gets the same hidden `reservation_group` field
  (replacing hidden `id`).
- Bottom "รายการจองรถทั้งหมด" table lists every row unfiltered, same as today. Add a
  defensive display rule: if `bus_number` is null, show "รอเลือกรถ" instead of a blank
  cell (pending rows already have their own dedicated card above, so this only guards
  against a pending row appearing in this table too).

## Testing plan

Reuse the supertest + mocked-`db` harness pattern already used to verify the earlier
`multipart/form-data` fix (temporary script, deleted after verification, mocking
`../db` and `../services/lineNotify`):

1. Submit a 2-bus request → assert 2 rows inserted with `bus_number = NULL`, same
   `reservation_group`, and that `sendLinePush` was **not** called (no driver
   notification yet).
2. Approve with a duplicate bus number in `bus_numbers[]` (e.g. `['TC001','TC001']`)
   → assert rejection with a "duplicate in this request" error, no DB update.
3. Approve where one selected bus number is already booked by a different
   `reservation_group` on the same date → assert rejection naming the conflicting bus
   number, no DB update.
4. Approve with two valid, non-conflicting bus numbers → assert both rows become
   `approved` with their respective `bus_number`, and `sendLinePush` was called once
   per bus.
5. Reject a group → assert all rows in the group become `rejected` in one call.

## Migration rollout note

This spec doesn't cover deployment mechanics (production is a separate Windows/IIS
box managed via `pm2`, per `CLAUDE.md`) — that's the same manual scp + `npm run
build` + `pm2 restart` flow already used for the previous fix, plus running the new
migration SQL against the production `db_bustransit` database before restarting the
backend.

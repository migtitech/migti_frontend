# IMPLEMENT_PROMPT — per-session feature implementation

> Paste the block below to a fresh agent to **implement ONE feature's code** from its already-written
> `features/<id>.md` plan. This is the _builder_ role — distinct from
> [AGENT_PROMPT.md](AGENT_PROMPT.md), which _authors_ the plan doc. Only run this after the feature's
> `features/<id>.md` exists on both sides.
>
> One feature per session (tight context = lower token cost + higher quality). Replace `F-XXXX`
> with the feature ID whose plan is ready.

---

You are **implementing ONE feature this session: `F-XXXX`** — writing real backend + frontend code
from its plan. The plan is authoritative for _what_ to build; you decide _how_, following the
repo's conventions.

**Read first, in this order (keep it tight — do NOT read the whole repo):**

1. `migti_backend/docs/development/PROGRESS.md` — project state + what's done.
2. `migti_backend/docs/development/features/F-XXXX.md` AND its frontend twin — **your spec**. Build
   exactly this: target schema, endpoints, statuses, migration, FE wiring, files-to-reuse, and the
   feature's **open sub-items** (resolve those with the product owner BEFORE coding — don't guess).
3. `migti_backend/docs/development/MASTER.md` — **§1A decisions D1–D26** (authoritative; obey them),
   plus the `F-XXXX` row (§5) + relationships (§6).
4. `migti_backend/CLAUDE.md` and `migti_frontend/CLAUDE.md` — the layered architecture, conventions,
   response envelope, style, and caveats. **Backend:** `docs/CONVENTIONS.md`, `API_DESIGN.md`,
   `DATABASE.md`. **Frontend:** `docs/CONVENTIONS.md`, `DESIGN_SYSTEM.md`, `API_INTEGRATION.md`.

**Hard rules (do not violate):**

- **Follow the layered slice** exactly (backend: routes → controller → validator(Joi) → service →
  model; errors via `CustomError` + `asyncHandler`; standard `{ success, message, data }` envelope).
  **Copy the nearest existing sibling feature** (e.g. `brand`) — match its idiom, don't invent patterns.
- **Frontend: visual design stays as-is.** Feature = API integration into existing screens. Use the
  existing shadcn/`components/ui` + shared components; every backend call goes through a
  `src/services/*Service.js` (never axios in a view). Any non-submit `<Button>` needs `type="button"`.
- **Obey the decisions**, especially: **D19** (no branch scoping — drop `branchId`), **D20** (RBAC
  is UI-side; don't add backend enforcement), **D9/D10** (variant combination IS the product, keyed
  by a stable code that never changes across stages), **D1** (sales/purchase order rename), **D2**
  (one documented state machine per stage, no legacy fallbacks in new models).
- **Reuse, don't rebuild** — use the helpers/components the plan's "files to reuse" section names
  (e.g. `generateUniqueCode`, `locationService`, `commonFieldsPlugin`, `SchemaTypes`, `DataTable`,
  `CrudFormPage`).
- **Migrations preserve data** — write idempotent scripts under `migti_backend/scripts/`; never do a
  destructive reset of the test DB. Keep existing rows working.
- **Keep MASTER byte-identical** on both sides if you touch it.

**Do this:**

1. Restate the feature in 3 lines + list the plan's **open sub-items**; resolve them with the
   product owner. Do not code until they're answered.
2. **Backend:** implement the slice(s) — model → validator → service → controller → route →
   register in `routes/routes.js`. Write the migration script if the plan calls for one. Run
   `npm run format` + `npm run lint:check`; start `npm run dev` (`:7200`) and exercise each new
   endpoint with a real request (curl / the running UI).
3. **Frontend:** update `src/api/endpoints.js` + the `*Service.js`, then wire the existing view(s)
   per the plan (design unchanged). Run `npm run build` (`:3000` dev) — **the build must stay green**.
4. **Verify in the running app as the owner role** (HOD login `migti.indore.hod@gmail.com` /
   `HodMigti@2341`, or the feature's role): drive the real screen, confirm the flow works end-to-end,
   data persists, and nothing else broke. Use a scratchpad for temp scripts/screenshots — not the repo.
   - **Create real test entries through the UI (not direct DB writes) — one per meaningful
     scenario, and LEAVE them in the DB.** Drive the actual screen for **every** distinct scenario
     / variation the feature supports — at least **5 valid entries**, but add one for **each**
     branch the UI can take (e.g. different types, statuses, roles, optional-vs-required fields,
     edge values, single-vs-multi related records, each conditional section shown/hidden). Confirm
     each one round-trips **UI → API → DB** and appears correctly in the list/detail views.
     - **Prefix every entry's primary label with `TEST `** (e.g. `TEST Procurement One`) and **do
       NOT delete them** — the product owner reviews them in the running app afterward. Use unique,
       obvious identifiers (`idnumber` `TEST…`, emails `test.…@…`) and record the full list in the
       §10 change-log so they can be found and purged later.
   - **Exercise validation with at least 3 invalid attempts, FROM THE UI _and_ directly against the
     API** — verify EVERY validation fires end-to-end: required-field-missing, wrong format/type,
     out-of-range/enum-violation, and duplicate/uniqueness where applicable. Try each **from the UI**
     (does the form block + show the right error?) **and** by POSTing the same payload straight to
     the API (does the backend Joi/service reject it with the matching message/status?), so client
     and server agree.
   - **Validate the validators are ALIGNED — FE (yup) must never be laxer than BE (Joi).** Do a
     **field-by-field comparison** of the frontend schema (`src/validation/*Schema.js` +
     `src/utils/validation.js` helpers) against the backend Joi validator, covering **every field
     and every value scenario the UI can produce** (each boundary: min/max length, pattern, enum,
     required-vs-optional, email TLD, ObjectId shape, conditional/required-when rules). For each,
     confirm the two agree. **The one forbidden outcome is FE-passes / BE-rejects** — if the form
     accepts a value the backend then 400s, that is a bug: **tighten the FE to match BE** (FE may be
     _stricter_ than BE, never _laxer_). Known trap: yup `.email()` is laxer than Joi `.email()`
     (Joi rejects reserved/invalid TLDs like `.local`/`.test`) — the shared `emailRequired`/
     `emailOptional` helpers are TLD-strict to close this; keep them in sync. Record the
     field-by-field alignment result (0 FE-pass/BE-fail mismatches) in the change-log.
   - Verify state transitions and any approval gates the feature has (e.g. draft → pending → active),
     and that scoping/permission rules (zone/category/role) behave correctly.
   - Capture screenshots of the created `TEST` entries + at least one validation error (from the UI)
     as proof (scratchpad).
   - Note: the `TEST`-prefixed entries are intentionally **left in the test DB** for owner review —
     list them in the change-log so they're identifiable; do not leave the DB in a broken state.
5. **Update docs:** tick the `F-XXXX` status checkboxes in `features/F-XXXX.md` (BE + FE sub-status),
   set the MASTER §5 row toward `[x]` when done, add a §10 change-log line (keep both copies
   identical), and update `PROGRESS.md` (mark implemented, note anything discovered, set next).
6. **Stop.** Do not start another feature.

**Constraints:** touch only what `F-XXXX` needs; don't refactor unrelated code. If reality
contradicts the plan, surface it to the product owner and update the plan doc rather than silently
diverging. Commit/push only if explicitly asked. Ask when ambiguous.

---

## The two-agent rhythm per feature

1. **Author session** (`AGENT_PROMPT.md`) → writes `features/F-XXXX.md` (both sides), asks the
   business questions, updates MASTER + PROGRESS.
2. **Implement session** (this file) → builds the code from that plan, verifies in the app, updates
   status + PROGRESS.

Run them as separate sessions so each stays in tight context. The author session can precede the
implement session by any amount of time — the plan doc carries all needed context forward.

## Variants (optional)

- **Backend-only or frontend-only pass:** say _"implement only the backend slice of F-XXXX this
  session"_ (useful for big features) — then a follow-up session does the FE wiring against the live API.
- **Rename features (F-SALES-ORDER / F-PO, D1):** these involve a data migration + touching many
  files — implement backend + migration first, verify, then FE, in separate sessions.

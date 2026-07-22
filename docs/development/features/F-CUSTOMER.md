# F-CUSTOMER — Customer (Industry) onboarding · contacts · branches (Frontend plan)

> **Feature ID:** `F-CUSTOMER` (shared across backend + frontend).
> **Owner roles:** Sales (zone-scoped), HOD.
> **Read with:** [MASTER.md](../MASTER.md) §1A decisions **D6, D7, D12, D14, D19, D29**.
> **Twin file (authoritative for schema/API):**
> [`migti_backend/.../features/F-CUSTOMER.md`](../../../../migti_backend/docs/development/features/F-CUSTOMER.md).
> **Batched with:** [`F-SUPPLIER.md`](F-SUPPLIER.md) — same shape; supplier adds category mapping.
>
> **Prime directive (MASTER):** existing **visual design stays as-is**. This is **feature + API
> integration + mandatory-field tightening** — wire the redesigned backend into the existing
> screens; change UI only where the feature requires it (mandatory validation, rename
> "Client mapping" → "Customer", swap the Purchase-Managers block for Contacts).

---

## 0. Scope (frontend)

The **Customers** area under admin. Covers the customer **form**, **list**, **detail/view**, and
the **contacts** ("Customer contacts") screens — plus the rename of the "Client mapping / Map to
Client" concept to **Customer**, and retiring the **Purchase Managers** block in favour of
**Contacts**.

| UI section        | Route                      | List file                                                      | Form file                                                      | Service                                        |
| ----------------- | -------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------- |
| Customers         | `#/industries` (Customers) | `src/views/admin/IndustryList.js`                              | `src/views/admin/IndustryForm.js` (+ `IndustryView.js`)        | `src/services/industryService.js`              |
| Customer contacts | `#/customer-contacts`      | `src/views/admin/ContactPersonList.js` (`CustomerContactList`) | `src/views/admin/ContactPersonForm.js` (`CustomerContactForm`) | `src/services/industryContactPersonService.js` |
| Customer branches | (inline in IndustryForm)   | —                                                              | field-array in `IndustryForm.js`                               | `src/services/industryBranchService.js`        |

Zone dropdown: `src/services/areaService.js`. Sub-zone: `src/services/subZoneService.js`. Postal
state/city (Address Information): `src/services/locationService.js` (cascading, already used).

---

## 1. Reusable assets already in the codebase (USE THESE)

- **`locationService`** — `getStates()`, `getCitiesByState(state)`, `getByPincode(pin)` — already
  wired in `IndustryForm.js` for the **Address Information** state/city (pincode blur auto-fills).
  Keep as-is; make those fields **required**.
- **`areaService.getAll({ areaType: 'industry' })`** — the **Zone** dropdown (payload key `area`),
  already cascades into `subZoneService.listByZone(area)`. Keep; enforce **active** zones.
- **Shared components:** `PageHeader`, `DataTable`, `RowActions`, `StatusBadge`, `StatusToggle`,
  `FormSection`, `FormField`, `SearchableDropdown`, `Select`, `Switch`. Don't rebuild.
- **`ContactPersonFormBase`** (`ContactPersonForm.js`) already drives both customer & supplier
  contacts via `PARENT_CONFIG` — the rename is a config change, not a rewrite.

---

## 2. Screen-by-screen plan (feature + API; keep design)

### 2.1 Customer form — `IndustryForm.js`

Current sections (verified): Basic Details · Location · **Purchase Managers** · Addresses · Branches
· Business Information · Address Information · Financial Information · Attachments · Additional
Information. The inline `industrySchema` (yup, ~L112–219) currently requires only `name`, `area`,
`shippingAddress`, `billingAddress`.

**Changes:**

1. **Make mandatory (add `.required(...)` to `industrySchema`):**
   - **Location** (`location`) — "Location is required".
   - **Zone** (`area`) — already required on create; **also enforce on edit** (do not leave zone
     blankable). _(Zone stays disabled-on-edit in the UI today; keep it read-only after creation —
     matches D7 immutability. ⚠ confirm whether zone may change pre-query.)_
   - **Address Information:** `state`, `city`, `pincode` — required (pincode 6-digit).
   - **Financial Information:** `paymentTerms` — required.
2. **Credit Limit default ₹20,00,000:** prefill `creditLimit` default `2000000` (editable). Show as
   a number field; keep it changeable at create.
3. **Payment Terms → dropdown** (was free field): `Select` with the backend enum (recommended
   `Advance / Net 15 / Net 30 / Net 45 / Net 60 / Net 90`, default `Net 30` — mirror backend twin).
4. **Retire the Purchase Managers section** (L1024–1123): remove the `purchaseManagers[]` field-array
   from the form. The customer's people are managed as **Contacts** (separate screen, §2.4). Stop
   sending `purchaseManagers` / `purchase_manager_name` / `purchase_manager_phone` in the payload.
   _(Keep the section commented/removed per PO; a later cleanup drops the backend fields once
   query/quotation exports switch to contacts — coordinate with those features.)_
5. **Customer code** is **read-only** and **auto-generated** (`CITY-CUS-<n>`, city from the mapped
   zone — backend derives it). Do **not** add a city dropdown to the customer form for the code;
   the code city comes from the selected **Zone**. Show the resulting `customerCode` read-only on
   edit (as today).
6. Keep the existing **cascading state→city** in Address Information (postal) and the **Zone→Sub-zone**
   cascade in Location — unchanged, just now with required validation on the address block.

**Payload** to `industryService.create/update`: `{ name, area, subZoneId, location, shippingAddress,
billingAddress, state, city, pincode, paymentTerms, creditLimit, gstNumber, category, ...businessInfo,
remarks, internalComments, branches[] }` — **no** `purchaseManagers`.

### 2.2 Customer list — `IndustryList.js`

- Page title stays **"Customers"**.
- **Replace the "Purchase Manager" column** (L176–195, 240–245) with a **Primary Contact** column
  (or drop it) — source the customer's active `industryContactPerson` (isPrimary first) via
  `industryContactPersonService.getAll({ industryId, status:'active' })`, OR simply drop the column
  if per-row contact fetch is too heavy (⚠ recommend: drop the PM column; show Zone + Code + GST).
- Keep Customer Code (now `CITY-CUS-<n>`), Customer name, GST, Zone columns. Keep the Zone filter.

### 2.3 Customer view — `IndustryView.js`

- Company Information tab InfoCards stay (Basic Details, Contact & Business, Address Information,
  Financial Information, **Additional Information** = Remarks + Internal Comments — keep, PO wants
  the remark visible).
- **Replace the "Purchase Managers" section** (L722–771) with a **Contacts** section: fetch
  `industryContactPersonService.getAll({ industryId, status:'active' })` and render each as
  **Designation · Name (first+last) · Phone (`mobileNumber`) · Email** + the contact's `remarks`
  (the "additional information" the PO wants). **Only active contacts are shown** (inactive hidden).
- Keep Branches section (`industryBranchService`). Keep the stat strip / tabs.

### 2.4 Customer contacts — `ContactPersonForm.js` / `ContactPersonList.js`

- **Rename "Client" → "Customer"** in `PARENT_CONFIG.industry` (L60–90): `mapLabel: "Client"` →
  `"Customer"`. This flips the section header **"Client mapping" → "Customer mapping"** and the
  dropdown label **"Map to Client" → "Map to Customer"**, plus `searchPlaceholder`/messages. FK
  key stays `industryId`.
- Contact fields already correct (Identity: first/last/designation/department · Contact info:
  email/secondary/mobile/office · mapping: status + Map-to-Customer + Primary · Additional: remarks).
  **Add nothing new** — the fields the PO listed (designation, name, phone, email, remarks) already
  exist here.
- **Inactive handling:** the form already blanks the mapping and disables the dropdown when
  `status = inactive`; keep. The **customer view/list only pull active contacts** (§2.2/§2.3), so an
  inactive contact is automatically hidden from the customer — satisfies the PO rule.
- `ContactPersonList` (`CustomerContactList`) title "Customer contacts" — keep; it may still show
  all contacts (incl. inactive) with a Status badge for management. Only the **customer detail**
  hides inactive.

### 2.5 Validation source

`industrySchema` is **inline in `IndustryForm.js`** today (not in `src/validation/`). Keep it inline
(match surrounding code) — just add the new `.required()` rules and the `creditLimit` default +
`paymentTerms` enum. Contact yup (`buildSchema` in `ContactPersonForm.js`) already requires
first/last/email and mapping-when-active — no change beyond the label rename.

---

## 3. API wiring changes (frontend)

- `industryService` payload: **drop** `purchaseManagers` / `purchase_manager_*`; ensure
  `location/state/city/pincode/paymentTerms/creditLimit` are always sent. `area` always sent.
- `customerCode` is server-generated (`CITY-CUS-<n>`) — display read-only; never post it.
- `endpoints.js` — no new endpoint needed (existing `INDUSTRIES.*`,
  `INDUSTRY_CONTACT_PERSONS.*`). Response envelope unchanged (`data.industries` + `pagination`,
  `data.industryContactPersons`).
- All calls via services (never axios in a view) — MASTER cross-cutting rule.

---

## 4. Relationships (echo MASTER §6)

Customers defined here feed **F-QUERY** (query tied to customer + its zone, D7), are **separate**
from suppliers (D14), and surface **contacts** on query/quotation screens. Zone/sub-zone come from
**F-SETTINGS**. Field names align with the backend twin (`area`, `subZoneId`, `industryId`).

---

## 5. Verification (implementation pass)

- `npm run build` stays green (the gate).
- Log in as HOD (or sales); **Customers → create**: form now **requires** location, zone, address
  (state/city/pincode), payment terms; **credit limit prefilled 2000000**; **no Purchase Managers
  block**; on save the **customer code renders `CITY-CUS-<n>`** using the mapped zone's city.
- **Customer view** shows a **Contacts** section (designation/name/phone/email + remark), **active
  only**; making a contact inactive removes it from the customer view.
- **Customer contacts** form header reads **"Customer mapping"** / **"Map to Customer"**.
- No design regressions; existing components reused.

---

## 6. Status (docs stage)

**Frontend** — view [x] · service [x] · api-wired [x] · verify [x]
Docs: plan authored 2026-07-21. **IMPLEMENTED + verified 2026-07-21** (FE build green).

## 7. Open sub-items — RESOLVED with product owner (2026-07-21)

- [x] `paymentTerms` enum + default — `Advance/Net 15/30/45/60/90`, **default `Net 30`** (Select dropdown).
- [x] Customer code-city = **mapped zone's city** (backend derives; create blocked if zone.city unset).
- [x] List "Purchase Manager" column → **dropped** (desktop col + mobile row removed; Zone/Code/GST kept).
- [x] Zone **read-only after creation** in the UI (kept disabled-on-edit); code frozen. Query-lock
      deferred to F-QUERY.
- [x] Purchase Managers block **retired now** (form section removed; `purchaseManagers`/`purchase_manager_*`
      no longer sent). Backend legacy fields kept for pipeline PDF exports; remove fully later.
- [x] Contacts surfaced on Customer **View** (active only) + relabelled **"Client mapping" → "Customer"**.

# F-EMP — Employee onboarding + zone/group mapping (Frontend plan)

> **Feature ID:** `F-EMP` (shared). **Owner:** HOD / administrator.
> **Read with:** [MASTER.md](../MASTER.md) §1A **D6, D8, D19, D20**.
> **Twin (authoritative for schema/API):**
> [`migti_backend/.../features/F-EMP.md`](../../../../migti_backend/docs/development/features/F-EMP.md).
>
> **Prime directive:** existing **visual design stays as-is** — feature + API integration + the
> specific UI cleanups below. The form already has the right sections; we adjust behavior.

---

## 0. Scope (frontend)

Route `#/employees` (+ `/employees/new`, `/employees/:id`, view). Files:

- List `src/views/admin/EmployeeList.js` · Form `src/views/admin/EmployeeForm.js` · View
  `src/views/admin/EmployeeView.js`.
- Section components under `src/views/admin/employees/`: `EmployeePersonalInfoSection`,
  `EmployeeCompanyInfoSection` (role/designation/salary/zone/sub-zone), `EmployeeGroupMappingSection`,
  `EmployeeAssetsSection`, `EmployeeAccountDetailsSection` (bank), `EmployeePermissionsSection`,
  `EmployeeFormActions`. **Dead (unused):** `EmployeeHeader.js`, `EmployeeTable.js`.
- Constants `src/constants/employeeRoleDesignations.js` (`ROLE_DESIGNATION_MAP`,
  `getDesignationsForRole`). Zone conditional `src/utils/employeeZoneEligibility.js`.
- Service `src/services/employeeService.js`; schema `src/validation/employeeSchema.js`; endpoints
  `EMPLOYEES` in `src/api/endpoints.js`.

Form is a **stacked-card** layout (not tabbed): Personal → Company (role/designation/zone) →
Group mapping → Assets → Bank → Access Permissions → actions.

---

## 1. Target behavior (feature + API)

### 1.1 Role vs Designation — SHOW DESIGNATION, NEVER ROLE (everywhere)

- The form keeps the Role select (drives designation + conditional mapping) — but **all read-only/
  display surfaces show the DESIGNATION label, never the raw role key**:
  - `EmployeeList.js` — the role column + role filter → show **designation** labels (map role→
    designation via `getDesignationsForRole`/`ROLE_DESIGNATION_MAP`). Remove the hardcoded inline
    role list; import from the constants file.
  - `EmployeeView.js` — show designation, not role. (Currently its `ROLES` map only covers 6/13 —
    replace with the shared constants.)
- Role stays in the payload/data; it's just not surfaced as a label.

### 1.2 Zone/sub-zone (sales roles) — keep current rule

- `EmployeeCompanyInfoSection` renders Zones multi-select + Sub-zone **only when**
  `shouldShowEmployeeZoneFields(role, designation)` (role starts with `sales`). **Keep as-is.**
- Multi-zone ⇒ no sub-zone; **exactly one zone** ⇒ sub-zone enabled (loads via
  `subZoneService.listByZone`). Reset zones/subZone when role becomes non-sales. **Unchanged.**

### 1.3 Group mapping (procurement/purchase roles) — becomes conditional + required

- **Show the Group mapping section ONLY for procurement/purchase-type roles** (not "optional for
  all"). For those roles it is **required** (must pick ≥1 group). Hide it for sales/other roles.
- Keep the existing add-rows group picker UI; emit `assigned_groups[]`.
- **Do NOT build a category UI.** Categories are **auto-derived server-side** from groups
  (`assigned_categories`); optionally the View page can _display_ the derived categories read-only
  (from the API response) so the user sees what the groups resolved to — but no editing.
- Remove the now-dead `categories` CSV handling from the form/schema.

### 1.4 Access Permissions — COMMENT OUT (don't delete)

- Comment out the `EmployeePermissionsSection` usage in `EmployeeForm.js` and the `permissions`
  state/submit wiring (leave the component file in place). Add a marker comment
  `// F-EMP: access permissions parked — see F-RBAC`.
- Stop sending `permissions` in the create/update payload.

### 1.5 System Information — REMOVE from EmployeeView

- Remove the **"System Information"** card (Employee ID, uniqueId, created/updated) from
  `EmployeeView.js`. Also drop the `ID: {uniqueId}` header badge. (Data still in API; just not shown.)

### 1.6 Legacy / dead cleanup

- Drop the legacy single `zoneId` from the form/schema (keep `zoneIds[]`).
- Note the unused `EmployeeHeader.js` / `EmployeeTable.js` (can be removed; not wired).

---

## 2. Service / schema / endpoints

- `employeeService.js` unchanged in shape; payloads drop `permissions`, `zoneId`, hand-set
  `categories`; keep `assigned_groups`, `zoneIds`, `subZoneId`, bank, assets.
- `employeeSchema.js` (yup): remove `permissions`, `zoneId`, `categories`; make `assigned_groups`
  **required for procurement/purchase roles** (conditional), optional/hidden otherwise; keep
  zone/subZone optional (UI-driven). Keep field names aligned with backend Joi.
- `EMPLOYEES` endpoints unchanged. Note: `EmployeePermissionsSection` currently calls axios
  directly (`ADMIN.PERMISSIONS_MODULES`) — since it's being commented out, that direct call goes
  dormant (don't "fix" it now).

---

## 3. Relationships

Consumes zones/sub-zones (F-SETTINGS) and groups/categories (F-CATALOG). Feeds routing/visibility
for sales (zone) and procurement/purchase (category) features. RBAC display gating is UI-side (D20).

---

## 4. Verification (implementation pass)

- `npm run build` green.
- As HOD: create a **sales** employee → zone fields appear; multi-zone hides sub-zone; single zone
  enables sub-zone. Create a **procurement** employee → group mapping shows + is required; on save,
  the view shows derived categories. Create an **other-role** employee → neither zones nor groups.
- List + View show **designation**, never role; no System Information card; no Access Permissions.
- ≥5 valid entries across role types + ≥3 invalid (missing required, bad email/phone, duplicate
  email/idnumber, procurement-without-group) — FE error + BE Joi rejection agree.

---

## 5. Status (docs stage)

**Frontend** — view [x] · service [x] · api-wired [x] · verify [x].
**IMPLEMENTED 2026-07-21** (FE build green; verified end-to-end via the exact payloads
`EmployeeForm.onSubmit` builds, UI→API→DB, for 5 valid + 4 invalid scenarios).

- `employeeZoneEligibility.js`: added `PROCUREMENT_PURCHASE_ROLES`, `isProcurementPurchaseRole`,
  and `shouldShowEmployeeGroupFields` (matches backend set).
- `EmployeeForm.js`: Group mapping card shown + **required only for proc/purchase roles**
  (`showGroupFields`); forces the picker on and clears groups for other roles; **Access
  Permissions card + permissions state/submit commented out** (parked — F-RBAC); `categories`
  dropped from reset/submit; sends `assigned_groups` only for proc/purchase roles.
- `EmployeeGroupMappingSection.js`: `required` prop hides the optional on/off toggle and always
  shows the picker.
- `employeeSchema.js`: `assigned_groups` **required for proc/purchase roles** (yup `.test`);
  removed `categories`; removed from defaults.
- `EmployeeList.js`: role column relabeled **Designation** (shows designation, never role key);
  imports shared `employeeRoleDesignations` constants; removed hardcoded role list + `ROLE_LABELS`.
- `EmployeeView.js`: shows **designation** (role badge removed); **System Information card + ID
  header badge removed**; **derived categories shown read-only** from `assigned_categories`.

**Follow-up 2026-07-21 (personal-info hardening, per owner):**

- `EmployeePersonalInfoSection.js`: added **State** (dropdown from `/location/states`) + **City**
  (cascading from `/location/cities?state=X`, disabled until state chosen) to Personal Information;
  **Pincode auto-fills state/city** on blur (`/location/pincode/:pin`). Reuses `locationService`
  (same pattern as SupplierForm/IndustryForm). `fatherName`, `motherName`, `pincode`, `state`,
  `city` marked **required** (`FormField required`).
- `EmployeeForm.js`: wired the states/citiesByState cascade + `lookupPincode`, resets city on state
  change, passes props to the section; state/city added to load-employee `reset`.
- `employeeSchema.js`: `fatherName`/`motherName`/`state`/`city` **required** (min 2); `pincode`
  **required 6-digit** (`^\d{6}$`); added state/city to defaults. **FE (yup) ↔ BE (Joi) verified
  aligned** — 11-case matrix, 0 FE-pass/BE-fail. No employee code added (owner: only PIN code).

## 6. Open sub-items (mirror backend)

- [x] **Exact procurement/purchase role set (RESOLVED 2026-07-21):** `procurement`,
      `purchase_manager`, `purchase_exicutive`, `localprocurement`, `localpurchase` (all 5).
- [x] **D8 one-category-one-owner — RESOLVED:** one category doc = one group = one owner (by ID).
      Duplicate category _names_ across groups are a F-CATALOG dedupe task, not an F-EMP concern.
- [x] **View shows derived categories read-only (RESOLVED 2026-07-21): YES** — count + names.

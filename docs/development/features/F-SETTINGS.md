# F-SETTINGS — Branch Settings: Company · Zones · Sub-zones (Frontend plan)

> **Feature ID:** `F-SETTINGS` (shared across backend + frontend).
> **Owner role:** HOD (single-tenant — one HOD, no branch, MASTER **D19**).
> **Read with:** [MASTER.md](../MASTER.md) §1A decisions **D6, D7, D8, D19**.
> **Twin file (authoritative for schema/API):**
> [`migti_backend/.../features/F-SETTINGS.md`](../../../../migti_backend/docs/development/features/F-SETTINGS.md).
>
> **Prime directive (MASTER):** existing **visual design stays as-is**. This is **feature + API
> integration** — wire the redesigned backend into the existing screens; change UI only where the
> feature strictly requires it (new state/city dropdowns, a status toggle).

---

## 0. Scope (frontend)

"Branch Settings" is a **sidebar nav GROUP** (`src/_nav.js`), not a tabbed screen. It routes to
standalone pages. This plan covers the **Zones**, **Sub-zones**, and **Company** screens.

| UI section | Route         | List file                        | Form file                                             | Service                          |
| ---------- | ------------- | -------------------------------- | ----------------------------------------------------- | -------------------------------- |
| Zones      | `#/zones`     | `src/views/admin/AreaList.js`    | `src/views/admin/AreaForm.js` (+ `AreaView.js`)       | `src/services/areaService.js`    |
| Sub-zones  | `#/sub-zones` | `src/views/admin/SubZoneList.js` | `src/views/admin/SubZoneForm.js`                      | `src/services/subZoneService.js` |
| Company    | `#/companies` | `src/views/admin/CompanyList.js` | `src/views/admin/CompanyForm.js` (+ `CompanyView.js`) | `src/services/companyService.js` |

Nav group: `src/_nav.js` (Branch Settings group ~lines 1136–1187; Company Information group ~1188+).
Routes: `src/routes.js` (`/zones`, `/sub-zones`, `/companies`).

> Note: `src/views/admin/BranchSettings.js` is an **unrelated HR-signature upload** screen — do
> NOT touch it for this feature.

---

## 1. Reusable assets already in the codebase (USE THESE)

- **`src/services/locationService.js`** — `getStates()` → `data.states: string[]`,
  `getCitiesByState(state)` → `data.cities: string[]`. Backed by `LOCATION` endpoints in
  `src/api/endpoints.js`. **Reference implementation of cascading state→city dropdowns:**
  `src/views/admin/SupplierForm.js` and `IndustryForm.js` (copy that pattern exactly).
- **shadcn/ui + shared components** (MASTER design system): `PageHeader`, `DataTable`,
  `RowActions`, `StatusBadge`, `StatusToggle`, `CrudFormPage`/`FormField`, `Select`, `Switch`,
  `SearchableDropdown`. Do not rebuild.
- Existing services: `areaService`, `subZoneService`, `companyService` (CRUD already wired).

---

## 2. Screen-by-screen plan (feature + API only; keep design)

### 2.1 Zones — `AreaForm.js`

- **Remove** the `companyId` **Company select** and the `branchId` auto-select (D19 — no
  branch/company coupling). If the backend keeps `companyId` optional, set it silently to the one
  company; otherwise omit it from the payload.
- **Replace** the free-text `city` `Input` with **cascading state→city dropdowns** driven by
  `locationService` (add a **`state`** field). Pattern: on state change → `getCitiesByState(state)`
  → populate city options; clear city when state changes. Copy `SupplierForm.js`.
- **Add** an **enable/disable status** control (`Switch`/`StatusToggle` → `isActive`).
- Keep `name` and `areaType` (`market`/`industry`) select.
- **Payload** to `areaService.create/update`: `{ name, state, city, areaType, isActive }`
  (+ optional `companyId` only if backend still wants it).

### 2.2 Zones — `AreaList.js`

- Add columns: **State**, **Status** (StatusBadge/toggle). Keep name, city, zone-type.
- Filters: keep `areaType`; **replace/keep** company filter only if backend keeps companyId
  (recommend remove — single company). Add optional status filter.
- Keep `DataTable` + `PageHeader` design; `RowActions` view/edit/delete gated by role (D20, UI-side).

### 2.3 Sub-zones — `SubZoneForm.js` / `SubZoneList.js`

- Keep design and the grouped-by-zone display (`subZoneService.listGrouped()`).
- Zone dropdown (`areaService.getAll`) should list **active** zones (`isActive` filter) with
  `name` (drop `- city` if city now optional, or keep `name - city`).
- If backend adds `subZone.isActive`, surface an enable/disable toggle (parity) — otherwise leave as-is.
- Payload unchanged: `{ zoneId, name }` (+ `isActive` if added).

### 2.4 Company — `CompanyForm.js` / `CompanyList.js` / `CompanyView.js`

- **Single company:** the app effectively has one company. Do **not** add a create flow in normal
  ops; the screen is **view + edit** of the one company. If a list is shown, it will have one row.
- **Add display of `code`** (new backend field) in `CompanyView`/`CompanyList` and (read-only or
  editable per backend) in `CompanyForm`.
- **Do NOT** add state/city to the company (they live on the zone).
- Where any other screen needs "the company" (e.g. a header/label), fetch via
  `companyService.getAll()` → `[0]` (or the new `companies/current` endpoint) and render
  **read-only, auto-selected** — no company dropdown.

---

## 3. API wiring changes (frontend)

- `areaService` create/update payloads gain `state` + `isActive`, drop `branchId`(/`companyId`).
- `endpoints.js`: add `COMPANIES.CURRENT` (`/companies/current`) if backend adds it; otherwise use
  `LIST` and take `[0]`.
- Response handling stays on the standard envelope: `res.data.data.areas` + `pagination`, etc.
- All calls remain through services (never axios directly in a view) — MASTER cross-cutting rule.

---

## 4. Relationships (echo MASTER §6)

Zones/sub-zones defined here are consumed by **F-CUSTOMER** (customer↔zone), **F-EMP**
(employee↔zone/sub-zone), **F-QUERY** (zone via customer branch), **F-TARGET**. Keep field names
aligned with the backend twin.

---

## 5. Verification (implementation pass)

- `npm run build` stays green (the gate).
- Log in as HOD; open **Zones** → create/edit a zone with state→city dropdowns + status toggle →
  saves and lists correctly (State + Status columns render).
- **Sub-zones** create/list-grouped still works; zone dropdown shows active zones.
- **Company** view/edit shows `code`; no second company can be created.
- No design regressions; existing components reused.

---

## 6. Status (docs stage)

**Frontend** — view [x] · service [x] · api-wired [x] · verify [x]
Docs: **implemented 2026-07-21**. `npm run build` green. Backend schema/API authoritative in the twin file.

### Implementation notes (what was wired)

- **AreaForm:** removed Company/Branch selects; added cascading **state → city** dropdowns
  (`locationService`, copied from SupplierForm) + an **isActive** `StatusToggle`. Payload now
  `{ name, state, city, areaType, isActive }`.
- **AreaList:** dropped Company filter/column; added **State** column, **Status** column
  (`StatusBadge`), and a **Status** filter (`isActive`). **AreaView:** shows State + Status,
  removed Company row.
- **SubZoneForm:** zone dropdown now lists **active** zones (`isActive: true`); added **isActive**
  toggle. **SubZoneList:** added a **Status** column + status toggle in the edit modal.
- **Company:** `companyService.getCurrent()` + `COMPANIES.CURRENT` endpoint; **Code** shown in
  `CompanyList` (column), `CompanyView` (detail row), and `CompanyForm` (read-only in edit).

## 7. Open sub-items (RESOLVED 2026-07-21 — mirror backend)

- [x] Company `code` rule → generated `COM<n>`; shown read-only in list/view/form.
- [x] `companyId` on zone payload → **dropped** (D19); no company field on the zone form.
- [x] `subZone.isActive` toggle → **added** (form + edit modal + list column).

# F-SUPPLIER — Supplier onboarding · contacts · category map · L1/L2/L3 (Frontend plan)

> **Feature ID:** `F-SUPPLIER` (shared across backend + frontend).
> **Owner roles:** Procurement (category-scoped), HOD.
> **Read with:** [MASTER.md](../MASTER.md) §1A decisions **D8, D12, D13, D14, D19, D29**.
> **Twin file (authoritative for schema/API):**
> [`migti_backend/.../features/F-SUPPLIER.md`](../../../../migti_backend/docs/development/features/F-SUPPLIER.md).
> **Batched with (shared design):** [`F-CUSTOMER.md`](F-CUSTOMER.md) — same shape. This file details
> only the **supplier deltas**; for shared behavior (mandatory fields, `paymentTerms` dropdown +
> ₹20-lakh `creditLimit`, contacts, "Client mapping" relabel, inactive-contact hiding) it defers to
> F-CUSTOMER.
>
> **Prime directive (MASTER):** existing **visual design stays as-is** — feature + API integration.

---

## 0. Scope (frontend)

The **Suppliers** area under admin: supplier **form**, **list**, **view**, and **supplier contacts**.
Supplier deltas vs customer: **category mapping** (+ L1/L2/L3 grade, D13), a **`codeCity` dropdown**
driving the `CITY-SUP-<n>` code, and surfacing **contacts** on the view (which it doesn't today).

| UI section        | List file                                                      | Form file                                                      | Service                                        |
| ----------------- | -------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------- |
| Suppliers         | `src/views/admin/SupplierList.js`                              | `src/views/admin/SupplierForm.js` (+ `SupplierView.js`)        | `src/services/supplierService.js`              |
| Supplier contacts | `src/views/admin/ContactPersonList.js` (`SupplierContactList`) | `src/views/admin/ContactPersonForm.js` (`SupplierContactForm`) | `src/services/supplierContactPersonService.js` |
| Supplier branches | field-array in `SupplierForm.js`                               | —                                                              | `src/services/supplierBranchService.js`        |

Category dropdown: `src/services/categoryService.js`. Postal state/city: `locationService.js`.

---

## 1. Reusable assets already in the codebase (USE THESE)

- **`SupplierForm.js` already has**: cascading state→city (Address Information, identical to
  IndustryForm), a **category multi-select** ("Categories & address" section, from
  `categoryService.getAll`), bank details, catalog upload, branches with per-branch
  `contactPersonId`, and a **Status (Active/Inactive)** control in Basic details.
- **`ContactPersonFormBase`** drives supplier contacts via `PARENT_CONFIG.supplier` — the relabel is
  a config change.
- Shared components (`PageHeader`, `DataTable`, `SearchableDropdown`, `StatusBadge`, `Select`, …) —
  reuse; don't rebuild.

---

## 2. Screen-by-screen plan (deltas over F-CUSTOMER)

### 2.1 Supplier form — `SupplierForm.js`

Shared changes (same as IndustryForm — see F-CUSTOMER §2.1): make **address/phone/email/gst**,
**Address Information (state/city/pincode)**, and **payment terms** required; **credit limit default
`2000000`** (editable); **payment terms → dropdown enum** (shared set). Keep the existing status
toggle, cascading state→city, bank/catalog/branch sections.

**Supplier-specific:**

1. **`codeCity` dropdown (NEW):** a `Select` for the code city — enum `['Indore','Noida']`, **default
   `Indore`** (D29). This drives the `CITY-SUP-<n>` code. Place it in Basic details. **This is
   distinct** from the postal Address-Information city (which stays free/cascading). _(Customers have
   NO such dropdown — their code city comes from the zone; suppliers need it because they map to
   categories, not zones.)_
2. **Supplier code read-only:** show `supplierCode` (`CITY-SUP-<n>`) read-only on edit — the field is
   **new** (backend didn't emit a code before). Never post it.
3. **Category mapping (existing) + L1/L2/L3 grade (NEW):** the "Categories & address" multi-select
   stays. For **D13**, extend each selected category with a **grade select (`L1`/`L2`/`L3`)** — i.e.
   render the picked categories as rows of `{ category name, grade dropdown }` and post
   **`categoryGrades: [{ category, grade }]`** (mirror the backend model). Grade is **optional at
   onboarding** (may be set later during procurement). Keep sending `categories` in parallel if the
   backend keeps the legacy array during transition. _(⚠ confirm the exact payload key
   `categoryGrades` with the backend twin.)_
4. **Reconcile `phone_2`:** the form currently marks **`phone_2` required** — the backend makes only
   `phone_1` required. Align to the backend: **`phone_1` required, `phone_2` optional** (⚠ confirm;
   recommend optional).

**Payload** to `supplierService.create/update`: shared fields + `codeCity`, `categoryGrades[]`
(+ legacy `categories[]` during transition), `phone_1` (req)/`phone_2` (opt) — **no** purchase-manager
concept (suppliers never had one).

### 2.2 Supplier list — `SupplierList.js`

- Add a **Supplier Code** column (`supplierCode`, now `CITY-SUP-<n>`) — new.
- Keep name/GST/category columns; optionally add a **category-grade** view later (D13 "L1/L2/L3 per
  category" report belongs to F-PROCUREMENT, not this list). Keep the category filter.

### 2.3 Supplier view — `SupplierView.js`

- **Add a Contacts section** (it has none today): fetch
  `supplierContactPersonService.getAll({ supplierId, status:'active' })` and render each as
  **Designation · Name · Phone (`mobileNumber`) · Email** + `remarks`. **Active only** (inactive
  hidden) — same rule as the customer.
- Keep existing Categories, Bank, Catalog, Branches, Address, Financial cards. Show `supplierCode`.
- Show the **category grades** (L1/L2/L3) on the Categories card once the model lands.

### 2.4 Supplier contacts — `ContactPersonForm.js` (`SupplierContactForm`)

- **Relabel "Client" → "Supplier"** in `PARENT_CONFIG.supplier`: section header → "Supplier mapping",
  dropdown → "Map to Supplier". FK key stays `supplierId`. (Same pattern as the customer's → "Customer".)
- Fields already correct (mirror the customer contact). Inactive handling identical — hidden from the
  supplier view.

---

## 3. API wiring changes (frontend)

- `supplierService` payload gains `codeCity`, `categoryGrades[]`; ensure
  `address/phone_1/email/gst/state/city/pincode/paymentTerms/creditLimit` always sent; `phone_2`
  optional.
- `supplierCode` server-generated — display read-only, never post.
- `endpoints.js` — no new endpoint (`SUPPLIERS.*`, `SUPPLIER_CONTACT_PERSONS.*` exist). Envelope
  unchanged. All calls via services.

---

## 4. Relationships (echo MASTER §6)

Suppliers feed **F-PROCUREMENT / F-FULFILLMENT / F-PO** (category-mapped, L1/L2/L3 rate source),
are **separate** from customers (D14), and surface **contacts** on procurement/PO screens.
Categories come from **F-CATALOG**. Field names align with the backend twin (`categoryGrades`,
`supplierId`, `codeCity`).

---

## 5. Verification (implementation pass)

- `npm run build` stays green.
- **Suppliers → create**: form now requires address/phone_1/email/gst/state/city/pincode/payment
  terms; **credit limit prefilled 2000000**; **codeCity dropdown default Indore**; on save the
  **supplier code renders `CITY-SUP-<n>`**; category rows carry an **L1/L2/L3 grade** select.
- **Supplier view** shows a **Contacts** section (active only) + `supplierCode` + category grades.
- **Supplier contacts** form header reads **"Supplier mapping" / "Map to Supplier"**.
- Deleting a supplier **soft-deletes** (row disappears from the list but data preserved) — no hard delete.
- No design regressions.

---

## 6. Status (docs stage)

**Frontend** — view [x] · service [x] · api-wired [x] · verify [x]
Docs: **plan authored 2026-07-21**; **IMPLEMENTED + verified 2026-07-21** (batched with
F-CUSTOMER). Backend authoritative in the twin.

**Implementation notes (2026-07-21):** `SupplierForm` now requires address/phone_1/email/gst/state/
city/pincode/paymentTerms + ≥1 category; **`phone_2` optional**; **credit limit default 2000000**;
**payment-terms dropdown** (`Advance / Net 15/30/45/60/90`); **`codeCity` dropdown** (Indore/Noida,
default Indore) driving the code; **supplier code shown read-only** (`CITY-SUP-<n>`); each picked
category renders an **L1/L2/L3 grade select** and the form posts `categoryGrades[]` (+ legacy
`categories[]`). `SupplierList` has a **Supplier Code** column; `SupplierView` shows an **active-only
Contacts** section + `supplierCode` + per-category grades. Supplier contact form relabelled
**"Supplier" / "Map to Supplier"**. **Email TLD-strict:** form email uses `emailRequired()` /
`emailOptional()` (TLD-strict) so the FE never accepts a `.local`/`.test` the backend rejects — FE
never laxer than BE. `npm run build` **green**.

## 7. Open sub-items (RESOLVED with product owner 2026-07-21)

- [x] `codeCity` enum `[Indore, Noida]` default Indore.
- [x] `categoryGrades[]` payload = `[{ category, grade: 'L1'|'L2'|'L3'|null }]`; grade optional at
      onboarding (rendered as a per-category grade `Select`).
- [x] `phone_2` → **optional** (FE tightened to match backend).
- [x] ≥1 category mandatory at create (D8) — **yes** (yup `min(1)`).
- [x] `paymentTerms` enum `Advance/Net 15/30/45/60/90`, default **Net 30**.
- [x] Grades shown **on the view Categories card** (per-category `· L1/L2/L3`). The "per-category
      L1/L2/L3 count" report is deferred to F-PROCUREMENT.

# F-PRODUCT-MASTER (frontend) — Product Master: Group · Category · Subcategory · Brand · Product · Variant combinations

> **Feature ID:** `F-PRODUCT-MASTER` (shared with the backend). Owner's name: **"Product Master"**.
> **This is the FRONTEND-leaning twin.** Backend-leaning doc (schema / endpoints / service /
> migration): [`migti_backend/.../features/F-PRODUCT-MASTER.md`](../../../../migti_backend/docs/development/features/F-PRODUCT-MASTER.md).
> **Owner role:** `procurement_master` (catalog owner); HOD approves new products (D10/D30).
> **Read with:** [MASTER.md](../MASTER.md) §1A **D8, D9, D10, D13, D19, D27, D28, D30**.
>
> **Prime directive (MASTER):** the existing frontend **visual design stays as-is**. This is
> **API integration + targeted edits**, NOT a redesign. The catalog is **already built** (7-step
> `ProductForm` wizard + all master forms); this doc lists the FE deltas for D30 + owner clarifications.

---

## 1. Shared requirements + relationships (identical intent on both sides)

Hierarchy is a strict single-parent tree; brand is many-to-many with category and used as a
category-filtered **attribute** (D30):

```
GROUP ──1:N──► CATEGORY ──1:N──► SUBCATEGORY      (each child has exactly one parent)
BRAND ──M:N (brandCategory)──► CATEGORY           → brand = category-filtered variant ATTRIBUTE (D30)
```

- **Combination IS the product (D9):** the user picks attributes → variants → checks which
  **combinations** to activate; each combination is the real sellable/trackable unit (`variantCode`).
  The parent `product` is a container used mainly for reporting.
- **New product = real code + `pending_hod_approval` (D10/D30):** codes are generated up front
  (`PRD-<GRP>-<n>` / `variantCode`) and **never change**; the product is usable only after HOD approval.
- **Relationships (echo MASTER §6):** F-SETTINGS (categories) → F-PRODUCT-MASTER; F-EMP D27 group→category
  derive **depends on** this hierarchy; F-SUPPLIER (category + L1/L2/L3, supplier codes) and F-CUSTOMER
  (customer product codes) map onto products; F-PRODUCT-MASTER feeds F-QUERY / F-QUOT / F-PO by `variantCode`.

Full requirement detail + the owner Q&A (2026-07-23) lives in the **backend twin**; the deltas below
are the frontend's share of implementing them.

## 2. Verified current state (frontend, 2026-07-23)

- **Views (`src/views/admin/`):** `ProductForm.js` (**3407 lines**, 7-step wizard), `ProductList.js`,
  `ProductView.js`; `GroupForm`/`GroupList`; `CategoryForm`/`CategoryList`/`CategoryView`;
  `SubcategoryForm`/`SubcategoryList`/`SubcategoryView`; `BrandForm`/`BrandList`.
- **Services (`src/services/`):** `productService` (getAll/getById/previewCode/create/update/delete/
  uploadImages), `groupService`, `categoryService`, `subcategoryService`, `brandService`.
- **Endpoints (`src/api/endpoints.js`):** `PRODUCTS` (create/list/get-by-id/update/delete/
  upload-images/**preview-code**), `GROUPS`, `CATEGORIES`, `SUBCATEGORIES`, `BRANDS` (each with
  upload-icon/image). **No `brandCategory` endpoint/service exists yet** (gap — §3.2).
- **ProductForm wizard steps:** `Basic Information → Tax & Accounting → Attributes → Inventory →
Map Client Code → Map Supplier Code → Preview`. Attribute options today: `Brand, Color, Size, Grade,
Thickness, Voltage, Weight, Height, Length, Amp`. Per active combination the form collects model no.,
  purchase/selling price, ≥1 image, timeline, next-review; validates ≥1 named attribute, ≥1 image per
  combo, and selling > purchase.

## 3. Frontend target — targeted edits only (D30 + clarifications)

> Reuse `PageHeader`/`DataTable`/`RowActions`/`StatusBadge`/`StatusToggle`/`CrudFormPage` and the
> existing wizard. All calls go through **services** (never `axios`/`api` directly in a view).

### 3.1 Tax & Accounting step

- **GST% → dropdown `[0%, 5%, 18%, 25%]`**, mandatory (was a free number input). yup: `.oneOf([0,5,18,25])`.
- **Tax clause** string input — confirm max length **25** vs current (owner said 25 chars; §9).
- **Units:** `unit` dropdown **mandatory** (from `PRODUCT_UNITS`), `purchaseUnit`/`salesUnit` optional.

### 3.2 Attributes step — Brand as a category-filtered attribute (D30)

- The **Brand attribute's options must be limited to brands mapped to the selected category** (via
  `brandCategory`). Needs a **new FE endpoint + service** to fetch brands-by-category (backend to
  expose; add `BRAND_CATEGORIES`/`brandCategoryService` mirroring the existing service pattern).
- **Stop sending the legacy single `product.brand`** from the form (deprecated). Many-to-many brand is
  realized through combinations.
- Keep the n-attributes → variants → **combination checkboxes** UX unchanged.

### 3.3 Per-combination fields

- **Selling ≥ Purchase** (allow equal): relax the current "selling must be greater" check to block only
  `price < costPrice`; update the inline message ("Selling price cannot be less than purchase price").
- **Timeline = rate-validity days** and **next-review date** stay per combination (each combination is
  procured on its own cycle). Keep the existing `queryQuotationImageId` "query image" selector (≥1
  product image mandatory; one flagged for the query/quotation PDF).

### 3.4 Inventory step

- min/max stock + expiry (all optional); add **`fixedStock`** input **if confirmed** (§9).

### 3.5 Map Customer / Supplier Code steps

- **Rename step "Map Client Code" → "Map Customer Code"** (label + preview text). Payload FK stays
  `industry` (the customer). Multi-row `{industry, code}`.
- Map Supplier Code unchanged: multi-row `{supplier, code}`.
- **Do NOT add a "terms of days" field here** — it's the rate-validity/procurement timeline (already on
  the combination), not a per-mapping value.

### 3.6 Status / approval + list/view

- New product created here lands **`pending_hod_approval`** (do not let the form set `active`); show the
  status via `StatusBadge`. HOD approval happens on a separate surface (coordinate w/ F-QUERY-APPROVAL).
- **ProductList / ProductView:** reflect the normalised status vocabulary
  (`pending_hod_approval`/`active`/`inactive`); ensure delete triggers the backend **soft** delete.

### 3.7 Masters

- **Groups/Categories/Subcategories:** icon/image upload to S3 (existing upload-icon/image endpoints);
  status toggle; **Category form requires `group`**; Subcategory filtered by category.
- **Brands:** add a **brand↔category mapping** UI (drives §3.2) once the `brandCategory` endpoint exists.

## 4. FE ↔ BE validation alignment (do at implementation)

Mirror every backend Joi rule in the form's yup schema so no FE-pass/BE-fail gaps (same discipline as
F-CUSTOMER/F-SUPPLIER): GST enum `[0,5,18,25]`; `unit` required; `name`/`category`/`group`/`hsnNumber`
required; ≥1 combination selected; per combo ≥1 image + `modelNumber` + `price ≥ costPrice`; tax-clause
max length; next-review must be a future date. Verify field-by-field after wiring.

## 5. Files to reuse (frontend)

`productService`/`groupService`/`categoryService`/`subcategoryService`/`brandService`, `api/endpoints.js`
(`PRODUCTS`/`GROUPS`/`CATEGORIES`/`SUBCATEGORIES`/`BRANDS`), the existing `ProductForm` wizard +
master forms/lists/views, shared `PageHeader`/`DataTable`/`RowActions`/`StatusBadge`/`StatusToggle`/
`CrudFormPage`, `PRODUCT_UNITS` constant, and `locationService`-style patterns for dependent dropdowns.
**Add:** a `brandCategoryService` + `BRAND_CATEGORIES` endpoints block (new, mirrors siblings).

## 6. Status

- **Frontend** — view [x] · service [x] · api-wired [x] · verify [~] → **IMPLEMENTED 2026-07-23**
  (build green). Verify is `[~]`: exercised via the live `/products/*` API (same payloads the wizard
  POSTs) — no browser-automation tool this session, so a human UI click-through + screenshots are still
  owed. Full change-log in the **backend twin §10** + MASTER §10.
- Delivered: GST dropdown **locked to `[0,5,18,25]`** (new `GstRateSelect` `fixedRates`/`allowCustom`
  props; other 10 usages untouched); `productSchema.js` yup aligned to BE (GST enum, `taxClause.max(200)`,
  `selling ≥ purchase`, status vocab) — **0 FE-pass/BE-fail**; ProductForm read-only status badge +
  inline `≥` price rule + **"Map Client Code"→"Map Customer Code"**; ProductList Pending/Rejected badges
  - filter + HOD **approve/reject/(de)activate** row-actions (reject requires a remark); `productService.updateStatus` +
    `PRODUCTS.UPDATE_STATUS`.

## 7. Open sub-items (frontend share — full list in the backend twin §9, all resolved)

- [x] Brand category-filtered attribute — **already built** via `categoryService` (`category.brands` from
      `brandCategory`); the ProductForm Brand attribute already filters to the selected category. No new
      `brandCategoryService` needed.
- [x] `fixedStock` input — **skipped** (owner).
- [x] Tax-clause max length — **200** (yup `.max(200)` added).
- [x] Master code display — masters auto-generate `<PREFIX>-<n>` server-side (read-only in UI).
- [x] Product `rejected` status surfaced — ProductList HOD approve/reject/(de)activate + badges.

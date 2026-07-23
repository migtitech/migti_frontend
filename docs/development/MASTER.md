# MASTER — MIGTI Trading CRM · Complete Requirements & System Reference

> **This is THE reference.** Every feature we design or redesign takes its full context from
> here. Backend and frontend keep an **identical copy** of this file
> ([backend](../../../migti_backend/docs/development/MASTER.md) ·
> [frontend](../../../migti_frontend/docs/development/MASTER.md)). Feature IDs are shared
> across both sides. When you work a feature: **read this whole MASTER → read the feature's
> row + relationships → open `features/<id>.md` on both sides → keep all in sync.**
>
> **Workflow: one feature per session.** Start each session from
> [`PROGRESS.md`](PROGRESS.md) (state + what's next) and follow
> [`AGENT_PROMPT.md`](AGENT_PROMPT.md) (per-session instructions). `features/F-SETTINGS.md` is the
> template for every feature doc.
>
> **Prime directive:** the existing **frontend visual design stays as-is**. This program is
> **feature completion + correct API integration + a consistent, optimized, scalable data
> model**. We are NOT constrained by the current DB layout — during this development phase we
> may **redesign schemas** for consistency (see §7). No gaps, consistent fields/values everywhere.

---

## 1. The business

MIGTI is a **B2B trading company** — a **middleman between customers and suppliers**.

- **Customers** (called **Industries** in the system) send **requirements**; MIGTI fulfills
  them by **procuring** the goods from **Suppliers/Vendors**.
- **The margin is the business:** MIGTI quotes the customer at a higher rate and procures from
  suppliers at a genuine/negotiated rate; the **rate difference + margin** is the profit.
- This CRM **digitalizes the entire end-to-end process**: lead → query → procurement (rate
  discovery) → quotation → sales order → purchase → payment → inventory → dispatch → delivery,
  plus follow-ups, targets, and reporting.

### Two operating "fronts"
- **Sales front** — customer-facing. Employees are mapped and scoped by **ZONE**.
- **Procurement/Purchase front** — supplier-facing. Employees & suppliers are mapped by **CATEGORY**.

These two mapping axes (**Zone** for sales, **Category** for procurement) are fundamental and
drive routing, visibility, targets, and reporting throughout the system.

---

## 1A. Locked design decisions

> These are **authoritative** and every `features/<id>.md` must comply. Confirmed with the
> product owner 2026-07-21. Later changes require an explicit decision + change-log entry.

- **D1 — Sales Order vs Purchase Order will be RENAMED to their true meaning.**
  Current code has them **inverted**: the customer-facing order (with `industry_id`, billing/
  shipping address, `quotationId`) is stored in the model **named `purchaseOrder`** and served
  at `/purchase-orders`, while the supplier-side buy lives in `poProduct` +
  `purchaseBillingRequest`. Redesign target:
  - **`salesOrder` (+ `salesOrderProduct`)** = the customer order (accepted quotation).
  - **`purchaseOrder` (+ `purchaseOrderLine`)** = the supplier buy (what MIGTI purchases).
  - This is a real rename across models/services/routes/frontend + a **data migration**
    (details per feature file: `F-SALES-ORDER`, `F-PO`). See §7 mapping table.
- **D2 — One unified, documented state machine per stage.**
  Replace the many ad-hoc/legacy status enums with a single documented state machine per stage
  (query, query-line, procurement/pro-bucket, quotation, sales-order, purchase-order, billing,
  payment, inventory, dispatch), with an explicit **old → new** status mapping for migration and
  no legacy fallbacks in the new models. Each feature file owns its stage's state machine.
- **D3 — Every line anchors to a `variantCombination`, including new products.**
  Creating a query line for a not-yet-cataloged product immediately creates a real `product` +
  `variantCombination` (see **D10** for the exact status/code behavior — real code, starts
  `pending_hod_approval`) so **every** line carries a firm combination reference from the start;
  no line ever relies on loose product-name strings. (Details: `F-PRODUCT-MASTER`, `F-QUERY`.)
- **D4 — Refine MASTER feature-by-feature.** We do not pre-write all schemas abstractly. For
  each feature we pick, we detail its `features/<id>.md` (schema, statuses, endpoints, migration,
  FE wiring) and **fold any newly-clarified cross-cutting rules back into this MASTER**.
- **D5 — Margin/profit is HOD-only by default.** The spread (sell rate − procurement rate +
  margin) is **computed and shown only to HOD**. Any other role sees margin **only** where the
  product owner explicitly grants it (per-feature note). Margin is computed **at the procurement
  stage** (the margin rule lives there); downstream stages carry the computed value, HOD-gated.
- **D6 — Sales employees can hold multiple zones; visibility = union of their zones.** An
  employee's `zoneIds[]` may contain several zones; they see/act on **all** data across those
  zones. **Sub-zone-level ownership:** within a single zone, different **sub-zones** may be owned
  by **different** employees — each participates/processes only their own sub-zone. So scoping is
  **zone by default, sub-zone where sub-zones split a zone across employees.**
- **D7 — No zone reassignment of queries.** A query is mapped to a **customer** (industry), and a
  customer belongs to exactly one zone; a specific query comes from a specific **customer branch**,
  which fixes its zone. Therefore a query's zone is **immutable** — no zone-reassignment flow, no
  re-attribution of historical targets. (A customer may have branches in different zones, but each
  query is tied to the branch it came from.)
- **D8 — Category is the ONLY procurement-routing level, and mapping is 1-to-1 + mandatory.**
  - Routing is decided **at the category level only** — never subcategory or group. **Groups are
    the source/parent of categories**; **subcategory is the least-managed level** and is NOT used
    for routing or ownership.
  - **One category ↔ exactly one procurement person.** A category is **never** mapped to multiple
    procurement people. (Contrast the sales axis, where sub-zones split a zone — categories do NOT
    split.) So a product's category deterministically resolves to a single procurement owner.
  - **Every category MUST be mapped** to a procurement person (business rule / invariant). There
    is no "unmapped category" runtime path in normal operation.
  - **Unmapped categories are flagged** in the UI (distinct color / warning state) so they get
    mapped. Backend should expose which categories are unmapped; FE highlights them.
  - **One-owner holds by category ID** (a category doc has one `group` → one owner via D27). The
    catalog currently has **duplicate category NAMES across groups** which could give a real-world
    category two owners — a **F-PRODUCT-MASTER data-cleanup task** (dedupe), not an employee-mapping issue.
- **D9 — Every product ALWAYS has ≥1 variant combination; the combination IS the product.**
  A product can never have zero combinations — combination is **mandatory**. At creation we make
  the base product **and** its combination(s) together. **The whole system runs on the
  combination's own code** (`variantCode`) — sales, procurement, quotation, SO, PO, inventory,
  reporting all key off the combination, not the base product. A variant-less product still gets
  one (default) combination so the identity is uniform.
- **D10 — New product/combination gets a REAL, SAME-FORMAT code immediately (draft), which is the
  stable tracking key across ALL stages.**
  - A product can be added newly at **any** stage where it's needed — **query, quotation, or even
    sales order**. Wherever it's created, it gets a **real `productCode`/`variantCode` in the same
    format** as catalog products (not a throwaway/temp code) as a **draft product**.
  - Default status is **`pending_hod_approval`** (a.k.a. draft / approval-pending from
    query/quotation/HOD). It is **not usable in normal operations** until **HOD approves** →
    **`active`**. (Rejected/other states TBD per `F-PRODUCT-MASTER`.)
  - **The code is generated up front precisely so it can be used as the mapping/tracking key**
    everywhere: query products, quotation products, **and** sales-order products all reference the
    **same** product/combination code. **The code never changes** across stages — the product is
    traceable end-to-end (query → quotation → SO → PO) by one stable identifier, whether it started
    as a catalog product or a draft added mid-pipeline.
- **D11 — Inventory will be redesigned separately (out of scope for now).** Current inventory is
  basic receipt-tracking. Keep it minimal; a dedicated inventory redesign (stock model, in/out,
  balances) is a **later, separate effort** — do not over-build it now. (`F-INVENTORY` will note
  "redesign pending".)
- **D12 — Customer & Supplier codes.** `customerCode` and `supplierCode` follow a **defined
  format** (product owner to give the exact pattern — see ⚠ open item below). Today: `industry`
  auto-generates `customerCode` via `generateUniqueCode` (default sequence format, no custom
  pattern); **`supplier` currently has NO `supplierCode` field at all** → the redesign must add a
  proper `supplierCode`. Both codes are unique and uppercase (NO branch scoping — D19).
- **D13 — Supplier L1/L2/L3 grade is PER SUPPLIER PER CATEGORY (not global).** A supplier can be
  L1 in one category and L3 in another, because grading is tied to the products/categories the
  supplier is mapped to. This enables "for this category, how many L1/L2/L3 suppliers exist?"
  views. Model as a **(supplier × category × grade)** mapping, not a single grade on the supplier.
- **D14 — A company can be BOTH customer and supplier, but as SEPARATE records.** The same
  real-world company may exist as a customer (`industry`) AND a supplier (`supplier`) — but they
  are **two independent entities**, never a shared/overloaded record. No cross-linking that merges
  them; they are treated separately end-to-end.

- **D15 — Follow-up rates are HIGHLIGHTED, not a routing mechanism.** There is **no** "reuse rate
  / skip procurement" mapping. Instead, the system tracks follow-ups and shows **overdue
  follow-up rates separately / highlighted** to employees — purely informational (a nudge), never
  an automatic assignment or gate. (This supersedes the earlier "rate reuse within follow-up
  window skips re-procurement" idea — that mechanism is dropped.)
- **D16 — Quotations: partial allowed, rates OPTIONAL.** A quotation can be **sent partially**
  (not all query products included) and **rates are not mandatory** to create a quotation — a
  quotation may have some, all, or no rates filled. (So "ready for quotation" does NOT require
  every line rated.)
- **D17 — Revision = a NEW quotation (regenerate), not in-place versioning.** When a quotation is
  negotiated/revised, we **create a new quotation** ("regenerate quotation") rather than mutating
  a revision of the same document. Multiple quotations can therefore exist for one query.
  (Implication: the `quotationSnapshot` "revision" model is replaced by discrete quotation
  documents linked to the same query.)
- **D18 — One query → MANY quotations; one query-product → MANY quotations (traceable).** A single
  query can spawn multiple quotations, and a single **query product line** can appear in multiple
  quotations. This many-to-many link must be **first-class and queryable** because **reporting**
  needs: for a given query, how many of its products went into how many quotations (and which).
  → Model an explicit **query-product ↔ quotation** association; do not infer it from embedded
  copies.

- **D19 — NO BRANCH CONCEPT. The whole CRM is single-tenant with ONE HOD.** This is a major
  correction: there is **no multi-branch model**. The system has a **single HOD** overseeing
  everything; the CRM is **separate from the company's physical branches** and does **not** scope
  data by branch. → **Drop `branchId`-based scoping as a core axis.** (Existing `branchId` fields
  are legacy; the redesign removes/ignores them as a scoping mechanism. Any lingering "branch
  settings" UI is really where **zones/sub-zones/categories** are configured, not tenant branches.)
  The only real scoping axes are **zone** (sales) and **category** (procurement).
- **D20 — Access control is UI-side (sidebar-driven), not backend-enforced.** Each role's access
  is defined by the **sidebar** it is given; the frontend **conditionally shows/hides** features
  based on role (and zone/category mapping). Build a **common function/logic** for this gating.
  The backend is **not** the RBAC enforcement point (consistent with today's stubbed
  `checkPermission`). → `F-RBAC` is primarily a **frontend** concern (nav + conditional render);
  backend keeps declarations but does not hard-enforce. Zones gate **salespersons** only;
  categories gate **procurement/suppliers** only.
- **D21 — Target rate is a GUIDELINE, not binding; deviation requires a remark + shows real rate.**
  Purchase person is expected to meet the HOD target rate. If they can't: they **add a mandatory
  remark**, which then **reveals the real procurement rate** to them; the **remark + the actual
  purchased price** are captured and **surfaced separately to the HOD** for visibility. No hard
  block — deviation is allowed with an audit trail.
- **D22 — Billing request is PER SUPPLIER, spanning ANY sales orders.** One billing request =
  **one supplier**, containing **any number of product lines** being purchased from that supplier
  — and those lines **may come from multiple different sales orders**. The billing request is
  **fully decoupled from the sales order**: it is keyed on **(supplier + selected purchase
  lines)**, never per-sales-order. (Mental model: "I'm going to one shop/supplier and buying
  several products in one go" — the products can belong to different customer orders.)
- **D23 — Payment supports CREDIT and DEBIT; full LEDGER is maintained.** Payment can occur
  **before or after** purchase. Two modes: **debit** (paid now) and **credit** (HOD adds a credit
  note → purchase on credit). **All credit deals are tracked** with their own tracking/status;
  **HOD is responsible** for entering payment data and **marking amounts paid**. The system
  **maintains a complete payment/credit ledger** (every entry recorded).
- **D24 — Partial delivery is supported (product-level); SO is fulfilled only when ALL products
  are dispatched.** Because the sales order tracks everything **per product**, any subset of ready
  products can be dispatched (e.g. 1 of 5), driven by internal communication (sales manager ↔
  customer ↔ company). Each product line carries its own delivery/dispatch status. **The sales
  order reaches `fulfilled` ONLY when every one of its product lines has been dispatched** — the
  SO-level status is derived from its lines (all dispatched → fulfilled; otherwise partial).
- **D25 — Dispatch proof = a RECEIPT upload, gated by HOD approval.** The dispatch person uploads
  a receipt (document / emailed proof). HOD reviews and **approves** it; **only after HOD approval
  is the dispatch marked complete**.
- **D26 — Notifications are designed SEPARATELY (later).** The notification rules (which event
  notifies which role) are out of scope for now and will be specified in a dedicated pass /
  `F-NOTIFY` feature. Do not hardcode ad-hoc notifications during other features.

- **D27 — Procurement/purchase employees map to GROUPS; categories are AUTO-DERIVED from groups.**
  On the procurement/purchase axis (D8), an employee is mapped to **product groups**
  (`assigned_groups`); the system **auto-derives `assigned_categories`** = all categories whose
  `category.group` is in the employee's groups (`Category.find({ group: { $in: groups } })`).
  Categories are **never hand-picked** and are **recomputed** on every create/update. Group mapping
  is **mandatory for procurement/purchase-type roles**, hidden for others. Sales roles use zones
  (D6) instead. (Replaces the legacy `employee.categories` CSV-of-names.)
  > **D8 reconciliation (RESOLVED 2026-07-21):** `category.group` is a **single** ref → one category
  > **document** belongs to exactly one group → exactly one owner. So D8 (one category → one owner)
  > **holds by ID, by design** — **no per-employee uniqueness check is needed in F-EMP.**
  > The only way a *real-world* category could appear to have two owners is **duplicate category
  > NAMES across groups** (the catalog currently has some, e.g. "cordless drill" = 2 docs in 2
  > groups). That is a **catalog data-cleanup task for F-PRODUCT-MASTER** (dedupe/merge duplicate-named
  > categories), **NOT** an employee-mapping problem. F-EMP proceeds as planned.
- **D28 — Company documents / CATALOGS are GROUP-based (not category-based).** A company catalog
  document is scoped to a **product group**, not a category. The `companyDocument` model already
  reflects this: `groupId → group` with the rule "**null = main company catalog; set when the
  doc_type is Catalog for a product group.**" So catalog uploads/attachments are organized by
  **group**. (Note the distinction: **procurement routing/ownership** is by **category** (D8);
  **catalogs/company documents** are by **group** (D28). Both are true — they scope different things.)

- **D29 — Customer/Supplier codes are CITY-prefixed: `CITY-CUS-<n>` / `CITY-SUP-<n>` (resolves the
  D12 open item).** Both codes share the shape `<CITY>-<TOKEN>-<seq>` where CITY is **UPPERCASE,
  spaces/punctuation stripped**, TOKEN is `CUS` (customer) / `SUP` (supplier), and `<seq>` is the
  existing **global** code sequence (from 1000; `generateUniqueCode` with a custom `format` fn — the
  numeric store is untouched). The code is **generated once and never changes** (D10/D12), even if
  the entity's city/zone later changes; **existing `CUS<n>` codes are NOT retro-renamed** (codes are
  immutable) — only new records use the city format.
  - **Customer city = the mapped ZONE's city.** The customer is mandatorily zone-mapped (D6/D7) and
    the zone (`area`) carries a city; the code city is `area.city`. No city field is added to the
    customer. (Requires the zone's `city` to be set before a customer in it can be coded.)
  - **Supplier city = a fixed `codeCity` ENUM on the supplier** — `['Indore','Noida']` (extensible),
    **default `Indore`**. Suppliers map to **categories, not zones** (D8), so they have no zone-city
    to derive from; the enum supplies a controlled city. **Add the missing `supplierCode` field**
    (D12 noted it doesn't exist) plus this `codeCity` enum.
  - **`paymentTerms`** on both becomes a **fixed dropdown enum** (e.g. `Advance / Net 15 / Net 30 /
    Net 45 / Net 60 / Net 90`; exact set per feature file), and **`creditLimit` defaults to
    `2000000`** (₹20 lakh, editable at create). Mandatory onboarding fields (customer & supplier):
    location/address (state/city/pincode)/payment terms/zone (customer) — enforced in Joi.
  - **Contacts, not purchase-managers, are the entity's people.** The legacy customer
    "purchase-manager" surface is retired in favour of `industryContactPerson`/`supplierContactPerson`
    contacts (designation · name · phone · email · remark); **inactive contacts are hidden** from the
    customer/supplier surface. The contact "Client mapping" concept is **relabelled "Customer"**.
    (Details: `F-CUSTOMER` / `F-SUPPLIER`.)

- **D30 — Product Master (catalog) rules (F-PRODUCT-MASTER).** Confirmed with the owner 2026-07-23. The
  catalog is largely built; these are the authoritative refinements:
  - **New products are HOD-gated everywhere (extends D10).** A product created **directly in Product
    Master** (by `procurement_master`) starts **`pending_hod_approval`** and becomes **`active` only
    on HOD approval** — the same single gate as products added mid-pipeline via query/quotation. (Today
    the product create validator wrongly defaults to `active`; align it.)
  - **Brand is a category-filtered variant ATTRIBUTE, not a product-level field.** A brand's
    selectable options = brands mapped to the product's **category** via `brandCategory`; "one product
    ↔ many brands" is realized **through combinations** (D9). **Deprecate the legacy single
    `product.brand`** ref (kept unread for back-compat). No new brand model.
  - **GST% is a fixed enum `[0, 5, 18, 25]`%, mandatory** on the product (combination may override
    within the same enum). Never > 100 (implied). (Today it's a free `0–100` number.)
  - **Selling ≥ Purchase.** A combination's **selling price** (`price`) must be **≥ its purchase/cost
    price** (`costPrice`) — block only `price < costPrice` (equal allowed). (Owner corrected the
    inverted phrasing; the existing "must be greater" rule is right in spirit, relax to allow equal.)
  - **"Terms of days" = rate-validity (rate expiry) in days = the procurement timeline.** It is **not**
    a per-customer/per-supplier field. It is the existing `timeline`(days) → `nextTimelineDate` →
    `procurementReviewStatus` on the **combination**: when the rate **expires** (`overdue`) the product
    must be **re-procured separately**; within the window a valid rate is reused (informational, D15).
    Customer/supplier code-mapping rows stay `{entity, code}` — **no `termsOfDays` added**.
  - **Customer code mapping** (`companyProductCodes[]` `{industry, code}`) is relabelled **"Map
    Customer Code"** (FK stays `industry`); supplier mapping `{supplier, code}` unchanged. Both allow
    multiple rows. Product **delete → soft delete** (convention). (Details: `F-PRODUCT-MASTER`.)

---

## 2. Core entities & their identity

| Entity | Notes | Unique identity |
|--------|-------|-----------------|
| ~~Branch / Company (own)~~ | **REMOVED (D19).** No tenant-branch concept — the CRM is single-HOD, single-tenant. Data is NOT branch-scoped. "Branch Settings" UI = where zones/sub-zones/categories are configured. | — |
| **Zone** (`area`) | Business is divided into zones. Sales performance/targets tracked by zone. | `areaType`, name |
| **Sub-zone** (`subZone`) | A zone contains multiple sub-zones (`subZone.zoneId → area`). | `subZoneCode` |
| **Employee** | Roles below. Sales employees mapped to **zone(s)**; procurement/purchase mapped to **categories**. | `idnumber`, `email` |
| **Customer** (`industry`) | The buyer. Onboarded with name, **GST**, financials, contacts, employees. Mapped to a **zone** + sub-zone. | **`customerCode`** (unique) |
| **Customer branch / contact** | Industry branches + `industryContactPerson`. | — |
| **Supplier / Vendor** | The seller MIGTI procures from. Mapped to **categories**; graded **L1/L2/L3 per category** (D13). Same real company may also be a customer, as a **separate** record (D14). | `supplierCode` (**to be added** — missing today) |
| **Supplier contact** | `supplierContactPerson`, mapped to a supplier. | — |
| **Group → Category → Subcategory** | Product **hierarchy / standardization** (group is top; category is the routing level; subcategory least-managed). | codes |
| **Product** | Internal catalog "container." **Always has ≥1 combination** (D9). New product starts `pending_hod_approval`, real code from creation, usable only after HOD approval (D10). | `productCode`, `sku` |
| **Variant combination** | ⭐ **The real "product" everywhere (D9).** One product with 3 combinations = 3 sellable/reportable products. The **entire system keys off `variantCode`** — sales, procurement, quotation, SO, PO, inventory, reporting. Base `product` is internal grouping only. | `variantCode` |
| **Unit** | Separate **sales unit** and **procurement unit**; rates are quoted/collected per unit. | — |

> **Rule — the combination is the product.** For salesperson, procurement, quotation, PO,
> reporting: the unit of work is the **variant combination**. Base `product` is internal mapping.

---

## 3. Roles & responsibilities

Roles (login dropdown + DB confirmed): `head_of_department`, `sales_manager`,
`purchase_exicutive`, `procurement`, `back_office_exicutive`, `finance`, `inventry_manager`,
`dispatch_manager`, `localprocurement`, `localpurchase`, `procurement_master`, `purchase_manager`.

| Role | Scope axis | Core responsibility |
|------|-----------|---------------------|
| **HOD** (head_of_department) | all | Full access & control. Approves **query products** (which products go to procurement), **procurement rates**, sets **target rates** & chosen supplier, approves **quotations**, **billing requests**, **delivery**; sees analytics & payment backlog. |
| **Sales** (sales_manager / sales exec) | **Zone** | Only sees customers/queries/quotations of **their zone(s)**. Creates queries from leads, builds quotations, converts to sales orders, does follow-ups. |
| **Procurement** | **Category** | Receives HOD-approved query products (in their categories), goes to market, collects supplier rates (with unit) → submits to Pro Bucket. |
| **Purchase** (purchase_manager) | **Category** | After sales order, purchases the goods from the chosen supplier; raises **billing requests** for payment. |
| **Finance** | — | Approves/pays **billing requests** (with HOD). |
| **Inventory manager** | — | Receives purchased goods into **inventory**. |
| **Dispatch manager** | — | Collects from inventory, **dispatches**, uploads **dispatch proof**. |
| **Back office** | — | Support / data entry (scope TBD). |
| **Local procurement / Local purchase** | Category | Local variants of procurement/purchase (scope TBD). |
| **Procurement master** | — | Catalog & rate master ownership (scope TBD). |
| **Administrator** | all | User + zone/category/settings administration (no tenant branch, D19). |

> ⏳ **TO REFINE:** exact permission set per role (§ Role→Feature matrix below) once fully dictated.
> RBAC enforcement is currently **stubbed** — see `F-RBAC`.

### Two mapping axes (critical)
- **Sales employees ↔ Zones (multi, D6).** `zoneIds[]` may hold several zones; the user sees &
  acts on the **union** of their zones' data. Where a zone is split by **sub-zone**, each sub-zone
  is owned by a **different** employee who participates only in that sub-zone.
- **Procurement/Purchase employees ↔ Categories (1-to-1, mandatory, D8).** Routing is at the
  **category level only** (groups parent categories; subcategory is least-managed, not used for
  routing). **One category → exactly one procurement person**; every category must be mapped;
  unmapped categories are **flagged** in the UI.
- **Suppliers ↔ Categories** (also graded L1/L2/L3).
- **Customers ↔ Zone (+ sub-zone).** A customer belongs to one zone; a query is tied to the
  **customer branch** it came from, which fixes its zone permanently (D7 — no reassignment).
- **Auto-routing:** a product line flows to the bucket of the person mapped to its **category**,
  with a **manual override** (HOD/admin can reassign a specific line to a specific person).
- **Margin is HOD-only by default (D5).**

---

## 4. End-to-end lifecycle (the canonical flow)

```
LEAD (sales, in zone)
  │
  ▼
QUERY  ──────────────────────────────────────────────────────────────────────┐
  • sales creates query for a customer (their zone)                            │
  • per line: pick existing product/combination OR create new product          │
  • set query settings: follow-up date, quotation date                         │
  │                                                                            │
  ▼                                                                            │
QUERY PRODUCTS (per-line)                                                       │
  • HOD APPROVES which lines need procurement                                   │
  • follow-ups: overdue follow-up rates are HIGHLIGHTED to employees (D15)      │
    — informational only, NOT an auto-skip / mapping                            │
  │                                                                            │
  ▼ (approved lines)                                                           │
PROCUREMENT / PRO BUCKET  (procurement, by category)                           │
  • procurement collects SUPPLIER rates (per unit) — suppliers graded L1/L2/L3  │
  • submits rates → visible to HOD (procurement-rate view)                      │
  • HOD reviews & APPROVES rate  ───────────────────────────────────────────► RATE captured
  │                                                                            │
  ▼ (line has rate)                                                            │
READY FOR QUOTATION → CONVERT TO QUOTATION                                      │
  │                                                                            │
  ▼                                                                            │
QUOTATION MASTER  (sales, with quotation access)                               │
  • add quotation rate (OPTIONAL, D16), discount, freight/packing, GST%, date  │
  • can PULL more products from the query; see HOD-approved procurement rate    │
  • PARTIAL quotation allowed; one query → MANY quotations (D16/D18)            │
  • revision = REGENERATE as a NEW quotation (D17)                              │
  • HOD APPROVES quotation → download PDF → SEND to customer                    │
  • lost quotations tracked via FOLLOW-UP dashboard + reporting                 │
  • query-product ↔ quotation is many-to-many + traced for reporting (D18)      │
  │                                                                            │
  ▼ (customer accepts)                                                         │
SALES ORDER  (CONVERT quotation → sales order)                                  │
  • confirm company / billing addr / shipping addr / amount / delivery date     │
  • may add new products/lines                                                  │
  │                                                                            │
  ▼                                                                            │
FULFILLMENT — routed by CATEGORY mapping (+ manual override)                    │
  • HOD sees prefilled ACTUAL supplier rates (captured at procurement time),    │
    sets TARGET RATE per supplier, and picks the supplier to buy from           │
  │                                                                            │
  ▼                                                                            │
PURCHASE BUCKET  (purchase, by category)                                        │
  • purchase person assigned (auto by category / manual)                        │
  • raises BILLING REQUEST ──► FINANCE / HOD make PAYMENT                        │
  • after payment → PURCHASE the product from supplier                          │
  │                                                                            │
  ▼                                                                            │
INVENTORY  (inventory manager receives goods)                                   │
  │                                                                            │
  ▼                                                                            │
DISPATCH  (dispatch manager) → dispatch + upload DISPATCH PROOF → DELIVERED ◄───┘
```

**Two sub-flows to keep straight:**
1. **Query → (procurement rates) → Quotation → send to customer.**
2. **Customer accepts → Sales Order → purchase/pay/inventory/dispatch → delivered.**

**Rate lineage (must be consistent end-to-end):** supplier rate captured at procurement →
reused in quotation (subject to follow-up window) → actual rate prefilled at sales-order
fulfillment → target rate + chosen supplier set by HOD → purchase → billing → payment. A
`rateMaster`-style ledger must trace each stage (procurement / quoted / po / billing).

---

## 5. Feature registry

Status: `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked.
Sub-status columns — **BE**: backend (API+DB+service+verify) · **FE**: frontend (view+service+api-wired+verify).

| ID | Feature | Scope axis | Owner role(s) | Status | BE | FE | File | Related |
|----|---------|-----------|---------------|:------:|:--:|:--:|------|---------|
| F-AUTH | Login / token / refresh / password reset | — | all | [ ] | [ ] | [ ] | [features/F-AUTH.md](features/F-AUTH.md) | F-RBAC, F-EMP |
| F-RBAC | Role & permission enforcement (stubbed today) | — | administrator | [ ] | [ ] | [ ] | [features/F-RBAC.md](features/F-RBAC.md) | F-AUTH, all |
| F-SETTINGS | Company (singleton) + Zone + sub-zone setup ("Branch Settings" UI; NO tenant branch, D19); category mapping cross-linked to F-EMP/F-PRODUCT-MASTER | — | hod | [x] | [x] | [x] | [features/F-SETTINGS.md](features/F-SETTINGS.md) | all |
| F-EMP | Employee onboarding + zone/sub-zone (sales) + group→category auto-map (procurement, D27); access-permissions parked; designation shown not role | zone & category | hod | [x] | [x] | [x] | [features/F-EMP.md](features/F-EMP.md) | F-SETTINGS, F-PRODUCT-MASTER, F-RBAC |
| F-CUSTOMER | Customer (industry) onboarding + contacts + customer branches; code `CITY-CUS-<n>` (D29); mandatory zone/location/address/paymentTerms; creditLimit 20L; contacts replace purchase-manager | zone | sales, hod | [x] | [x] | [x] | [features/F-CUSTOMER.md](features/F-CUSTOMER.md) | F-SETTINGS, F-SUPPLIER, F-QUERY |
| F-SUPPLIER | Supplier onboarding + contacts + category map + L1/L2/L3 | category | procurement, hod | [x] | [x] | [x] | [features/F-SUPPLIER.md](features/F-SUPPLIER.md) | F-CUSTOMER, F-PRODUCT-MASTER, F-PROCUREMENT |
| F-PRODUCT-MASTER | Group→Category→Subcategory + Product + **Variant combinations** + inventory basics (D30: HOD-gated new products, brand=category-filtered attribute, GST enum, selling≥purchase, rate-validity timeline) | category | procurement_master | [x] | [x] | [x] | [features/F-PRODUCT-MASTER.md](features/F-PRODUCT-MASTER.md) | F-QUERY, F-QUOT, F-PO |
| F-QUERY | Query creation + query products + follow-up/quotation dates | zone | sales | [ ] | [ ] | [ ] | [features/F-QUERY.md](features/F-QUERY.md) | F-CUSTOMER, F-PRODUCT-MASTER, F-QUERY-APPROVAL, F-PROCUREMENT |
| F-QUERY-APPROVAL | HOD approves query products → procurement (with rate/follow-up reuse rule) | — | hod | [ ] | [ ] | [ ] | [features/F-QUERY-APPROVAL.md](features/F-QUERY-APPROVAL.md) | F-QUERY, F-PROCUREMENT, F-RATE |
| F-PROCUREMENT | Pro Bucket: collect supplier rates per unit, submit to HOD | category | procurement | [ ] | [ ] | [ ] | [features/F-PROCUREMENT.md](features/F-PROCUREMENT.md) | F-QUERY-APPROVAL, F-SUPPLIER, F-RATE, F-RATE-APPROVAL |
| F-RATE-APPROVAL | HOD reviews/approves procurement rates; sets target rate & chosen supplier | — | hod | [ ] | [ ] | [ ] | [features/F-RATE-APPROVAL.md](features/F-RATE-APPROVAL.md) | F-PROCUREMENT, F-RATE, F-QUOT, F-PO |
| F-RATE | **Rate ledger** (procurement/quoted/po/billing) + reuse/follow-up window | — | system | [ ] | [ ] | [ ] | [features/F-RATE.md](features/F-RATE.md) | F-PROCUREMENT, F-QUOT, F-PO, F-BILLING |
| F-QUOT | Quotation build (rates, discount, freight, GST, delivery, pull-from-query, PDF, send) | zone | sales, hod | [ ] | [ ] | [ ] | [features/F-QUOT.md](features/F-QUOT.md) | F-QUERY, F-RATE, F-QUOT-APPROVAL, F-SALES-ORDER, F-FOLLOWUP |
| F-QUOT-APPROVAL | HOD approves quotation | — | hod | [ ] | [ ] | [ ] | [features/F-QUOT-APPROVAL.md](features/F-QUOT-APPROVAL.md) | F-QUOT, F-HOD-DASH |
| F-SALES-ORDER | Convert quotation → sales order; addresses, amounts, delivery, add lines | zone | sales, hod | [ ] | [ ] | [ ] | [features/F-SALES-ORDER.md](features/F-SALES-ORDER.md) | F-QUOT, F-FULFILLMENT, F-BILLING |
| F-FULFILLMENT | Route SO lines by category (+manual override); HOD target rate & supplier choice | category | hod, procurement | [ ] | [ ] | [ ] | [features/F-FULFILLMENT.md](features/F-FULFILLMENT.md) | F-SALES-ORDER, F-RATE-APPROVAL, F-PO |
| F-PO | Purchase bucket: assign, purchase from chosen supplier | category | purchase_manager | [ ] | [ ] | [ ] | [features/F-PO.md](features/F-PO.md) | F-FULFILLMENT, F-BILLING, F-INVENTORY |
| F-BILLING | Billing requests → finance/HOD approval | — | purchase, finance, hod | [ ] | [ ] | [ ] | [features/F-BILLING.md](features/F-BILLING.md) | F-PO, F-PAYMENT, F-HOD-DASH |
| F-PAYMENT | Payment execution + payment backlog | — | finance, hod | [ ] | [ ] | [ ] | [features/F-PAYMENT.md](features/F-PAYMENT.md) | F-BILLING, F-PO, F-HOD-DASH |
| F-INVENTORY | Inventory receipt of purchased goods | — | inventry_manager | [ ] | [ ] | [ ] | [features/F-INVENTORY.md](features/F-INVENTORY.md) | F-PO, F-DISPATCH |
| F-DISPATCH | Dispatch + upload dispatch proof + delivery approval | — | dispatch_manager, hod | [ ] | [ ] | [ ] | [features/F-DISPATCH.md](features/F-DISPATCH.md) | F-INVENTORY, F-HOD-DASH |
| F-FOLLOWUP | Follow-up dashboard (query/quotation follow-ups, lost quotations) | zone | sales, hod | [ ] | [ ] | [ ] | [features/F-FOLLOWUP.md](features/F-FOLLOWUP.md) | F-QUERY, F-QUOT, F-REPORT |
| F-HOD-DASH | HOD dashboard: KPIs, pending actions, analytics | — | hod | [ ] | [ ] | [ ] | [features/F-HOD-DASH.md](features/F-HOD-DASH.md) | F-QUOT-APPROVAL, F-RATE-APPROVAL, F-BILLING, F-DISPATCH, F-PAYMENT |
| F-TARGET | Zone/employee targets & analytics | zone | hod | [ ] | [ ] | [ ] | [features/F-TARGET.md](features/F-TARGET.md) | F-SETTINGS, F-EMP, F-REPORT |
| F-REPORT | Reporting across the pipeline | zone/category | hod | [ ] | [ ] | [ ] | [features/F-REPORT.md](features/F-REPORT.md) | all |

> ⏳ Confirm/expand as we walk each feature. Keep IDs stable.

---

## 6. Relationship map (global)

Every edge here MUST also appear in both related features' `features/<id>.md` files.

```
F-SETTINGS --(defines zones/sub-zones/categories + mappings)--> <all operational features>
(NO branch scoping — D19: single-tenant, one HOD)
F-EMP      --(zone-mapped)-->      sales features (F-CUSTOMER, F-QUERY, F-QUOT, F-SALES-ORDER, F-FOLLOWUP)
F-EMP      --(category-mapped)-->  procurement features (F-PROCUREMENT, F-PO, F-FULFILLMENT)
F-RBAC     --(guards)-->           <all features>

F-CUSTOMER --(source of)-->        F-QUERY
F-PRODUCT-MASTER  --(products/combos for)--> F-QUERY, F-QUOT, F-PO
F-SUPPLIER --(category-mapped, L1/L2/L3, rate source for)--> F-PROCUREMENT, F-FULFILLMENT, F-PO

F-QUERY        --(HOD approves lines via)-->   F-QUERY-APPROVAL --(sends approved lines to)--> F-PROCUREMENT
F-FOLLOWUP     --(highlights overdue rates, informational — D15)--> F-QUERY, F-QUOT
F-PROCUREMENT  --(submits supplier rates to)--> F-RATE-APPROVAL --(HOD approves rate into)--> F-RATE
F-QUERY        --(ready → convert; rates OPTIONAL D16)--> F-QUOT
F-QUOT         --(reads approved procurement rate from)--> F-RATE
F-QUERY        --(1 query → MANY quotations; query-product ↔ quotation M:N, traced D18)--> F-QUOT
F-QUOT         --(revision = regenerate as NEW quotation D17)--> F-QUOT
F-QUOT         --(HOD approves via)-->          F-QUOT-APPROVAL --(surfaced on)--> F-HOD-DASH
F-QUOT         --(sent; lost tracked in)-->     F-FOLLOWUP
F-QUOT         --(customer accepts → convert)--> F-SALES-ORDER
F-SALES-ORDER  --(routes lines by category to)--> F-FULFILLMENT
F-FULFILLMENT  --(HOD sets target rate + chosen supplier using actual rate from)--> F-RATE-APPROVAL/F-RATE
F-FULFILLMENT  --(creates)-->                    F-PO
F-PO           --(raises)-->                     F-BILLING --(finance/HOD)--> F-PAYMENT
F-PO           --(after payment, purchased → received in)--> F-INVENTORY --(collected & dispatched by)--> F-DISPATCH
F-DISPATCH     --(HOD delivery approval on)-->   F-HOD-DASH
F-PAYMENT      --(backlog on)-->                 F-HOD-DASH
F-TARGET       --(zone/employee perf from)-->    F-QUERY, F-QUOT, F-SALES-ORDER
F-REPORT       --(aggregates)-->                 <all>
```

---

## 7. Data model — current state, gaps, and redesign direction

### 7.1 Current state (verified)
Product line-items are **fragmented and duplicated across every stage**, with inconsistent
shapes:
- `query.products[]` (embedded) **AND** `query_products` collection **AND** `queryNewProduct`.
- `quotation.products[]` (embedded) **AND** `quotedProductRate` **AND** `quotationSnapshot`.
- `poProduct` (per-line) with its own status enum + legacy `inventoryStatus`.
- Rates spread across `rateMaster` (with `procurementSnapshot`/`quotationSnapshot`/`poSnapshot`/
  `purchaseSnapshot` Mixed buckets), `rateCombination`, `quotedProductRate`, `rateLog`,
  `productlHodRates`.
- **Sales Order / Purchase Order are INVERTED (naming gap, see D1).** The customer-facing sales
  order DOES exist — it is the model **named `purchaseOrder`** (`/purchase-orders`, has
  `industry_id`, billing/shipping address, `quotationId`, `poPaymentReceived`). The supplier-side
  purchase is `poProduct` + `purchaseBillingRequest`. Frontend already labels the former
  "Sales Order" (`SalesOrders.js`, `CreateSalesOrderFromQuotation.js`) while calling
  `/purchase-orders` — confusing and to be renamed.
- `variantCombination` exists but the pipeline often carries loose `productName`/`rawProductCode`
  strings instead of a firm combination reference → identity drift (see D3).

**Current → target model rename / segregation map (D1):**

| Current (code today) | Real meaning | Target |
|----------------------|--------------|--------|
| `purchaseOrder` model, `/purchase-orders` | Customer order (accepted quotation) | **`salesOrder`** + **`salesOrderProduct`** |
| `poProduct` + `purchaseBillingRequest` | Supplier buy (line-level) | **`purchaseOrder`** + **`purchaseOrderLine`** |
| `query.products[]` + `query_products` + `queryNewProduct` | Query line-items | **`queryLine`** (combination-anchored, D3) |
| `quotation.products[]` + `quotedProductRate` | Quotation line-items + quoted rate | **`quotationLine`** (+ rate ledger row) |
| `rateMaster` (+ Mixed snapshots) + `rateCombination` + `rateLog` + `quotedProductRate` | Rate history | **`rateLedger`** (typed rows, D4/F-RATE) |

### 7.2 Problems (the "gaps")
- Same line-item re-modeled per stage with different field names/shapes → inconsistency & drift.
- `Mixed`/snapshot fields hide structure and make queries/reporting brittle.
- Status enums differ per stage and carry legacy fallbacks.
- Weak/loose linkage between a line and its **variant combination** (the true product identity).
- Sales order not a first-class entity.

### 7.3 Redesign direction (principles — detail per feature file)
1. **One canonical line-item identity** anchored to **`variantCombination`** (the "product"),
   carried consistently from query → procurement → quotation → sales order → PO → dispatch.
2. **Segregate per stage as first-class, consistently-shaped documents** (query line, quotation
   line, sales-order line, PO line) that **reference the same combination + upstream line id**,
   rather than re-embedding divergent copies.
3. **Rename to true meaning (D1):** customer order → `salesOrder` (+ `salesOrderProduct`);
   supplier buy → `purchaseOrder` (+ `purchaseOrderLine`). Migrate existing `purchaseorders`
   docs into `salesorders`, and `poProduct` into `purchaseorderlines`.
4. **One consistent rate ledger** (`F-RATE`) with typed rows (procurement/quoted/po/billing),
   explicit supplier + unit + follow-up window — replace ad-hoc `Mixed` snapshot buckets.
5. **Uniform status vocabulary** per stage (documented enums, no legacy fallbacks in the new model).
6. **Consistent scoping fields on every operational doc:** `zone`/`subZone` (sales axis) and
   `category` (procurement axis) so routing/targets/reporting are queryable. **NO `branchId`
   scoping** (D19 — single-tenant). Drop legacy `branchId` from the redesigned models.
7. Preserve the shared conventions (SchemaTypes, commonFieldsPlugin, codes/slugs, soft-delete).

> Each feature file (`features/<id>.md`) specifies the concrete target schema, migration notes,
> endpoints, and the mapping to the existing collections it replaces/merges.

---

## 8. Role → Feature access matrix

> ⏳ **TO DEFINE** with product owner. Mark view / create / approve per cell. Drives `F-RBAC`
> and frontend `_nav.js` + `usePermissions`. Must be identical to the frontend copy.

| Feature \ Role | hod | sales | purchase | procurement | finance | dispatch | inventory | back_office | localproc | localpurch | proc_master | admin |
|----------------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| _(fill per feature)_ | | | | | | | | | | | | |

---

## 9. Cross-cutting requirements

- [ ] **Frontend design unchanged** except where a feature strictly requires a new/changed screen.
- [ ] Backend follows layered slices + response envelope + Joi + `CustomError` (see ../CONVENTIONS.md).
- [ ] Every operational doc carries zone/sub-zone and/or category as applicable (NO `branchId` — D19).
- [ ] Line identity anchored to `variantCombination`; no loose product-name-only linkage in new model.
- [ ] The **same product/combination code is the tracking key across every stage** (query →
      quotation → sales order → PO); code is generated at first creation (draft, same format) and
      **never changes** — even for products added mid-pipeline (D10).
- [ ] One rate ledger; no `Mixed` snapshot buckets in redesigned models.
- [ ] Every backend endpoint mirrored in a frontend service + `endpoints.js`; response shape handled.
- [ ] RBAC declarations on every route; role→feature matrix (§8) respected in nav/actions.
- [ ] MASTER + both `features/<id>.md` files updated in the same change as code.
- [ ] `npm run build` (FE) green; feature verified in the running app for its owner role(s).

---

## 10. Change log

- 2026-07-23 — **F-PRODUCT-MASTER IMPLEMENTED** (BE+FE; FE build green; BE verified via API). D30 landed: product `gstPercentage`→enum **[0,5,18,25]** mandatory (product+combination, Joi+model+yup+GST dropdown locked via new `fixedRates`/`allowCustom` props); product `status` vocabulary collapsed to **`pending_hod_approval`→active/rejected/inactive** (default pending; create FORCES pending; general update never flips status; new **`PUT /products/update-status`** HOD gate = the only path to `active`; ProductList approve/reject/(de)activate row-actions for HOD; **reject REQUIRES a `rejectionReason` remark** — Joi `.when` + reject dialog forces non-empty, cleared on approve); **selling ≥ purchase** (allow equal; block `price<costPrice`); product **delete→soft** (+ cascade combos); **`category.group` now MANDATORY** (schema+Joi; data already 100% populated); **"Map Client Code"→"Map Customer Code"** relabel; master codes → **`GRP-<n>`/`CAT-<n>`/`SUB-<n>`/`BRD-<n>`** (dropped name-part). Fixed latent bug exposed by soft-delete: `generateProductCode` now counts soft-deleted rows so codes are never reused (D10). Migration `scripts/migrate-catalog-f-product-master.js` (idempotent): status remap (11), GST report (1 invalid: `mig1335` gst=65, left for HOD), same-group dup-category dedupe (14 merged+soft-deleted), 27 cross-group dup NAMES reported for owner, 42 blank brand codes backfilled, brandCategory backfill. Owner Q&A resolved 5 open items (auto-gen master codes `<PREFIX>-<n>`; category.group mandatory+dedupe; add `rejected`; taxClause max=200; skip `fixedStock`). Left 6 `TEST PM` products in DB (`PRD-TST-2/4/5/6/7/8`: GST 0/5/18/25, single/multi-combo, mapped customer+supplier codes, inventory, rate-validity timeline; 3 active + 3 pending) + `TEST PM StatusGuard` (rejected+soft-deleted) + masters `TEST PM Group A`/`TEST PM Brand B3`. FE↔BE validators aligned field-by-field (0 FE-pass/BE-fail). **procurementReviewStatus** normalisation + single-`product.brand` deprecation left as documented no-ops (consumed by unbuilt features). Registry row → [x]/[x]/[x].
- 2026-07-23 — feature — **F-PRODUCT-MASTER (Product Master) plan authored** (single backend doc, FE folded
  into §5). Added **D30** (product-master catalog rules): new products **HOD-gated everywhere**
  (`pending_hod_approval → active`, extends D10); **brand = category-filtered variant attribute**
  (deprecate single `product.brand`, options via `brandCategory`); **GST% = fixed enum [0,5,18,25]**
  mandatory; **selling ≥ purchase** (allow equal); **"terms of days" = rate-validity days = the
  procurement timeline** (combination `timeline`/`nextTimelineDate`/`procurementReviewStatus`; no
  per-mapping field); **"Map Client Code" → "Map Customer Code"** (FK stays `industry`); product
  **delete → soft delete**. Grounded in live models (`group`/`category`/`subcategory`/`brand`/
  `brandCategory`/`product`/`variantCombination`), `product`/`variantCombination` services + code
  generation (`PRD-<GRP>-<n>`, `variantCode`), and the FE 7-step `ProductForm` wizard — feature is
  **largely built**, so the doc is verified-current-state → gaps → target. Registry row F-PRODUCT-MASTER →
  [~]. **Open for implementation:** confirm `fixedStock` field + meaning; master code formats (owner's
  given pattern / auto-generate?); tax-clause max length (25 vs 200); add product `rejected` status?;
  make `category.group` mandatory + dedupe duplicate category NAMES across groups (D8). **Next: F-RBAC**
  (last entity) → then the pipeline starting **F-QUERY**.
- 2026-07-21 — verified (re-run) — **F-CUSTOMER live UI re-verification** (headless Chromium via the repo's puppeteer, driving the real `:3004` app end-to-end). Added TEST customers through the **Customer form UI** (UI→API→DB round-trip, each with a distinct zone/paymentTerms/creditLimit): `TEST Customer UI One V2` (INDORE-CUS-1006), `TEST Customer UI Two V2` (PITHAMPUR-CUS-1007), `TEST Customer UI Three V2` (RAU-CUS-1008 — postal city "Bijrauni" but code-city RAU, proving code-city = **zone.city** not postal city), `TEST Customer UI Four V2` (DEWAS-CUS-1009, creditLimit 750000/Net 90), `TEST Customer UI Five V2` (SAWER-CUS-1010); plus `TEST Customer API Indore` (INDORE-CUS-1005) via API. Contacts on INDORE-CUS-1006: `TEST BuyerActive` (active, primary, shown) + `TEST SecondActive` (set **inactive** → **disappears** from the customer View / customer-scoped list, count 2→1 — inactive-hidden rule confirmed). Empty/invalid form **blocked by yup** with correct inline messages (name/zone/location/addresses/State/City required, "Pincode must be 6 digits"); same payloads **400 via API** (matching Joi messages). Customer **View** shows the **Contacts** section (designation·name·phone·email·remark, active-only) and **no Purchase Managers** block; Payment Terms Net 30 + Credit Limit ₹20,00,000 render. **FE(yup)↔BE(Joi) re-audit:** tightened FE `state`/`city` to `.max(100)` to match Joi (was unbounded — only reachable outside the dropdown, but closes the FE-laxer gap). These UI-run TEST entries (codes 1005–1010 + the two contacts) are **left in the DB** alongside the earlier 1000–1004 set for owner review.
- 2026-07-21 — implemented — **F-SUPPLIER built + verified** (BE+FE, FE build green). **Backend:** supplier model gains **`supplierCode`** (`CITY-SUP-<n>`, D29 — sparse-unique, immutable), **`codeCity`** enum `['Indore','Noida']` default Indore, **`categoryGrades:[{category, grade:L1/L2/L3|null}]`** (D13, kept in parallel with legacy `categories[]`), `creditLimit` default `null→2000000`, `paymentTerms` enum `['','Advance','Net 15','Net 30','Net 45','Net 60','Net 90']`. `codeSequence` adds a `supplierCode` sequence (`SUP<n>` store) + `SET_ON_INSERT`; service generates `<CITY>-SUP-<n>` in `addSupplier` via `generateUniqueCode` custom `format` (numeric store untouched → codes immutable), **syncs `categories[]`↔`categoryGrades[]`** on create/update, **hard-delete → soft-delete + cascade** (contacts + branches, mirrors `deleteIndustry`), populates `categoryGrades.category`. Joi `createSupplierSchema` tightened to **owner-confirmed parity set** (address/phone_1/email/gst/state/city/pincode/paymentTerms(enum)/≥1 category/codeCity required; `phone_2` optional; `creditLimit` default 2000000, accepts blank→default); **new** `supplierContactPerson` Joi validator (firstName required, emails TLD-strict, phones 5–20 digits optional) wired into its create/update controllers. Idempotent migration `scripts/migrate-supplier-f-supplier.js` (backfill codeCity/supplierCode/creditLimit/categoryGrades; existing blanks left for HOD edit; nothing deleted; ran clean — 6 existing suppliers coded `INDORE-SUP-1000..1004`). **Frontend:** SupplierForm requires the parity set, `phone_2` optional, credit-limit prefilled 2000000, **payment-terms dropdown** + **`codeCity` dropdown** (Indore/Noida) + **per-category L1/L2/L3 grade selects** posting `categoryGrades[]` (+legacy `categories[]`), **supplier code read-only**; SupplierList adds a **Supplier Code** column; SupplierView adds an **active-only Contacts** section + code + per-category grades; supplier contact form relabelled **"Supplier" / "Map to Supplier"**. **Validator trap closed:** supplier `email`/`companyEmail` + contact emails switched from `.email({tlds:{allow:false}})` (accepts `.local`/`.test`) to plain `.email()` (IANA TLD check); FE form email switched to the TLD-strict `emailRequired`/`emailOptional` helpers — **field-by-field FE(yup)↔BE(Joi) boundary check: 0 FE-pass/BE-reject mismatches** (name/email-TLD/gst/pincode/paymentTerms/categories/codeCity/creditLimit/grade). Owner-resolved open sub-items: token **`SUP`**; **embed `categoryGrades[]`** (grade optional at onboarding); **full parity** mandatory set; paymentTerms default **Net 30**. **TEST data left in DB (owner review):** `TEST Supplier One` (INDORE-SUP-1009, ungraded), `TEST Supplier Two` (NOIDA-SUP-1010, L1/L2/L3), `TEST Supplier Three` (INDORE-SUP-1011, L2), `TEST Supplier Four` (INDORE-SUP-1012, L1+ungraded), `TEST Supplier Five` (NOIDA-SUP-1013, L3), `TEST Supplier Six` (INDORE-SUP-1014, ungraded rows), `TEST Blank Credit` (INDORE-SUP-1015, blank→2000000), `TEST API Supplier Beta` (NOIDA-SUP-1007, L1/L2) + `TEST API Supplier Alpha` (NOIDA-SUP-1005) **soft-deleted** to prove delete round-trip (`isDeleted:true`, hidden from list, preserved in DB). Verified: valid create→code+grades persist; invalid (missing-required / bad GST / bad pincode / off-enum paymentTerms / `.local` email) all 400 via API; soft-delete hides-but-preserves. **Note:** no browser-automation lib in repo → UI proof via the live API the UI calls through `supplierService` (build green). **Next: F-PRODUCT-MASTER.**
- 2026-07-21 — implemented — **F-CUSTOMER built + verified** (BE+FE, FE build green). **Backend:** industry model `creditLimit` default `null → 2000000`, `paymentTerms` enum `['','Advance','Net 15','Net 30','Net 45','Net 60','Net 90']`, purchase-manager fields marked legacy (kept for pipeline PDF exports, no longer written by the customer form); Joi make `area`/`location`/`state`/`city`/`pincode`(6-digit)/`paymentTerms`(enum) **required on create AND update**, `creditLimit` default 2000000; service generates `customerCode = <CITY>-CUS-<n>` (CITY = mapped `zone.city`, uppercased/stripped) via `generateUniqueCode` custom `format` (numeric store untouched → codes immutable), **create blocked 400 if the zone has no city**; **new** `industryContactPerson` Joi validator (firstName+email required, `status` enum, `industryId` required-when-active) wired into its controller; contact list-by-customer defaults to **active-only** (inactive hidden). Idempotent migration `scripts/migrate-customer-f-customer.js` (backfill `creditLimit` null→2000000; report-only for blank mandatory fields + off-enum paymentTerms — nothing fabricated; existing `CUS<n>` codes NOT retro-renamed). **Frontend:** IndustryForm — location/state/city/pincode/paymentTerms now required, `paymentTerms`→Select enum, `creditLimit` prefilled 2000000, **Purchase Managers section removed** (payload no longer sends `purchaseManagers`/`purchase_manager_*`); IndustryList — Purchase Manager column dropped (desktop+mobile); IndustryView — Purchase Managers block → **Contacts** section (designation·name·phone·email·remark, **active only**); ContactPersonForm `PARENT_CONFIG.industry` relabelled **"Client"→"Customer"** (FK stays `industryId`). **Resolved w/ owner:** paymentTerms default Net 30; require zone.city (block, no placeholder); zone editable-on-update but code frozen (query-lock deferred to F-QUERY); business-info stays optional; keep null-on-inactive; deprecate-PM-now. **FE(yup)↔BE(Joi) verified aligned** (industry: 0 FE-pass/BE-fail; contact FE stricter on lastName — OK). **TEST data left in DB (owner review):** `TEST API Customer One` (INDORE-CUS-1000), `TEST Pithampur Traders` (PITHAMPUR-CUS-1001, GST), `TEST Rau Industries` (RAU-CUS-1002, +sub-zone), `TEST Dewas Overrides` (DEWAS-CUS-1003, creditLimit 500000/Advance), `TEST Sawer Minimal` (SAWER-CUS-1004, Net 90); contacts `TEST Primary Buyer`(primary), `TEST Contact One`, `TEST Rau Contact`, `TEST Inactive`(hidden). **Discovered:** many existing rows have `paymentTerms:"undefined"` (string literal, prior form bug) — flagged by migration for HOD to normalise on next edit. **Next: F-SUPPLIER** (or F-PRODUCT-MASTER). **Note:** `companyEmail` — BE Joi uses `tlds:{allow:false}` so not stricter than yup `.email()`; contact email uses TLD-strict shared helper (FE) vs Joi default (BE) — same pre-existing condition as supplier, flagged.
- 2026-07-21 — enhancement — **F-EMP personal-info hardening** (owner request). Added `state` + `city` to the employee (model + create/update Joi + FE yup + form + view), sourced from the existing `/location` API via `locationService` (state dropdown → cities-by-state cascade; pincode-on-blur auto-fills state/city — same pattern as SupplierForm). Made **`fatherName`, `motherName`, `state`, `city`, `pincode` (6-digit) REQUIRED** on FE and BE. **No employee code** added (owner: only PIN code). FE (yup) ↔ BE (Joi) verified aligned for these fields (11/11 each side; 0 FE-pass/BE-fail). Pure personal-info CRUD + display — no mapping. Also aligned the shared email validator: FE `emailRequired`/`emailOptional` now TLD-strict (reject reserved TLDs like `.local`/`.test`) to match Joi — closes a prior FE-pass/BE-fail gap. **QA data left in test DB (owner review):** `TEST Procurement One` (MP/Indore), `TEST Purchase Manager` (MH/Mumbai), `TEST Sales Single Zone` (GJ/Ahmedabad), `TEST Sales Multi Zone` (RJ/Jaipur), `TEST Finance Exec` (DL/New Delhi) — `idnumber` TESTEMP001–005, emails `test.*@migti.com`, password `Test@1234`.
- 2026-07-21 — feature — **F-CUSTOMER + F-SUPPLIER plans authored** (both sides, batched — same shape,
  supplier delta = category mapping). Added **D29** (customer/supplier codes = `CITY-CUS-<n>` /
  `CITY-SUP-<n>`; customer city from mapped **zone.city**, supplier city from a fixed `codeCity` enum
  `[Indore,Noida]` default Indore; adds the missing `supplierCode`; resolves the D12 code open item).
  Folded: mandatory onboarding fields (location/address state-city-pincode/payment terms; zone
  mandatory on create+update for customer); **`creditLimit` default 2000000**; **`paymentTerms` →
  dropdown enum**; **retire customer purchase-manager surface in favour of contacts** (designation·
  name·phone·email·remark), **inactive contacts hidden**, contact "Client mapping" **relabelled
  "Customer"**. Grounded in live models/services/validators/routes + the FE forms/views. Registry
  rows F-CUSTOMER/F-SUPPLIER → [~].
- 2026-07-21 — implemented — **F-EMP built + verified** (backend + frontend, FE build green). Backend: employee model `+assigned_categories[ref category]`, **dropped legacy `zoneId`**, **`permissions` commented out** (parked — F-RBAC), `branchId` made optional (D19), `categories` CSV kept+deprecated (product-owner: keep in parallel, purchaseTask consumer unchanged). Service auto-derives `assigned_categories` from `assigned_groups` (D27) on create/update; **mandatory group mapping** for the 5 procurement/purchase roles (`procurement`, `purchase_manager`, `purchase_exicutive`, `localprocurement`, `localpurchase`) → 400 otherwise; non-proc roles force `assigned_categories=[]`; strips client-sent `permissions`/`categories`/`assigned_categories`; login JWT `permissions` line commented; list/get populate group+category names. Validator dropped `permissions`/`zoneId`/hand-set `categories`; role stays free string (no soft enum — owner decision). Idempotent migration `scripts/migrate-employee-f-emp.js` (fold `zoneId`→`zoneIds` + `$unset` w/ `strict:false`; backfill categories from groups). Frontend: group-mapping section shown+**required only for proc/purchase roles**; **Access Permissions card parked**, `categories` retired from form/schema; **List + View show DESIGNATION never role**; **System Information card removed**; **derived categories shown read-only** on View. Verified UI→API→DB (5 valid + 4 invalid, FE yup ↔ BE Joi agree). Registry row → [x]/[x]/[x].
- 2026-07-21 — implemented — **F-SETTINGS built + verified** (backend + frontend). Company is now a singleton: added unique `code` (`COM<n>` via generateUniqueCode), `addCompany` rejects a 2nd company (409), `code` immutable on update, `deleteCompany` → soft delete, new `GET /v1/companies/current`. Zone (`area`): added `state`, **dropped `branchId`+`companyId`** (D19), name-uniqueness now global `(name)` case-insensitive, `listAreas` gains `isActive` filter + returns `state`, `deleteArea` → soft delete with referential guard (sub-zones/customers/employees). Sub-zone: added `isActive` (create/update/list). Idempotent migration `scripts/migrate-settings-f-settings.js` (1 company code, 12 zones state+unset, 10 sub-zones isActive). FE: AreaForm cascading state→city + status toggle (no company/branch), AreaList State+Status columns/filter, SubZone status toggle + active-zone dropdown, Company `code` shown read-only. `npm run build` green; verified in the running app as HOD (5 valid + 5 invalid + toggles + delete guard, UI→API→DB round-trip). Registry row → [x]/[x]/[x].
- 2026-07-21 — scaffold — MASTER rewritten as full business+system reference from product-owner
  walkthrough; feature registry, lifecycle, relationship map, and DB-redesign direction seeded.
- 2026-07-21 — refine — strengthened D10: a product added newly at ANY stage (query/quotation/sales order) gets a real same-format code immediately as a draft (pending_hod_approval); the SAME code is the stable tracking key mapped across query/quotation/SO products and never changes. Added matching §9 invariant.
- 2026-07-21 — refine — sharpened D22 (billing request spans products from MULTIPLE sales orders, fully SO-decoupled) and D24 (SO fulfilled only when ALL products dispatched; SO status derived from line dispatch). Confirmed D21/D23/D25.
- 2026-07-21 — decision — added **D28** (company documents / CATALOGS are GROUP-based, not category-based; `companyDocument.groupId` already models this). Clarifies: routing=category (D8), catalogs=group (D28).
- 2026-07-21 — resolved — **D8-vs-D27 tension CLOSED**: `category.group` is a single ref → one category doc = one owner (D8 holds by ID); duplicate category NAMES across groups are a F-PRODUCT-MASTER dedupe task, not an F-EMP concern. No per-employee uniqueness check needed. Updated D8, D27, F-EMP.
- 2026-07-21 — feature — **F-EMP plan authored** (both sides). Added **D27** (procurement/purchase employees map to groups → categories AUTO-DERIVED `assigned_categories`; mandatory for those roles; replaces `categories` CSV). Decisions folded: keep sales zone/sub-zone rule (D6); **comment out Access Permissions** (parked, not deleted — permissions field/Joi/sync/JWT-line); **drop legacy `zoneId`**; **show designation never role** in all UI; **remove System Information** from EmployeeView. Flagged D8-vs-D27 overlap tension + purchaseTask consumer switch (name→id). Registry row → [~].
- 2026-07-21 — feature — **F-SETTINGS plan authored** (both sides: features/F-SETTINGS.md) covering Company (singleton), Zones (add state+city via existing /location API, add isActive, drop branchId per D19), Sub-zones. Grounded in live code/DB (1 company, 12 zones, 10 sub-zones; branchFilter already neutralized; locationService/location API reusable). Registry row → [~]. Confirmed: state/city on ZONE not company; zone = name+state+city+areaType+isActive; preserve data via migration.
- 2026-07-21 — decisions — added D19 (**NO BRANCH CONCEPT — single-tenant, one HOD**; dropped branchId scoping), D20 (RBAC is UI/sidebar-side, not backend-enforced; common gating fn), D21 (target rate = guideline; deviation needs remark → reveals real rate → surfaced to HOD), D22 (billing request per-supplier, independent of sales order), D23 (credit+debit payment, full ledger, HOD marks paid), D24 (partial delivery, per-product), D25 (dispatch proof = receipt upload, HOD-approval gates complete), D26 (notifications designed separately). Renamed F-BRANCH→F-SETTINGS (zone/category setup). Purged tenant-branch scoping throughout §2/§5/§6/§7/§9; kept 'customer branch' as a legit entity.
- 2026-07-21 — decisions — added D15 (follow-up rates highlighted, not a reuse/skip mapping — supersedes old rate-reuse mechanic), D16 (partial quotations; rates optional), D17 (revision = new quotation), D18 (query→many quotations, query-product↔quotation M:N traced for reporting). Reconciled §4 lifecycle + §6 relationship map; clarified D3 to defer to D10.
- 2026-07-21 — decisions — added D9 (combination mandatory, is the product, system keys off variantCode), D10 (new product = real code + pending_hod_approval → active), D11 (inventory redesigned separately later), D12 (customer/supplier code formats; supplierCode missing today), D13 (L1/L2/L3 grade per supplier-per-category), D14 (customer & supplier separate records). Open item: exact code format. Updated §2 entities.
- 2026-07-21 — decisions — added D8 (category is the only procurement-routing level; one category ↔ one procurement person; mapping mandatory; unmapped categories flagged). Updated §3 category axis.
- 2026-07-21 — decisions — added D5 (margin HOD-only, computed at procurement), D6 (multi-zone; sub-zone-level ownership), D7 (query zone immutable — tied to customer branch). Updated §3 axes.
- 2026-07-21 — decisions — added §1A locked decisions D1–D4 (SO/PO rename, unified state machine,
  provisional combination for new products, feature-by-feature refinement); §7 updated with the
  verified SO/PO inversion + current→target rename/segregation map. Verified against live code/DB.

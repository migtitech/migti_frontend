# Design System

A shadcn-style Tailwind v4 UI kit (Radix under the hood) that is **replacing CoreUI**. New
and edited code uses this kit; CoreUI is migrated out, never added to. Full historical detail
is in [../UI_REDESIGN_HANDOFF.md](../UI_REDESIGN_HANDOFF.md); this is the working reference.

## Where things live

- **Primitives:** `src/components/ui/` — import from `../../components/ui`.
- **Shared components:** `src/components/` — import from `../../components`.
- **Tokens:** `src/scss/tailwind.css` (`@theme`) + `src/scss/_tokens.scss`. Primary = blue
  `#2563eb`. **Do not change tokens** without explicit direction.
- **`cn()` classnames helper:** `src/lib/utils.js` → `import { cn } from "../../lib/utils"`.
- Icons: `lucide-react`.

## Primitives (`components/ui/`)

`Button` (variants: default / secondary / outline / ghost / destructive / success / warning /
link; sizes: default / sm / lg / icon), `Input`, `Textarea`, `Label`, `Select` (styled native
— same `value`/`onChange`/`<option>` API as `CFormSelect`), `Card` (+ `CardHeader` /
`CardTitle` / `CardDescription` / `CardContent` / `CardFooter`), `Badge` (default / secondary /
success / warning / destructive / info / outline), `Table` (+ `TableHeader` / `TableBody` /
`TableRow` / `TableHead` / `TableCell`), `Dialog` (Radix; `open` / `onOpenChange`), `Sheet`
(drawer, replaces `COffcanvas`), `Tabs` (Radix; controlled `value` / `onValueChange`),
`Checkbox`, `Switch` (`onCheckedChange`), `RadioGroup`/`RadioGroupItem`, `Spinner`, `Progress`,
`Skeleton`, `Avatar` (+`AvatarImage`/`AvatarFallback`), `Separator`, `Alert` (+`AlertTitle`/
`AlertDescription`), `Tooltip`, `DropdownMenu*`.

## Shared components (`components/`)

- **`PageHeader`** — `title` / `description` / `actions`. Top of every page.
- **`DataTable`** — enterprise table: search, sort, column toggle, sticky header, row
  selection/bulk, **Export to Excel**, pagination-friendly. Key props: `columns` (useMemo
  array: `key`/`label`/`sortable`/`render`/`align`/`exportable`/`toggleable`/`sortValue`/
  `exportValue`/`stopRowClick`), `rows`, `rowKey`, `loading`, `onRowClick`, `showSearch`,
  `emptyTitle`/`emptyMessage`, `exportFileName`, `rowClassName`/`rowStyle`.
- **`RowActions`** — `onView`/`onEdit`/`onDelete`/`extra`; pass `undefined` to hide an action
  by permission.
- **`StatusBadge`** — status string → auto variant. `StatusLabel`, `StatusToggle` also exist.
- **`CrudFormPage`** + **`FormField`** + **`FormSkeleton`** — form scaffold (all shadcn).
- **`ConfirmDialog`** (`visible`/`onClose`/`onConfirm`/`title`/`message`/`confirmText`/
  `cancelText`/`confirmColor`/`icon`/`closeOnConfirm`), **`EmptyState`**, **`Loader`**,
  **`Filtered`** (server-search input), **`TablePagination`**, **`FilterLockButton`**,
  **`SearchableDropdown`**, **`StatCard`**, plus domain dialogs (`MapBrandModal`,
  `ProductUnitSelect`, `GstRateSelect`, `PurchaseDetailDialog`, `QuotationFollowupDialog`,
  `TrackingTimeline`, …).

## CoreUI → shadcn mapping (quick reference)

| CoreUI                                                  | shadcn                                                                                                                                                                       |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CButton`                                               | `Button` (primary→default, secondary/outline→outline, ghost→ghost, danger→destructive, success→success, warning→warning, link→link; icon-only→`variant="ghost" size="icon"`) |
| `CBadge`                                                | `Badge` / `StatusBadge`                                                                                                                                                      |
| `CAlert`                                                | `Alert`+`AlertDescription` (danger→destructive, success→success, warning→warning, info/primary→info)                                                                         |
| `CCard*`                                                | `Card*`                                                                                                                                                                      |
| `CForm` / `CFormLabel` / `CFormInput` / `CFormTextarea` | `form` / `Label` / `Input` / `Textarea`                                                                                                                                      |
| `CFormSelect`                                           | `Select` (keep `value`/`onChange` + `<option>`s)                                                                                                                             |
| `CFormCheck`                                            | `Checkbox` (`onCheckedChange`) or native styled input inside RHF `register`/`Controller`                                                                                     |
| `CFormSwitch`                                           | `Switch`                                                                                                                                                                     |
| `CFormFeedback`                                         | `<p className="text-sm text-destructive">`                                                                                                                                   |
| `CRow`/`CCol`                                           | Tailwind grid (`grid grid-cols-1 md:grid-cols-2 gap-4`, `md:col-span-2` for full width)                                                                                      |
| `CTable*`                                               | `DataTable` (real lists) or `Table` primitives (small/static/detail)                                                                                                         |
| `CModal`                                                | `Dialog` (`visible`→`open`, `onClose`→`onOpenChange={(o)=>!o&&onClose()}`)                                                                                                   |
| `COffcanvas`                                            | `Sheet` (same `open`/`onOpenChange`)                                                                                                                                         |
| `CNav`+`CTabContent`                                    | `Tabs` (persist form-state tabs with `forceMount`+`hidden` — Radix unmounts inactive tabs)                                                                                   |
| `CProgress` / `CSpinner` / `CListGroup`                 | `Progress` / `Spinner` / `divide-y` list or `<dl>`                                                                                                                           |
| `CInputGroup`                                           | relative wrapper w/ absolute icon (`<Input className="pl-8">`) or flex row                                                                                                   |
| `CIcon` / `@coreui/icons`                               | `lucide-react`                                                                                                                                                               |
| `CWidgetStats*`                                         | `StatCard`                                                                                                                                                                   |

**Keep working:** `@coreui/react-chartjs` chart widgets (`CChart*`) are intentionally kept —
only restyle their container to `Card`. A few pages still import charts on purpose
(`IndustryView`, `PurchaseOrderSidebar`, `FinanceDashboard`, `HodDashboard`) — leave those.

## Rules

- **`type="button"`** on any Button that isn't a form submit (shadcn defaults to submit).
- **Presentational only** when restyling — no logic/handler/service/validation/routing/calc
  changes. Preserve every `// eslint-disable` comment and every feature/branch.
- Build (`npm run build`) is the gate — must stay green after any UI change.
- Don't rebuild primitives that already exist; don't change design tokens.

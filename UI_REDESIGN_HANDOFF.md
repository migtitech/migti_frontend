# ERP UI Redesign — Continuation Handoff

Paste the "PROMPT FOR NEW CHAT" section (bottom) into a fresh chat. Everything above is reference.

## 0. Project

- Repo: `/home/mindpath/Desktop/New Folder/Migti Tech/migti_frontend`
- Branch: `ui-redesign` (git). Backend is untouched and out of scope.
- Stack: React 19 + Vite 7, CoreUI (legacy, being replaced), Tailwind v4 + shadcn-style `ui/` primitives, react-hook-form + yup, react-router HashRouter, redux (sidebar), socket.io.
- Build: `npm run build` (~27s). This is the gate. Vite build = source of truth (ESLint is NOT part of the gate; pre-existing `react-hooks/set-state-in-effect` lint errors exist and are fine).
- Format: `npx prettier --write "src/**/*.{js,jsx}"` (husky pre-commit runs prettier; lint-staged does NOT run eslint).

## 1. Goal & Rules (unchanged from original brief)

Redesign the ENTIRE ERP UI to a modern, consistent, enterprise look (Linear/Notion/Salesforce feel) using shadcn + Tailwind. **User chose FULL shadcn replacement** (swap CoreUI CButton/CBadge/CAlert/etc. for shadcn), and **autonomous, build-gated batches**.

ABSOLUTE RULES: presentational only. Do NOT change business logic, state, effects, handlers, API/service calls, validation schemas, permissions, routing, calculations, PDF/chart data. Keep every feature/branch. The app must behave identically; only look/UX changes. Preserve all `// eslint-disable` comments. Any `<Button>`/`<button>` that is NOT a form submit must have `type="button"` (shadcn Button defaults to submit; CoreUI CButton defaulted to button).

## 2. Design system that ALREADY EXISTS (use it — do not rebuild)

Conversion guide (READ FIRST every session):
`/tmp/claude-1000/-home-mindpath-Desktop-New-Folder/3710a07f-843d-4551-b968-bdcd84d69117/scratchpad/CONVERSION_GUIDE.md`
(If that scratchpad is gone in the new session, the mapping is summarized in section 4 below — recreate the guide file from it.)

shadcn primitives in `src/components/ui/` (import from `../../components/ui`):
Button (variants: default/secondary/outline/ghost/destructive/success/warning/link; sizes: default/sm/lg/icon), Input, Textarea, Label, Select (styled native — same value/onChange/`<option>` API as CFormSelect), Card+CardHeader/CardTitle/CardDescription/CardContent/CardFooter, Badge (variants: default/secondary/success/warning/destructive/info/outline), Table+TableHeader/TableBody/TableRow/TableHead/TableCell, Dialog+DialogContent/Header/Title/Description/Footer/Close (Radix; `open`/`onOpenChange`), Sheet+SheetContent(side)/Header/Body/Footer/Title/Description (drawer, replaces COffcanvas; `open`/`onOpenChange`), Tabs+TabsList/TabsTrigger/TabsContent (Radix; controlled `value`/`onValueChange`), Checkbox, Switch (`onCheckedChange`), RadioGroup/RadioGroupItem, Spinner, Progress, Skeleton, Avatar/AvatarImage/AvatarFallback, Separator, Alert+AlertTitle/AlertDescription, Tooltip, DropdownMenu\*.

Shared components in `src/components/` (import from `../../components`):

- `PageHeader` (title/description/actions) — top of every page.
- `DataTable` — enterprise table: search, sort, column toggle, sticky header, row selection/bulk, **Export to Excel**, pagination-friendly. Props incl. `columns` (useMemo array: key/label/sortable/render/align/exportable/toggleable/sortValue/exportValue/stopRowClick), `rows`, `rowKey`, `loading`, `onRowClick`, `showSearch`, `emptyTitle/emptyMessage`, `exportFileName`, and `rowClassName`/`rowStyle` (row highlight).
- `RowActions` (onView/onEdit/onDelete/extra — pass `undefined` to hide by permission) — standard table action buttons.
- `StatusBadge` (status string → auto variant; supports success/warning/destructive/info/secondary).
- `EmptyState`, `ConfirmDialog` (shadcn now; API: visible/onClose/onConfirm/title/message/confirmText/cancelText/confirmColor/icon/closeOnConfirm), `Loader`, `Filtered` (server-search input), `TablePagination`, `FilterLockButton`, `SearchableDropdown`, `MapBrandModal`, `ProductUnitSelect`, `CrudFormPage`+`FormField`+`FormSkeleton` (form scaffold — all shadcn now).
- Icons: use `lucide-react` everywhere (NOT @coreui/icons / CIcon).
- `cn` util: `import { cn } from "../../lib/utils"`.

Design tokens live in `src/scss/tailwind.css` (@theme) and `src/scss/_tokens.scss`. Primary = blue #2563eb. Do not change tokens.

## 3. REFERENCE PAGES (copy these patterns exactly)

- List page: `src/views/admin/CompanyList.js`
- Form page: `src/views/admin/CompanyForm.js`
- Detail/View page: `src/views/admin/CompanyView.js`

## 4. CoreUI → shadcn mapping (quick reference)

CButton→Button (primary→default, secondary/outline→outline, ghost→ghost, danger→destructive, success→success, warning→warning, link→link; icon-only→`variant="ghost" size="icon"`). CBadge→Badge/StatusBadge. CAlert→Alert+AlertDescription (color→variant: danger→destructive, success→success, warning→warning, info/primary→info). CCard*→Card*. CForm→form, CFormLabel→Label, CFormInput→Input, CFormTextarea→Textarea, CFormSelect→Select (keep value/onChange + `<option>`s), CFormCheck→Checkbox (onCheckedChange) OR native styled input if inside RHF `register`/`Controller` (lowest risk), CFormSwitch→Switch, CFormFeedback→`<p className="text-sm text-destructive">`. CRow/CCol→Tailwind grid (`grid grid-cols-1 md:grid-cols-2 gap-4`, `md:col-span-2` full-width). CTable\*→ DataTable (real sortable list) or Table primitives (small/static/detail). CModal→Dialog (`visible`→`open`, `onClose`→`onOpenChange={(o)=>!o&&onClose()}`). COffcanvas→Sheet (same open/onOpenChange). CNav/CNavItem/CNavLink+CTabContent/CTabPane→Tabs (keep active-tab state; if a tab holds form state that must persist across switches, use `forceMount`+`hidden={activeTab!==key}` on TabsContent because Radix unmounts inactive tabs). CProgress→Progress. CSpinner→Spinner. CListGroup→`divide-y divide-border` list or `<dl>` key/value. CInputGroup/CInputGroupText→relative wrapper w/ absolute icon (`<Input className="pl-8">`) or flex row. CImage→img. CAvatar→Avatar. CBreadcrumb→drop (PageHeader covers) or simple `<nav>`. CIcon/@coreui/icons→lucide-react. **KEEP** `@coreui/react-chartjs` chart widgets (CChart/CChartBar/CChartLine/CChartDoughnut) working — only restyle their container to Card. Replace CWidgetStatsA/B/etc. stat tiles with shadcn stat-cards.

## 5. WHAT IS DONE (122 of 138 view pages + all shared/foundation)

- Foundation: all `ui/` primitives, shared components (RowActions, StatusBadge, DataTable, PageHeader, EmptyState), ConfirmDialog, Filtered, TablePagination, FilterLockButton, SearchableDropdown, MapBrandModal, ProductUnitSelect, CrudFormPage/FormField/FormSkeleton — all shadcn. Button has success/warning variants; Badge has info variant.
- All 30 List pages, all 16 Form pages, all 22 View pages — done + build-gated.
- `views/admin/branches/*` and `views/admin/employees/*` subcomponents — done.
- Most dashboards + misc admin done: AdminDashboard, SalesDashboard, PurchaseDashboard, ProDashboard, SuperAdminDashboard, HodDashboard, FinanceDashboard, PoBucketDashboard, TargetDashboard, FollowUpDashboard, QuotationFollowupDashboard, TargetAnalytics, FinalizeSalesOrder, PurchaseTasks, BranchManagement, BranchUserManagement, MyVisits, SidebarDocs, MyTargets, BranchSettings, DmgBucket, ProductLead, RaiseBillingRequest, BatchBillingRequests, and hod/SalarySlipForm, HodPaymentBacklog, SalaryManagement.
- Direct-converted: pages/Page404, Page401, Page500, sidebar/SidebarPageShell, pages/login/Login, employee/MySalary.
- `IndustryView`, `PurchaseOrderSidebar`, `FinanceDashboard`, `HodDashboard` only still import `@coreui/react-chartjs` (charts) — that is INTENTIONAL, leave as-is.
- Build is GREEN (`✓ built in ~27s`), nothing broken.

## 6. WHAT REMAINS (16 view pages + 13 shared/layout components)

### A. 16 view pages still using CoreUI components (convert per section 4):

- src/views/admin/BatchBillingRequestDetail.js
- src/views/admin/BranchAnalytics.js
- src/views/admin/FindProductModal.js (a modal component — CModal→Dialog, keep visible/onClose→open/onOpenChange, keep product search/select logic)
- src/views/admin/PendingPayment.js
- src/views/admin/PoPaymentBacklog.js
- src/views/admin/PoProductAdd.js
- src/views/admin/PoProductCreate.js
- src/views/admin/ProBucketDetail.js (large ~1605 lines — prefer targeted Edits)
- src/views/admin/QuotationGenerate.js
- src/views/admin/RateMaster.js
- src/views/admin/RawQueryCreate.js (large ~1113 lines)
- src/views/admin/RawQuery.js
- src/views/admin/TaskBucket.js
- src/views/admin/Tracking.js (~1102 lines; keep any map/tracking widget functioning)
- src/views/hod/EmployeeLocations.js (keep any map widget functioning, restyle container only)
- src/views/notifications/NotificationsPage.js
- ALSO check src/views/admin/PurchaseBucketDetail.js — grep says it may already be converted (not in the coreui-component list); VERIFY with grep before touching.

### B. 13 shared / layout-chrome components still on CoreUI:

- LAYOUT SHELL (load-bearing — CoreUI CSidebar/CHeader provide responsive collapse + redux sidebarShow + `--cui-sidebar-occupy` padding; convert with EXTRA care or leave if risky. The sidebar is already visually restyled via `sidebar-enhanced` classes in `src/scss/style.scss`): AppSidebar.js, AppSidebarNav.js, AppHeader.js, AppFooter.js, AppContent.js, AppBreadcrumb.js, header/AppHeaderDropdown.js, header/AppHeaderNotifications.js
- OTHER SHARED (safe to convert): AuthImage/AuthImage.js, ErrorFallback/ErrorFallback.js, TrackingTimeline/TrackingTimeline.js, RealtimeNotificationAlert.js, notifications/NotificationDescription.js

## 7. KNOWN ISSUES / FLAGS TO VERIFY

- **AdminDashboard.js line ~221**: `onClick={() => handleDelete(company.id)}` but only `handleDeleteClick`/`handleDeleteConfirm` are defined → `handleDelete` is undefined (would crash on delete click). Check the original: `git show HEAD:src/views/dashboard/AdminDashboard.js | grep -n handleDelete`. If original used `handleDeleteClick`, this is a conversion regression — fix to `handleDeleteClick`. If original also had `handleDelete`, it's pre-existing — flag to user, don't silently change behavior.
- Radix Tabs unmount inactive panels (CoreUI kept them mounted). Where a tab holds local form state that must survive tab switches, use `forceMount`+`hidden`. Most tab usages are display panels (safe). QuotationView already handles this correctly.
- Some earlier green "approve" buttons use `className="bg-success text-white"` instead of `variant="success"` (added later) — cosmetic only, optional cleanup.
- `views/admin/employees/EmployeeHeader.js` & `EmployeeTable.js` are orphaned (unused) but converted — harmless.
- Session-limit interruptions happened twice; each time the build stayed green (no truncated files).

## 8. RECOMMENDED NEXT ACTIONS (in order)

1. Read the conversion guide + the 3 reference pages.
2. `npm run build` to confirm still green.
3. Convert the 16 remaining view pages (section 6A) — batch them (parallel subagents OR directly), build-gate after. Use targeted Edits for the 3 large ones.
4. Convert the 5 safe shared components (section 6B "OTHER SHARED").
5. Decide with the user on the layout shell (section 6B "LAYOUT SHELL") — these are load-bearing; converting AppSidebar/AppHeader risks the responsive layout. Recommend converting AppFooter/AppBreadcrumb/header dropdowns (low risk) and keeping/lightly-restyling the CSidebar/CHeader shell unless the user insists on full replacement.
6. Fix/flag the AdminDashboard handleDelete issue (section 7).
7. Final: `npx prettier --write`, `npm run build`, then grep `grep -rlE '@coreui/react["'\'']|@coreui/react[^-]' src` should return only intentional chart files (or nothing). Optionally run the app to click through a few flows.

## 9. Batch execution tips

Parallel subagents (Agent tool, general-purpose) work well: give each 5-7 disjoint files + the guide + reference paths + the rules. Keep waves ≤ ~4 agents to avoid session limits. Build-gate after each wave. Agents should NOT run the build (orchestrator does). Files edited by different agents don't conflict.

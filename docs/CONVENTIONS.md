# Frontend Conventions

> **Read before writing any code.** Copy the nearest reference page. The canonical set is
> `views/admin/CompanyList.js` (list), `CompanyForm.js` (form), `CompanyView.js` (detail).

## Language & style

- React 19 function components + hooks. **JSX lives in `.js` files** (and `.jsx` for `ui/`
  primitives). Default-export the page/component.
- Prettier-formatted (husky pre-commit). Match surrounding files (this project uses double
  quotes, 2-space indent, semicolons in most files — follow the file you're editing).
- Import UI primitives from `../../components/ui`; shared components from `../../components`;
  the `cn()` helper from `../../lib/utils`.
- `lucide-react` for all icons (never `@coreui/icons`/`CIcon` in new code).

## Naming

| Thing             | Convention                       | Example                                       |
| ----------------- | -------------------------------- | --------------------------------------------- |
| List page         | `<Feature>List.js`               | `CompanyList.js`                              |
| Form page         | `<Feature>Form.js`               | `CompanyForm.js`                              |
| Detail page       | `<Feature>View.js`               | `CompanyView.js`                              |
| Service           | `<resource>Service.js`           | `companyService.js`                           |
| Service object    | default export with CRUD methods | `{ getAll, getById, create, update, delete }` |
| Endpoint block    | UPPER_SNAKE in `endpoints.js`    | `COMPANIES = { LIST, CREATE, … }`             |
| Validation schema | `<feature>Schema.js` (yup)       | `employeeSchema.js`                           |
| Hook              | `use<Thing>.js`                  | `usePermissions.js`                           |
| Shared component  | `PascalCase` folder + file       | `PageHeader/PageHeader.js`                    |

## The three page patterns

### List page (`<Feature>List.js`)

- `PageHeader` (title + a "Create" action Button).
- `DataTable` with a `useMemo` `columns` array (`key`, `label`, `sortable`, `render`,
  `align`, `exportable`, `toggleable`). Rows from a service call in `useEffect`.
- `RowActions` in an actions column (`onView`/`onEdit`/`onDelete`; pass `undefined` to hide
  by permission via `usePermissions`).
- `ConfirmDialog` for delete. `StatusBadge` for status cells.
- Loading via `DataTable`'s `loading` prop; empty via `emptyTitle`/`emptyMessage`.

### Form page (`<Feature>Form.js`)

- `react-hook-form` with `yupResolver(fooSchema)` from `src/validation/`.
- Build on `CrudFormPage` + `FormField` + `FormSkeleton`, or plain shadcn `Input`/`Select`/
  `Textarea`/`Label` inside a Tailwind grid (`grid grid-cols-1 md:grid-cols-2 gap-4`).
- On submit → call `service.create`/`service.update` → toast (`utils/toast.js`) → navigate.
- Handles both create and edit (load existing via `service.getById` when an id is present).
- `useUnsavedChangesGuard` where edits must warn before navigating away.

### Detail page (`<Feature>View.js`)

- `PageHeader` + `Card`s / `<dl>` key-value blocks (or `Tabs` for sectioned detail).
- Read-only; fetch via `service.getById`.

## Calling the backend (never from a component directly)

```js
// service (src/services/brandService.js)
import { api } from "../api/axiosClient";
import { BRANDS } from "../api/endpoints";

const brandService = {
  getAll: (params = {}) => api.get(BRANDS.LIST, { params }),
  getById: (id) => api.get(BRANDS.GET_BY_ID, { params: { brandId: id } }),
  create: (data) => api.post(BRANDS.CREATE, data),
  update: (id, data) =>
    api.put(BRANDS.UPDATE, data, { params: { brandId: id } }),
  delete: (id) => api.delete(BRANDS.DELETE, { params: { brandId: id } }),
};
export default brandService;
```

- Ids go in `params` (query string) to match the backend's `?<res>Id=` convention.
- Read the payload as `response.data` in the view. Lists are `response.data.data.<plural>`
  with `response.data.data.pagination` — confirm the exact shape against the backend service.
- See [API_INTEGRATION.md](API_INTEGRATION.md).

## Forms & validation

- yup schemas in `src/validation/`. Keep field names aligned with the backend Joi validator
  and Mongoose model so create/update payloads match.
- Wire with `useForm({ resolver: yupResolver(schema) })`; render errors under fields
  (`<p className="text-sm text-destructive">`).

## Buttons

- **Any `<Button>`/`<button>` that isn't a form submit MUST set `type="button"`** — shadcn
  Button defaults to `submit`. This prevents accidental form submission.

## Permissions & branch scope

- `usePermissions()` → gate actions/routes; hide `RowActions` handlers the user can't perform.
- `useBranchContext()` → current branch; pass branch filters to list services where the
  backend expects branch scoping.

## What NOT to do when restyling (presentational-only rule)

Do **not** change: business logic, state/effects, event handlers, service/API calls,
validation schemas, permissions, routing, calculations, or PDF/chart data. Only change
look/UX. Preserve every `// eslint-disable` comment. Keep every feature/branch intact.

## Add-a-CRUD-resource recipe

1. `src/api/endpoints.js` — add a `FOO = { LIST, GET_BY_ID, CREATE, UPDATE, DELETE }` block.
2. `src/services/fooService.js` — CRUD methods (copy `brandService.js`).
3. `src/validation/fooSchema.js` — yup schema (if the form validates).
4. `src/views/admin/FooList.js` / `FooForm.js` / `FooView.js` — copy the Company references.
5. `src/routes.js` — lazy-register the three routes; `_nav.js` — add sidebar link if needed.
6. `npm run format`, then `npm run build` (must stay green), then exercise the page.

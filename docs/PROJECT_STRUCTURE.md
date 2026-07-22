# Frontend Project Structure

> **Work within this structure.** Views go in `src/views/<area>/`, API access in
> `src/services/`, UI in `src/components/`. Don't add new top-level folders under `src/`.

## Top level

```
migti_frontend/
├── src/                  # all application source
├── public/               # static assets served as-is
├── index.html            # Vite entry HTML
├── vite.config.mjs       # Vite config (aliases, plugins: react, tailwind)
├── eslint.config.mjs
├── manifest.json
├── Dockerfile , ci/ , .husky/   # deploy & git hooks (husky → prettier on commit)
├── package.json
├── .env                  # VITE_API_BASE_URL, optional VITE_SOCKET_URL
└── UI_REDESIGN_HANDOFF.md# historical redesign notes (reference)
```

## `src/` layout

```
src/
├── index.js              # React root render
├── App.js                # providers + HashRouter + top-level routes
├── routes.js             # lazy route table (path → component)
├── _nav.js               # sidebar navigation definition
├── store.js              # redux store (sidebarShow, theme only)
│
├── api/
│   ├── axiosClient.js    # axios instance: baseURL, token injection, 401 handling
│   └── endpoints.js      # BASE_URL/API_VERSION + per-resource endpoint constants + URL helpers
│
├── services/             # 1 file per backend resource: <res>Service.js
│                         #   { getAll, getById, create, update, delete, …custom }
│
├── components/
│   ├── ui/               # shadcn-style primitives (button, input, select, dialog, table, …)
│   ├── DataTable/        # enterprise table (search, sort, export, pagination)
│   ├── PageHeader/       # page title + actions (top of every page)
│   ├── RowActions/       # standard view/edit/delete table actions
│   ├── StatusBadge/ StatusLabel/ StatusToggle/  # status rendering
│   ├── CrudFormPage/     # form scaffold: CrudFormPage + FormField + FormSkeleton
│   ├── ConfirmDialog/ EmptyState/ Loader/ TablePagination/ SearchableDropdown/ …
│   └── (other shared components — see DESIGN_SYSTEM.md)
│
├── views/                # page components, grouped by area
│   ├── dashboard/        # role dashboards
│   ├── admin/            # main CRUD screens (+ branches/ employees/ followup/ poBucket/)
│   ├── salesMaster/  purchaseMaster/  procurementMaster/  master/   # role master boards
│   ├── reports/          # reporting (+ components/ , components/smart/)
│   ├── hod/  employee/   # role-specific screens
│   ├── notifications/    # notification views
│   └── pages/            # login/, page401/, page404/, page500/  + sidebar/
│
├── layout/               # DefaultLayout (app shell: sidebar + header + content)
├── context/              # AuthContext, SocketContext, NotificationContext, DataContext, notificationSocketBridge
├── hooks/                # usePermissions, useBranchContext, useFilterLock, useUnsavedChangesGuard, useAreaNameLookup
├── constants/            # colorTheme, designTokens, employeeRoleDesignations, industrySectors, productUnits
├── validation/           # yup schemas (employeeSchema, productSchema, …)
├── utils/                # formatting/helpers (dateFormatter, authSession, toast, sort, sidebarNav, pdf, …)
├── lib/utils.js          # cn() classnames helper
├── data/                 # dummy/sample data (dev fixtures — not production data)
├── filtered/             # Filtered.js (server-search input component)
├── assets/               # images / avatars
└── scss/                 # style.scss + tailwind.css (@theme tokens) + vendors/
```

## Where does my new file go?

| I'm adding…                      | Put it in…                                                                       | Name it…                                         |
| -------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------ |
| A new page/screen                | `src/views/<area>/`                                                              | `FooList.js` / `FooForm.js` / `FooView.js`       |
| A backend call                   | `src/services/fooService.js`                                                     | `{ getAll, getById, create, update, delete }`    |
| Endpoint URLs for a new resource | `src/api/endpoints.js`                                                           | `FOO = { LIST, GET_BY_ID, CREATE, … }`           |
| A reusable UI primitive          | `src/components/ui/`                                                             | lowercase (`button.jsx`) — only if truly generic |
| A shared app component           | `src/components/<Name>/`                                                         | `PascalCase`                                     |
| A form validation schema         | `src/validation/`                                                                | `fooSchema.js` (yup)                             |
| A cross-cutting hook             | `src/hooks/`                                                                     | `useFoo.js`                                      |
| A formatting/util helper         | `src/utils/`                                                                     | `fooThing.js`                                    |
| A route                          | register lazily in `src/routes.js` + add to `_nav.js` if it needs a sidebar link | —                                                |

## Reference pages (copy these exactly)

- **List:** [../src/views/admin/CompanyList.js](../src/views/admin/CompanyList.js)
- **Form:** [../src/views/admin/CompanyForm.js](../src/views/admin/CompanyForm.js)
- **Detail/View:** [../src/views/admin/CompanyView.js](../src/views/admin/CompanyView.js)

A typical CRUD resource = `FooList.js` + `FooForm.js` + `FooView.js` in `views/admin/`, a
`fooService.js`, a `FOO` block in `endpoints.js`, and (if validated) `validation/fooSchema.js`.

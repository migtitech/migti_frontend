# Frontend Architecture

React 19 SPA (Vite 7). CoreUI admin template being migrated to a shadcn/Tailwind design
system. Talks to the MIGTI backend over `/api/v1` (axios) + Socket.IO.

## Provider & render tree

[../src/App.js](../src/App.js) wraps the app in nested providers, then a HashRouter:

```
<AuthProvider>            # context/AuthContext.js — current user, token, login/logout
  <SocketProvider>        # context/SocketContext.js — socket.io connection (JWT auth)
    <NotificationProvider># context/NotificationContext.js — realtime notifications
      <DataProvider>      # context/DataContext.js — shared reference data caches
        <Toaster/>        # react-hot-toast
        <HashRouter>
          <Routes>
            /login, /404, /500  → standalone pages
            /*                  → DefaultLayout (lazy) guarded by AuthRouteMiddleware
```

- **Routing is hash-based** (`HashRouter`). Route table is [../src/routes.js](../src/routes.js):
  a flat list of lazy-loaded view components mapped to paths. `_nav.js` drives the sidebar.
- **Auth gate:** `AuthRouteMiddleware` protects everything under `DefaultLayout`.
- **Theme:** forced light (`applyGlobalLightTheme` in App.js). Redux store holds
  `sidebarShow` + `theme` only.

## Layers (component → service → API)

```
View component (src/views/<area>/*.js)
    │  • renders UI from components/ui + shared components
    │  • local state (useState) / react-hook-form for forms
    │  • calls a service function (never axios directly)
    ▼
Service (src/services/<res>Service.js)
    │  • { getAll, getById, create, update, delete, …custom }
    │  • uses `api` from api/axiosClient + a constant from api/endpoints
    ▼
axiosClient (src/api/axiosClient.js)
    │  • baseURL = BASE_URL + API_VERSION
    │  • injects Bearer token, handles 401 → auth-failure/logout, refresh
    ▼
Backend  /api/v1/<res>/<action>
```

Return shape from the backend is `{ success, message, data }` (lists nested as
`{ <plural>: [], pagination: {} }`). Services return the axios response; views read
`response.data`.

## State model

| Concern                     | Mechanism                          | Location                                                                     |
| --------------------------- | ---------------------------------- | ---------------------------------------------------------------------------- |
| Auth / current user / token | React Context                      | `context/AuthContext.js`, token in `localStorage` via `utils/authSession.js` |
| Realtime socket             | React Context                      | `context/SocketContext.js` (+ `notificationSocketBridge.js`)                 |
| Notifications               | React Context                      | `context/NotificationContext.js`                                             |
| Shared reference data       | React Context                      | `context/DataContext.js`                                                     |
| Sidebar / theme             | Redux (`legacy_createStore`)       | `store.js` (`{ sidebarShow, theme }`)                                        |
| Page/form state             | local `useState` / react-hook-form | per view                                                                     |
| Permissions                 | hook                               | `hooks/usePermissions.js`                                                    |
| Branch scoping              | hook                               | `hooks/useBranchContext.js`                                                  |

There is **no global data store for domain entities** — data is fetched per-page via services
and held in local component state. Keep it that way; don't introduce Redux slices for entities.

## Realtime

- `SocketProvider` opens a socket.io connection authenticated with the JWT (matches the
  backend `user:<id>` room model).
- `NotificationContext` + `notificationSocketBridge.js` surface incoming notifications;
  `RealtimeNotificationAlert` renders them; `utils/sirenSound.js` for alerts.

## Feature areas (`src/views/`)

- `dashboard/` — role dashboards (Sales, Purchase, Admin, HOD, Finance, …).
- `admin/` — the bulk of CRUD screens (companies, branches, catalog, industries, suppliers,
  employees, queries, quotations, purchase orders, buckets, billing…). Subfolders
  `admin/branches`, `admin/employees`, `admin/followup`, `admin/poBucket`.
- `salesMaster/`, `purchaseMaster/`, `procurementMaster/`, `master/` — role "master" boards.
- `reports/` — reporting (with `components/smart/` widgets).
- `hod/`, `employee/` — role-specific screens.
- `pages/` — login + error pages (401/404/500). `sidebar/` — sidebar shell.

## Build & gating

- `npm run build` (Vite) is the **gate** — must stay green. ESLint is not the gate.
- Lazy route loading keeps the initial bundle small; keep new views lazy in `routes.js`.

## Principles to preserve

- **Services are the only API boundary** — views never touch axios/fetch/URLs directly.
- **Design-system-first** — build from `components/ui` + shared components; migrate CoreUI
  out, don't add new CoreUI.
- **Presentational vs behavioral** — restyle without touching logic/handlers/validation.
- **Per-page data fetching** — no global entity store; keep state local + context for
  cross-cutting concerns only.

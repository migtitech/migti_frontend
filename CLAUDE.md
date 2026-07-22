# CLAUDE.md — MIGTI CRM Frontend

> Auto-loaded by Claude Code every session. Single source of truth for how this frontend is
> structured and how work must be done. **Read this first; don't crawl the whole repo to
> decide something — the docs below already describe the structure and rules.**

## What this is

MIGTI CRM/ERP web client. React 19 + Vite 7 SPA that talks to the MIGTI backend REST API
(`/api/v1`). Mid-migration from CoreUI to a shadcn-style Tailwind design system.

- **Framework:** React 19, Vite 7 (`.js`/`.jsx`, JSX in `.js` files)
- **Routing:** react-router-dom v7, **HashRouter**, lazy-loaded route components
- **UI system:** Tailwind v4 + shadcn-style primitives in `src/components/ui/`
  (Radix under the hood). **CoreUI (`@coreui/react`) is legacy, being phased out.**
- **Forms:** react-hook-form + yup (`@hookform/resolvers`)
- **State:** Redux (legacy `createStore`, sidebar/theme only) + React Context (auth,
  socket, notifications, shared data)
- **HTTP:** axios (`src/api/axiosClient.js`) with a typed endpoints map (`src/api/endpoints.js`)
- **Realtime:** socket.io-client
- **Icons:** `lucide-react` (NOT `@coreui/icons`)
- **Toasts:** react-hot-toast
- **PDF/Excel:** jspdf + jspdf-autotable, xlsx

## Documentation map — read the one relevant to your task

| Doc                                                    | When to read it                                                       |
| ------------------------------------------------------ | --------------------------------------------------------------------- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)           | Providers, routing, data flow, state model                            |
| [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) | Where a file goes; what each directory holds                          |
| [docs/CONVENTIONS.md](docs/CONVENTIONS.md)             | **Read before writing any code.** Page patterns, service calls, forms |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)         | The shadcn/Tailwind UI kit + CoreUI→shadcn migration rules            |
| [docs/API_INTEGRATION.md](docs/API_INTEGRATION.md)     | Adding/changing a backend call; service + endpoints pattern           |
| [UI_REDESIGN_HANDOFF.md](UI_REDESIGN_HANDOFF.md)       | Historical detail of the in-progress UI redesign (reference)          |

## Golden rules (do not violate without asking)

1. **Work within the existing structure.** Views in `src/views/<area>/`, API access only via
   `src/services/*Service.js` (never call axios directly from a component), UI from
   `src/components/ui/` + shared `src/components/`. Don't invent new top-level folders.
2. **All backend calls go through a service.** A component imports a `*Service` and calls it;
   the service uses `api` (axiosClient) + a constant from `src/api/endpoints.js`. Never
   hardcode a URL or call `axios`/`fetch` in a view. See [API_INTEGRATION.md](docs/API_INTEGRATION.md).
3. **Use the design system, don't rebuild it.** Import primitives from `../../components/ui`
   and shared pieces (`PageHeader`, `DataTable`, `RowActions`, `StatusBadge`, `ConfirmDialog`,
   `CrudFormPage`) from `../../components`. Prefer shadcn over CoreUI in new/edited code.
4. **Follow the reference pages exactly.** List: `views/admin/CompanyList.js`. Form:
   `views/admin/CompanyForm.js`. Detail: `views/admin/CompanyView.js`. Copy their patterns.
5. **Any `<Button>`/`<button>` that is not a form submit needs `type="button"`** (shadcn
   Button defaults to submit). Keep every `// eslint-disable` comment.
6. **Forms:** react-hook-form + yup resolver. Validation schemas live in `src/validation/`.
   Keep API/service calls, handlers, calculations, and permissions unchanged when only
   restyling.
7. **Match the API contract.** The backend returns `{ success, message, data }` with lists
   nested as `{ <plural>: [...], pagination: {...} }`. Read [../migti_backend/docs/API_DESIGN.md]
   before wiring a new call.

## Commands

```bash
npm run dev          # vite dev server
npm run build        # vite build  — THIS IS THE GATE. Must stay green.
npm run serve        # vite preview (serve the build)
npm run lint         # eslint
npm run format       # prettier --write .
npm run format:check # prettier --check .
```

- **Build is the source of truth** (`npm run build`). ESLint is _not_ the gate; some
  pre-existing `react-hooks` lint warnings are known and acceptable — don't "fix" them by
  changing behavior.
- Husky pre-commit runs **prettier** via lint-staged (does NOT run eslint). Run
  `npm run format` before finishing.
- There is **no automated test suite**. Verify by building green and exercising the page.

## Environment

`.env`: `VITE_API_BASE_URL` (defaults to `http://localhost:7200/api`), optional
`VITE_SOCKET_URL`. `endpoints.js` normalizes the API root and derives the socket/assets URL.
Never hardcode hosts in components.

## Style

Prettier (v3): default config from `package.json`/`prettier` — 2-space, double quotes in
this project's JS (match surrounding files), trailing commas. JSX lives in `.js` files.
Import UI from relative paths (`../../components/ui`). Use the `cn()` util from `src/lib/utils.js`.

## Workflow expectations

- Before building a page, open the matching reference page and copy its structure.
- Keep presentational changes presentational — don't alter business logic, effects,
  service calls, validation, routing, permissions, or calculations while restyling.
- When the backend API changes, update the matching `src/services/*Service.js` +
  `src/api/endpoints.js` in the same change, and keep the response-shape handling in sync.
- Update the relevant `docs/*.md` when you change structure or the design system.

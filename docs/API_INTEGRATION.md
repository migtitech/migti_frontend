# API Integration

How the frontend talks to the MIGTI backend. **Every backend call goes through a service +
the endpoints map — never call axios/fetch or hardcode a URL in a component.**

Pair this with the backend contract: [../../migti_backend/docs/API_DESIGN.md](../../migti_backend/docs/API_DESIGN.md).

## Layers

```
component → services/<res>Service.js → api (axiosClient) → api/endpoints.js constant → /api/v1/...
```

## `api/endpoints.js`

- `BASE_URL` = normalized `VITE_API_BASE_URL` (default `http://localhost:7200/api`);
  `normalizeApiRoot` collapses accidental `/api/api`.
- `API_VERSION` = `/v1`. axiosClient's `baseURL` = `BASE_URL + API_VERSION`.
- Per-resource constants group the action paths:
  ```js
  export const BRANDS = {
    LIST: "/brands/list",
    GET_BY_ID: "/brands/get-by-id",
    CREATE: "/brands/create",
    UPDATE: "/brands/update",
    DELETE: "/brands/delete",
    UPLOAD_ICON: "/brands/upload-icon",
  };
  ```
- `getSocketUrl()` / `getAssetsBaseUrl()` / `getAssetsUrl(path)` derive the socket + asset
  origins from the API base (asset paths that are already full URLs — e.g. S3 — pass through).

## `api/axiosClient.js`

- Creates the axios instance (`baseURL`, 30s timeout, JSON default).
- Injects `Authorization: Bearer <token>` from `localStorage` (`access_token`).
- Handles **401**: clears auth storage and triggers the registered auth-failure handler
  (logout/redirect), except on auth endpoints in `AUTH_BYPASS_401_PATHS` (login/refresh).
- Exposes `getAccessToken`/`getRefreshToken`/`setTokens`/`clearTokens` and
  `registerAuthFailureHandler`.
- Export used by services is `api` (the configured instance).

## Service pattern (`services/<res>Service.js`)

```js
import { api } from "../api/axiosClient";
import { BRANDS } from "../api/endpoints";

const brandService = {
  getAll: (params = {}) => api.get(BRANDS.LIST, { params }),
  getById: (id) => api.get(BRANDS.GET_BY_ID, { params: { brandId: id } }),
  create: (data) => api.post(BRANDS.CREATE, data),
  update: (id, data) =>
    api.put(BRANDS.UPDATE, data, { params: { brandId: id } }),
  delete: (id) => api.delete(BRANDS.DELETE, { params: { brandId: id } }),
  uploadIcon: (file) => {
    const fd = new FormData();
    fd.append("icon", file);
    return api.post(BRANDS.UPLOAD_ICON, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};
export default brandService;
```

Conventions:

- Resource ids go in **`params`** (query string) to match the backend's `?<res>Id=` style.
- File uploads use `FormData` + `multipart/form-data`.
- Return the axios response; let the view read `.data`.

## Response shape (from the backend)

```jsonc
{ "success": true, "message": "...", "data": { ... } }
```

- **Lists** nest as `data: { <plural>: [...], pagination: { currentPage, totalPages,
totalItems, itemsPerPage, hasNextPage, hasPrevPage } }`.
- In a view: `const res = await brandService.getAll(params); const { brands, pagination } =
res.data.data;` (confirm the exact key against the backend service you're calling).
- Errors: non-2xx carry `{ success:false, message, error }`. Surface `message` via
  `utils/toast.js`. 401s are handled globally by axiosClient.

## Consuming in a page

```js
useEffect(() => {
  let active = true;
  (async () => {
    setLoading(true);
    try {
      const res = await brandService.getAll({ pageNumber, pageSize, search });
      if (active) setRows(res.data.data.brands);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load");
    } finally {
      if (active) setLoading(false);
    }
  })();
  return () => {
    active = false;
  };
}, [pageNumber, pageSize, search]);
```

## Realtime (socket)

- `SocketProvider` connects to `getSocketUrl()` with the JWT (matches backend `user:<id>`
  rooms). Consume notifications via `NotificationContext`, not by opening your own socket.

## When the backend API changes — checklist

1. Update the resource block in `api/endpoints.js` (paths).
2. Update `services/<res>Service.js` (method signatures, params, payload keys).
3. Update views that read the response (field/key changes, pagination shape).
4. Keep field names aligned across yup schema (`validation/`) ↔ backend Joi ↔ Mongoose model.
5. `npm run build` (gate) + exercise the affected pages.

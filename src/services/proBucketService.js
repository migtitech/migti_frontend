import { api } from "../api/axiosClient";
import { PRO_BUCKET } from "../api/endpoints";

/** One page from list API (shape after axios interceptor: `{ success, data: { data, total, ... } }`). */
const parseListPage = (res) => {
  const inner = res?.data;
  if (!inner || typeof inner !== "object") {
    return { list: [], total: 0, pageSize: 100 };
  }
  return {
    list: Array.isArray(inner.data) ? inner.data : [],
    total: Number(inner.total) || 0,
    pageSize: Math.min(100, Math.max(1, Number(inner.pageSize) || 100)),
  };
};

const list = async (params = {}) => {
  const clean = { ...params };
  if (clean.groupIds == null || clean.groupIds === "") {
    delete clean.groupIds;
  }
  return api.get(PRO_BUCKET.QUERY_PRODUCTS, { params: clean });
};

/**
 * Loads every Pro Bucket line via the same `GET /pro-bucket/query-products` endpoint
 * the list UI uses (default filters: all statuses, no search/date). Caller can sum
 * `status` client-side so counts match the table.
 */
const listAllForCounts = async (extraParams = {}) => {
  const pageSize = 100;
  const all = [];
  let page = 1;
  const maxPages = 1000;
  while (page <= maxPages) {
    const res = await list({ ...extraParams, page, pageSize });
    const { list: chunk, total } = parseListPage(res);
    all.push(...chunk);
    if (chunk.length === 0) break;
    if (chunk.length < pageSize) break;
    if (total > 0 && all.length >= total) break;
    page += 1;
  }
  return all;
};

const proBucketService = {
  list,
  listAllForCounts,
  getById: async (id) => {
    const response = await api.get(PRO_BUCKET.QUERY_PRODUCT_BY_ID(id));
    return response;
  },
  updateQueryProduct: async (id, data) => {
    const response = await api.put(PRO_BUCKET.UPDATE_QUERY_PRODUCT(id), data);
    return response;
  },
  appendRates: async (id, rates) => {
    const response = await api.post(PRO_BUCKET.APPEND_RATES(id), { rates });
    return response;
  },
  updateHodRates: async (id, data) => {
    const response = await api.put(PRO_BUCKET.UPDATE_HOD_RATES(id), data);
    return response;
  },
  listHodRateHistories: async (id, params = {}) => {
    const response = await api.get(PRO_BUCKET.HOD_RATE_HISTORIES(id), { params });
    return response;
  },
};

export default proBucketService;

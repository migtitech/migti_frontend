import { api } from "../api/axiosClient";
import { QUERIES } from "../api/endpoints";

const mapToApiPayload = (data) => {
  const payload = {};
  if (data.status != null) payload.status = data.status;
  if (data.close_remark !== undefined) payload.close_remark = data.close_remark;

  if (data.companyInfo !== undefined) {
    payload.companyInfo = {
      ...(data.companyInfo || {}),
      purchaseManagers: (data.companyInfo?.purchaseManagers || []).map((m) => ({
        name: m?.name || "",
        phone: m?.phone || "",
        email: m?.email || "",
      })),
    };
  }

  if (data.industry_id !== undefined) {
    payload.industry_id = data.industry_id || null;
  }

  if (data.products !== undefined) {
    payload.products = (data.products || []).map((p) => {
      const img = Array.isArray(p.images) ? p.images : [];
      const idFromImg = (i) => {
        if (typeof i === "string" && /^[a-fA-F0-9]{24}$/.test(i)) return i;
        if (i && typeof i === "object" && i._id) return i._id;
        return null;
      };
      return {
        productName: p.productName,
        quantity: p.quantity ?? 1,
        unit: p.unit || "",
        hsnNumber: p.hsnNumber || "",
        modelNumber: p.modelNumber || "",
        gstPercentage:
          typeof p.gstPercentage === "number" ? p.gstPercentage : null,
        variants: (p.variants || []).map((v) => ({
          variantName: v.variantName || "",
        })),
        remark: p.remark || "",
        description:
          p.description && String(p.description).trim()
            ? String(p.description).trim()
            : "",
        product_id: p.product_id || null,
        groupId: p.groupId || null,
        categoryId: p.categoryId || null,
        rawProductCode:
          (p.rawProductCode && String(p.rawProductCode).trim()) || "",
        query_tracking_code:
          (p.query_tracking_code && String(p.query_tracking_code).trim()) || "",
        images: img.map(idFromImg).filter(Boolean),
      };
    });
  }

  if (data.created_by != null) payload.created_by = String(data.created_by);

  return payload;
};

const queryService = {
  getAll: async (params = {}) => {
    const response = await api.get(QUERIES.LIST, { params });
    return response;
  },

  getByIndustry: async (params = {}) => {
    const response = await api.get(QUERIES.BY_INDUSTRY, { params });
    return response;
  },

  /** Idempotent: ensures quotation ref + code are stored on the source query after convert. */
  syncQuotationOnQuery: async ({ queryId, quotationId, quotationCode }) => {
    const response = await api.post(QUERIES.LINK_CONVERTED_QUOTATION, {
      queryId,
      quotationId,
      quotationCode: quotationCode ?? "",
    });
    return response;
  },

  getById: async (id) => {
    const response = await api.get(QUERIES.GET_BY_ID, {
      params: { queryId: id },
    });
    return response;
  },

  /** Procurement (Pro Bucket) rates for one line: `query_products` matched by queryId + rawProductCode / lineIndex */
  getLineProcurementRates: async (queryId, { rawProductCode, lineIndex } = {}) => {
    const params = {
      queryId,
      rawProductCode: String(rawProductCode ?? "").trim(),
    };
    if (lineIndex != null && lineIndex !== "") {
      params.lineIndex = Number(lineIndex);
    }
    const response = await api.get(QUERIES.QUERY_LINE_PROCUREMENT_RATES, {
      params,
    });
    return response;
  },

  getTodayStats: async (params = {}) => {
    const response = await api.get(QUERIES.TODAY_STATS, { params });
    return response;
  },

  getSalesDashboardCards: async () => {
    const response = await api.get(QUERIES.SALES_DASHBOARD_CARDS);
    return response;
  },

  getSalesRecentBillings: async (params = {}) => {
    const response = await api.get(QUERIES.SALES_RECENT_BILLINGS, { params });
    return response;
  },

  create: async (data) => {
    const response = await api.post(QUERIES.CREATE, mapToApiPayload(data));
    return response;
  },

  update: async (id, data) => {
    const payload = mapToApiPayload(data);
    const response = await api.put(QUERIES.UPDATE, payload, {
      params: { queryId: id },
    });
    return response;
  },

  delete: async (id) => {
    const response = await api.delete(QUERIES.DELETE, {
      params: { queryId: id },
    });
    return response;
  },

  getActivities: async (queryId, params = {}) => {
    const response = await api.get(QUERIES.ACTIVITIES, {
      params: { queryId, ...params },
    });
    return response;
  },

  recordActivity: async (queryId, type, performedBy, meta = {}) => {
    const response = await api.post(QUERIES.RECORD_ACTIVITY, {
      queryId,
      type,
      performedBy: performedBy != null ? String(performedBy) : undefined,
      meta,
    });
    return response;
  },

  searchByCode: async (queryCode) => {
    const response = await api.get(QUERIES.LIST, {
      params: { search: queryCode, pageSize: 5 },
    });
    return response;
  },

  convertToQuotation: async (queryCode, body = {}) => {
    const response = await api.post(QUERIES.CONVERT_TO_QUOTATION, body, {
      params: { queryCode },
    });
    return response;
  },

  exportPdf: async (queryId) => {
    const response = await api.get(QUERIES.EXPORT_PDF, {
      params: { queryId },
      responseType: "blob",
    });
    return response;
  },
};

export default queryService;

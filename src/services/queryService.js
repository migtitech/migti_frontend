import { api } from '../api/axiosClient'
import { QUERIES } from '../api/endpoints'

const mapToApiPayload = (data) => ({
  ...(data.status != null && { status: data.status }),
  companyInfo: {
    ...(data.companyInfo || {}),
    purchaseManagers: (data.companyInfo?.purchaseManagers || []).map((m) => ({
      name: m?.name || '',
      phone: m?.phone || '',
      email: m?.email || '',
    })),
  },
  industry_id: data.industry_id || null,
  products: (data.products || []).map((p) => ({
    productName: p.productName,
    quantity: p.quantity ?? 1,
    unit: p.unit || '',
    hsnNumber: p.hsnNumber || '',
    modelNumber: p.modelNumber || '',
    gstPercentage: typeof p.gstPercentage === 'number' ? p.gstPercentage : null,
    variants: (p.variants || []).map((v) => ({
      variantName: v.variantName || '',
    })),
    remark: p.remark || '',
    description: (p.description && String(p.description).trim()) ? String(p.description).trim() : '',
    product_id: p.product_id || null,
    images: Array.isArray(p.images) ? p.images : [],
  })),
  created_by: data.created_by != null ? String(data.created_by) : undefined,
})

const queryService = {
  getAll: async (params = {}) => {
    const response = await api.get(QUERIES.LIST, { params })
    return response
  },

  getById: async (id) => {
    const response = await api.get(QUERIES.GET_BY_ID, {
      params: { queryId: id },
    })
    return response
  },

  getTodayStats: async (params = {}) => {
    const response = await api.get(QUERIES.TODAY_STATS, { params })
    return response
  },

  create: async (data) => {
    const response = await api.post(QUERIES.CREATE, mapToApiPayload(data))
    return response
  },

  update: async (id, data) => {
    const payload = mapToApiPayload(data)
    const response = await api.put(QUERIES.UPDATE, payload, {
      params: { queryId: id },
    })
    return response
  },

  delete: async (id) => {
    const response = await api.delete(QUERIES.DELETE, {
      params: { queryId: id },
    })
    return response
  },

  getActivities: async (queryId, params = {}) => {
    const response = await api.get(QUERIES.ACTIVITIES, {
      params: { queryId, ...params },
    })
    return response
  },

  recordActivity: async (queryId, type, performedBy, meta = {}) => {
    const response = await api.post(QUERIES.RECORD_ACTIVITY, {
      queryId,
      type,
      performedBy: performedBy != null ? String(performedBy) : undefined,
      meta,
    })
    return response
  },

  searchByCode: async (queryCode) => {
    const response = await api.get(QUERIES.LIST, {
      params: { search: queryCode, pageSize: 5 },
    })
    return response
  },

  convertToQuotation: async (queryCode, body = {}) => {
    const response = await api.post(
      QUERIES.CONVERT_TO_QUOTATION,
      body,
      {
        params: { queryCode },
      },
    )
    return response
  },

  exportPdf: async (queryId) => {
    const response = await api.get(QUERIES.EXPORT_PDF, {
      params: { queryId },
      responseType: 'blob',
    })
    return response
  },
}

export default queryService

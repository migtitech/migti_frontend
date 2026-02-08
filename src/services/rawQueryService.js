import { api } from '../api/axiosClient'
import { RAW_QUERIES } from '../api/endpoints'

const mapToApiPayload = (data) => ({
  priority: data.priority,
  title: data.title,
  company_info: data.companyInfo || '',
  industry_id: data.industryId || null,
  supplier_id: data.supplierId || null,
  description: data.description,
  files: data.files || [],
  created_by: data.created_by,
})

const rawQueryService = {
  getAll: async (params = {}) => {
    const response = await api.get(RAW_QUERIES.LIST, { params })
    return response
  },

  getById: async (id) => {
    const response = await api.get(RAW_QUERIES.GET_BY_ID, {
      params: { rawQueryId: id },
    })
    return response
  },

  create: async (rawQueryData) => {
    const response = await api.post(RAW_QUERIES.CREATE, mapToApiPayload(rawQueryData))
    return response
  },

  update: async (id, rawQueryData) => {
    const response = await api.put(RAW_QUERIES.UPDATE, mapToApiPayload(rawQueryData), {
      params: { rawQueryId: id },
    })
    return response
  },

  delete: async (id) => {
    const response = await api.delete(RAW_QUERIES.DELETE, {
      params: { rawQueryId: id },
    })
    return response
  },

  getActivities: async (rawQueryId) => {
    const response = await api.get(RAW_QUERIES.ACTIVITIES, {
      params: { rawQueryId },
    })
    return response
  },

  recordActivity: async (rawQueryId, type, performedBy, meta = {}) => {
    const response = await api.post(RAW_QUERIES.RECORD_ACTIVITY, {
      rawQueryId,
      type,
      performedBy,
      meta,
    })
    return response
  },
}

export default rawQueryService

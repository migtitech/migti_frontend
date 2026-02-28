import { api } from '../api/axiosClient'
import { QUOTATIONS } from '../api/endpoints'

const mapQuotation = (q) => (q ? { ...q, id: q._id ?? q.id } : null)

const quotationService = {
  getAll: async (params = {}) => {
    const response = await api.get(QUOTATIONS.LIST, { params })
    return response
  },

  getById: async (id) => {
    const response = await api.get(QUOTATIONS.GET_BY_ID, {
      params: { quotationId: id },
    })
    return response
  },

  update: async (id, data) => {
    const response = await api.put(QUOTATIONS.UPDATE, data, {
      params: { quotationId: id },
    })
    return response
  },

  updateStatus: async (id, status) => {
    const response = await api.put(QUOTATIONS.UPDATE_STATUS, { status }, {
      params: { quotationId: id },
    })
    return response
  },
}

export default quotationService
export { mapQuotation }

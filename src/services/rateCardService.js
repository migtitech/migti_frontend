import { api } from '../api/axiosClient'
import { RATE_CARDS } from '../api/endpoints'

const rateCardService = {
  getAll: async (params = {}) => {
    const response = await api.get(RATE_CARDS.LIST, { params })
    return response
  },

  getById: async (id) => {
    const response = await api.get(RATE_CARDS.GET_BY_ID, {
      params: { rateCardId: id },
    })
    return response
  },

  create: async (data) => {
    const response = await api.post(RATE_CARDS.CREATE, data)
    return response
  },

  update: async (id, data) => {
    const response = await api.put(RATE_CARDS.UPDATE, data, {
      params: { rateCardId: id },
    })
    return response
  },

  delete: async (id) => {
    const response = await api.delete(RATE_CARDS.DELETE, {
      params: { rateCardId: id },
    })
    return response
  },

  addSupplier: async (rateCardId, data) => {
    const response = await api.post(RATE_CARDS.ADD_SUPPLIER, data, {
      params: { rateCardId },
    })
    return response
  },

  updateSupplier: async (rateCardId, supplierId, data) => {
    const response = await api.put(RATE_CARDS.UPDATE_SUPPLIER, data, {
      params: { rateCardId, supplierId },
    })
    return response
  },

  deleteSupplier: async (rateCardId, supplierId) => {
    const response = await api.delete(RATE_CARDS.DELETE_SUPPLIER, {
      params: { rateCardId, supplierId },
    })
    return response
  },
}

export default rateCardService

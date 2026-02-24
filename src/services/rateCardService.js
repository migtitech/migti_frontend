import { api } from '../api/axiosClient'
import { RATE_CARDS } from '../api/endpoints'

const rateCardService = {
  searchProducts: async (params = {}) => {
    const response = await api.get(RATE_CARDS.SEARCH_PRODUCTS, { params })
    return response
  },

  searchSuppliers: async (params = {}) => {
    const response = await api.get(RATE_CARDS.SEARCH_SUPPLIERS, { params })
    return response
  },

  getByProduct: async (productId, combinationUniqueId) => {
    const params = { productId }
    if (combinationUniqueId && combinationUniqueId !== 'base') {
      params.combinationUniqueId = combinationUniqueId
    }
    const response = await api.get(RATE_CARDS.BY_PRODUCT, { params })
    return response
  },

  getBySupplier: async (supplierId) => {
    const response = await api.get(RATE_CARDS.BY_SUPPLIER, {
      params: { supplierId },
    })
    return response
  },

  upsertRate: async (data) => {
    const response = await api.post(RATE_CARDS.UPSERT_RATE, data)
    return response
  },

  delete: async (id, isRateCombination = false) => {
    const params = isRateCombination ? { rateCombinationId: id } : { rateCardId: id }
    const response = await api.delete(RATE_CARDS.DELETE, { params })
    return response
  },
}

export default rateCardService

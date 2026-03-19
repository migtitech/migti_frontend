import { api } from '../api/axiosClient'
import { QUERY_NEW_PRODUCTS } from '../api/endpoints'

const queryNewProductService = {
  create: async (data) => {
    const response = await api.post(QUERY_NEW_PRODUCTS.CREATE, data)
    return response
  },

  list: async (params = {}) => {
    const response = await api.get(QUERY_NEW_PRODUCTS.LIST, { params })
    return response
  },

  getById: async (productId) => {
    const response = await api.get(QUERY_NEW_PRODUCTS.GET_BY_ID, {
      params: { productId },
    })
    return response
  },

  delete: async (productId) => {
    const response = await api.delete(QUERY_NEW_PRODUCTS.DELETE, {
      params: { productId },
    })
    return response
  },
}

export default queryNewProductService


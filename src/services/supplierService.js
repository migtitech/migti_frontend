import { api } from '../api/axiosClient'
import { SUPPLIERS } from '../api/endpoints'

const supplierService = {
  getAll: async (params = {}) => {
    const response = await api.get(SUPPLIERS.LIST, { params })
    return response
  },

  search: async (params = {}) => {
    const response = await api.get(SUPPLIERS.SEARCH, { params })
    return response
  },

  getById: async (id) => {
    const response = await api.get(SUPPLIERS.GET_BY_ID, {
      params: { supplierId: id },
    })
    return response
  },

  create: async (data) => {
    const response = await api.post(SUPPLIERS.CREATE, data)
    return response
  },

  update: async (id, data) => {
    const response = await api.put(SUPPLIERS.UPDATE, data, {
      params: { supplierId: id },
    })
    return response
  },

  delete: async (id) => {
    const response = await api.delete(SUPPLIERS.DELETE, {
      params: { supplierId: id },
    })
    return response
  },

  uploadCatalog: async (supplierId, file) => {
    const formData = new FormData()
    formData.append('catalog', file)
    const response = await api.post(
      `${SUPPLIERS.UPLOAD_CATALOG}?supplierId=${supplierId}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return response
  },
}

export default supplierService

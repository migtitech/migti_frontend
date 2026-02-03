import { api } from '../api/axiosClient'
import axiosClient from '../api/axiosClient'
import { PRODUCTS } from '../api/endpoints'

const productService = {
  getAll: async (params = {}) => {
    const response = await api.get(PRODUCTS.LIST, { params })
    return response
  },

  getById: async (id) => {
    const response = await api.get(PRODUCTS.GET_BY_ID, {
      params: { productId: id },
    })
    return response
  },

  create: async (data) => {
    const response = await api.post(PRODUCTS.CREATE, data)
    return response
  },

  update: async (id, data) => {
    const response = await api.put(PRODUCTS.UPDATE, data, {
      params: { productId: id },
    })
    return response
  },

  delete: async (id) => {
    const response = await api.delete(PRODUCTS.DELETE, {
      params: { productId: id },
    })
    return response
  },

  uploadImages: async (files) => {
    const formData = new FormData()
    files.forEach((file) => {
      formData.append('images', file)
    })
    const response = await axiosClient.post(PRODUCTS.UPLOAD_IMAGES, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response
  },
}

export default productService

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

  /**
   * Upload images to assets; creates document records. Returns { documents: [{ _id, path }] }.
   * @param {File[]} files
   * @param {{ productId?: string, variantUniqueId?: string }} options - optional, for folder path
   */
  uploadImages: async (files, options = {}) => {
    const formData = new FormData()
    files.forEach((file) => {
      formData.append('images', file)
    })
    const params = new URLSearchParams()
    if (options.productId) params.set('productId', options.productId)
    if (options.variantUniqueId) params.set('variantUniqueId', options.variantUniqueId)
    const query = params.toString()
    const url = query ? `${PRODUCTS.UPLOAD_IMAGES}?${query}` : PRODUCTS.UPLOAD_IMAGES
    const response = await axiosClient.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response
  },
}

export default productService

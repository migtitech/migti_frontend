import { api } from '../api/axiosClient'
import axiosClient from '../api/axiosClient'
import { PRODUCTS } from '../api/endpoints'

const getFormDataConfig = () => ({
  transformRequest: [(data, headers) => {
    if (data instanceof FormData) {
      delete headers['Content-Type']
    }
    return data
  }],
})

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
   * Legacy: Local disk upload (no productId). Returns paths for use in create payload.
   */
  uploadImages: async (files) => {
    const formData = new FormData()
    files.forEach((file) => {
      formData.append('images', file)
    })
    const response = await axiosClient.post(PRODUCTS.UPLOAD_IMAGES, formData, getFormDataConfig())
    return response
  },

  /**
   * S3 upload for product images. Requires productId. Saves to Images model.
   * Use after product is created or when editing existing product.
   *
   * @param {string} productId
   * @param {File[]} files
   * @returns {Promise<{ data: { images: Array } }>}
   */
  uploadImagesS3: async (productId, files) => {
    const formData = new FormData()
    files.forEach((file) => {
      formData.append('images', file)
    })
    if (import.meta.env?.DEV) {
      
    }
    const response = await axiosClient.post(
      `${PRODUCTS.UPLOAD_IMAGES_S3}?productId=${productId}`,
      formData,
      getFormDataConfig(),
    )
    return response
  },
}

export default productService

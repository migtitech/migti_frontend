import axiosClient from '../api/axiosClient'
import { IMAGES } from '../api/endpoints'

const getFormDataConfig = () => ({
  transformRequest: [(data, headers) => {
    if (data instanceof FormData) {
      delete headers['Content-Type']
    }
    return data
  }],
})

/**
 * Upload images to S3 via Images API
 * Uses FormData - token attached automatically by axios interceptor
 *
 * @param {Object} params
 * @param {string} params.productId - Required. Product/entity reference ID
 * @param {File[]} params.files - Array of File objects
 * @param {string} [params.imageType] - 'product' | 'variant' (default: 'product')
 * @param {string} [params.variantCombinationUniqueId] - For variant images
 * @returns {Promise<{ data: { images: Array } }>}
 */
const uploadImages = async ({ productId, files, imageType = 'product', variantCombinationUniqueId }) => {
  const formData = new FormData()
  files.forEach((file) => {
    formData.append('images', file)
  })

  const params = new URLSearchParams()
  params.append('productId', productId)
  params.append('imageType', imageType)
  if (variantCombinationUniqueId) {
    params.append('variantCombinationUniqueId', variantCombinationUniqueId)
  }

  if (import.meta.env?.DEV) {
    console.debug('[imageService.uploadImages] Request:', {
      url: `${IMAGES.UPLOAD}?${params.toString()}`,
      productId,
      imageType,
      variantCombinationUniqueId: variantCombinationUniqueId || '(none)',
      fileCount: files.length,
      contentType: '(browser-set multipart/form-data with boundary)',
    })
  }
  const response = await axiosClient.post(
    `${IMAGES.UPLOAD}?${params.toString()}`,
    formData,
    getFormDataConfig(),
  )
  if (import.meta.env?.DEV) {
    console.debug('[imageService.uploadImages] Response:', response)
  }
  return response
}

/**
 * Delete image by ID
 * @param {string} imageId
 * @returns {Promise}
 */
const deleteImage = async (imageId) => {
  const response = await axiosClient.delete(IMAGES.DELETE, {
    params: { imageId },
  })
  return response
}

const imageService = {
  uploadImages,
  deleteImage,
}

export default imageService

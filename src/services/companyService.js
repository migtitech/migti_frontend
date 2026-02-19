import { api } from '../api/axiosClient'
import { COMPANIES } from '../api/endpoints'

const companyService = {
  /**
   * Get all companies
   * @param {Object} params - Query parameters (page, limit, search, etc.)
   * @returns {Promise}
   */
  getAll: async (params = {}) => {
    const response = await api.get(COMPANIES.LIST, { params })
    return response
  },

  /**
   * Get company by ID
   * @param {string|number} id
   * @returns {Promise}
   */
  getById: async (id) => {
    const response = await api.get(COMPANIES.GET_BY_ID, {
      params: { companyId: id },
    })
    return response
  },

  /**
   * Create new company
   * @param {Object} companyData
   * @returns {Promise}
   */
  create: async (companyData) => {
    const response = await api.post(COMPANIES.CREATE, companyData)
    return response
  },

  /**
   * Update company
   * @param {string|number} id
   * @param {Object} companyData
   * @returns {Promise}
   */
  update: async (id, companyData) => {
    const response = await api.put(COMPANIES.UPDATE, companyData, {
      params: { companyId: id },
    })
    return response
  },

  /**
   * Delete company
   * @param {string|number} id
   * @returns {Promise}
   */
  delete: async (id) => {
    const response = await api.delete(COMPANIES.DELETE, {
      params: { companyId: id },
    })
    return response
  },

  /**
   * Upload company logo to S3. Returns { url } to use as logoUrl in create/update.
   * @param {File} file - Image file (e.g. from input type="file")
   * @returns {Promise<{ data: { url: string } }>}
   */
  uploadLogo: async (file) => {
    const formData = new FormData()
    formData.append('logo', file)
    const response = await api.post(COMPANIES.UPLOAD_LOGO, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response
  },
}

export default companyService

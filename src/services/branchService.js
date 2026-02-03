import { api } from '../api/axiosClient'
import { BRANCHES } from '../api/endpoints'

const branchService = {

  getAll: async (params = {}) => {
    const response = await api.get(BRANCHES.LIST, { params })
    return response
  },

  /**
   * Get branch by ID
   * @param {string|number} id
   * @returns {Promise}
   */
  getById: async (id) => {
    const response = await api.get(BRANCHES.GET_BY_ID, {
      params: { companyBranchId: id },
    })
    return response
  },

  /**
   * Create new branch
   * @param {Object} branchData
   * @returns {Promise}
   */
  create: async (branchData) => {
    const response = await api.post(BRANCHES.CREATE, branchData)
    return response
  },

  /**
   * Update branch
   * @param {string|number} id
   * @param {Object} branchData
   * @returns {Promise}
   */
  update: async (id, branchData) => {
    const response = await api.put(BRANCHES.UPDATE, branchData, {
      params: { companyBranchId: id },
    })
    return response
  },

  /**
   * Delete branch
   * @param {string|number} id
   * @returns {Promise}
   */
  delete: async (id) => {
    const response = await api.delete(BRANCHES.DELETE, {
      params: { companyBranchId: id },
    })
    return response
  },
}

export default branchService

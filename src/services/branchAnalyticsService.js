import { api } from '../api/axiosClient'
import { QUERIES } from '../api/endpoints'

const branchAnalyticsService = {
  getData: async (params = {}) => {
    const response = await api.get(QUERIES.BRANCH_ANALYTICS, { params })
    return response
  },
}

export default branchAnalyticsService

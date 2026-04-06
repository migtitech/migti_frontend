import { api } from '../api/axiosClient'
import { QUERIES } from '../api/endpoints'

const targetAnalyticsService = {
  getData: async (params = {}) => {
    const response = await api.get(QUERIES.TARGET_ANALYTICS, { params })
    return response
  },
  getSummary: async (params = {}) => {
    const response = await api.get(QUERIES.TARGET_ANALYTICS_SUMMARY, { params })
    return response
  },
  upsertTarget: async (payload) => {
    const response = await api.post(QUERIES.TARGET_ANALYTICS, payload)
    return response
  },
}

export default targetAnalyticsService

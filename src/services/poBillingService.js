import { api } from '../api/axiosClient'
import { PO_BILLING } from '../api/endpoints'

const poBillingService = {
  getFormOptions: async (params = {}) => {
    const response = await api.get(PO_BILLING.FORM_OPTIONS, { params })
    return response
  },

  getAnalytics: async (params = {}) => {
    const response = await api.get(PO_BILLING.ANALYTICS, { params })
    return response
  },

  createPo: async (payload) => {
    const response = await api.post(PO_BILLING.CREATE_PO, payload)
    return response
  },

  createBilling: async (payload) => {
    const response = await api.post(PO_BILLING.CREATE_BILLING, payload)
    return response
  },
}

export default poBillingService

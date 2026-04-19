import { api } from '../api/axiosClient'
import { EMPLOYEE_LOCATIONS } from '../api/endpoints'

const employeeLocationService = {
  create: async (payload) => {
    const response = await api.post(EMPLOYEE_LOCATIONS.CREATE, payload)
    return response
  },

  list: async (params = {}) => {
    const response = await api.get(EMPLOYEE_LOCATIONS.LIST, { params })
    return response
  },
}

export default employeeLocationService

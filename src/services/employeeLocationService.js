import { api } from "../api/axiosClient";
import { EMPLOYEE_LOCATIONS } from "../api/endpoints";

const employeeLocationService = {
  create: async (payload) => {
    const response = await api.post(EMPLOYEE_LOCATIONS.CREATE, payload);
    return response;
  },

  list: async (params = {}) => {
    const response = await api.get(EMPLOYEE_LOCATIONS.LIST, { params });
    return response;
  },

  getLatest: async () => {
    const response = await api.get(EMPLOYEE_LOCATIONS.LATEST);
    return response;
  },

  getTeamLatest: async () => {
    const response = await api.get(EMPLOYEE_LOCATIONS.TEAM_LATEST);
    return response;
  },

  getHistoryBinned: async (params) => {
    const response = await api.get(EMPLOYEE_LOCATIONS.HISTORY_BINNED, {
      params,
    });
    return response;
  },
};

export default employeeLocationService;

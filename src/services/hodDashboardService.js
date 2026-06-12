import { api } from "../api/axiosClient";
import { HOD_DASHBOARD } from "../api/endpoints";

const hodDashboardService = {
  getOverview: async (params = {}) =>
    api.get(HOD_DASHBOARD.OVERVIEW, { params }),
  getPendingItems: async (params = {}) =>
    api.get(HOD_DASHBOARD.PENDING_ITEMS, { params }),
};

export default hodDashboardService;

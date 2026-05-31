import { api } from "../api/axiosClient";
import { QUERIES } from "../api/endpoints";

const targetAnalyticsService = {
  getData: async (params = {}) => {
    const response = await api.get(QUERIES.TARGET_ANALYTICS, { params });
    return response;
  },
  getSummary: async (params = {}) => {
    const response = await api.get(QUERIES.TARGET_ANALYTICS_SUMMARY, {
      params,
    });
    return response;
  },
  upsertTarget: async (payload) => {
    const response = await api.post(QUERIES.TARGET_ANALYTICS, payload);
    return response;
  },
  getZoneData: async (params = {}) =>
    api.get(QUERIES.TARGET_ANALYTICS_ZONE, { params }),
  getZoneSummary: async (params = {}) =>
    api.get(QUERIES.TARGET_ANALYTICS_ZONE_SUMMARY, { params }),
  upsertZoneTarget: async (payload) =>
    api.post(QUERIES.TARGET_ANALYTICS_ZONE, payload),
  getEmployeeData: async (params = {}) =>
    api.get(QUERIES.TARGET_ANALYTICS_EMPLOYEE, { params }),
  getEmployeeSummary: async (params = {}) =>
    api.get(QUERIES.TARGET_ANALYTICS_EMPLOYEE_SUMMARY, { params }),
  upsertEmployeeTarget: async (payload) =>
    api.post(QUERIES.TARGET_ANALYTICS_EMPLOYEE, payload),
  getHodDashboardCards: async () => api.get(QUERIES.HOD_DASHBOARD_CARDS),
  getMyZoneTargets: async () =>
    api.get(QUERIES.TARGET_ANALYTICS_ZONE_MY_TARGETS),
};

export default targetAnalyticsService;

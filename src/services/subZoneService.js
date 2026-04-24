import { api } from "../api/axiosClient";
import { SUB_ZONES } from "../api/endpoints";

const subZoneService = {
  listByZone: async (zoneId, params = {}) => {
    const response = await api.get(SUB_ZONES.LIST, {
      params: { zoneId, pageSize: 100, ...params },
    });
    return response;
  },

  listGrouped: async () => {
    const response = await api.get(SUB_ZONES.LIST_GROUPED);
    return response;
  },

  create: async (data) => {
    const response = await api.post(SUB_ZONES.CREATE, data);
    return response;
  },

  update: async (subZoneId, data) => {
    const response = await api.put(SUB_ZONES.UPDATE, data, {
      params: { subZoneId },
    });
    return response;
  },

  delete: async (subZoneId) => {
    const response = await api.delete(SUB_ZONES.DELETE, {
      params: { subZoneId },
    });
    return response;
  },
};

export default subZoneService;

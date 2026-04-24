import { api } from "../api/axiosClient";
import { AREAS } from "../api/endpoints";

const areaService = {
  getAll: async (params = {}) => {
    const response = await api.get(AREAS.LIST, { params });
    return response;
  },

  getById: async (id) => {
    const response = await api.get(AREAS.GET_BY_ID, {
      params: { areaId: id },
    });
    return response;
  },

  create: async (data) => {
    const response = await api.post(AREAS.CREATE, data);
    return response;
  },

  update: async (id, data) => {
    const response = await api.put(AREAS.UPDATE, data, {
      params: { areaId: id },
    });
    return response;
  },

  delete: async (id) => {
    const response = await api.delete(AREAS.DELETE, {
      params: { areaId: id },
    });
    return response;
  },
};

export default areaService;

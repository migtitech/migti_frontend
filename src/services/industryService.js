import { api } from "../api/axiosClient";
import { INDUSTRIES } from "../api/endpoints";

const industryService = {
  getAll: async (params = {}) => {
    const response = await api.get(INDUSTRIES.LIST, { params });
    return response;
  },

  getById: async (id) => {
    const response = await api.get(INDUSTRIES.GET_BY_ID, {
      params: { industryId: id },
    });
    return response;
  },

  create: async (data) => {
    const response = await api.post(INDUSTRIES.CREATE, data);
    return response;
  },

  update: async (id, data) => {
    const response = await api.put(INDUSTRIES.UPDATE, data, {
      params: { industryId: id },
    });
    return response;
  },

  delete: async (id) => {
    const response = await api.delete(INDUSTRIES.DELETE, {
      params: { industryId: id },
    });
    return response;
  },
};

export default industryService;

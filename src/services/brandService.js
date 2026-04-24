import { api } from "../api/axiosClient";
import { BRANDS } from "../api/endpoints";

const brandService = {
  getAll: async (params = {}) => {
    const response = await api.get(BRANDS.LIST, { params });
    return response;
  },

  getById: async (id) => {
    const response = await api.get(BRANDS.GET_BY_ID, {
      params: { brandId: id },
    });
    return response;
  },

  create: async (data) => {
    const response = await api.post(BRANDS.CREATE, data);
    return response;
  },

  update: async (id, data) => {
    const response = await api.put(BRANDS.UPDATE, data, {
      params: { brandId: id },
    });
    return response;
  },

  delete: async (id) => {
    const response = await api.delete(BRANDS.DELETE, {
      params: { brandId: id },
    });
    return response;
  },
};

export default brandService;

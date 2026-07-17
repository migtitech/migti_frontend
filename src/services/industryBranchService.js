import { api } from "../api/axiosClient";
import { INDUSTRY_BRANCHES } from "../api/endpoints";

const industryBranchService = {
  getAll: async (params = {}) => {
    const response = await api.get(INDUSTRY_BRANCHES.LIST, { params });
    return response;
  },

  getById: async (id) => {
    const response = await api.get(INDUSTRY_BRANCHES.GET_BY_ID, {
      params: { industryBranchId: id },
    });
    return response;
  },

  create: async (data) => {
    const response = await api.post(INDUSTRY_BRANCHES.CREATE, data);
    return response;
  },

  update: async (id, data) => {
    const response = await api.put(INDUSTRY_BRANCHES.UPDATE, data, {
      params: { industryBranchId: id },
    });
    return response;
  },

  delete: async (id) => {
    const response = await api.delete(INDUSTRY_BRANCHES.DELETE, {
      params: { industryBranchId: id },
    });
    return response;
  },
};

export default industryBranchService;

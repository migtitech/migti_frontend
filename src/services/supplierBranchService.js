import { api } from "../api/axiosClient";
import { SUPPLIER_BRANCHES } from "../api/endpoints";

const supplierBranchService = {
  getAll: async (params = {}) => {
    const response = await api.get(SUPPLIER_BRANCHES.LIST, { params });
    return response;
  },

  getById: async (id) => {
    const response = await api.get(SUPPLIER_BRANCHES.GET_BY_ID, {
      params: { supplierBranchId: id },
    });
    return response;
  },

  create: async (data) => {
    const response = await api.post(SUPPLIER_BRANCHES.CREATE, data);
    return response;
  },

  update: async (id, data) => {
    const response = await api.put(SUPPLIER_BRANCHES.UPDATE, data, {
      params: { supplierBranchId: id },
    });
    return response;
  },

  delete: async (id) => {
    const response = await api.delete(SUPPLIER_BRANCHES.DELETE, {
      params: { supplierBranchId: id },
    });
    return response;
  },
};

export default supplierBranchService;

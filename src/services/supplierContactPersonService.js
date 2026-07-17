import { api } from "../api/axiosClient";
import { SUPPLIER_CONTACT_PERSONS } from "../api/endpoints";

const supplierContactPersonService = {
  getAll: async (params = {}) => {
    const response = await api.get(SUPPLIER_CONTACT_PERSONS.LIST, { params });
    return response;
  },

  getById: async (id) => {
    const response = await api.get(SUPPLIER_CONTACT_PERSONS.GET_BY_ID, {
      params: { supplierContactPersonId: id },
    });
    return response;
  },

  create: async (data) => {
    const response = await api.post(SUPPLIER_CONTACT_PERSONS.CREATE, data);
    return response;
  },

  update: async (id, data) => {
    const response = await api.put(SUPPLIER_CONTACT_PERSONS.UPDATE, data, {
      params: { supplierContactPersonId: id },
    });
    return response;
  },

  delete: async (id) => {
    const response = await api.delete(SUPPLIER_CONTACT_PERSONS.DELETE, {
      params: { supplierContactPersonId: id },
    });
    return response;
  },
};

export default supplierContactPersonService;

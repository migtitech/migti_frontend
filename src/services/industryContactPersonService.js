import { api } from "../api/axiosClient";
import { INDUSTRY_CONTACT_PERSONS } from "../api/endpoints";

const industryContactPersonService = {
  getAll: async (params = {}) => {
    const response = await api.get(INDUSTRY_CONTACT_PERSONS.LIST, { params });
    return response;
  },

  getById: async (id) => {
    const response = await api.get(INDUSTRY_CONTACT_PERSONS.GET_BY_ID, {
      params: { industryContactPersonId: id },
    });
    return response;
  },

  create: async (data) => {
    const response = await api.post(INDUSTRY_CONTACT_PERSONS.CREATE, data);
    return response;
  },

  update: async (id, data) => {
    const response = await api.put(INDUSTRY_CONTACT_PERSONS.UPDATE, data, {
      params: { industryContactPersonId: id },
    });
    return response;
  },

  delete: async (id) => {
    const response = await api.delete(INDUSTRY_CONTACT_PERSONS.DELETE, {
      params: { industryContactPersonId: id },
    });
    return response;
  },
};

export default industryContactPersonService;

import { api } from "../api/axiosClient";
import { VISITS } from "../api/endpoints";

const visitService = {
  create: async (payload) => {
    const response = await api.post(VISITS.CREATE, payload);
    return response;
  },

  list: async (params = {}) => {
    const response = await api.get(VISITS.LIST, { params });
    return response;
  },

  myList: async (params = {}) => {
    const response = await api.get(VISITS.MY_VISITS, { params });
    return response;
  },

  completeWithRemark: async (payload) => {
    const response = await api.patch(VISITS.COMPLETE_WITH_REMARK, payload);
    return response;
  },
};

export default visitService;

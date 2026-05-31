import { api } from "../api/axiosClient";
import { RATE_MASTER } from "../api/endpoints";

const rateMasterService = {
  searchCodes: async (params = {}) => {
    const response = await api.get(RATE_MASTER.SEARCH_CODES, { params });
    return response;
  },

  getSummary: async (productCode) => {
    const response = await api.get(RATE_MASTER.SUMMARY, {
      params: { productCode },
    });
    return response;
  },

  getRates: async (params = {}) => {
    const response = await api.get(RATE_MASTER.RATES, { params });
    return response;
  },
};

export default rateMasterService;

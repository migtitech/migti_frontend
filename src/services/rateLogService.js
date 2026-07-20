import { api } from "../api/axiosClient";
import { QUOTATIONS } from "../api/endpoints";

const rateLogService = {
  getAll: async (params = {}) => {
    const response = await api.get(QUOTATIONS.RATE_LOGS_LIST, { params });
    return response;
  },
  getProductDetail: async (productTitle) => {
    const response = await api.get(QUOTATIONS.RATE_LOGS_PRODUCT_DETAIL, {
      params: { productTitle },
    });
    return response;
  },
};

export default rateLogService;

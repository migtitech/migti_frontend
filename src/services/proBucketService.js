import { api } from "../api/axiosClient";
import { PRO_BUCKET } from "../api/endpoints";

const proBucketService = {
  list: async (params = {}) => {
    const response = await api.get(PRO_BUCKET.QUERY_PRODUCTS, { params });
    return response;
  },
  getById: async (id) => {
    const response = await api.get(PRO_BUCKET.QUERY_PRODUCT_BY_ID(id));
    return response;
  },
  appendRates: async (id, rates) => {
    const response = await api.post(PRO_BUCKET.APPEND_RATES(id), { rates });
    return response;
  },
};

export default proBucketService;

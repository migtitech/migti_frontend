import { api } from "../api/axiosClient";
import { QUOTATIONS } from "../api/endpoints";

const rateLogService = {
  getAll: async (params = {}) => {
    const response = await api.get(QUOTATIONS.RATE_LOGS_LIST, { params });
    return response;
  },
};

export default rateLogService;

import { api } from "../api/axiosClient";
import { PO_PAYMENT_BACKLOG } from "../api/endpoints";

const poPaymentBacklogService = {
  list: async (params = {}) => {
    return api.get(PO_PAYMENT_BACKLOG.LIST, { params });
  },

  settle: async (backlogId) => {
    return api.put(PO_PAYMENT_BACKLOG.SETTLE, { backlogId });
  },
};

export default poPaymentBacklogService;

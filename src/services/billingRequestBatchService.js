import { api } from "../api/axiosClient";
import { BILLING_REQUESTS } from "../api/endpoints";

const billingRequestBatchService = {
  list: async (params = {}) => {
    const response = await api.get(BILLING_REQUESTS.LIST, { params });
    return response;
  },
  getById: async (id) => {
    const response = await api.get(BILLING_REQUESTS.BY_ID(id));
    return response;
  },
  financeApprove: async (id, data = {}) => {
    const response = await api.patch(BILLING_REQUESTS.FINANCE_APPROVE(id), data);
    return response;
  },
  hodProductAction: async (id, productId, data = {}) => {
    const response = await api.patch(BILLING_REQUESTS.HOD_PRODUCT_ACTION(id, productId), data);
    return response;
  },
  resubmitProduct: async (id, productId, data = {}) => {
    const response = await api.patch(BILLING_REQUESTS.RESUBMIT_PRODUCT(id, productId), data);
    return response;
  },
  markProductPurchased: async (id, productId) => {
    const response = await api.patch(BILLING_REQUESTS.MARK_PRODUCT_PURCHASED(id, productId));
    return response;
  },
};

export default billingRequestBatchService;

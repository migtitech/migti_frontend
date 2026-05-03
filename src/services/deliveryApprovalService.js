import { api } from "../api/axiosClient";
import { DELIVERY_APPROVAL } from "../api/endpoints";

const deliveryApprovalService = {
  list: async (params = {}) => {
    const response = await api.get(DELIVERY_APPROVAL.PO_PRODUCTS, { params });
    return response;
  },
  getById: async (id) => {
    const response = await api.get(DELIVERY_APPROVAL.PO_PRODUCT_BY_ID(id));
    return response;
  },
  approveDelivery: async (id) => {
    const response = await api.post(DELIVERY_APPROVAL.APPROVE_DELIVERY(id));
    return response;
  },
};

export default deliveryApprovalService;

import { api } from "../api/axiosClient";
import { DELIVERY_APPROVAL, PO_PRODUCTS_BUCKET } from "../api/endpoints";

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

export const poProductsBucketService = {
  list: async (params = {}) => {
    return api.get(PO_PRODUCTS_BUCKET.PO_PRODUCTS, { params });
  },
  getById: async (id) => {
    return api.get(PO_PRODUCTS_BUCKET.PO_PRODUCT_BY_ID(id));
  },
  update: async (id, data) => {
    return api.put(PO_PRODUCTS_BUCKET.UPDATE_PO_PRODUCT(id), data);
  },
  create: async (data) => {
    return api.post(PO_PRODUCTS_BUCKET.CREATE_PO_PRODUCT, data);
  },
  poCodeSuggestions: async (search) => {
    return api.get(PO_PRODUCTS_BUCKET.PO_CODE_SUGGESTIONS, { params: { search } });
  },
  approveDelivery: async (id) => {
    return api.post(PO_PRODUCTS_BUCKET.APPROVE_DELIVERY(id));
  },
};

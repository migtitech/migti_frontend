import { api } from "../api/axiosClient";
import { DISPATCHMENT_BUCKET } from "../api/endpoints";

const dispatchmentBucketService = {
  list: async (params = {}) => {
    const response = await api.get(DISPATCHMENT_BUCKET.PO_PRODUCTS, { params });
    return response;
  },
  getById: async (id) => {
    const response = await api.get(DISPATCHMENT_BUCKET.PO_PRODUCT_BY_ID(id));
    return response;
  },
  markReadyForDispatchment: async (id) => {
    const response = await api.post(
      DISPATCHMENT_BUCKET.READY_FOR_DISPATCHMENT(id),
    );
    return response;
  },
  markDelivered: async (id, body = {}) => {
    const response = await api.post(
      DISPATCHMENT_BUCKET.MARK_DELIVERED(id),
      body,
    );
    return response;
  },
};

export default dispatchmentBucketService;

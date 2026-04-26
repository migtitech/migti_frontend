import { api } from "../api/axiosClient";
import { INVENTORY_BUCKET } from "../api/endpoints";

const inventoryBucketService = {
  list: async (params = {}) => {
    const response = await api.get(INVENTORY_BUCKET.PO_PRODUCTS, { params });
    return response;
  },
  getById: async (id) => {
    const response = await api.get(INVENTORY_BUCKET.PO_PRODUCT_BY_ID(id));
    return response;
  },
  markInventoryReceived: async (id) => {
    const response = await api.post(INVENTORY_BUCKET.INVENTORY_RECEIVED(id));
    return response;
  },
  markReadyForDispatchment: async (id) => {
    const response = await api.post(INVENTORY_BUCKET.READY_FOR_DISPATCHMENT(id));
    return response;
  },
};

export default inventoryBucketService;

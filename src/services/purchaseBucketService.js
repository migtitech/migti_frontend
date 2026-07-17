import { api } from "../api/axiosClient";
import { PURCHASE_BUCKET } from "../api/endpoints";

const purchaseBucketService = {
  list: async (params = {}) => {
    const response = await api.get(PURCHASE_BUCKET.PO_PRODUCTS, { params });
    return response;
  },
  getById: async (id) => {
    const response = await api.get(PURCHASE_BUCKET.PO_PRODUCT_BY_ID(id));
    return response;
  },
  raisePaymentRequest: async (id, body) => {
    const response = await api.post(PURCHASE_BUCKET.PAYMENT_REQUEST(id), body);
    return response;
  },
  markLinePurchased: async (id) => {
    const response = await api.post(PURCHASE_BUCKET.MARK_PURCHASED(id), {});
    return response;
  },
  /** Set or clear `attachmentDocumentId` on the po_product line (product image). */
  setLineAttachment: async (id, body) => {
    const response = await api.patch(PURCHASE_BUCKET.LINE_ATTACHMENT(id), body);
    return response;
  },
};

export default purchaseBucketService;

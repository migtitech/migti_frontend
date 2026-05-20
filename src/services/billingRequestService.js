import { api } from "../api/axiosClient";
import { BILLING_REQUESTS } from "../api/endpoints";

const billingRequestService = {
  /**
   * Create one billing_request document for a batch of PO products.
   * Also sets each po_product.status = 'hod_approval_pending' on the backend.
   *
   * @param {Array<{
   *   poProductId: string,
   *   amount: number,
   *   billDocId: string,
   *   productImageDocId?: string,
   *   supplierSnapshot?: object,
   *   remark?: string
   * }>} products
   */
  create: async (products) => {
    const response = await api.post(BILLING_REQUESTS.CREATE, { products });
    return response;
  },
};

export default billingRequestService;

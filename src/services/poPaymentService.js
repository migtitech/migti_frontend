import { api } from "../api/axiosClient";
import { PO_PAYMENTS } from "../api/endpoints";

const poPaymentService = {
  appendLedger: async (purchaseOrderId, body = {}) => {
    return api.post(PO_PAYMENTS.APPEND_LEDGER, {
      ...body,
      purchaseOrderId,
    });
  },
};

export default poPaymentService;

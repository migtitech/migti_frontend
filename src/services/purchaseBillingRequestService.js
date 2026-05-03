import { api } from "../api/axiosClient";
import { PURCHASE_BILLING_REQUESTS } from "../api/endpoints";

const purchaseBillingRequestService = {
  list: async (params = {}) => {
    const response = await api.get(PURCHASE_BILLING_REQUESTS.LIST, { params });
    return response;
  },
  getById: async (id) => {
    const response = await api.get(PURCHASE_BILLING_REQUESTS.BY_ID(id));
    return response;
  },
  saveRemark: async (id, statusRemark) => {
    const response = await api.put(PURCHASE_BILLING_REQUESTS.REMARK(id), {
      statusRemark: statusRemark ?? "",
    });
    return response;
  },
  approve: async (id, statusRemark) => {
    const body = {};
    if (statusRemark != null && String(statusRemark).length) {
      body.statusRemark = String(statusRemark).trim();
    }
    const response = await api.put(PURCHASE_BILLING_REQUESTS.APPROVE(id), body);
    return response;
  },
  /** Optional payment proof: pass `null` to remove. */
  setProof: async (id, proofDocumentId) => {
    const response = await api.put(PURCHASE_BILLING_REQUESTS.PROOF(id), {
      proofDocumentId:
        proofDocumentId === null || proofDocumentId === undefined
          ? null
          : String(proofDocumentId),
    });
    return response;
  },
};

export default purchaseBillingRequestService;

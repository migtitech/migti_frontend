import { api } from "../api/axiosClient";
import { PURCHASE_ORDERS } from "../api/endpoints";

const mapPo = (row) => (row ? { ...row, id: row._id ?? row.id } : null);

const purchaseOrderService = {
  getAll: async (params = {}) => {
    const response = await api.get(PURCHASE_ORDERS.LIST, { params });
    return response;
  },

  /** POs where `salesEmployeeId` is the logged-in user (see backend `/my-assigned`). */
  listMyAssigned: async (params = {}) => {
    const response = await api.get(PURCHASE_ORDERS.MY_ASSIGNED, { params });
    return response;
  },

  getById: async (id) => {
    const response = await api.get(PURCHASE_ORDERS.GET_BY_ID, {
      params: { purchaseOrderId: id },
    });
    return response;
  },

  /** Lists `po_products` for a PO (by Mongo id and/or `poCode`). */
  listPoProductLines: async (params = {}) => {
    const response = await api.get(PURCHASE_ORDERS.PO_PRODUCT_LINES, {
      params,
    });
    return response;
  },

  getByQuotationId: async (quotationId) => {
    const response = await api.get(PURCHASE_ORDERS.BY_QUOTATION, {
      params: { quotationId },
    });
    return response;
  },

  createFromQuotation: async (quotationId, options = {}) => {
    const body = {
      quotationId,
      reuseExisting: options.reuseExisting !== false,
    };
    if (Array.isArray(options.products)) {
      body.products = options.products;
    }
    const response = await api.post(
      PURCHASE_ORDERS.CREATE_FROM_QUOTATION,
      body,
    );
    return response;
  },

  update: async (id, data) => {
    const response = await api.put(PURCHASE_ORDERS.UPDATE, data, {
      params: { purchaseOrderId: id },
    });
    return response;
  },

  updateStatus: async (id, status) => {
    const response = await api.put(
      PURCHASE_ORDERS.UPDATE_STATUS,
      { status },
      { params: { purchaseOrderId: id } },
    );
    return response;
  },

  /** Head of department only (backend enforces). */
  hodClose: async (id) => {
    const response = await api.put(
      PURCHASE_ORDERS.HOD_CLOSE,
      {},
      {
        params: { purchaseOrderId: id },
      },
    );
    return response;
  },

  /** Head of department only (backend enforces). Sets PO `status` to `hod_approved`. */
  hodApprove: async (id) => {
    const response = await api.put(
      PURCHASE_ORDERS.HOD_APPROVE,
      {},
      {
        params: { purchaseOrderId: id },
      },
    );
    return response;
  },

  appendPayment: async (id, body) => {
    const response = await api.post(PURCHASE_ORDERS.APPEND_PAYMENT, body, {
      params: { purchaseOrderId: id },
    });
    return response;
  },
};

export default purchaseOrderService;
export { mapPo };

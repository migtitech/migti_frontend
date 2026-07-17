import { api } from "../api/axiosClient";
import { LOCAL_PURCHASE } from "../api/endpoints";

const localPurchaseService = {
  list: async (params = {}) => {
    const response = await api.get(LOCAL_PURCHASE.LIST, { params });
    return response;
  },
  getById: async (id) => {
    const response = await api.get(LOCAL_PURCHASE.BY_ID(id));
    return response;
  },
  submit: async (id, payload) => {
    const response = await api.put(LOCAL_PURCHASE.SUBMIT(id), payload);
    return response;
  },
  updateAttachments: async (id, payload) => {
    const response = await api.put(LOCAL_PURCHASE.ATTACHMENTS(id), payload);
    return response;
  },
  listEmployees: async () => {
    const response = await api.get(LOCAL_PURCHASE.EMPLOYEES);
    return response;
  },
  assign: async ({
    poProductId,
    employeeId,
    zoneId,
    remark,
    supplier,
    locationLink,
  }) => {
    const response = await api.post(LOCAL_PURCHASE.ASSIGN, {
      poProductId,
      employeeId,
      zoneId,
      remark: remark || "",
      supplier: supplier || "",
      locationLink: locationLink || "",
    });
    return response;
  },
};

export default localPurchaseService;

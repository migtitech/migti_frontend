import { api } from "../api/axiosClient";
import { LOCAL_PROCUREMENT } from "../api/endpoints";

const localProcurementService = {
  list: async (params = {}) => {
    const response = await api.get(LOCAL_PROCUREMENT.LIST, { params });
    return response;
  },
  listEmployees: async () => {
    const response = await api.get(LOCAL_PROCUREMENT.EMPLOYEES);
    return response;
  },
  assign: async ({ queryProductId, employeeId, remark }) => {
    const response = await api.post(LOCAL_PROCUREMENT.ASSIGN, {
      queryProductId,
      employeeId,
      remark: remark || "",
    });
    return response;
  },
  submit: async (id, payload) => {
    const response = await api.put(LOCAL_PROCUREMENT.SUBMIT(id), payload);
    return response;
  },
};

export default localProcurementService;

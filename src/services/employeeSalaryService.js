import { api } from "../api/axiosClient";
import { EMPLOYEE_SALARY } from "../api/endpoints";

const employeeSalaryService = {
  getAll: async (params = {}) => {
    const response = await api.get(EMPLOYEE_SALARY.LIST, { params });
    return response;
  },

  getById: async (id) => {
    const response = await api.get(EMPLOYEE_SALARY.GET_BY_ID, {
      params: { employeeSalaryId: id },
    });
    return response;
  },

  create: async (data) => {
    const response = await api.post(EMPLOYEE_SALARY.CREATE, data);
    return response;
  },

  update: async (id, data) => {
    const response = await api.put(EMPLOYEE_SALARY.UPDATE, data, {
      params: { employeeSalaryId: id },
    });
    return response;
  },

  exportPdf: async (id) => {
    const response = await api.get(EMPLOYEE_SALARY.EXPORT_PDF, {
      params: { employeeSalaryId: id },
      responseType: "blob",
    });
    return response;
  },
};

export default employeeSalaryService;

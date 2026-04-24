import { api } from "../api/axiosClient";
import { TASK_MANAGEMENT } from "../api/endpoints";

const taskManagementService = {
  create: async (data) => {
    const response = await api.post(TASK_MANAGEMENT.CREATE, data);
    return response;
  },

  getAll: async (params = {}) => {
    const response = await api.get(TASK_MANAGEMENT.LIST, { params });
    return response;
  },

  getMyTasks: async (params = {}) => {
    const response = await api.get(TASK_MANAGEMENT.MY_TASKS, { params });
    return response;
  },

  getById: async (id) => {
    const response = await api.get(TASK_MANAGEMENT.GET_BY_ID(id));
    return response;
  },

  assignEmployee: async (taskId, employeeId) => {
    const response = await api.put(TASK_MANAGEMENT.ASSIGN_EMPLOYEE, {
      taskId,
      employeeId,
    });
    return response;
  },

  updateSupplier: async (taskId, data) => {
    const response = await api.put(TASK_MANAGEMENT.UPDATE_SUPPLIER, {
      taskId,
      ...data,
    });
    return response;
  },

  update: async (taskId, data) => {
    const response = await api.put(TASK_MANAGEMENT.UPDATE, {
      taskId,
      ...data,
    });
    return response;
  },

  delete: async (taskId) => {
    const response = await api.delete(TASK_MANAGEMENT.DELETE, {
      params: { taskId },
    });
    return response;
  },
};

export default taskManagementService;

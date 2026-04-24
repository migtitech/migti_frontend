import { api } from "../api/axiosClient";
import { PURCHASE_TASKS } from "../api/endpoints";

const purchaseTaskService = {
  assign: async (data) => {
    const response = await api.post(PURCHASE_TASKS.ASSIGN, data);
    return response;
  },

  getMyTasks: async (params = {}) => {
    const response = await api.get(PURCHASE_TASKS.MY_TASKS, { params });
    return response;
  },

  updateStatus: async (taskId, status, targetRate) => {
    const payload = { status };
    if (typeof targetRate === "number") {
      payload.targetRate = targetRate;
    }
    const response = await api.put(PURCHASE_TASKS.UPDATE_STATUS, payload, {
      params: { taskId },
    });
    return response;
  },

  updateRemark: async (taskId, supplierRateRemark) => {
    const response = await api.put(
      PURCHASE_TASKS.UPDATE_REMARK,
      { supplierRateRemark },
      { params: { taskId } },
    );
    return response;
  },

  getRateBucket: async (params = {}) => {
    const response = await api.get(PURCHASE_TASKS.RATE_BUCKET, { params });
    return response;
  },

  adminList: async (params = {}) => {
    const response = await api.get(PURCHASE_TASKS.ADMIN_LIST, { params });
    return response;
  },
};

export default purchaseTaskService;

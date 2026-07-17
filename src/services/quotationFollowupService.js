import { api } from "../api/axiosClient";
import { QUOTATION_FOLLOWUP } from "../api/endpoints";

const quotationFollowupService = {
  list: async (params = {}) => {
    return api.get(QUOTATION_FOLLOWUP.LIST, { params });
  },

  updateRemark: async (followupId, remark) => {
    return api.put(QUOTATION_FOLLOWUP.UPDATE_REMARK, { followupId, remark });
  },
};

export default quotationFollowupService;

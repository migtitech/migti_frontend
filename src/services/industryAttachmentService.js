import { api } from "../api/axiosClient";
import { INDUSTRY_ATTACHMENTS } from "../api/endpoints";

const industryAttachmentService = {
  list: async (params = {}) => {
    const response = await api.get(INDUSTRY_ATTACHMENTS.LIST, { params });
    return response;
  },

  create: async ({ industryId, label, file }) => {
    const formData = new FormData();
    formData.append("industryId", industryId);
    if (label) formData.append("label", label);
    formData.append("file", file);
    const response = await api.post(INDUSTRY_ATTACHMENTS.CREATE, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response;
  },

  delete: async (industryAttachmentId) => {
    const response = await api.delete(INDUSTRY_ATTACHMENTS.DELETE, {
      params: { industryAttachmentId },
    });
    return response;
  },
};

export default industryAttachmentService;

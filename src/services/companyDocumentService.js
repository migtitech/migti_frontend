import { api } from "../api/axiosClient";
import { COMPANY_DOCUMENTS } from "../api/endpoints";

const companyDocumentService = {
  list: async (params = {}) => {
    const response = await api.get(COMPANY_DOCUMENTS.LIST, { params });
    return response;
  },

  create: async ({ name, doc_type, remark, file }) => {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("doc_type", doc_type);
    if (remark) formData.append("remark", remark);
    formData.append("catalog", file);
    const response = await api.post(COMPANY_DOCUMENTS.CREATE, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response;
  },

  delete: async (companyDocumentId) => {
    const response = await api.delete(COMPANY_DOCUMENTS.DELETE, {
      params: { companyDocumentId },
    });
    return response;
  },
};

export default companyDocumentService;

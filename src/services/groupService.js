import { api } from "../api/axiosClient";
import { GROUPS } from "../api/endpoints";

const groupService = {
  getAll: async (params = {}) => {
    const response = await api.get(GROUPS.LIST, { params });
    return response;
  },

  getById: async (id) => {
    const response = await api.get(GROUPS.GET_BY_ID, {
      params: { groupId: id },
    });
    return response;
  },

  create: async (data) => {
    const response = await api.post(GROUPS.CREATE, data);
    return response;
  },

  update: async (id, data) => {
    const response = await api.put(GROUPS.UPDATE, data, {
      params: { groupId: id },
    });
    return response;
  },

  delete: async (id) => {
    const response = await api.delete(GROUPS.DELETE, {
      params: { groupId: id },
    });
    return response;
  },

  uploadIcon: async (file) => {
    const formData = new FormData();
    formData.append("icon", file);
    const response = await api.post(GROUPS.UPLOAD_ICON, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response;
  },
};

export default groupService;

import { api } from "../api/axiosClient";
import { CATEGORIES } from "../api/endpoints";

const categoryService = {
  getAll: async (params = {}) => {
    const response = await api.get(CATEGORIES.LIST, { params });
    return response;
  },

  getAllCategories: async () => {
    const response = await api.get(CATEGORIES.GET_ALL);
    return response;
  },

  getById: async (id) => {
    const response = await api.get(CATEGORIES.GET_BY_ID, {
      params: { categoryId: id },
    });
    return response;
  },

  create: async (data) => {
    const response = await api.post(CATEGORIES.CREATE, data);
    return response;
  },

  update: async (id, data) => {
    const response = await api.put(CATEGORIES.UPDATE, data, {
      params: { categoryId: id },
    });
    return response;
  },

  delete: async (id) => {
    const response = await api.delete(CATEGORIES.DELETE, {
      params: { categoryId: id },
    });
    return response;
  },

  uploadIcon: async (file) => {
    const formData = new FormData();
    formData.append("icon", file);
    const response = await api.post(CATEGORIES.UPLOAD_ICON, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response;
  },
};

export default categoryService;

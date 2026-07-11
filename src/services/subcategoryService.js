import { api } from "../api/axiosClient";
import { SUBCATEGORIES } from "../api/endpoints";

const subcategoryService = {
  getAll: async (params = {}) => {
    const response = await api.get(SUBCATEGORIES.LIST, { params });
    return response;
  },

  getAllSubcategories: async (params = {}) => {
    const response = await api.get(SUBCATEGORIES.GET_ALL, { params });
    return response;
  },

  getById: async (id) => {
    const response = await api.get(SUBCATEGORIES.GET_BY_ID, {
      params: { subcategoryId: id },
    });
    return response;
  },

  create: async (data) => {
    const response = await api.post(SUBCATEGORIES.CREATE, data);
    return response;
  },

  update: async (id, data) => {
    const response = await api.put(SUBCATEGORIES.UPDATE, data, {
      params: { subcategoryId: id },
    });
    return response;
  },

  delete: async (id) => {
    const response = await api.delete(SUBCATEGORIES.DELETE, {
      params: { subcategoryId: id },
    });
    return response;
  },

  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append("image", file);
    const response = await api.post(SUBCATEGORIES.UPLOAD_IMAGE, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response;
  },
};

export default subcategoryService;

import { api } from "../api/axiosClient";
import { USERS } from "../api/endpoints";

const userService = {
  /**
   * Get all users
   * @param {Object} params - Query parameters (page, limit, search, etc.)
   * @returns {Promise}
   */
  getAll: async (params = {}) => {
    const response = await api.get(USERS.BASE, { params });
    return response;
  },

  /**
   * Get user by ID
   * @param {string|number} id
   * @returns {Promise}
   */
  getById: async (id) => {
    const response = await api.get(USERS.BY_ID(id));
    return response;
  },

  /**
   * Get current user profile
   * @returns {Promise}
   */
  getProfile: async () => {
    const response = await api.get(USERS.PROFILE);
    return response;
  },

  /**
   * Create new user
   * @param {Object} userData
   * @returns {Promise}
   */
  create: async (userData) => {
    const response = await api.post(USERS.BASE, userData);
    return response;
  },

  /**
   * Update user
   * @param {string|number} id
   * @param {Object} userData
   * @returns {Promise}
   */
  update: async (id, userData) => {
    const response = await api.put(USERS.BY_ID(id), userData);
    return response;
  },

  /**
   * Update user profile
   * @param {Object} profileData
   * @returns {Promise}
   */
  updateProfile: async (profileData) => {
    const response = await api.put(USERS.PROFILE, profileData);
    return response;
  },

  /**
   * Update password
   * @param {string} currentPassword
   * @param {string} newPassword
   * @returns {Promise}
   */
  updatePassword: async (currentPassword, newPassword) => {
    const response = await api.put(USERS.UPDATE_PASSWORD, {
      currentPassword,
      newPassword,
    });
    return response;
  },

  /**
   * Delete user
   * @param {string|number} id
   * @returns {Promise}
   */
  delete: async (id) => {
    const response = await api.delete(USERS.BY_ID(id));
    return response;
  },
};

export default userService;

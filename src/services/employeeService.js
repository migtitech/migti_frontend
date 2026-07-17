import { api } from "../api/axiosClient";
import { EMPLOYEES } from "../api/endpoints";

const employeeService = {
  /**
   * Get all employees
   * @param {Object} params - Query parameters (page, limit, search, etc.)
   * @returns {Promise}
   */
  getAll: async (params = {}) => {
    const response = await api.get(EMPLOYEES.LIST, { params });
    return response;
  },

  /**
   * Get employee by ID
   * @param {string|number} id
   * @returns {Promise}
   */
  getById: async (id) => {
    const response = await api.get(EMPLOYEES.GET_BY_ID, {
      params: { employeeId: id },
    });
    return response;
  },

  /**
   * Create new employee
   * @param {Object} employeeData
   * @returns {Promise}
   */
  create: async (employeeData) => {
    const response = await api.post(EMPLOYEES.CREATE, employeeData);
    return response;
  },

  /**
   * Update employee
   * @param {string|number} id
   * @param {Object} employeeData
   * @returns {Promise}
   */
  update: async (id, employeeData) => {
    const response = await api.put(EMPLOYEES.UPDATE, employeeData, {
      params: { employeeId: id },
    });
    return response;
  },

  /**
   * Set a new login password (stored encrypted on the server).
   * @param {string|number} id
   * @param {{ newPassword: string, confirmPassword: string }} passwords
   */
  updatePassword: async (id, { newPassword, confirmPassword }) => {
    const response = await api.put(
      EMPLOYEES.UPDATE_PASSWORD,
      { newPassword, confirmPassword },
      { params: { employeeId: id } },
    );
    return response;
  },

  /**
   * Delete employee
   * @param {string|number} id
   * @returns {Promise}
   */
  delete: async (id) => {
    const response = await api.delete(EMPLOYEES.DELETE, {
      params: { employeeId: id },
    });
    return response;
  },
};

export default employeeService;

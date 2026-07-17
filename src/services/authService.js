import { api, setTokens, clearTokens } from "../api/axiosClient";
import { AUTH } from "../api/endpoints";

const authService = {
  login: async (email, password) => {
    const response = await api.post(AUTH.LOGIN, { email, password });
    if (response.accessToken) {
      setTokens(response.accessToken, response.refreshToken);
    }
    return response;
  },

  loginAdmin: async (email, password) => {
    const response = await api.post(AUTH.ADMIN_LOGIN, { email, password });
    const accessToken = response?.data?.accessToken;
    const refreshToken = response?.data?.refreshToken;
    if (accessToken) {
      setTokens(accessToken, refreshToken);
    }
    return response;
  },

  loginSuperAdmin: async (email, password) => {
    const response = await api.post(AUTH.SUPERADMIN_LOGIN, { email, password });
    const accessToken = response?.data?.accessToken;
    const refreshToken = response?.data?.refreshToken;
    if (accessToken) {
      setTokens(accessToken, refreshToken);
    }
    return response;
  },
  /**
   * Login employee
   * @param {string} email
   * @param {string} password
   * @param {string} role
   * @returns {Promise}
   */
  loginEmployee: async (email, password, role) => {
    const response = await api.post(AUTH.EMPLOYEE_LOGIN, {
      email,
      password,
      role,
    });
    const accessToken = response?.data?.accessToken;
    const refreshToken = response?.data?.refreshToken;
    if (accessToken) {
      setTokens(accessToken, refreshToken);
    }
    return response;
  },

  register: async (userData) => {
    const response = await api.post(AUTH.REGISTER, userData);
    return response;
  },

  logout: async () => {
    try {
      await api.post(AUTH.LOGOUT);
    } finally {
      clearTokens();
    }
  },

  getCurrentUser: async () => {
    const response = await api.get(AUTH.ME);
    return response;
  },

  forgotPassword: async (email) => {
    const response = await api.post(AUTH.FORGOT_PASSWORD, { email });
    return response;
  },

  resetPassword: async (token, password) => {
    const response = await api.post(AUTH.RESET_PASSWORD, { token, password });
    return response;
  },

  verifyEmail: async (token) => {
    const response = await api.post(AUTH.VERIFY_EMAIL, { token });
    return response;
  },
};

export default authService;

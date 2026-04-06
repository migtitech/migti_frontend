import axios from 'axios'
import { BASE_URL, API_VERSION, AUTH } from './endpoints'

// Create axios instance
const axiosClient = axios.create({
  baseURL: `${BASE_URL}${API_VERSION}`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Token management
const TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'

export const getAccessToken = () => localStorage.getItem(TOKEN_KEY)
export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY)
export const setTokens = (accessToken, refreshToken) => {
  localStorage.setItem(TOKEN_KEY, accessToken)
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  }
}
export const clearTokens = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

const USER_STORAGE_KEY = 'migticrm_user'

/** Clear auth data and redirect to login (e.g. on 401 / token expired) */
const redirectToLogin = () => {
  clearTokens()
  localStorage.removeItem(USER_STORAGE_KEY)
  const base = `${window.location.origin}${window.location.pathname || '/'}`
  window.location.replace(`${base}#/login`)
}

// Request interceptor
axiosClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Response interceptor
axiosClient.interceptors.response.use(
  (response) => {
    if (response.config.responseType === 'blob') return response
    return response.data
  },
  async (error) => {
    const originalRequest = error.config
    const status = error.response?.status
    const errorMessage =
      error.response?.data?.message || error.message || ''

    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const refreshToken = getRefreshToken()
      if (refreshToken) {
        try {
          const response = await axios.post(`${BASE_URL}${API_VERSION}${AUTH.REFRESH_TOKEN}`, {
            refreshToken,
          })

          const { accessToken, refreshToken: newRefreshToken } = response.data
          setTokens(accessToken, newRefreshToken)

          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          return axiosClient(originalRequest)
        } catch (refreshError) {
          redirectToLogin()
          return Promise.reject(refreshError)
        }
      }

      // No refresh token or token expired: clear auth and redirect to login
      redirectToLogin()
      return Promise.reject(error)
    }

    // Some backends return 403 for invalid/mismatched token
    if (status === 403) {
      const msg = String(errorMessage).toLowerCase()
      if (
        msg.includes('unauthorized') ||
        msg.includes('forbidden') ||
        msg.includes('token') ||
        msg.includes('jwt')
      ) {
        redirectToLogin()
      }
    }

    // Format error response
    const errorResponse = {
      status: error.response?.status,
      message: error.response?.data?.message || error.message || 'An error occurred',
      errors: error.response?.data?.errors || null,
      data: error.response?.data || null,
    }

    return Promise.reject(errorResponse)
  },
)

// HTTP methods
export const api = {
  get: (url, config = {}) => axiosClient.get(url, config),
  post: (url, data, config = {}) => axiosClient.post(url, data, config),
  put: (url, data, config = {}) => axiosClient.put(url, data, config),
  patch: (url, data, config = {}) => axiosClient.patch(url, data, config),
  delete: (url, config = {}) => axiosClient.delete(url, config),
}

export default axiosClient

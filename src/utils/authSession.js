const USER_STORAGE_KEY = "migticrm_user";

export const decodeTokenPayload = (token) => {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "=",
    );
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
};

export const isTokenExpired = (token, skewSeconds = 30) => {
  const payload = decodeTokenPayload(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 <= Date.now() + skewSeconds * 1000;
};

export const hasValidAccessSession = (getAccessToken, getRefreshToken) => {
  const token = getAccessToken();
  const refreshToken = getRefreshToken();
  if (!token && !refreshToken) return false;
  if (!token) return !!refreshToken;
  if (!isTokenExpired(token)) return true;
  return !!refreshToken;
};

export const clearAuthStorage = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem(USER_STORAGE_KEY);
};

export { USER_STORAGE_KEY };

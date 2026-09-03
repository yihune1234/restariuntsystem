import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.MODE === "development"
    ? "http://localhost:5000/api/v1"
    : "https://tastystation-bg.vercel.app/api/v1");

const STORAGE_KEYS = {
  accessToken: "ts_access_token",
  refreshToken: "ts_refresh_token",
  customerSessionToken: "ts_customer_session_token",
  user: "ts_user",
};

export { STORAGE_KEYS };

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
  },
});

// Offline queue for failed mutating requests
const offlineQueue = [];
let isProcessingQueue = false;

async function processOfflineQueue() {
  if (isProcessingQueue || offlineQueue.length === 0) return;
  if (!navigator.onLine) return;
  isProcessingQueue = true;
  while (offlineQueue.length > 0) {
    const pending = offlineQueue.shift();
    try {
      await axiosInstance(pending.config);
      pending.resolve?.();
    } catch {
      pending.reject?.();
    }
  }
  isProcessingQueue = false;
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', processOfflineQueue);
}

axiosInstance.interceptors.request.use((config) => {
  const url = config.url || "";

  // Pure anonymous routes: no staff bearer token should ever be attached,
  // only the customer session token (used by customers without an account).
  const isAnonCustomerRoute =
    url.includes("/public/") ||
    url.includes("/customer-sessions/") ||
    url.includes("/payments/chapa/webhook");

  // Dual-use routes that can be hit by BOTH staff (cashier/manager confirming
  // a payment, viewing branch feedback) and customers (QR self-order flow,
  // submitting feedback). We attach whichever credentials exist; the backend
  // `authenticateAny` middleware prefers a staff bearer token and falls back
  // to the customer session token, so sending both is safe and correct.
  const isDualAuthRoute =
    url.includes("/orders/") ||
    url.endsWith("/orders") ||
    url.includes("/payments/chapa/initiate") ||
    url.includes("/payments/verify") ||
    url.includes("/feedback");

  // Always send the customer session token when present (harmless for staff,
  // required for customers). These are CustomerSession-authenticated or
  // authenticateAny routes only.
  if (isAnonCustomerRoute || isDualAuthRoute) {
    const sessionToken = localStorage.getItem(STORAGE_KEYS.customerSessionToken);
    if (sessionToken) {
      config.headers["x-session-token"] = sessionToken;
    }
  }

  // For dual-use routes hit by staff, also attach the staff bearer token.
  const accessToken = localStorage.getItem(STORAGE_KEYS.accessToken);
  if (accessToken && (isDualAuthRoute || !isAnonCustomerRoute)) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => refreshSubscribers.push(cb);
const onRefreshed = (newToken) => {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
};

const clearAuthAndRedirect = () => {
  localStorage.removeItem(STORAGE_KEYS.accessToken);
  localStorage.removeItem(STORAGE_KEYS.refreshToken);
  localStorage.removeItem(STORAGE_KEYS.user);
  onRefreshed(null);
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const status = error.response?.status;
    const data = error.response?.data;

    if (status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);

      if (refreshToken && !originalRequest.url?.includes("/auth/")) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            subscribeTokenRefresh((newToken) => {
              if (newToken) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                resolve(axiosInstance(originalRequest));
              } else {
                reject(error);
              }
            });
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });

          if (res?.data?.data?.accessToken) {
            const newAccess = res.data.data.accessToken;
            const newRefresh = res.data.data.refreshToken;
            localStorage.setItem(STORAGE_KEYS.accessToken, newAccess);
            if (newRefresh) localStorage.setItem(STORAGE_KEYS.refreshToken, newRefresh);
            onRefreshed(newAccess);
            originalRequest.headers.Authorization = `Bearer ${newAccess}`;
            isRefreshing = false;
            return axiosInstance(originalRequest);
          }
        } catch {
          isRefreshing = false;
          clearAuthAndRedirect();
          return Promise.reject(error);
        }
      }

      if (!refreshToken || originalRequest.url?.includes("/auth/")) {
        clearAuthAndRedirect();
      }
    }

    if (data && typeof data === "object") {
      error.backendMessage = data.message;
      error.backendCode = data.code;
      error.backendErrors = data.errors;
    }

    return Promise.reject(error);
  }
);

// Offline interceptor: queue mutating requests when offline
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const config = error.config;
    const isMutating = ["post", "put", "patch", "delete"].includes(
      (config?.method || "").toLowerCase()
    );
    const isOfflineError =
      !navigator.onLine ||
      error.code === "ERR_NETWORK" ||
      error.message === "Network Error";

    if (isMutating && isOfflineError && config && !config._offlineQueued) {
      config._offlineQueued = true;
      return new Promise((resolve, reject) => {
        offlineQueue.push({ config, resolve, reject });
      });
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;

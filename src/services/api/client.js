/**
 * Base HTTP Client for API Communications
 * Connected to CRYVEX SHOPFLOW API
 * https://shopflowbackend-production.up.railway.app/docs
 */

import { APP_CONFIG } from "../../config/appConfig";
import { AppError, ERROR_TYPES, handleError } from "../error/errorHandler";
import { securityManager } from "../../utils/security";

class ApiClient {
  constructor(baseUrl = APP_CONFIG.api.baseUrl) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.timeoutMs = APP_CONFIG.api.timeoutMs;
  }

  getToken() {
    return securityManager.getToken();
  }

  setToken(token, authResponse) {
    return securityManager.setToken(token, authResponse);
  }

  clearToken() {
    securityManager.clearAuth({ reason: "logout" });
  }

  buildUrl(endpoint) {
    if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
      return endpoint;
    }
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    return `${this.baseUrl}${cleanEndpoint}`;
  }

  async request(endpoint, options = {}) {
    const url = this.buildUrl(endpoint);

    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
    };

    // Auto-attach Bearer token for protected endpoints
    const isPublicEndpoint =
      endpoint.includes("/auth/login") ||
      endpoint.includes("/auth/register") ||
      endpoint.startsWith("/health");

    const token = this.getToken();
    if (!isPublicEndpoint && token && !securityManager.isAuthenticated()) {
      securityManager.expireSession();
      throw new AppError("Authentication session expired", ERROR_TYPES.API_ERROR, {
        status: 401,
        url,
      });
    }

    if (!headers.Authorization && !isPublicEndpoint) {
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        // Parse FastAPI validation errors or error detail
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        if (errorData) {
          if (typeof errorData.detail === "string") {
            errorMessage = errorData.detail;
          } else if (Array.isArray(errorData.detail)) {
            // FastAPI pydantic validation errors
            errorMessage = errorData.detail
              .map((err) => `${err.loc?.slice(-1)[0] || "field"}: ${err.msg}`)
              .join(" | ");
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        }

        // A protected endpoint rejecting the active token ends the shared session.
        if (response.status === 401 && !isPublicEndpoint && token) {
          securityManager.expireSession();
        }

        throw new AppError(errorMessage, ERROR_TYPES.API_ERROR, {
          status: response.status,
          data: errorData,
        });
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return null;
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new AppError("Request timeout to API", ERROR_TYPES.API_ERROR, { url });
      }
      handleError(error, `ApiClient.request [${url}]`);
      throw error;
    }
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: "GET" });
  }

  post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  patch(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: "DELETE" });
  }
}

export const apiClient = new ApiClient();
export default apiClient;

/**
 * Health Check API Service
 * Centralized service for validating backend system availability
 * Connects to Cryvex /health endpoint
 */

import { apiClient } from "./client";
import { ENDPOINTS } from "./endpoints";

export const healthApi = {
  /**
   * Check backend API health status
   * @returns {Promise<{ isHealthy: boolean, data?: any, error?: string }>}
   */
  async checkHealth() {
    try {
      const response = await apiClient.get(ENDPOINTS.HEALTH);
      // Expected backend response: { status: "ok", service: "shopflow-api" }
      const isHealthy =
        Boolean(response) &&
        (response.status === "ok" ||
          response.status === "healthy" ||
          response.status === 200 ||
          !response.error);

      return {
        isHealthy,
        data: response,
      };
    } catch (err) {
      return {
        isHealthy: false,
        error:
          err?.message ||
          "Unable to connect to Cryvex server. Please check your network connection.",
      };
    }
  },
};

export default healthApi;

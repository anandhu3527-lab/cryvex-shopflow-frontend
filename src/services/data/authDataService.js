/**
 * Auth & Profile Data Service
 * Central data management for user sessions and merchant profile
 */

import { authApi } from "../api/authApi";

export const authDataService = {
  /**
   * Login with identifier (phone/email) and password
   * POST /api/v1/auth/login
   */
  async login(identifier, password) {
    return authApi.login({ identifier, password });
  },

  /**
   * Get current authenticated user profile
   * GET /api/v1/auth/me
   */
  async getProfile() {
    return authApi.getProfile();
  },

  /**
   * Get current shop/tenant details
   * GET /api/v1/tenants/me
   */
  async getTenant() {
    return authApi.getTenant();
  },
};

export default authDataService;

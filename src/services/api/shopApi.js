/**
 * Shop / Tenant Management API Service
 * Centralized service for shop profile and settings management.
 * Connected to CRYVEX SHOPFLOW API:
 * - GET  /api/v1/tenants/me   — Get shop details (OWNER only)
 * - PATCH /api/v1/tenants/me  — Update shop details (OWNER only)
 */

import { apiClient } from "./client";
import { ENDPOINTS } from "./endpoints";

export const shopApi = {
  /**
   * Get Current Shop / Tenant Details
   * GET /api/v1/tenants/me
   * OWNER only
   */
  getShop() {
    return apiClient.get(ENDPOINTS.TENANTS.ME);
  },

  /**
   * Update Shop / Tenant Details
   * PATCH /api/v1/tenants/me
   * OWNER only
   * @param {{ name?: string, phone?: string, email?: string, address?: string, gstin?: string }} data
   */
  updateShop(data) {
    return apiClient.patch(ENDPOINTS.TENANTS.ME, data);
  },
};

export default shopApi;

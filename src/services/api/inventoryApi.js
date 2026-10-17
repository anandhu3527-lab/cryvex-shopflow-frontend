/**
 * Inventory API Service
 * Centralized service for inventory overview, low-stock alerts, and stock updates.
 * Connected to CRYVEX SHOPFLOW API:
 * - Stock Overview: GET /api/v1/products/stock
 * - Low Stock Alerts: GET /api/v1/products/low-stock
 * - Update Variant Inventory: PATCH /api/v1/products/variants/{variant_id}/inventory
 */

import { apiClient } from "./client";
import { ENDPOINTS } from "./endpoints";

export const inventoryApi = {
  /**
   * Get Stock Overview
   * GET /api/v1/products/stock
   */
  getStockOverview() {
    return apiClient.get(ENDPOINTS.PRODUCTS.STOCK);
  },

  /**
   * Get Low Stock Alerts
   * GET /api/v1/products/low-stock
   */
  getLowStockAlerts() {
    return apiClient.get(ENDPOINTS.PRODUCTS.LOW_STOCK);
  },

  /**
   * Update Variant Inventory (Stock Quantity and Prices)
   * PATCH /api/v1/products/variants/{variant_id}/inventory
   */
  updateVariantInventory(variantId, payload) {
    return apiClient.patch(ENDPOINTS.PRODUCTS.UPDATE_INVENTORY(variantId), payload);
  },
};

export default inventoryApi;

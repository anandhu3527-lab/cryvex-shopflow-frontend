/**
 * Products API Service
 * Fully mapped with CRYVEX SHOPFLOW API:
 * https://shopflowbackend-production.up.railway.app/docs#/Products
 */

import { apiClient } from "./client";
import { ENDPOINTS } from "./endpoints";

export const productApi = {
  /**
   * Get All Products
   * GET /api/v1/products
   */
  getProducts(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `${ENDPOINTS.PRODUCTS.LIST}?${query}` : ENDPOINTS.PRODUCTS.LIST;
    return apiClient.get(endpoint);
  },

  /**
   * Create Product With Variants
   * POST /api/v1/products
   * Payload: { product: { name, description, category_id }, variants: [...] }
   */
  createProduct(productPayload) {
    return apiClient.post(ENDPOINTS.PRODUCTS.CREATE, productPayload);
  },

  /**
   * Get Product By ID
   * GET /api/v1/products/{product_id}
   */
  getProductById(id) {
    return apiClient.get(ENDPOINTS.PRODUCTS.DETAIL(id));
  },

  /**
   * Search Products by name query
   * GET /api/v1/products/search?q=...
   */
  searchProducts(query) {
    return apiClient.get(ENDPOINTS.PRODUCTS.SEARCH(query));
  },

  /**
   * Get Product by Barcode
   * GET /api/v1/products/barcode/{barcode}
   */
  getProductByBarcode(barcode) {
    return apiClient.get(ENDPOINTS.PRODUCTS.BARCODE(barcode));
  },

  /**
   * Get Low Stock Alerts
   * GET /api/v1/products/low-stock
   */
  getLowStockAlerts() {
    return apiClient.get(ENDPOINTS.PRODUCTS.LOW_STOCK);
  },

  /**
   * Get Stock Overview
   * GET /api/v1/products/stock
   */
  getStockOverview() {
    return apiClient.get(ENDPOINTS.PRODUCTS.STOCK);
  },

  /**
   * Get Variant By ID
   * GET /api/v1/products/variant/{variant_id}
   */
  getVariantById(variantId) {
    return apiClient.get(ENDPOINTS.PRODUCTS.VARIANT(variantId));
  },

  /**
   * Update Variant details & pricing
   * PATCH /api/v1/products/variant/{variant_id}
   */
  updateVariant(variantId, data) {
    return apiClient.patch(ENDPOINTS.PRODUCTS.VARIANT(variantId), data);
  },

  /**
   * Update Variant Inventory / Stock Quantity
   * PATCH /api/v1/products/variants/{variant_id}/inventory
   */
  updateVariantInventory(variantId, data) {
    return apiClient.patch(ENDPOINTS.PRODUCTS.UPDATE_INVENTORY(variantId), data);
  },

  /**
   * Get All Categories
   * GET /api/v1/categories
   */
  getCategories() {
    return apiClient.get(ENDPOINTS.PRODUCTS.CATEGORIES);
  },

  /**
   * Create New Category
   * POST /api/v1/categories
   * Payload: { name: string, description?: string }
   */
  createCategory(categoryData) {
    return apiClient.post(ENDPOINTS.PRODUCTS.CATEGORIES, categoryData);
  },
};

export default productApi;

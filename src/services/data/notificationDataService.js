/**
 * Notification Data Service
 * Manages user-scoped notification data, persistence, and state transitions
 * Complies with CRYVEX SHOPFLOW specifications:
 * - Scoped strictly to authenticated user/shop
 * - Persists read and cleared states across page refreshes and re-logins
 * - Isolated per-user state on the same device
 * - Does not delete product data or business records when clearing
 */

import { notificationApi } from "../api/notificationApi.js";
import { productApi } from "../api/productApi.js";

const STORAGE_PREFIX = "cryvex_user_notifications_";

/**
 * Get storage key for the authenticated user
 */
function getUserStorageKey(userKey) {
  if (!userKey) return null;
  return `${STORAGE_PREFIX}${userKey}`;
}

/**
 * Load user's saved notification states from storage
 * @param {string} userKey
 * @returns {{ readIds: string[], clearedIds: string[] }}
 */
function loadUserState(userKey) {
  const key = getUserStorageKey(userKey);
  if (!key) return { readIds: [], clearedIds: [] };

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { readIds: [], clearedIds: [] };
    const parsed = JSON.parse(raw);
    return {
      readIds: Array.isArray(parsed?.readIds) ? parsed.readIds.map(String) : [],
      clearedIds: Array.isArray(parsed?.clearedIds) ? parsed.clearedIds.map(String) : [],
    };
  } catch {
    return { readIds: [], clearedIds: [] };
  }
}

/**
 * Save user's notification states to storage
 * @param {string} userKey
 * @param {{ readIds: string[], clearedIds: string[] }} state
 */
function saveUserState(userKey, state) {
  const key = getUserStorageKey(userKey);
  if (!key) return;

  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        readIds: Array.from(new Set(state.readIds || [])),
        clearedIds: Array.from(new Set(state.clearedIds || [])),
        updatedAt: new Date().toISOString(),
      })
    );
  } catch {
    // Gracefully handle quota or storage disabled
  }
}

/**
 * Safely unwrap raw low stock alerts from productApi
 */
function unwrapAlerts(response) {
  let value = response;
  for (let i = 0; i < 4; i += 1) {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== "object") return [];
    if (Array.isArray(value.data)) return value.data;
    if (Array.isArray(value.items)) return value.items;
    if (Array.isArray(value.results)) return value.results;
    if (value.data && typeof value.data === "object") {
      value = value.data;
      continue;
    }
    return [];
  }
  return [];
}

/**
 * Transform low stock alert into standard notification model
 */
function transformLowStockToNotification(item, userKey, userState, shopId) {
  const productId = item?.product_id ?? item?.productId ?? item?.product?.id ?? item?.id ?? "";
  const variantId = item?.variant_id ?? item?.variantId ?? item?.variant?.id ?? "";
  const id = `notif-stock-${productId || variantId}`;
  const productName = item?.product_name || item?.productName || item?.product?.name || item?.name || "Product";
  const stockQuantity = Number(item?.stock_quantity ?? item?.current_stock ?? item?.stock ?? item?.quantity ?? 0);
  const threshold = Number(item?.low_stock_threshold ?? item?.threshold ?? item?.minimum_stock ?? 5);
  const unit = item?.unit || item?.unit_name || "units";
  const barcode = item?.barcode || item?.variant?.barcode || "";

  const isRead = userState.readIds.includes(id) || userState.readIds.includes(String(productId));
  const isCleared = userState.clearedIds.includes(id) || userState.clearedIds.includes(String(productId));

  return {
    id,
    user_id: userKey,
    shop_id: shopId || null,
    title: `Low Stock: ${productName}`,
    message: `Current stock is only ${stockQuantity} ${unit} (safety minimum: ${threshold} ${unit}). Reorder recommended.`,
    type: "LOW_STOCK",
    product_id: productId ? String(productId) : null,
    variant_id: variantId ? String(variantId) : null,
    product_name: productName,
    stock_quantity: stockQuantity,
    threshold,
    unit,
    barcode,
    is_read: isRead,
    is_cleared: isCleared,
    created_at: item?.created_at || new Date().toISOString(),
    raw: item,
  };
}

export const notificationDataService = {
  getUserState(userKey) {
    return loadUserState(userKey);
  },

  /**
   * Fetch active notifications for the current authenticated user
   * Reuses the available Swagger endpoints (low-stock alerts) and dedicated notification endpoints
   * Filters out cleared notifications and applies read state
   */
  async getNotifications(currentUser, currentTenant) {
    if (!currentUser) return [];

    const userKey = String(currentUser.id ?? currentUser.user_id ?? currentUser.userId ?? currentUser.email ?? "");
    const shopId = String(currentTenant?.id ?? currentUser.tenant_id ?? "");
    const userState = loadUserState(userKey);

    // Try calling dedicated /api/v1/notifications endpoint first
    try {
      const response = await notificationApi.getNotifications();
      const rawList = unwrapAlerts(response);

      if (Array.isArray(rawList)) {
        // Backend returned notifications array
        return rawList
          .map((n) => {
            const id = String(n.id || `notif-${n.product_id || Math.random()}`);
            const isRead = n.is_read || userState.readIds.includes(id) || (n.product_id && userState.readIds.includes(String(n.product_id)));
            const isCleared = n.is_cleared || userState.clearedIds.includes(id) || (n.product_id && userState.clearedIds.includes(String(n.product_id)));

            return {
              id,
              user_id: n.user_id || userKey,
              shop_id: n.shop_id || shopId,
              title: n.title || "Notification",
              message: n.message || "",
              type: n.type || "SYSTEM",
              product_id: n.product_id ? String(n.product_id) : null,
              variant_id: n.variant_id ? String(n.variant_id) : null,
              product_name: n.product_name || n.productName || null,
              stock_quantity: n.stock_quantity ?? null,
              threshold: n.threshold ?? n.low_stock_threshold ?? null,
              unit: n.unit || "units",
              barcode: n.barcode || null,
              is_read: Boolean(isRead),
              is_cleared: Boolean(isCleared),
              created_at: n.created_at || new Date().toISOString(),
              raw: n,
            };
          })
          .filter((n) => !n.is_cleared);
      }
    } catch (err) {
      const status = err?.status ?? err?.details?.status;
      if (status && status !== 404) {
        throw err;
      }
      // If 404, fallback to available Swagger low-stock endpoint as per requirement 6
    }

    // Reuse available Swagger endpoint: GET /api/v1/products/low-stock
    const lowStockResponse = await productApi.getLowStockAlerts();
    const alertItems = unwrapAlerts(lowStockResponse);

    // Deduplicate by product ID
    const uniqueMap = new Map();
    for (const item of alertItems) {
      const notif = transformLowStockToNotification(item, userKey, userState, shopId);
      if (notif.is_cleared) continue; // Cleared notifications remain hidden
      if (!uniqueMap.has(notif.id)) {
        uniqueMap.set(notif.id, notif);
      }
    }

    return Array.from(uniqueMap.values());
  },

  /**
   * Mark a notification as read for the user
   */
  async markAsRead(notificationId, userKey, productId = null) {
    if (!userKey || !notificationId) return;

    const idStr = String(notificationId);
    const prodStr = productId ? String(productId) : null;

    // 1. Persist to backend if endpoint available
    try {
      await notificationApi.markAsRead(idStr);
    } catch (err) {
      const status = err?.status ?? err?.details?.status;
      if (status && status !== 404) {
        throw err;
      }
    }

    // 2. Persist to user-scoped persistent storage
    const state = loadUserState(userKey);
    const newRead = new Set(state.readIds);
    newRead.add(idStr);
    if (prodStr) newRead.add(prodStr);

    saveUserState(userKey, {
      ...state,
      readIds: Array.from(newRead),
    });
  },

  /**
   * Mark all visible notifications as read for the user
   */
  async markAllAsRead(notifications, userKey) {
    if (!userKey) return;

    try {
      await notificationApi.markAllAsRead();
    } catch (err) {
      const status = err?.status ?? err?.details?.status;
      if (status && status !== 404) {
        throw err;
      }
    }

    const state = loadUserState(userKey);
    const newRead = new Set(state.readIds);

    for (const n of notifications || []) {
      if (n.id) newRead.add(String(n.id));
      if (n.product_id) newRead.add(String(n.product_id));
      if (n.productId) newRead.add(String(n.productId));
    }

    saveUserState(userKey, {
      ...state,
      readIds: Array.from(newRead),
    });
  },

  /**
   * Clear a notification from user's visible list
   * (Does not delete product data or other records)
   */
  async clearNotification(notificationId, userKey, productId = null) {
    if (!userKey || !notificationId) return;

    const idStr = String(notificationId);
    const prodStr = productId ? String(productId) : null;

    // 1. Call backend delete if available
    try {
      await notificationApi.clearNotification(idStr);
    } catch (err) {
      const status = err?.status ?? err?.details?.status;
      if (status && status !== 404) {
        throw err;
      }
    }

    // 2. Persist to user-scoped persistent storage
    const state = loadUserState(userKey);
    const newCleared = new Set(state.clearedIds);
    newCleared.add(idStr);
    if (prodStr) newCleared.add(prodStr);

    saveUserState(userKey, {
      ...state,
      clearedIds: Array.from(newCleared),
    });
  },
};

export default notificationDataService;

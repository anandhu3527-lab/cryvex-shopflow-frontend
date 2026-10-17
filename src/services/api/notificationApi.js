/**
 * Notification API Service
 * Centralized API communication for Cryvex ShopFlow Notifications
 */

import { apiClient } from "./client.js";
import { ENDPOINTS } from "./endpoints.js";

export const notificationApi = {
  /**
   * Fetch current user's notifications
   * GET /api/v1/notifications
   */
  async getNotifications(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `${ENDPOINTS.NOTIFICATIONS.LIST}?${query}` : ENDPOINTS.NOTIFICATIONS.LIST;
    return apiClient.get(endpoint);
  },

  /**
   * Mark a single notification as read
   * PATCH /api/v1/notifications/:id/read
   */
  async markAsRead(id) {
    if (!id) throw new Error("Notification ID is required to mark as read.");
    return apiClient.patch(ENDPOINTS.NOTIFICATIONS.MARK_READ(id), { is_read: true });
  },

  /**
   * Mark all active notifications as read for current user
   * POST /api/v1/notifications/read-all
   */
  async markAllAsRead() {
    return apiClient.post(ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ, {});
  },

  /**
   * Clear a notification (dismiss from current user's view)
   * DELETE /api/v1/notifications/:id
   */
  async clearNotification(id) {
    if (!id) throw new Error("Notification ID is required to clear.");
    return apiClient.delete(ENDPOINTS.NOTIFICATIONS.CLEAR(id));
  },
};

export default notificationApi;

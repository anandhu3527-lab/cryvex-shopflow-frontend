import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "./AuthContext";
import { notificationDataService } from "../services/data/notificationDataService";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const auth = useAuth() || {};
  const { currentUser, currentTenant } = auth;
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const userKey = currentUser
    ? String(currentUser.id ?? currentUser.user_id ?? currentUser.userId ?? currentUser.email ?? currentUser.phone ?? "")
    : "";
  const previousUserKey = useRef(userKey);

  // Clear or reset on user switch
  useEffect(() => {
    if (previousUserKey.current !== userKey) {
      previousUserKey.current = userKey;
      setNotifications([]);
      setError("");
      setActionError("");
    }
    if (!currentUser) {
      setNotifications([]);
      setError("");
      setActionError("");
      setLoading(false);
    }
  }, [currentUser, userKey]);

  // Fetch notifications for the current authenticated user
  const fetchNotifications = useCallback(async () => {
    if (!currentUser || !userKey) {
      setNotifications([]);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const list = await notificationDataService.getNotifications(currentUser, currentTenant);
      // Map to ensure both is_read/read and product_id/productId exist for full compatibility
      const normalized = list.map((item) => ({
        ...item,
        productId: item.product_id || item.productId,
        productName: item.product_name || item.productName || item.title,
        currentStock: item.stock_quantity ?? item.currentStock ?? 0,
        threshold: item.threshold ?? 5,
        read: Boolean(item.is_read || item.read),
        is_read: Boolean(item.is_read || item.read),
        is_cleared: Boolean(item.is_cleared),
      }));

      setNotifications(normalized);
    } catch (err) {
      setError(err?.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [currentUser, currentTenant, userKey]);

  // Initial fetch and periodic refresh
  useEffect(() => {
    if (!currentUser) return undefined;
    fetchNotifications();
    const interval = window.setInterval(fetchNotifications, 25000);
    return () => window.clearInterval(interval);
  }, [currentUser, fetchNotifications]);

  // Calculate unread count immediately based on current state
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.is_read && !n.read && !n.is_cleared).length;
  }, [notifications]);

  const hasUnreadAlerts = unreadCount > 0;

  // Mark single notification as read
  const markAsRead = useCallback(async (idOrProductKey) => {
    if (!idOrProductKey || !userKey) return;
    const targetKey = String(idOrProductKey);

    // Save previous state for rollback in case of error
    let targetItem = null;
    setNotifications((previous) => {
      return previous.map((item) => {
        if (
          String(item.id) === targetKey ||
          String(item.product_id) === targetKey ||
          String(item.productId) === targetKey
        ) {
          targetItem = item;
          return { ...item, is_read: true, read: true };
        }
        return item;
      });
    });

    try {
      setActionError("");
      const prodId = targetItem?.product_id || targetItem?.productId || null;
      await notificationDataService.markAsRead(targetItem?.id || targetKey, userKey, prodId);
    } catch (err) {
      setActionError(err?.message || "Failed to mark notification as read.");
      // Rollback
      setNotifications((previous) =>
        previous.map((item) =>
          String(item.id) === targetKey || String(item.product_id) === targetKey
            ? { ...item, is_read: false, read: false }
            : item
        )
      );
    }
  }, [userKey]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!userKey || notifications.length === 0) return;

    const previousNotifications = [...notifications];
    // Immediate UI update
    setNotifications((previous) =>
      previous.map((item) => ({ ...item, is_read: true, read: true }))
    );

    try {
      setActionError("");
      await notificationDataService.markAllAsRead(notifications, userKey);
    } catch (err) {
      setActionError(err?.message || "Failed to mark all notifications as read.");
      setNotifications(previousNotifications);
    }
  }, [userKey, notifications]);

  // Clear single notification (removes from visible list, preserves product data)
  const clearNotification = useCallback(async (idOrProductKey) => {
    if (!idOrProductKey || !userKey) return;
    const targetKey = String(idOrProductKey);

    const previousNotifications = [...notifications];
    const targetItem = notifications.find(
      (item) =>
        String(item.id) === targetKey ||
        String(item.product_id) === targetKey ||
        String(item.productId) === targetKey
    );

    // Immediate UI update: remove from visible list
    setNotifications((previous) =>
      previous.filter(
        (item) =>
          String(item.id) !== targetKey &&
          String(item.product_id) !== targetKey &&
          String(item.productId) !== targetKey
      )
    );

    try {
      setActionError("");
      const prodId = targetItem?.product_id || targetItem?.productId || null;
      await notificationDataService.clearNotification(targetItem?.id || targetKey, userKey, prodId);
    } catch (err) {
      setActionError(err?.message || "Failed to clear notification.");
      setNotifications(previousNotifications);
    }
  }, [userKey, notifications]);

  // Product notification navigation
  const handleNotificationClick = useCallback((notification, navigate) => {
    if (!notification) return;

    const targetKey = notification.id ?? notification.product_id ?? notification.productId;
    markAsRead(targetKey);

    const targetProductId = notification.product_id || notification.productId;
    if (navigate && targetProductId) {
      navigate(`/products/${targetProductId}`);
    }
  }, [markAsRead]);

  const value = {
    notifications,
    unreadCount,
    hasUnreadAlerts,
    loading,
    error,
    actionError,
    refreshNotifications: fetchNotifications,
    markAsRead,
    markAllAsRead,
    clearNotification,
    handleNotificationClick,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications must be used within a NotificationProvider");
  return context;
}

export default NotificationContext;

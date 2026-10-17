import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { authApi } from "../../services/api/authApi";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import { formatDateTime } from "../../utils/formatting/date";
import cryvexLogo from "../../assets/cryvex-logo.png";

const ROUTE_TITLES = {
  "/dashboard": "Dashboard Overview",
  "/daily-price-update": "Daily Price Update",
  "/price-update": "Daily Price Update",
  "/products": "Product Inventory",
  "/products/add": "Add New Product",
  "/quick-bill": "Billing",
  "/customers": "Customer Directory",
  "/kadan": "Kadan Credit Ledger",
  "/bill-history": "Bill History & Invoices",
  "/reports": "Sales & Revenue Reports",
};

const getTenantShop = (response) => {
  const shop = response?.data?.shop;
  if (!shop) throw new Error("Tenant profile details were not returned.");
  return shop;
};

const getProfileForm = (shop) => ({
  name: shop.name || "",
  business_name: shop.business_name || "",
  email: shop.email || "",
  address: shop.address || "",
});

export default function Header({
  title,
  onToggleSidebar,
  userProfile,
  showNotification = true,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, currentTenant, refreshTenant } = useAuth();
  const {
    notifications,
    unreadCount,
    hasUnreadAlerts,
    loading: notificationsLoading,
    error: notificationsError,
    actionError: notificationsActionError,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    clearNotification,
    handleNotificationClick,
  } = useNotifications();

  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [employeeProfileStatus, setEmployeeProfileStatus] = useState("idle");
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [profileDraft, setProfileDraft] = useState({ name: "", business_name: "", email: "", address: "" });
  const [profileLoadStatus, setProfileLoadStatus] = useState("idle");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccessMessage, setProfileSuccessMessage] = useState("");

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const bellRef = useRef(null);
  const notificationPanelRef = useRef(null);

  const toggleNotifications = () => {
    const nextState = !isNotificationsOpen;
    setIsNotificationsOpen(nextState);
    if (nextState) {
      refreshNotifications();
    }
  };

  // Close dropdowns on outside click
  useEffect(() => {
    if (!isNotificationsOpen && !isProfileDialogOpen) return;
    const handler = (e) => {
      // Ignore clicks inside bell button or inside notification panel
      if (
        bellRef.current?.contains(e.target) ||
        notificationPanelRef.current?.contains(e.target) ||
        e.target.closest("[data-notification-panel]")
      ) {
        return;
      }
      setIsNotificationsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isNotificationsOpen, isProfileDialogOpen]);

  useEffect(() => {
    if (!profileSuccessMessage) return undefined;
    const timeoutId = window.setTimeout(() => setProfileSuccessMessage(""), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [profileSuccessMessage]);

  const displayTitle =
    title ||
    ROUTE_TITLES[location.pathname] ||
    (location.pathname.startsWith("/kadan/")
      ? "Customer Kadan Details"
      : location.pathname.startsWith("/products/")
      ? "Product Details"
      : "Dashboard Overview");


  const role = currentUser?.role || "OWNER";
  let displayName = "Staff User";
  let showEditProfile = false;

  if (currentUser) {
    displayName = currentUser.name || "Staff";
    showEditProfile = role === "OWNER";
  }

  const avatarInitial = displayName.trim().charAt(0).toUpperCase() || "O";

  const loadTenantProfile = async () => {
    setProfileError("");
    setProfileLoadStatus("loading");
    try {
      const shop = getTenantShop(await authApi.getTenant());
      setProfileDraft(getProfileForm(shop));
      setProfileLoadStatus("success");
    } catch (error) {
      setProfileLoadStatus("error");
      setProfileError(error?.message || "Could not load your profile. Please try again.");
    }
  };

  const loadEmployeeProfile = () => {
    setProfileError("");
    setEmployeeProfileStatus("loading");
    if (currentUser) {
      setEmployeeProfile(currentUser);
      setEmployeeProfileStatus("success");
    } else {
      setEmployeeProfileStatus("error");
      setProfileError("Could not load your profile. Please try again.");
    }
  };

  const openProfileDialog = () => {
    setIsProfileDialogOpen(true);
    loadEmployeeProfile();
    if (showEditProfile) {
      void loadTenantProfile();
    }
  };

  const handleProfileFormChange = (field, value) => {
    setProfileDraft((previous) => ({ ...previous, [field]: value }));
    if (profileError) setProfileError("");
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    const nextProfile = {
      name: profileDraft.name.trim(),
      business_name: profileDraft.business_name.trim(),
      email: profileDraft.email.trim(),
      address: profileDraft.address.trim(),
    };

    if (Object.values(nextProfile).some((value) => !value)) {
      setProfileError("Owner name, business name, email, and address are required.");
      return;
    }
    if (nextProfile.name.length > 150 || nextProfile.business_name.length > 200 || nextProfile.email.length > 255) {
      setProfileError("One or more fields exceed the allowed length.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextProfile.email)) {
      setProfileError("Enter a valid email address.");
      return;
    }

    setIsSavingProfile(true);
    setProfileError("");
    try {
      await authApi.updateTenant(nextProfile);
      const savedProfile = await refreshTenant();
      if (savedProfile) setProfileDraft(getProfileForm(savedProfile));
      setIsProfileDialogOpen(false);
      setProfileSuccessMessage("Profile updated successfully.");
    } catch (error) {
      setProfileError(error?.message || "Could not update your profile. Please try again.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const closeProfileDialog = () => {
    setIsProfileDialogOpen(false);
    setProfileError("");
  };

  const handleSignOut = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network error on logout
    }
    window.location.href = "/login";
  };

  return (
    <header className="min-h-16 px-4 sm:px-6 lg:px-8 py-3 bg-white/90 backdrop-blur-md border-b border-[#E2E8F0] flex flex-wrap items-center justify-between sticky top-0 z-30 gap-x-4 gap-y-2 shadow-[0_2px_12px_rgba(7,91,255,0.03)]">
      {/* Success Toast */}
      {profileSuccessMessage && (
        <div className="fixed right-5 top-5 z-[60] rounded-2xl border border-emerald-200 bg-white px-5 py-3.5 text-sm font-semibold text-emerald-700 shadow-2xl flex items-center gap-3 animate-slide-up" role="status">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span>{profileSuccessMessage}</span>
        </div>
      )}

      {/* Left: Mobile toggle + Page Name */}
      <div className="flex items-center gap-3 shrink-0">

        <div>
          <h1 className="text-base sm:text-lg font-extrabold text-[#102A56] tracking-tight">
            {displayTitle}
          </h1>
          <p className="text-[11px] text-[#64748B] font-medium hidden sm:block">
            {currentTenant?.name || "Cryvex ShopFlow Cloud Counter"}
          </p>
        </div>
      </div>


      {/* Right: Notifications & Profile Avatar */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Notification Bell */}
        {showNotification && (
          <div className="relative" data-notification-panel>
            <button
              type="button"
              onClick={toggleNotifications}
              className={`relative p-2.5 rounded-xl border transition-all cursor-pointer ${
                isNotificationsOpen
                  ? "text-[#075BFF] bg-[#EAF3FF] border-[#075BFF]/30 shadow-inner"
                  : "text-[#64748B] hover:text-[#102A56] bg-white hover:bg-[#F5F9FF] border-[#E2E8F0]"
              }`}
              aria-label="Notifications"
              ref={bellRef}
            >
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {/* Red Badge — Only shown when there are active/unread low-stock notifications */}
              {hasUnreadAlerts && (
                <span
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-500 rounded-full ring-2 ring-white flex items-center justify-center text-white font-bold animate-pulse"
                  style={{ fontSize: "9px" }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Panel rendered via portal — escapes header stacking context */}
            {isNotificationsOpen && createPortal(
              <>
                {/* Backdrop — visible on mobile, closes panel */}
                <div
                  className="fixed inset-0 bg-slate-900/40 z-[998] sm:hidden backdrop-blur-xs"
                  onClick={() => setIsNotificationsOpen(false)}
                  aria-hidden="true"
                />
                {/* Transparent desktop backdrop to catch outside clicks */}
                <div
                  className="fixed inset-0 z-[998] hidden sm:block"
                  onClick={() => setIsNotificationsOpen(false)}
                  aria-hidden="true"
                />
                <div
                  ref={notificationPanelRef}
                  data-notification-panel
                  className="
                    fixed bottom-0 left-0 right-0 z-[999]
                    sm:fixed sm:bottom-auto
                    w-full sm:w-[420px]
                    max-h-[85vh] sm:max-h-none
                    rounded-t-3xl sm:rounded-2xl
                    bg-white shadow-2xl border border-[#E2E8F0]
                    overflow-hidden notification-sheet flex flex-col
                  "
                  style={{
                    ...(typeof window !== 'undefined' && window.innerWidth >= 640 && bellRef.current ? {
                      top: bellRef.current.getBoundingClientRect().bottom + 8,
                      right: Math.max(16, window.innerWidth - bellRef.current.getBoundingClientRect().right),
                      left: 'auto',
                    } : {})
                  }}
                >
                  {/* Mobile drag handle */}
                  <div className="flex justify-center pt-3 pb-1 sm:hidden">
                    <div className="w-10 h-1 rounded-full bg-slate-200" />
                  </div>

                  {/* Panel Header */}
                  <div className="px-5 py-4 border-b border-[#F1F5F9] flex items-center justify-between bg-gradient-to-r from-slate-50 to-blue-50/40">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-[#075BFF]">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-[#102A56]">Notifications</h3>
                          {unreadCount > 0 ? (
                            <span className="text-[10px] font-bold bg-[#075BFF] text-white px-2 py-0.5 rounded-full">
                              {unreadCount} unread
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                              All read
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#64748B]">Stock alerts & store updates</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasUnreadAlerts && (
                        <button
                          type="button"
                          onClick={markAllAsRead}
                          onMouseDown={(e) => e.stopPropagation()}
                          className="text-[11px] font-bold text-[#075BFF] hover:text-[#023FC2] hover:underline cursor-pointer px-1 py-0.5"
                          title="Mark all notifications as read"
                        >
                          Mark all read
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => refreshNotifications()}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="w-7 h-7 rounded-lg bg-white hover:bg-slate-100 border border-[#E2E8F0] flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                        title="Refresh notifications"
                      >
                        <svg className={`w-3.5 h-3.5 ${notificationsLoading ? "animate-spin text-[#075BFF]" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsNotificationsOpen(false)}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="w-7 h-7 rounded-lg bg-white hover:bg-slate-100 border border-[#E2E8F0] flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                        title="Close panel"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Action error banner if mark or clear fails */}
                  {notificationsActionError && (
                    <div className="px-4 py-2 bg-rose-50 border-b border-rose-100 flex items-center justify-between text-xs text-rose-700">
                      <span>{notificationsActionError}</span>
                      <button
                        type="button"
                        onClick={() => refreshNotifications()}
                        className="font-bold underline cursor-pointer ml-2"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {/* Panel Body */}
                  <div className="max-h-[52vh] sm:max-h-96 overflow-y-auto overscroll-contain p-2.5 space-y-2">
                    {notificationsLoading && notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <div className="w-8 h-8 rounded-full border-2 border-[#075BFF]/20 border-t-[#075BFF] animate-spin" />
                        <p className="text-xs text-slate-500 font-medium">Loading notifications...</p>
                      </div>
                    ) : notificationsError && notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 px-4 gap-2 text-center">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-xs font-semibold text-rose-600">{notificationsError}</p>
                        <button
                          type="button"
                          onClick={() => refreshNotifications()}
                          className="text-xs text-[#075BFF] font-bold hover:underline cursor-pointer mt-1"
                        >
                          Try Again
                        </button>
                      </div>
                    ) : notifications && notifications.length > 0 ? (
                      notifications.map((n) => {
                        const isUnread = !n.read && !n.is_read;
                        const hasProduct = Boolean(n.product_id || n.productId);
                        return (
                          <div
                            key={n.id}
                            onClick={() => {
                              setIsNotificationsOpen(false);
                              handleNotificationClick(n, navigate);
                            }}
                            className={`group relative p-3.5 rounded-xl border transition-all cursor-pointer ${
                              isUnread
                                ? "bg-gradient-to-r from-blue-50/70 to-indigo-50/40 border-[#075BFF]/30 hover:border-[#075BFF]/60 hover:shadow-md shadow-xs"
                                : "bg-white hover:bg-slate-50/90 border-slate-200/90 hover:border-slate-300 opacity-90 hover:opacity-100"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {/* Left icon / unread indicator */}
                              <div className="relative shrink-0 mt-0.5">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                  isUnread
                                    ? "bg-[#075BFF] text-white shadow-sm"
                                    : "bg-slate-100 text-slate-500"
                                }`}>
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                  </svg>
                                </div>
                                {isUnread && (
                                  <span
                                    className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#075BFF] ring-2 ring-white animate-pulse"
                                    title="Unread"
                                  />
                                )}
                              </div>

                              {/* Body content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-1">
                                  <h4 className={`text-xs ${isUnread ? "font-extrabold text-[#102A56]" : "font-bold text-slate-700"} truncate`}>
                                    {n.title || `Low Stock: ${n.productName || "Product"}`}
                                  </h4>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0 uppercase tracking-wider ${
                                    isUnread
                                      ? "bg-[#075BFF]/10 text-[#075BFF]"
                                      : "bg-slate-100 text-slate-500"
                                  }`}>
                                    {isUnread ? "New" : "Read"}
                                  </span>
                                </div>

                                <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                                  {n.message}
                                </p>

                                {/* Relevant Product Details */}
                                {hasProduct && (
                                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/80">
                                      <span>Stock:</span>
                                      <strong className="text-rose-600 font-extrabold">{n.stock_quantity ?? n.currentStock}</strong>
                                      <span className="text-amber-700 font-normal">/ min {n.threshold} {n.unit}</span>
                                    </span>
                                    {n.barcode && (
                                      <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                                        #{n.barcode}
                                      </span>
                                    )}
                                    <span className="text-[10px] text-[#075BFF] font-semibold group-hover:underline ml-auto flex items-center gap-0.5">
                                      View Product
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    </span>
                                  </div>
                                )}

                                {/* Date / Time and Individual Actions */}
                                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                                  <span className="flex items-center gap-1 font-medium text-slate-400">
                                    <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {n.created_at ? formatDateTime(n.created_at) : "Just now"}
                                  </span>

                                  <div
                                    className="flex items-center gap-1.5"
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                  >
                                    {isUnread && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          markAsRead(n.id || n.productId);
                                        }}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        className="text-[10px] font-bold text-[#075BFF] hover:text-[#023FC2] bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded transition-colors cursor-pointer"
                                        title="Mark this notification as read"
                                      >
                                        Mark as Read
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        clearNotification(n.id || n.productId);
                                      }}
                                      onMouseDown={(e) => e.stopPropagation()}
                                      className="text-[10px] font-semibold text-slate-400 hover:text-rose-600 hover:bg-rose-50 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                                      title="Clear this notification from your list"
                                    >
                                      Clear
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 px-4 gap-2 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-sm font-bold text-slate-800">All caught up!</p>
                        <p className="text-[11px] text-slate-400 max-w-[220px]">
                          You have no unread notifications or low-stock alerts.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Panel Footer */}
                  <div className="px-4 py-2.5 border-t border-[#F1F5F9] bg-[#FAFBFC] flex items-center justify-between text-xs">
                    <Link
                      to="/products"
                      onClick={() => setIsNotificationsOpen(false)}
                      className="text-xs font-bold text-[#075BFF] hover:text-[#023FC2] flex items-center gap-1.5 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Manage Inventory
                    </Link>
                    <span className="text-[10px] text-slate-400 font-medium">
                      ShopFlow Cloud
                    </span>
                  </div>
                </div>
              </>,
              document.body
            )}
          </div>
        )}

        {/* Cryvex Brand Logo Container */}
        <div
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#0B192C] border border-[#1E3E62] p-1 flex items-center justify-center shadow-xs shrink-0 select-none"
          title="Cryvex ShopFlow"
        >
          <img
            src={cryvexLogo}
            alt="Cryvex Logo"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Profile Avatar Button */}
        <button
          type="button"
          onClick={openProfileDialog}
          className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl hover:bg-[#F5F9FF] border border-transparent hover:border-[#E2E8F0] transition-all cursor-pointer text-left"
          aria-label={`Profile for ${displayName}`}
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#075BFF] to-[#1687FF] text-white font-bold text-xs flex items-center justify-center shadow-md shadow-blue-500/20">
            {avatarInitial}
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-xs font-bold text-[#102A56] leading-tight">{displayName}</span>
            <span className="text-[10px] font-semibold text-[#075BFF]">{role === "OWNER" ? "Store Owner" : "Staff Member"}</span>
          </div>
          <svg className="hidden sm:block w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* ── Account Profile Dialog ── */}
      {isProfileDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-end bg-slate-900/30 backdrop-blur-xs"
          role="presentation"
          onClick={(e) => { if (e.target === e.currentTarget) closeProfileDialog(); }}
        >
          <div
            className="mt-16 mr-4 w-full max-w-sm rounded-3xl border border-[#E2E8F0] bg-white shadow-2xl overflow-hidden animate-slide-up"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-title"
          >
            {/* Dialog Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9] bg-gradient-to-r from-[#F8FAFC] to-white">
              <h3 id="profile-title" className="text-sm font-extrabold text-[#102A56]">
                {showEditProfile ? "Shop Account" : "My Profile"}
              </h3>
              <button
                type="button"
                onClick={closeProfileDialog}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
              {/* Profile Card */}
              {employeeProfileStatus === "loading" ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 rounded-full border-2 border-[#075BFF]/20 border-t-[#075BFF] animate-spin" />
                </div>
              ) : employeeProfileStatus === "error" ? (
                <div className="text-center py-4">
                  <button type="button" onClick={loadEmployeeProfile} className="text-sm font-semibold text-[#075BFF] hover:underline">Retry Loading</button>
                </div>
              ) : employeeProfile ? (
                <div className="bg-gradient-to-br from-[#EAF3FF] to-[#F5F9FF] rounded-2xl p-4 flex items-center gap-4 border border-[#BFDBFE]/60">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#075BFF] to-[#1687FF] text-white font-black text-xl flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
                    {employeeProfile.name ? employeeProfile.name.charAt(0).toUpperCase() : "?"}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-[#102A56] truncate">{employeeProfile.name}</h4>
                    <span className="text-[11px] font-bold bg-[#075BFF] text-white px-2 py-0.5 rounded-full inline-block mt-1">
                      {employeeProfile.role || "Staff Member"}
                    </span>
                    <p className="text-[11px] text-[#64748B] mt-1 truncate">
                      {employeeProfile.phone_number || employeeProfile.phone || employeeProfile.email || "—"}
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Quick Info Rows */}
              {employeeProfile && (
                <div className="bg-white border border-[#E2E8F0] rounded-2xl divide-y divide-slate-100 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 text-xs">
                    <span className="text-[#64748B] font-medium flex items-center gap-2">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                      Phone
                    </span>
                    <span className="font-semibold text-[#102A56]">{employeeProfile.phone_number || employeeProfile.phone || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5 text-xs">
                    <span className="text-[#64748B] font-medium flex items-center gap-2">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      Email
                    </span>
                    <span className="font-semibold text-[#102A56] truncate max-w-[140px]">{employeeProfile.email || "—"}</span>
                  </div>
                  {currentTenant && (
                    <div className="flex items-center justify-between px-4 py-2.5 text-xs">
                      <span className="text-[#64748B] font-medium flex items-center gap-2">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        Store
                      </span>
                      <span className="font-semibold text-[#102A56] truncate max-w-[140px]">{currentTenant.name || currentTenant.shopName || "—"}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Owner: Edit Shop Details Form */}
              {showEditProfile && (
                <form onSubmit={saveProfile} className="border-t border-[#F1F5F9] pt-4" aria-busy={profileLoadStatus === "loading" || isSavingProfile}>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-3">Edit Shop Details</h4>
                  {profileLoadStatus === "loading" ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="w-5 h-5 rounded-full border-2 border-[#075BFF]/20 border-t-[#075BFF] animate-spin" />
                    </div>
                  ) : profileLoadStatus === "error" ? (
                    <div className="text-center py-4">
                      <button type="button" onClick={loadTenantProfile} className="text-xs font-semibold text-[#075BFF] hover:underline">Retry Loading</button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label htmlFor="profile-owner-name" className="block text-[11px] font-bold text-[#102A56] mb-1">Owner Name</label>
                        <input id="profile-owner-name" type="text" value={profileDraft.name} onChange={(e) => handleProfileFormChange("name", e.target.value)} maxLength={150} required className="input-field text-xs" />
                      </div>
                      <div>
                        <label htmlFor="profile-business-name" className="block text-[11px] font-bold text-[#102A56] mb-1">Business Name</label>
                        <input id="profile-business-name" type="text" value={profileDraft.business_name} onChange={(e) => handleProfileFormChange("business_name", e.target.value)} maxLength={200} required className="input-field text-xs" />
                      </div>
                      <div>
                        <label htmlFor="profile-email" className="block text-[11px] font-bold text-[#102A56] mb-1">Official Email</label>
                        <input id="profile-email" type="email" value={profileDraft.email} onChange={(e) => handleProfileFormChange("email", e.target.value)} maxLength={255} required className="input-field text-xs" />
                      </div>
                      <div>
                        <label htmlFor="profile-address" className="block text-[11px] font-bold text-[#102A56] mb-1">Store Address</label>
                        <textarea id="profile-address" rows={2} value={profileDraft.address} onChange={(e) => handleProfileFormChange("address", e.target.value)} required className="input-field resize-none text-xs" />
                      </div>
                      <button type="submit" disabled={isSavingProfile || profileLoadStatus !== "success"} className="btn-primary w-full text-xs py-2.5">
                        {isSavingProfile ? "Saving..." : "Save Shop Details"}
                      </button>
                    </div>
                  )}
                </form>
              )}

              {profileError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200">
                  <svg className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-rose-600 font-medium" role="alert">{profileError}</p>
                </div>
              )}
            </div>

            {/* Dialog Footer */}
            <div className="border-t border-[#F1F5F9] px-5 py-3 bg-[#FAFBFC] flex items-center justify-between gap-3">
<button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-2 text-xs font-bold text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-xl transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { authApi } from "../../services/api/authApi";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
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
  searchTerm = "",
  onSearchChange,
  onToggleSidebar,
  searchPlaceholder,
  userProfile,
  showNotification = true,
  hideSearch = false,
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
    refreshNotifications,
    markAsRead,
    markAllAsRead,
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
      if (!e.target.closest("[data-notification-panel]")) {
        setIsNotificationsOpen(false);
      }
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

  const resolvedPlaceholder =
    searchPlaceholder || `Search ${displayTitle.toLowerCase()}...`;

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

      {/* Center: Universal Page Search Bar */}
      {!hideSearch && (
        <div className="order-3 basis-full min-w-0 sm:order-none sm:flex-1 sm:basis-auto sm:max-w-md mx-auto">
          <div className="relative w-full">
            <span
              className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400"
              aria-hidden="true"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              id="header-search-input"
              type="text"
              placeholder={resolvedPlaceholder}
              value={searchTerm}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-[#F7FAFF] border border-[#E2E8F0] rounded-xl text-[#102A56] placeholder-slate-400 focus:outline-none focus:border-[#075BFF] focus:bg-white focus:ring-3 focus:ring-[#075BFF]/10 shadow-xs transition-all"
            />
          </div>
        </div>
      )}

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
                  className="fixed inset-0 bg-slate-900/40 z-[998] sm:hidden"
                  onClick={() => setIsNotificationsOpen(false)}
                  aria-hidden="true"
                />
                {/* Transparent desktop backdrop to catch outside clicks */}
                <div
                  className="fixed inset-0 z-[998] hidden sm:block"
                  onClick={() => setIsNotificationsOpen(false)}
                  aria-hidden="true"
                />
                <div className="
                  fixed bottom-0 left-0 right-0 z-[999]
                  sm:fixed sm:bottom-auto
                  w-full sm:w-96
                  max-h-[82vh] sm:max-h-none
                  rounded-t-3xl sm:rounded-2xl
                  bg-white shadow-2xl border border-[#E2E8F0]
                  overflow-hidden notification-sheet
                "
                  style={{
                    ...(typeof window !== 'undefined' && window.innerWidth >= 640 && bellRef.current ? {
                      top: bellRef.current.getBoundingClientRect().bottom + 8,
                      right: window.innerWidth - bellRef.current.getBoundingClientRect().right,
                      left: 'auto',
                    } : {})
                  }}
                >
                  {/* Mobile drag handle */}
                  <div className="flex justify-center pt-3 pb-1 sm:hidden">
                    <div className="w-10 h-1 rounded-full bg-slate-200" />
                  </div>

                  {/* Panel Header */}
                  <div className="px-5 py-4 border-b border-[#F1F5F9] flex items-center justify-between bg-gradient-to-r from-[#FEFCE8] to-[#FFFBEB]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
                        <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#102A56]">Stock Alerts</h3>
                        <p className="text-[10px] text-[#64748B]">Low stock items requiring action</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasUnreadAlerts && (
                        <button
                          onClick={markAllAsRead}
                          className="text-[11px] font-bold text-[#075BFF] hover:underline cursor-pointer mr-1"
                        >
                          Mark read
                        </button>
                      )}
                      {notifications && notifications.length > 0 && (
                        <span className="text-[11px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                          {notifications.length} alert{notifications.length !== 1 ? "s" : ""}
                        </span>
                      )}
                      <button
                        onClick={() => setIsNotificationsOpen(false)}
                        className="w-7 h-7 rounded-lg bg-white hover:bg-slate-100 border border-[#E2E8F0] flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Panel Body */}
                  <div className="max-h-[48vh] sm:max-h-80 overflow-y-auto overscroll-contain">
                    {notificationsLoading ? (
                      <div className="flex flex-col items-center justify-center py-10 gap-3">
                        <div className="w-8 h-8 rounded-full border-2 border-[#075BFF]/20 border-t-[#075BFF] animate-spin" />
                        <p className="text-xs text-slate-500 font-medium">Checking stock levels...</p>
                      </div>
                    ) : notificationsError ? (
                      <div className="flex flex-col items-center justify-center py-10 gap-2">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                          <svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-xs text-rose-500 font-medium">{notificationsError}</p>
                        <button
                          onClick={() => refreshNotifications()}
                          className="text-[11px] text-[#075BFF] font-semibold hover:underline cursor-pointer"
                        >
                          Try Again
                        </button>
                      </div>
                    ) : notifications && notifications.length > 0 ? (
                      <div className="p-2 space-y-1.5">
                        {notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => {
                              setIsNotificationsOpen(false);
                              handleNotificationClick(n, navigate);
                            }}
                            className={`p-3 rounded-xl border flex items-start gap-3 transition-all cursor-pointer hover:shadow-md ${
                              n.read
                                ? "bg-slate-50/90 border-slate-200/80 opacity-75 hover:opacity-100"
                                : "bg-[#FFFBEB] border-amber-200/90 shadow-xs"
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                              n.read ? "bg-slate-200/70 text-slate-500" : "bg-amber-100 text-amber-700"
                            }`}>
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <p className="text-xs font-bold text-[#102A56] truncate">{n.productName}</p>
                                {!n.read && (
                                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" title="Unread notification" />
                                )}
                              </div>
                              <div className="flex items-center gap-2.5 mt-1">
                                <span className="text-[11px] text-slate-600 font-medium">
                                  Stock: <strong className="text-rose-600 font-bold">{n.currentStock}</strong> {n.unit}
                                </span>
                                <span className="text-[11px] text-slate-400">Min: {n.threshold}</span>
                              </div>
                              <p className="text-[10px] text-amber-700 font-semibold mt-1 flex items-center gap-1">
                                <span>⚠ Low Stock — Only {n.currentStock} left</span>
                              </p>
                            </div>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                              n.read ? "bg-slate-200 text-slate-600" : "bg-rose-100 text-rose-700"
                            }`}>
                              {n.read ? "READ" : "LOW"}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 gap-2">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                          <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-sm font-bold text-emerald-600">All stock healthy!</p>
                        <p className="text-[11px] text-slate-400 text-center max-w-[180px]">No products below safety stock threshold.</p>
                      </div>
                    )}
                  </div>

                  {/* Panel Footer */}
                  {notifications && notifications.length > 0 && (
                    <div className="px-4 py-3 border-t border-[#F1F5F9] bg-[#FAFBFC]">
                      <Link
                        to="/products"
                        onClick={() => setIsNotificationsOpen(false)}
                        className="w-full flex items-center justify-center gap-2 text-xs font-bold text-[#075BFF] hover:text-[#023FC2] transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        View All Products Catalog
                      </Link>
                    </div>
                  )}
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

import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { authApi } from "../../services/api/authApi";
import { productApi } from "../../services/api/productApi";
import { useAuth } from "../../context/AuthContext";

const ROUTE_TITLES = {
  "/dashboard": "Dashboard",
  "/daily-price-update": "Daily Price Update",
  "/price-update": "Daily Price Update",
  "/products": "Products",
  "/products/add": "Add Product",
  "/quick-bill": "Quick Bill",
  "/customers": "Customers",
  "/kadan": "Kadan Management",
  "/bill-history": "Bill History",
  "/reports": "Sales Reports",
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
  const { currentUser, currentTenant, refreshTenant } = useAuth();
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isEmployeeProfileOpen, setIsEmployeeProfileOpen] = useState(false);
  const [employeeProfileStatus, setEmployeeProfileStatus] = useState("idle");
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [profileDraft, setProfileDraft] = useState({ name: "", business_name: "", email: "", address: "" });
  const [profileLoadStatus, setProfileLoadStatus] = useState("idle");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccessMessage, setProfileSuccessMessage] = useState("");

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState(null);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");

  const toggleNotifications = async () => {
    setIsNotificationsOpen(!isNotificationsOpen);
    if (!isNotificationsOpen && notifications === null) {
      setNotificationsLoading(true);
      try {
        const response = await productApi.getLowStockAlerts();
        const data = Array.isArray(response) ? response : response?.data || [];
        setNotifications(Array.isArray(data) ? data : []);
      } catch (err) {
        setNotificationsError("Failed to load notifications.");
      } finally {
        setNotificationsLoading(false);
      }
    }
  };

  useEffect(() => {
  // auth data is fetched in AuthContext, no need for local on-mount fetch
  }, []);

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
      : "Dashboard");

  const resolvedPlaceholder =
    searchPlaceholder || `Search ${displayTitle.toLowerCase()}...`;

  const role = currentUser?.role || "OWNER";
  let displayName = "Loading...";
  let showEditProfile = false;
  
  if (currentUser) {
    displayName = currentUser.name || "Staff";
    if (role === "OWNER") {
      showEditProfile = true;
    } else {
      showEditProfile = false;
    }
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

  const renderRight = () => {
    return (
      <div className="flex items-center gap-3">
        {showNotification && (
          <div className="relative">
            <button
              type="button"
              onClick={toggleNotifications}
              className={`relative p-2 rounded-xl transition-colors ${
                isNotificationsOpen ? "text-blue-700 bg-blue-50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              }`}
              aria-label="Notifications"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {(!notifications || notifications.length > 0) && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
              )}
            </button>
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white shadow-lg ring-1 ring-black/5 z-50">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-800">Low Stock Alerts</h3>
                  <button onClick={() => setIsNotificationsOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto p-2">
                  {notificationsLoading ? (
                    <p className="p-4 text-center text-xs text-slate-500">Loading alerts...</p>
                  ) : notificationsError ? (
                    <p className="p-4 text-center text-xs text-rose-500">{notificationsError}</p>
                  ) : notifications && notifications.length > 0 ? (
                    notifications.map((n, i) => (
                      <div key={i} className="p-3 mb-1 bg-amber-50 rounded-lg border border-amber-100 flex flex-col gap-1">
                        <span className="text-xs font-bold text-slate-800">{n.product_name || n.name}</span>
                        <div className="flex justify-between text-[11px] text-slate-600">
                          <span>Stock: <strong className="text-rose-600">{n.stock_quantity}</strong> {n.unit}</span>
                          <span>Threshold: {n.low_stock_threshold}</span>
                        </div>
                        {n.barcode && <span className="text-[10px] text-slate-500">Barcode: {n.barcode}</span>}
                      </div>
                    ))
                  ) : (
                    <p className="p-4 text-center text-xs text-slate-500">No low stock alerts.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={openProfileDialog}
          className={`flex items-center gap-2 pl-2 border-l border-slate-200 text-left cursor-pointer`}
          aria-label={`Profile for ${displayName}`}
          title={"Profile"}
        >
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
            {avatarInitial}
          </div>
          <span className="flex flex-col">
            <span className="text-xs sm:text-sm font-semibold text-slate-700 hidden sm:inline">{displayName}</span>
            <span className="text-xs font-semibold text-blue-700">{showEditProfile ? "Shop Profile" : "User Profile"}</span>
          </span>
        </button>
      </div>
    );
  };

  return (
    <header className="min-h-16 px-4 py-3 sm:py-0 sm:px-6 lg:px-8 bg-transparent flex flex-wrap items-center justify-between sticky top-0 z-20 gap-x-4 gap-y-2">
      {profileSuccessMessage && (
        <div className="fixed right-5 top-5 z-[60] rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm font-medium text-emerald-700 shadow-lg" role="status">
          {profileSuccessMessage}
        </div>
      )}
      {/* Left: Mobile toggle + Page Name (Header Name) */}
      <div className="flex items-center gap-3 shrink-0">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs"
            aria-label="Toggle Sidebar Navigation"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <h2 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight whitespace-nowrap">
          {displayTitle}
        </h2>
      </div>

      {/* Center: Universal Page Search Bar */}
      {!hideSearch && (
        <div className="order-3 basis-full min-w-0 sm:order-none sm:flex-1 sm:basis-auto sm:max-w-md mx-auto">
          <div className="relative w-full">
            <span
              className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400 text-xs sm:text-sm"
              aria-hidden="true"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              id="header-search-input"
              type="text"
              placeholder={resolvedPlaceholder}
              value={searchTerm}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-200/90 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs transition-all"
            />
          </div>
        </div>
      )}

      {/* Right: Notifications & Profile Avatar */}
      <div className="flex items-center gap-2.5 shrink-0">
        {renderRight()}
      </div>

      {isProfileDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 overflow-y-auto" role="presentation">
          <div className="w-full max-w-md my-8 rounded-xl border border-slate-200 bg-white p-5 shadow-xl max-h-full overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="profile-title">
            <h3 id="profile-title" className="text-base font-bold text-slate-900 mb-4">User Profile</h3>
            
            {/* User Profile Section (Read-Only for both Owner and Employee) */}
            {employeeProfileStatus === "loading" ? (
              <p className="py-4 text-center text-sm text-slate-500" role="status">Loading profile...</p>
            ) : employeeProfileStatus === "error" ? (
              <div className="mt-2">
                <button type="button" onClick={loadEmployeeProfile} className="text-sm font-semibold text-blue-700 hover:underline">Retry Loading Profile</button>
              </div>
            ) : employeeProfile ? (
              <div className="grid gap-3">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 font-bold text-xl flex items-center justify-center shadow-xs mb-3">
                    {employeeProfile.name ? employeeProfile.name.charAt(0).toUpperCase() : "?"}
                  </div>
                  <h4 className="text-lg font-bold text-slate-800">{employeeProfile.name}</h4>
                  <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full mt-1 border border-blue-100">
                    {employeeProfile.role || "Staff"}
                  </span>
                </div>
                
                <div className="bg-white border border-slate-100 rounded-lg p-3 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone Number</p>
                    <p className="text-sm font-medium text-slate-900 mt-0.5">{employeeProfile.phone_number || employeeProfile.phone || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email Address</p>
                    <p className="text-sm font-medium text-slate-900 mt-0.5">{employeeProfile.email || "Not provided"}</p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Shop Details Section (Editable, only for Owner) */}
            {showEditProfile && (
              <form onSubmit={saveProfile} className="mt-6 border-t border-slate-200 pt-4" aria-busy={profileLoadStatus === "loading" || isSavingProfile}>
                <h4 className="text-sm font-bold text-slate-900 mb-3">Shop Details</h4>
                {profileLoadStatus === "loading" ? (
                  <p className="py-4 text-center text-sm text-slate-500" role="status">Loading shop details...</p>
                ) : profileLoadStatus === "error" ? (
                  <div className="mt-2">
                    <button type="button" onClick={loadTenantProfile} className="text-sm font-semibold text-blue-700 hover:underline">Retry Loading Shop</button>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    <div>
                      <label htmlFor="profile-owner-name" className="block text-sm font-medium text-slate-700">Owner Name</label>
                      <input id="profile-owner-name" type="text" value={profileDraft.name} onChange={(event) => handleProfileFormChange("name", event.target.value)} maxLength={150} required className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                    </div>
                    <div>
                      <label htmlFor="profile-business-name" className="block text-sm font-medium text-slate-700">Business Name</label>
                      <input id="profile-business-name" type="text" value={profileDraft.business_name} onChange={(event) => handleProfileFormChange("business_name", event.target.value)} maxLength={200} required className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                    </div>
                    <div>
                      <label htmlFor="profile-email" className="block text-sm font-medium text-slate-700">Email ID</label>
                      <input id="profile-email" type="email" value={profileDraft.email} onChange={(event) => handleProfileFormChange("email", event.target.value)} maxLength={255} required className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                    </div>
                    <div>
                      <label htmlFor="profile-address" className="block text-sm font-medium text-slate-700">Address</label>
                      <textarea id="profile-address" rows={2} value={profileDraft.address} onChange={(event) => handleProfileFormChange("address", event.target.value)} required className="mt-1.5 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                    </div>
                  </div>
                )}
                
                <div className="mt-4 flex justify-end gap-2">
                  <button type="submit" className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={isSavingProfile || profileLoadStatus !== "success"}>
                    {isSavingProfile ? "Saving..." : "Save Shop Details"}
                  </button>
                </div>
              </form>
            )}

            {profileError && <p className="mt-3 text-sm text-rose-600 font-medium text-center" role="alert">{profileError}</p>}
            
            <div className="mt-4 border-t border-slate-100 pt-4 flex justify-end">
              <button type="button" onClick={closeProfileDialog} className="w-full sm:w-auto rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

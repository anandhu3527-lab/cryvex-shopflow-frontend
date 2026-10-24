import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { authApi } from "../../services/api/authApi";

export default function Profile() {
  const navigate = useNavigate();
  const { currentUser, currentTenant, refreshTenant } = useAuth();

  const role = currentUser?.role || "OWNER";
  const isOwner = role === "OWNER";
  const displayName = currentUser?.name || currentUser?.fullName || "Staff User";
  const avatarInitial = displayName.trim().charAt(0).toUpperCase() || "U";

  // Editable store draft for Store Owners
  const [profileDraft, setProfileDraft] = useState({
    name: "",
    business_name: "",
    email: "",
    address: "",
  });
  const [isLoadingStore, setIsLoadingStore] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (isOwner) {
      loadStoreData();
    }
  }, [isOwner]);

  const loadStoreData = async () => {
    setIsLoadingStore(true);
    try {
      const res = await authApi.getTenant();
      const shop = res?.data?.shop || res?.shop || {};
      setProfileDraft({
        name: shop.name || currentTenant?.name || "",
        business_name: shop.business_name || currentTenant?.business_name || "",
        email: shop.email || currentTenant?.email || "",
        address: shop.address || currentTenant?.address || "",
      });
    } catch {
      // Fallback to currentTenant in context
      if (currentTenant) {
        setProfileDraft({
          name: currentTenant.name || "",
          business_name: currentTenant.business_name || "",
          email: currentTenant.email || "",
          address: currentTenant.address || "",
        });
      }
    } finally {
      setIsLoadingStore(false);
    }
  };

  const handleSaveStore = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    const payload = {
      name: profileDraft.name.trim(),
      business_name: profileDraft.business_name.trim(),
      email: profileDraft.email.trim(),
      address: profileDraft.address.trim(),
    };

    if (!payload.name || !payload.business_name || !payload.email || !payload.address) {
      setFeedback({ type: "error", message: "All store fields are required." });
      setIsSaving(false);
      return;
    }

    try {
      await authApi.updateTenant(payload);
      await refreshTenant();
      setFeedback({ type: "success", message: "Store profile details updated successfully!" });
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Failed to update profile." });
    } finally {
      setIsSaving(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleSignOut = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    window.location.href = "/login";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#102A56] tracking-tight">User Profile & Account</h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            View user credentials, business identity, and system discovery.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Sign Out</span>
        </button>
      </div>

      {/* ── Did you know about Cryvex? Banner Card ── */}
      <div className="rounded-3xl p-6 sm:p-7 bg-gradient-to-r from-[#075BFF] via-[#126BFF] to-[#0047D4] text-white shadow-xl shadow-blue-500/20 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="relative z-10 space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-bold text-white tracking-wide">
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
            DISCOVER CRYVEX SHOPFLOW
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
            Did you know about Cryvex?
          </h2>
          <p className="text-blue-100 text-xs sm:text-sm leading-relaxed">
            Learn how Cryvex ShopFlow accelerates billing to 2.4 seconds, powers offline-ready cloud sync, eliminates paper with WhatsApp invoices, and automates customer Kadan ledgers.
          </p>
        </div>

        <div className="relative z-10 shrink-0">
          <button
            type="button"
            onClick={() => navigate("/landing", { state: { from: "/profile" } })}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-white text-[#075BFF] hover:bg-blue-50 text-sm font-black shadow-lg shadow-black/10 transition-all hover:scale-105 cursor-pointer"
          >
            <span>Click here</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute -right-10 -bottom-10 w-56 h-56 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl text-sm font-semibold flex items-center gap-3 border animate-fade-in ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
          role="status"
        >
          <span>{feedback.type === "success" ? "✓" : "⚠"}</span>
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Grid: User Profile Card & Shop Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: User Identity Card */}
        <div className="lg:col-span-5 space-y-6">
          <div className="white-card p-6 border border-[#E2E8F0] space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#075BFF] to-[#1687FF] text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
                {avatarInitial}
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-extrabold text-[#102A56] truncate">{displayName}</h3>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EAF3FF] text-[#075BFF] border border-[#075BFF]/20">
                  {isOwner ? "Store Owner" : "Staff Member"}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 divide-y divide-slate-100 text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#64748B] font-medium">Username / Phone</span>
                <span className="font-semibold text-[#102A56]">{currentUser?.phone_number || currentUser?.phone || currentUser?.username || "—"}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#64748B] font-medium">Email Address</span>
                <span className="font-semibold text-[#102A56] truncate max-w-[180px]">{currentUser?.email || "—"}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#64748B] font-medium">Assigned Store</span>
                <span className="font-semibold text-[#102A56] truncate max-w-[180px]">{currentTenant?.name || currentTenant?.shopName || "Cryvex Store"}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#64748B] font-medium">Account Status</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Active POS Counter
                </span>
              </div>
            </div>
          </div>

          {/* Quick Info Box */}
          <div className="p-5 rounded-3xl bg-[#F5F9FF] border border-[#BFDBFE] space-y-2">
            <h4 className="text-xs font-bold text-[#102A56] flex items-center gap-1.5">
              <span className="text-[#075BFF]">⚡</span>
              Need Help or Product Guidance?
            </h4>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Explore the full features showcase anytime by visiting the Cryvex info landing page.
            </p>
            <button
              type="button"
              onClick={() => navigate("/landing", { state: { from: "/profile" } })}
              className="text-xs font-bold text-[#075BFF] hover:underline cursor-pointer pt-1 inline-flex items-center gap-1"
            >
              <span>Explore Cryvex Landing Page</span>
              <span>→</span>
            </button>
          </div>
        </div>

        {/* Right: Store Details / Edit Form */}
        <div className="lg:col-span-7">
          <div className="white-card p-6 border border-[#E2E8F0]">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#F1F5F9]">
              <div>
                <h3 className="text-base font-extrabold text-[#102A56]">
                  {isOwner ? "Shop & Business Profile" : "Store Profile"}
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  {isOwner ? "Update your official shop contact and address details." : "Registered store information."}
                </p>
              </div>
              {isOwner && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-50 text-[#075BFF] border border-blue-200">
                  Owner Editable
                </span>
              )}
            </div>

            {isLoadingStore ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-[#075BFF]/20 border-t-[#075BFF] animate-spin" />
                <p className="text-xs text-slate-500 font-medium">Loading store details...</p>
              </div>
            ) : isOwner ? (
              <form onSubmit={handleSaveStore} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#102A56] mb-1.5">
                      Store Name *
                    </label>
                    <input
                      type="text"
                      value={profileDraft.name}
                      onChange={(e) => setProfileDraft({ ...profileDraft, name: e.target.value })}
                      required
                      maxLength={150}
                      className="input-field text-xs"
                      placeholder="e.g. Metro Mart & Electronics"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#102A56] mb-1.5">
                      Business Entity Name *
                    </label>
                    <input
                      type="text"
                      value={profileDraft.business_name}
                      onChange={(e) => setProfileDraft({ ...profileDraft, business_name: e.target.value })}
                      required
                      maxLength={200}
                      className="input-field text-xs"
                      placeholder="e.g. Metro Retailers Pvt Ltd"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#102A56] mb-1.5">
                    Official Business Email *
                  </label>
                  <input
                    type="email"
                    value={profileDraft.email}
                    onChange={(e) => setProfileDraft({ ...profileDraft, email: e.target.value })}
                    required
                    maxLength={255}
                    className="input-field text-xs"
                    placeholder="billing@yourstore.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#102A56] mb-1.5">
                    Store Physical Address *
                  </label>
                  <textarea
                    rows={3}
                    value={profileDraft.address}
                    onChange={(e) => setProfileDraft({ ...profileDraft, address: e.target.value })}
                    required
                    className="input-field resize-none text-xs"
                    placeholder="Shop #14, Main Road, Market Area..."
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="btn-primary text-xs py-2.5 px-6 cursor-pointer"
                  >
                    {isSaving ? "Saving Updates..." : "Save Store Changes"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                  <div>
                    <span className="text-[#64748B]">Store Name:</span>
                    <p className="font-bold text-[#102A56] text-sm mt-0.5">{currentTenant?.name || "Cryvex Store"}</p>
                  </div>
                  <div>
                    <span className="text-[#64748B]">Official Address:</span>
                    <p className="font-semibold text-[#102A56] mt-0.5">{currentTenant?.address || "Address on file"}</p>
                  </div>
                  <div>
                    <span className="text-[#64748B]">Contact Email:</span>
                    <p className="font-semibold text-[#102A56] mt-0.5">{currentTenant?.email || "—"}</p>
                  </div>
                </div>
                <p className="text-[11px] text-[#64748B]">
                  * Only the Store Owner can update business entity and tax registration details.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

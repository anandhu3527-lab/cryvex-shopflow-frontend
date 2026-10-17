/**
 * Mobile Bottom Navigation - White-first SaaS design
 * Clean white surface, soft shadow, subtle blue active state, and raised center Quick Bill CTA.
 */

import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { navigationItems } from "./navigationItems";

export default function MobileFabNavigation({ allowedItems }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // Main 4 slots + center button
  const mainNav = [
    { label: "Home", path: "/dashboard", icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )},
    { label: "Products", path: "/products", icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    )},
    { label: "Daily Price", path: "/daily-price-update", icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    )},
  ];

  const moreItems = (allowedItems || navigationItems).filter(
    (item) => !["Dashboard", "Billing", "Products", "Daily Price Update"].includes(item.label)
  );

  const isCurrentActive = (path) => {
    if (path === "/dashboard") return location.pathname === "/dashboard" || location.pathname === "/";
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const isQuickBillActive = location.pathname.startsWith("/quick-bill");

  return (
    <>
      {/* Floating White Mobile Bottom Bar — lg:hidden */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-lg border-t border-[#E2E8F0] shadow-[0_-4px_25px_rgba(7,91,255,0.08)] px-2 py-2 flex items-center justify-around"
      >
        {/* Home */}
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-transform active:scale-95 cursor-pointer ${
            isCurrentActive("/dashboard") ? "text-[#075BFF] font-bold" : "text-[#64748B]"
          }`}
        >
          {mainNav[0].icon}
          <span className="text-[10px]">{mainNav[0].label}</span>
          {isCurrentActive("/dashboard") && (
            <span className="w-1.5 h-1 bg-[#075BFF] rounded-full shadow-[0_0_6px_rgba(7,91,255,0.6)]" />
          )}
        </button>

        {/* Products */}
        <button
          type="button"
          onClick={() => navigate("/products")}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-transform active:scale-95 cursor-pointer ${
            isCurrentActive("/products") ? "text-[#075BFF] font-bold" : "text-[#64748B]"
          }`}
        >
          {mainNav[1].icon}
          <span className="text-[10px]">{mainNav[1].label}</span>
          {isCurrentActive("/products") && (
            <span className="w-1.5 h-1 bg-[#075BFF] rounded-full shadow-[0_0_6px_rgba(7,91,255,0.6)]" />
          )}
        </button>

        {/* Raised Center Quick Bill Button */}
        <div className="relative -top-4">
          <button
            type="button"
            onClick={() => navigate("/quick-bill")}
            className={`w-13 h-13 rounded-2xl flex items-center justify-center text-white shadow-xl transition-transform hover:scale-105 active:scale-95 cursor-pointer ${
              isQuickBillActive
                ? "bg-gradient-to-tr from-[#075BFF] to-[#1687FF] shadow-blue-500/40 ring-4 ring-white"
                : "bg-[#075BFF] shadow-blue-500/30 ring-3 ring-white"
            }`}
            aria-label="Quick Billing"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Daily Price Update */}
        <button
          type="button"
          onClick={() => navigate("/daily-price-update")}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-transform active:scale-95 cursor-pointer ${
            isCurrentActive("/daily-price-update") ? "text-[#075BFF] font-bold" : "text-[#64748B]"
          }`}
        >
          {mainNav[2].icon}
          <span className="text-[10px] whitespace-nowrap">{mainNav[2].label}</span>
          {isCurrentActive("/daily-price-update") && (
            <span className="w-1.5 h-1 bg-[#075BFF] rounded-full shadow-[0_0_6px_rgba(7,91,255,0.6)]" />
          )}
        </button>

        {/* More Sheet Trigger */}
        <button
          type="button"
          onClick={() => setIsMoreOpen(true)}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-transform active:scale-95 cursor-pointer ${
            isMoreOpen ? "text-[#075BFF] font-bold" : "text-[#64748B]"
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span className="text-[10px]">More</span>
        </button>
      </nav>

      {/* More Bottom Sheet Modal */}
      {isMoreOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/20 backdrop-blur-xs lg:hidden"
          onClick={() => setIsMoreOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-t-3xl border-t border-[#E2E8F0] shadow-2xl p-5 pb-8 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Handle */}
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-4" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-extrabold text-sm text-[#102A56]">More Modules</h3>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 max-h-72 overflow-y-auto">
              {moreItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    setIsMoreOpen(false);
                    navigate(item.path);
                  }}
                  className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    isCurrentActive(item.path)
                      ? "bg-[#EAF3FF] border-[#075BFF]/30 text-[#075BFF] font-bold"
                      : "bg-[#F8FAFC] border-[#E2E8F0] text-[#102A56] hover:bg-[#F1F5F9]"
                  }`}
                >
                  <span className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center text-[#075BFF] shadow-2xs">
                    {item.icon}
                  </span>
                  <span className="text-xs font-semibold">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

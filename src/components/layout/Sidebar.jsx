import { NavLink, Link, useLocation } from "react-router-dom";
import { authApi } from "../../services/api/authApi";
import { useAuth } from "../../context/AuthContext";

export default function Sidebar({ items = [], isOpen = false, onClose }) {
  const location = useLocation();
  const { currentTenant } = useAuth();

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-xs z-30 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Floating White Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-[#E2E8F0] p-4 flex flex-col justify-between shrink-0 select-none shadow-[0_4px_24px_rgba(7,91,255,0.04)] transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Brand Header */}
          <div className="flex items-center justify-between px-3 py-3 mb-4 border-b border-[#F1F5F9]">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#075BFF] to-[#1687FF] flex items-center justify-center text-white shadow-md shadow-blue-500/20 transition-transform group-hover:scale-105">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="font-extrabold text-sm tracking-tight text-[#102A56]">CRYVEX</span>
                  <span className="font-bold text-sm text-[#075BFF]">ShopFlow</span>
                </div>
                <p className="text-[10px] text-[#64748B] font-medium truncate max-w-[130px]">
                  {currentTenant?.name || "Retail Counter"}
                </p>
              </div>
            </Link>

            {/* Mobile Close Button */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                aria-label="Close navigation menu"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Navigation Section */}
          <nav className="space-y-1 overflow-y-auto flex-1 pr-1 py-1">
            {items.map((item) => {
              const isActive =
                location.pathname === item.path ||
                (item.path === "/dashboard" && location.pathname === "/") ||
                (item.path !== "/dashboard" && location.pathname.startsWith(item.path));

              return (
                <NavLink
                  key={item.label}
                  to={item.path}
                  onClick={() => {
                    if (onClose) onClose();
                  }}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all duration-200 relative group cursor-pointer ${
                    isActive
                      ? "bg-[#EAF3FF] text-[#075BFF] font-bold shadow-xs"
                      : "text-[#64748B] hover:text-[#102A56] hover:bg-[#F5F9FF]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-5 h-5 flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
                        isActive ? "text-[#075BFF]" : "text-[#64748B] group-hover:text-[#102A56]"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>

                  {/* Active Indicator Bar / Dot */}
                  {isActive && (
                    <span className="w-1.5 h-4 bg-[#075BFF] rounded-full shadow-[0_0_8px_rgba(7,91,255,0.5)]" />
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Bottom Section: Quick Switcher / Logout */}
          <div className="pt-3 mt-auto border-t border-[#F1F5F9] space-y-1">
            <Link
              to="/quick-bill"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#075BFF] to-[#1687FF] text-white text-xs font-bold shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>New Bill</span>
            </Link>

            <button
              type="button"
              onClick={async () => {
                try {
                  await authApi.logout();
                } catch {
                  // Ignore network error on logout
                }
                window.location.href = "/login";
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-[#64748B] hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

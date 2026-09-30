import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import { authApi } from "../../services/api/authApi";

export default function Sidebar({ items = [], isOpen = false, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-30 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200/90 p-5 flex flex-col justify-between shrink-0 select-none transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          {/* Brand Header & Mobile Close */}
          <div className="flex items-center justify-between px-2 py-2 mb-6">
            <Link to="/" className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-slate-900">
                CRYVEX CLOUD
              </span>
              <span className="text-[11px] text-slate-400 font-medium tracking-normal mt-0.5">
                Management Suite
              </span>
            </Link>

            {/* Mobile Close Button */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                aria-label="Close navigation menu"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Navigation Section */}
          <nav className="space-y-1">
            {items.map((item) => {
              const isActive = location.pathname === item.path || (item.path === "/dashboard" && location.pathname === "/");
              
              return (
                <NavLink
                  key={item.label}
                  to={item.path}
                  onClick={() => {
                    if (onClose) onClose();
                  }}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-colors duration-150 relative ${
                    isActive
                      ? "text-blue-600 font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-5 h-5 flex items-center justify-center shrink-0 ${
                        isActive ? "text-blue-600" : "text-slate-500"
                      }`}
                      aria-hidden="true"
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>

                  {/* Active Indicator Bar on the Right */}
                  {isActive && (
                    <span
                      className="absolute right-0 top-1.5 bottom-1.5 w-1 bg-blue-600 rounded-l"
                      aria-hidden="true"
                    />
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Logout */}
        <div className="pt-4 border-t border-slate-100">
          <Link
            to="/login"
            onClick={(event) => {
              event.preventDefault();
              authApi.logout();
              navigate("/login", { replace: true });
            }}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
          >
            <svg
              className="w-5 h-5 text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span>Logout</span>
          </Link>
        </div>
      </aside>
    </>
  );
}

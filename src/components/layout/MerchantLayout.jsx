import { useState } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import MobileFabNavigation from "./MobileFabNavigation";
import { navigationItems } from "./navigationItems";
import { useAuth } from "../../context/AuthContext";
import cryvexShopBg from "../../assets/cryvex-shop-bg.jpg";

const ROUTE_TITLES = {
  "/dashboard": "Dashboard",
  "/products": "Products",
  "/products/add": "Add Product",
  "/products/detail": "Product Details",
  "/quick-bill": "Billing",
  "/bill-history": "Bill History",
  "/report": "Sales Reports",
  "/reports": "Sales Reports",
  "/reports/monthly": "Monthly Report",
  "/reports/weekly": "Weekly Report",
  "/reports/daily": "Daily Report",
  "/customers": "Customers",
  "/kadan": "Kadan Management",
  "/daily-price-update": "Daily Price Update",
  "/profile": "User Profile",
  "/employees/add": "Add Employee",
};

function getRouteTitle(pathname) {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
  if (pathname.startsWith("/reports")) return "Sales Reports";
  if (pathname.startsWith("/products/")) return "Product Details";
  if (pathname.startsWith("/customers/")) return "Customer Details";
  if (pathname.startsWith("/bills/")) return "Bill Detail";
  return "Cryvex ShopFlow";
}

const HIDE_SEARCH_ROUTES = new Set([
  "/dashboard",
  "/quick-bill",
  "/report",
  "/reports",
  "/reports/monthly",
  "/reports/weekly",
  "/reports/daily",
  "/profile",
  "/employees/add",
]);

function shouldHideSearch(pathname) {
  if (HIDE_SEARCH_ROUTES.has(pathname)) return true;
  if (pathname.startsWith("/reports")) return true;
  if (pathname.startsWith("/products/") && pathname !== "/products/add") return true;
  if (pathname.startsWith("/customers/")) return true;
  if (pathname.startsWith("/bills/")) return true;
  return false;
}

export default function MerchantLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState("");
  const { currentUser } = useAuth();
  const location = useLocation();
  const role = currentUser?.role || "OWNER";

  const title = getRouteTitle(location.pathname);
  const hideSearch = shouldHideSearch(location.pathname);

  const allowedItems = navigationItems.filter((item) => {
    if (role !== "OWNER" && item.label === "Add Employee") return false;
    return true;
  });

  return (
    <div className="flex min-h-screen bg-[#F7FAFF] text-[#102A56] relative overflow-x-hidden font-sans">
      {/* ── Ambient Cryvex ShopFlow Store Background Wallpaper across ALL pages ── */}
      <div
        className="fixed inset-0 z-0 pointer-events-none select-none overflow-hidden"
        aria-hidden="true"
      >
        <img
          src={cryvexShopBg}
          alt="Cryvex ShopFlow Store Background"
          className="w-full h-full object-cover object-center opacity-[0.13] filter saturate-[1.12] contrast-[1.05]"
          loading="eager"
        />
        {/* Soft atmospheric gradient veil for contrast and readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#F7FAFF]/75 via-[#F7FAFF]/50 to-[#F7FAFF]/80 pointer-events-none" />
      </div>

      <div className="fixed -top-40 -right-40 w-96 h-96 rounded-full bg-blue-100/40 blur-3xl pointer-events-none z-0" />
      <div className="fixed top-1/2 -left-40 w-96 h-96 rounded-full bg-cyan-50/50 blur-3xl pointer-events-none z-0" />

      <div className="hidden lg:block relative z-20">
        <Sidebar
          items={allowedItems}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 w-full relative z-10">
        <Header
          title={title}
          searchTerm={hideSearch ? "" : headerSearch}
          onSearchChange={hideSearch ? undefined : setHeaderSearch}
          searchPlaceholder="Search..."
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          hideSearch={hideSearch}
        />
        <main className="px-4 sm:px-6 lg:px-8 py-6 pb-28 lg:pb-12 flex-1 overflow-auto">
          {children}
        </main>
      </div>

      <MobileFabNavigation allowedItems={allowedItems} />
    </div>
  );
}

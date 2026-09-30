import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { navigationItems } from "./navigationItems";
import { useAuth } from "../../context/AuthContext";

export default function MerchantLayout({
  children,
  searchTerm = "",
  onSearchChange,
  title,
  searchPlaceholder,
  rightElement,
  userProfile,
  showNotification,
  hideSearch,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentUser } = useAuth();
  const role = currentUser?.role || "OWNER";
  
  const allowedItems = navigationItems.filter(item => {
    if (role !== "OWNER" && item.label === "Add Employee") {
      return false;
    }
    return true;
  });

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-900 relative overflow-x-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        items={allowedItems}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        <Header
          title={title}
          searchTerm={searchTerm}
          onSearchChange={onSearchChange}
          searchPlaceholder={searchPlaceholder}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          rightElement={rightElement}
          userProfile={userProfile}
          showNotification={showNotification}
          hideSearch={hideSearch}
        />
        <main className="px-4 sm:px-6 lg:px-8 pb-10 flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

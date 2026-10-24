import { Outlet, Routes, Route, Navigate, useParams } from "react-router-dom";
import MerchantLayout from "../components/layout/MerchantLayout";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import ScrollToTop from "../components/layout/ScrollToTop";
import { securityManager } from "../utils/security";

// Page Components
import Dashboard from "../pages/dashboard/Dashboard";
import Products from "../pages/products/Products";
import ProductDetail from "../pages/products/ProductDetail";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import LandingPage from "../pages/landing/LandingPage";
import Profile from "../pages/profile/Profile";
import QuickBill from "../pages/billing/QuickBill";
import Customers from "../pages/customers/Customers";
import CustomerDetail from "../pages/customers/CustomerDetail";
import Kadan from "../pages/kadan/Kadan";
import ReportsHub from "../pages/reports/ReportsHub";
import MonthlyReport from "../pages/reports/MonthlyReport";
import WeeklyReport from "../pages/reports/WeeklyReport";
import DailyReport from "../pages/reports/DailyReport";
import DailyPriceUpdate from "../pages/products/DailyPriceUpdate";
import BillHistory from "../pages/billing/BillHistory";
import BillDetail from "../pages/billing/BillDetail";
import AddProduct from "../pages/products/AddProduct";
import AddProductVariant from "../pages/products/AddProductVariant";
import AddEmployee from "../pages/employees/AddEmployee";

/**
 * PersistentLayout — rendered ONCE and kept mounted for all protected routes.
 * Sidebar, Header and MobileFabNavigation remain in the tree between navigations.
 */
function PersistentLayout() {
  return (
    <ProtectedRoute>
      <MerchantLayout>
        <ScrollToTop />
        <Outlet />
      </MerchantLayout>
    </ProtectedRoute>
  );
}

/** Owner-only persistent layout */
function OwnerOnlyLayout() {
  return (
    <ProtectedRoute allowedRoles={["OWNER"]}>
      <MerchantLayout>
        <ScrollToTop />
        <Outlet />
      </MerchantLayout>
    </ProtectedRoute>
  );
}

/** CustomerDetail needs key-based remount when customer changes */
function CustomerDetailPage() {
  const { customerId } = useParams();
  return <CustomerDetail key={customerId} />;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Root redirect */}
      <Route
        path="/"
        element={
          securityManager.isAuthenticated() ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Public routes */}
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/setup" element={<Navigate to="/register" replace />} />
      <Route path="/signup" element={<Navigate to="/register" replace />} />
      <Route path="/sales-reports" element={<Navigate to="/reports" replace />} />
      <Route path="/price-update" element={<Navigate to="/daily-price-update" replace />} />

      {/* Protected merchant routes — persistent shared layout */}
      <Route element={<PersistentLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/add" element={<AddProduct />} />
        <Route path="/products/:productId/variants/new" element={<AddProductVariant />} />
        <Route path="/products/variants/new" element={<AddProductVariant />} />
        <Route path="/products/detail" element={<ProductDetail />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/products/:productId" element={<ProductDetail />} />
        <Route path="/daily-price-update" element={<DailyPriceUpdate />} />
        <Route path="/quick-bill" element={<QuickBill />} />
        <Route path="/bill-history" element={<BillHistory />} />
        <Route path="/bills/:id" element={<BillDetail />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/customers/:customerId" element={<CustomerDetailPage />} />
        <Route path="/kadan" element={<Kadan />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      {/* Owner-only routes */}
      <Route element={<OwnerOnlyLayout />}>
        <Route path="/employees/add" element={<AddEmployee />} />
        <Route path="/report" element={<Navigate to="/reports" replace />} />
        <Route path="/reports" element={<ReportsHub />} />
        <Route path="/reports/monthly" element={<MonthlyReport />} />
        <Route path="/reports/weekly" element={<WeeklyReport />} />
        <Route path="/reports/daily" element={<DailyReport />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

import { useState } from "react";
import { Routes, Route, Navigate, useParams } from "react-router-dom";
import MerchantLayout from "../components/layout/MerchantLayout";
import ProtectedRoute from "../components/auth/ProtectedRoute";

// Page Components
import Dashboard from "../pages/dashboard/Dashboard";
import Products from "../pages/products/Products";
import ProductDetail from "../pages/products/ProductDetail";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import LandingPage from "../pages/landing/LandingPage";
import QuickBill from "../pages/billing/QuickBill";
import Customers from "../pages/customers/Customers";
import CustomerDetail from "../pages/customers/CustomerDetail";
import Kadan from "../pages/kadan/Kadan";
import Reports from "../pages/reports/Reports";
import DailyPriceUpdate from "../pages/products/DailyPriceUpdate";
import BillHistory from "../pages/billing/BillHistory";
import BillDetail from "../pages/billing/BillDetail";
import AddProduct from "../pages/products/AddProduct";
import AddEmployee from "../pages/employees/AddEmployee";

// Layout Wrappers
function DailyPriceUpdateWrapper() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <MerchantLayout
      title="Daily Price Update"
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder="Search products..."
      hideSearch={true}
    >
      <DailyPriceUpdate searchTerm={searchTerm} />
    </MerchantLayout>
  );
}

function DashboardWrapper() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <MerchantLayout
      title="Dashboard"
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder="Search dashboard..."
      hideSearch={true}
    >
      <Dashboard searchTerm={searchTerm} />
    </MerchantLayout>
  );
}

function ProductsWrapper() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <MerchantLayout
      title="Products"
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder="Search product, barcode, or SKU"
    >
      <Products searchTerm={searchTerm} />
    </MerchantLayout>
  );
}

function AddProductWrapper() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <MerchantLayout
      title="Add Product"
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder="Search products..."
    >
      <AddProduct />
    </MerchantLayout>
  );
}

function ProductDetailWrapper() {
  return (
    <MerchantLayout
      title="Product Details"
      hideSearch={true}
    >
      <ProductDetail />
    </MerchantLayout>
  );
}

function QuickBillWrapper() {
  return (
    <MerchantLayout
      title="Quick Bill"
      hideSearch={true}
    >
      <QuickBill />
    </MerchantLayout>
  );
}

function CustomersWrapper() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <MerchantLayout
      title="Customers"
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder="Search customers..."
    >
      <Customers searchTerm={searchTerm} />
    </MerchantLayout>
  );
}

function CustomerDetailWrapper() {
  const { customerId } = useParams();
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <MerchantLayout
      title="Customer Details"
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
    >
      <CustomerDetail key={customerId} />
    </MerchantLayout>
  );
}

function KadanWrapper() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <MerchantLayout
      title="Kadan Management"
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder="Search kadan records..."
    >
      <Kadan searchTerm={searchTerm} />
    </MerchantLayout>
  );
}

function ReportsWrapper() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <MerchantLayout
      title="Sales Reports"
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder="Search reports..."
    >
      <Reports searchTerm={searchTerm} />
    </MerchantLayout>
  );
}

function BillHistoryWrapper() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <MerchantLayout
      title="Bill History"
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder="Search bills..."
    >
      <BillHistory searchTerm={searchTerm} />
    </MerchantLayout>
  );
}

function BillDetailWrapper() {
  return (
    <MerchantLayout
      title="Bill Detail"
      hideSearch={true}
    >
      <BillDetail />
    </MerchantLayout>
  );
}

function AddEmployeeWrapper() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <MerchantLayout
      title="Add Employee"
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder="Search staff..."
    >
      <AddEmployee />
    </MerchantLayout>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<LandingPage />} />

      {/* Authentication */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Backward-compatible registration URL.
          Setup page has been removed. */}
      <Route path="/setup" element={<Navigate to="/register" replace />} />
      <Route path="/signup" element={<Navigate to="/register" replace />} />

      {/* Protected Merchant Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardWrapper />
          </ProtectedRoute>
        }
      />

      <Route
        path="/daily-price-update"
        element={
          <ProtectedRoute>
            <DailyPriceUpdateWrapper />
          </ProtectedRoute>
        }
      />

      <Route
        path="/price-update"
        element={<Navigate to="/daily-price-update" replace />}
      />

      <Route
        path="/bill-history"
        element={
          <ProtectedRoute>
            <BillHistoryWrapper />
          </ProtectedRoute>
        }
      />

      <Route
        path="/bills/:id"
        element={
          <ProtectedRoute>
            <BillDetailWrapper />
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <ReportsWrapper />
          </ProtectedRoute>
        }
      />

      <Route
        path="/sales-reports"
        element={<Navigate to="/reports" replace />}
      />

      <Route
        path="/quick-bill"
        element={
          <ProtectedRoute>
            <QuickBillWrapper />
          </ProtectedRoute>
        }
      />

      <Route
        path="/customers"
        element={
          <ProtectedRoute>
            <CustomersWrapper />
          </ProtectedRoute>
        }
      />

      <Route
        path="/customers/:customerId"
        element={
          <ProtectedRoute>
            <CustomerDetailWrapper />
          </ProtectedRoute>
        }
      />

      <Route
        path="/kadan"
        element={
          <ProtectedRoute>
            <KadanWrapper />
          </ProtectedRoute>
        }
      />

      <Route
        path="/products"
        element={
          <ProtectedRoute>
            <ProductsWrapper />
          </ProtectedRoute>
        }
      />

      <Route
        path="/products/add"
        element={
          <ProtectedRoute>
            <AddProductWrapper />
          </ProtectedRoute>
        }
      />

      <Route
        path="/products/detail"
        element={
          <ProtectedRoute>
            <ProductDetailWrapper />
          </ProtectedRoute>
        }
      />

      <Route
        path="/employees/add"
        element={
          <ProtectedRoute allowedRoles={["OWNER"]}>
            <AddEmployeeWrapper />
          </ProtectedRoute>
        }
      />

      <Route
        path="/products/:id"
        element={
          <ProtectedRoute>
            <ProductDetailWrapper />
          </ProtectedRoute>
        }
      />

      {/* Fallback Route */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

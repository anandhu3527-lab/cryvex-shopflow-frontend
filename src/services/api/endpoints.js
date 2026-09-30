/**
 * Central API Endpoints Registry
 * Matched with CRYVEX SHOPFLOW API Swagger Docs:
 * https://shopflowbackend-production.up.railway.app/docs
 */

const BILLS_ENDPOINT = "/api/v1/bills";

export const ENDPOINTS = {
  HEALTH: "/health",
  HEALTH_DATABASE: "/health/database",
  AUTH: {
    LOGIN: "/api/v1/auth/login",
    REGISTER: "/api/v1/auth/register",
    ME: "/api/v1/auth/me",
    EMPLOYEES: "/api/v1/users/employees",
    CREATE_EMPLOYEE: "/api/v1/users/employees",
  },
  PRODUCTS: {
    LIST: "/api/v1/products",
    CREATE: "/api/v1/products",
    SEARCH: (q) => `/api/v1/products/search?q=${encodeURIComponent(q)}`,
    LOW_STOCK: "/api/v1/products/low-stock",
    STOCK: "/api/v1/products/stock",
    DETAIL: (id) => `/api/v1/products/${id}`,
    BARCODE: (barcode) => `/api/v1/products/barcode/${encodeURIComponent(barcode)}`,
    VARIANT: (id) => `/api/v1/products/variant/${id}`,
    UPDATE_INVENTORY: (id) => `/api/v1/products/variants/${id}/inventory`,
    CATEGORIES: "/api/v1/categories",
  },
  BILLS: {
    LIST: BILLS_ENDPOINT,
  },
  BILLING: {
    BILLS: BILLS_ENDPOINT,
    CREATE_BILL: BILLS_ENDPOINT,
    DETAIL: (id) => `/api/v1/bills/${id}`,
    BY_NUMBER: (number) => `/api/v1/bills/number/${number}`,
    DATE_SUMMARY: (date) => `/api/v1/bills/date-summary?date=${date}`,
  },
  CUSTOMERS: {
    LIST: "/api/v1/customers",
    DETAIL: (id) => `/api/v1/customers/${id}`,
    BILLS: (id) => `/api/v1/customers/${id}/bills`,
    CREDIT_BILLS: (id) => `/api/v1/customers/${id}/credit-bills`,
  },
  KADAN: {
    SUMMARY: "/api/v1/kadan/summary",
    ACCOUNTS: "/api/v1/kadan/accounts",
    CUSTOMER: (id) => `/api/v1/kadan/customer/${id}`,
    TRANSACTIONS: (id) => `/api/v1/kadan/customer/${id}/transactions`,
    TRANSACTION_DETAIL: (id) => `/api/v1/kadan/transactions/${id}`,
    RECEIVE_PAYMENT: (id) => `/api/v1/kadan/customer/${id}/payment`,
  },
  REPORTS: {
    MONTHLY: (month) => `/api/v1/reports/monthly?month=${month}`,
    WEEKLY: (weekStart) => `/api/v1/reports/weekly?week_start=${weekStart}`,
    MOST_SOLD: (month) => `/api/v1/reports/most-sold-product?month=${month}`,
    LAST_3_MONTHS: "/api/v1/reports/most-sold-products/last-3-months",
  },
  TENANTS: {
    ME: "/api/v1/tenants/me",
  },
  AUDIT_LOGS: {
    LIST: "/api/v1/audit-logs/",
    DETAIL: (id) => `/api/v1/audit-logs/${id}`,
  },
};

export default ENDPOINTS;

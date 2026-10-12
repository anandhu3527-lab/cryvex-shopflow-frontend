/**
 * Central Services Index
 * Unified entry point for all API and Data services
 */

// ── API Clients ──────────────────────────────────────────────────────────────
export * from "./api/client";
export * from "./api/endpoints";

// Auth & User
export * from "./api/authApi";
export * from "./api/employeeApi";

// Products & Inventory
export * from "./api/productApi";
export * from "./api/inventoryApi";

// Billing
export * from "./api/billingApi";

// Customers
export * from "./api/customerApi";

// Kadan (Credit Ledger)
export * from "./api/kadanApi";

// Reports & Analytics
export * from "./api/reportsApi";

// Shop / Tenant
export * from "./api/shopApi";

// Audit Logs
export * from "./api/auditApi";

// ── Data Services (transformation + business logic layer) ────────────────────
export * from "./data/billingDataService";
export * from "./data/productDataService";
export * from "./data/customerDataService";
export * from "./data/kadanDataService";
export * from "./data/reportsDataService";
export * from "./data/authDataService";

// ── Error Handling ───────────────────────────────────────────────────────────
export * from "./error/errorHandler";

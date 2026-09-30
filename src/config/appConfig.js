/**
 * Application Configuration
 * Centralized settings, feature flags, and environment configurations
 */

export const APP_CONFIG = {
  appName: "Cryvex ShopFlow",
  appSubtitle: "Management Suite",
  version: "1.0.0",
  currency: {
    symbol: "₹",
    code: "INR",
    locale: "en-IN",
  },
  api: {
    baseUrl:
      import.meta.env.VITE_API_BASE_URL !== undefined && import.meta.env.VITE_API_BASE_URL !== ""
        ? import.meta.env.VITE_API_BASE_URL
        : import.meta.env.PROD
          ? "https://shopflowbackend-production.up.railway.app"
          : "",
    docsUrl: "https://shopflowbackend-production.up.railway.app/docs",
    timeoutMs: 15000,
  },
  defaultPagination: {
    pageSize: 10,
  },
  dateFormat: "DD/MM/YYYY",
};

export default APP_CONFIG;

/**
 * Reports & Analytics Data Service
 * Central data management for timeframe sales metrics and trend KPIs
 */

import { reportsApi } from "../api/reportsApi";
import { billingApi } from "../api/billingApi";

export const reportsDataService = {
  /**
   * Get report data for a given timeframe label.
   * Fetches from live backend API.
   */
  async getTimeframeData(timeframe = "This Week") {
    const now = new Date();
    if (timeframe === "Today") {
      const date = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
      ].join("-");
      return billingApi.getDateSummary(date);
    }
    if (timeframe === "This Week") {
      // Use weekly report with the current week's Monday as start
      const monday = new Date(now);
      monday.setDate(now.getDate() - now.getDay() + 1);
      const weekStart = monday.toISOString().split("T")[0];
      return reportsApi.getWeeklyReport(weekStart);
    } else if (timeframe === "This Month") {
      const month = now.toISOString().slice(0, 7); // YYYY-MM
      return reportsApi.getMonthlyReport(month);
    }
    // Default: weekly
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1);
    const weekStart = monday.toISOString().split("T")[0];
    return reportsApi.getWeeklyReport(weekStart);
  },

  /**
   * Get most-sold products for the last 3 months.
   * GET /api/v1/reports/most-sold-products/last-3-months
   */
  async getMostSoldProducts() {
    return reportsApi.getLast3MonthsMostSold();
  },

  /**
   * Get most-sold product for a specific month.
   * GET /api/v1/reports/most-sold-product?month=YYYY-MM
   */
  async getMostSoldProduct(month) {
    return reportsApi.getMostSoldProduct(month);
  },
};

export default reportsDataService;

import { apiClient } from "./client";
import { ENDPOINTS } from "./endpoints";

export const reportsApi = {
  /**
   * Get Monthly Report
   * GET /api/v1/reports/monthly?month=YYYY-MM
   */
  getMonthlyReport(month) {
    return apiClient.get(ENDPOINTS.REPORTS.MONTHLY(month));
  },

  /**
   * Get Weekly Report
   * GET /api/v1/reports/weekly?week_start=YYYY-MM-DD
   */
  getWeeklyReport(weekStart) {
    return apiClient.get(ENDPOINTS.REPORTS.WEEKLY(weekStart));
  },

  /**
   * Get Most Sold Product by Month
   * GET /api/v1/reports/most-sold-product?month=YYYY-MM
   */
  getMostSoldProduct(month) {
    return apiClient.get(ENDPOINTS.REPORTS.MOST_SOLD(month));
  },

  /**
   * Get Most Sold Products in Last 3 Months
   * GET /api/v1/reports/most-sold-products/last-3-months
   */
  getLast3MonthsMostSold() {
    return apiClient.get(ENDPOINTS.REPORTS.LAST_3_MONTHS);
  },
};

export default reportsApi;

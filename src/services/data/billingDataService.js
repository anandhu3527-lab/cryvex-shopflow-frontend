/**
 * Billing Data Service
 * Central data management for invoices, bills, and payment processing
 */

import { billingApi } from "../api/billingApi";
import { calculateBillSummary } from "../../utils/calculations/billCalculations";
import { queryCache } from "./queryCache";

export const PAYMENT_METHODS = [
  { key: "cash", label: "Cash" },
  { key: "upi", label: "UPI" },
];

export const billingDataService = {
  /**
   * Get recent bills from backend API
   * GET /api/v1/bills?limit=4
   */
  async getRecentBills() {
    return queryCache.fetch("bills:recent", () => billingApi.getBills(4, 0), 30_000);
  },

  async getDateSummary(date) {
    return queryCache.fetch(`bills:date:${date}`, () => billingApi.getDateSummary(date), 120_000);
  },

  /**
   * Get full bill history from backend API
   * GET /api/v1/bills?limit=50&offset=0
   */
  async getBillHistory(limit = 50, offset = 0) {
    const pageLimit = typeof limit === "object" && limit !== null ? (limit.limit ?? 50) : limit;
    const pageOffset = typeof limit === "object" && limit !== null ? (limit.offset ?? 0) : offset;
    const cacheKey = `bills:history:${pageLimit}:${pageOffset}`;
    const res = await queryCache.fetch(cacheKey, () => billingApi.getBills(pageLimit, pageOffset), 30_000);
    const list = Array.isArray(res)
      ? res
      : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res?.bills)
            ? res.bills
            : Array.isArray(res?.items)
              ? res.items
              : [];
    return Object.assign([...list], {
      data: list,
      raw: res,
    });
  },

  async createBill(billData) {
    const result = await billingApi.createBill(billData);
    // Invalidate bill caches so dashboard/history refresh on next visit
    queryCache.invalidatePrefix("bills:");
    return result;
  },

  calculateBill(items, discount = 0) {
    return calculateBillSummary(items, discount);
  },
};

export default billingDataService;

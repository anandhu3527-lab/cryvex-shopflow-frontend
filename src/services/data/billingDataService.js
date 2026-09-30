/**
 * Billing Data Service
 * Central data management for invoices, bills, and payment processing
 */

import { billingApi } from "../api/billingApi";
import { calculateBillSummary } from "../../utils/calculations/billCalculations";

export const PAYMENT_METHODS = [
  { key: "cash", label: "Cash" },
  { key: "upi", label: "UPI" },
  { key: "card", label: "Card" },
  { key: "kadan", label: "Kadan (Credit)" },
];

export const billingDataService = {
  /**
   * Get recent bills from backend API
   * GET /api/v1/bills?limit=4
   */
  async getRecentBills() {
    return billingApi.getBills(4, 0);
  },

  async getDateSummary(date) {
    return billingApi.getDateSummary(date);
  },

  /**
   * Get full bill history from backend API
   * GET /api/v1/bills?limit=50&offset=0
   */
  async getBillHistory(limit = 50, offset = 0) {
    if (typeof limit === "object" && limit !== null) {
      const { limit: pageLimit = 50, offset: pageOffset = 0 } = limit;
      return billingApi.getBills(pageLimit, pageOffset);
    }
    return billingApi.getBills(limit, offset);
  },

  calculateBill(items, discount = 0) {
    return calculateBillSummary(items, discount);
  },
};

export default billingDataService;

import { apiClient } from "./client";
import { ENDPOINTS } from "./endpoints";

export const billingApi = {
  /**
   * Get All Bills
   * GET /api/v1/bills?limit=50&offset=0
   */
  getBills(limit = 50, offset = 0) {
    const params = typeof limit === "object" && limit !== null ? limit : { limit, offset };
    const normalizedLimit = Number.isFinite(Number(params.limit)) ? Number(params.limit) : 50;
    const normalizedOffset = Number.isFinite(Number(params.offset)) ? Number(params.offset) : 0;
    const endpoint = `${ENDPOINTS.BILLS.LIST}?limit=${normalizedLimit}&offset=${normalizedOffset}`;
    return apiClient.get(endpoint);
  },

  /**
   * Get Bill by ID
   * GET /api/v1/bills/{bill_id}
   */
  getBillById(id) {
    return apiClient.get(ENDPOINTS.BILLING.DETAIL(id));
  },

  /**
   * Get Bill by Bill Number
   * GET /api/v1/bills/number/{bill_number}
   */
  getBillByNumber(number) {
    return apiClient.get(ENDPOINTS.BILLING.BY_NUMBER(number));
  },

  /**
   * Create New Bill
   * POST /api/v1/bills
   */
  createBill(billData) {
    return apiClient.post(ENDPOINTS.BILLING.CREATE_BILL, billData);
  },

  /**
   * Get Date Summary of Bills
   * GET /api/v1/bills/date-summary?date=YYYY-MM-DD
   */
  getDateSummary(date) {
    return apiClient.get(ENDPOINTS.BILLING.DATE_SUMMARY(date));
  },

  /**
   * Historical bills alias
   */
  getBillHistory(limit = 50, offset = 0) {
    return this.getBills(limit, offset);
  },
};

export default billingApi;

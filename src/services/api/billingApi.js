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
   *
   * Note:
   * Tenant and user IDs are taken from authenticated session.
   * Frontend does NOT send: tenant_id, user_id, total_amount.
   * Defaults customer_name to "Walk-in Customer" if not entered.
   */
  async createBill(billData = {}) {
    // Strip fields forbidden by the backend endpoint contract.
    // Tenant, user, and total amount are always derived from the authenticated session and backend calculations.
    const { tenant_id, user_id, total_amount, ...rest } = billData || {};

    const rawName = typeof rest.customer_name === "string" ? rest.customer_name.trim() : (rest.customer_name ?? "");
    const rawPhone = (rest.customer_phone ?? "").toString().replace(/\D/g, "").slice(0, 10);

    // Backend rule: BOTH customer fields must be provided together, or BOTH must be null.
    // If either is missing or is the walk-in placeholder, send both as null.
    const hasValidName = rawName.length > 0 && rawName.toLowerCase() !== "walk-in customer";
    const hasValidPhone = rawPhone.length === 10;
    const hasBothCustomerDetails = hasValidName && hasValidPhone;

    const normalizedDiscount = Number(rest.discount_amount ?? rest.discount ?? 0);
    const normalizedPaid = Number(rest.paid_amount ?? 0);
    const safeDiscount = Number.isFinite(normalizedDiscount) && normalizedDiscount >= 0 ? normalizedDiscount : 0;
    const safePaid = Number.isFinite(normalizedPaid) && normalizedPaid >= 0 ? normalizedPaid : 0;
    const normalizedPaymentMethod = (rest.payment_method ?? "CASH").toString().trim().toUpperCase();

    const payload = {
      customer_name: hasBothCustomerDetails ? rawName : null,
      customer_phone: hasBothCustomerDetails ? rawPhone : null,
      items: Array.isArray(rest.items)
        ? rest.items.map((item) => ({
            variant_id: item?.variant_id ?? item?.variantId ?? null,
            quantity: Number.isFinite(Number(item?.quantity ?? item?.qty ?? 1))
              ? Math.max(1, Number(item.quantity ?? item.qty ?? 1))
              : 1,
          }))
        : [],
      discount_amount: safeDiscount,
      paid_amount: safePaid,
      payment_method: normalizedPaymentMethod,
    };

    const response = await apiClient.post(ENDPOINTS.BILLING.CREATE_BILL, payload);
    return response;
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

import { apiClient } from "./client";
import { ENDPOINTS } from "./endpoints";

export const kadanApi = {
  /**
   * Get Kadan Summary
   * GET /api/v1/kadan/summary
   */
  getSummary() {
    return apiClient.get(ENDPOINTS.KADAN.SUMMARY);
  },

  /**
   * Get Kadan Customer Accounts
   * GET /api/v1/kadan/accounts
   */
  getAccounts(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `${ENDPOINTS.KADAN.ACCOUNTS}?${query}` : ENDPOINTS.KADAN.ACCOUNTS;
    return apiClient.get(endpoint);
  },

  /**
   * Alias for backward compatibility
   */
  getKadanRecords(params = {}) {
    return this.getAccounts(params);
  },

  /**
   * Get Customer Ledger Summary
   * GET /api/v1/kadan/customer/{customer_id}
   */
  getCustomerLedger(customerId) {
    return apiClient.get(ENDPOINTS.KADAN.CUSTOMER(customerId));
  },

  /**
   * Get Customer Kadan Transactions
   * GET /api/v1/kadan/customer/{customer_id}/transactions
   */
  getCustomerTransactions(customerId) {
    return apiClient.get(ENDPOINTS.KADAN.TRANSACTIONS(customerId));
  },

  /**
   * Get Single Transaction Detail
   * GET /api/v1/kadan/transactions/{transaction_id}
   */
  getTransactionDetail(transactionId) {
    return apiClient.get(ENDPOINTS.KADAN.TRANSACTION_DETAIL(transactionId));
  },

  /**
   * Record Payment received from customer
   * POST /api/v1/kadan/customer/{customer_id}/payment
   */
  receivePayment(customerId, paymentData) {
    return apiClient.post(ENDPOINTS.KADAN.RECEIVE_PAYMENT(customerId), paymentData);
  },
};

export default kadanApi;

/**
 * Kadan (Credit/Khata) Data Service
 * Central data management for customer debt, credit ledger, and settlements
 */

import { kadanApi } from "../api/kadanApi";

export const kadanDataService = {
  /**
   * Get all Kadan customer accounts from backend API
   * GET /api/v1/kadan/accounts
   */
  async getKadanRecords(params = {}) {
    return kadanApi.getAccounts(params);
  },

  /**
   * Get Kadan summary totals
   * GET /api/v1/kadan/summary
   */
  async getSummary() {
    return kadanApi.getSummary();
  },

  /**
   * Get individual customer ledger
   * GET /api/v1/kadan/customer/{id}
   */
  async getCustomerLedger(customerId) {
    return kadanApi.getCustomerLedger(customerId);
  },

  /**
   * Get customer transactions
   * GET /api/v1/kadan/customer/{id}/transactions
   */
  async getCustomerTransactions(customerId) {
    return kadanApi.getCustomerTransactions(customerId);
  },

  /**
   * Record payment from customer
   * POST /api/v1/kadan/customer/{id}/payment
   */
  async receivePayment(customerId, paymentData) {
    return kadanApi.receivePayment(customerId, paymentData);
  },

  computeTotals(records = []) {
    return records.reduce(
      (acc, r) => ({
        totalCredit: acc.totalCredit + (r.totalCredit || r.total_credit || 0),
        totalPaid: acc.totalPaid + (r.paid || r.total_paid || 0),
        totalBalance: acc.totalBalance + (r.balance || r.outstanding_balance || 0),
      }),
      { totalCredit: 0, totalPaid: 0, totalBalance: 0 }
    );
  },
};

export default kadanDataService;

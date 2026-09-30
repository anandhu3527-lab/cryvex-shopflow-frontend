/**
 * Customers Data Service
 * Central data management for customer profiles and directory
 */

import { customerApi } from "../api/customerApi";

export const customerDataService = {
  /**
   * Get all customers from backend API
   * GET /api/v1/customers
   */
  async getCustomers(params = {}) {
    return customerApi.getCustomers(params);
  },

  /**
   * Create new customer
   * POST /api/v1/customers
   */
  async createCustomer(customerData) {
    return customerApi.createCustomer(customerData);
  },

  /**
   * Get customer by ID
   * GET /api/v1/customers/{id}
   */
  async getCustomerById(id) {
    return customerApi.getCustomerById(id);
  },

  /**
   * Get customer bills
   * GET /api/v1/customers/{customer_id}/bills
   */
  async getCustomerBills(id) {
    return customerApi.getCustomerBills(id);
  },
};

export default customerDataService;

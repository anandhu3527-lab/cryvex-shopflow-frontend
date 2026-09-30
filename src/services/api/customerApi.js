import { apiClient } from "./client";
import { ENDPOINTS } from "./endpoints";

export const customerApi = {
  /**
   * Get All Customers
   * GET /api/v1/customers
   */
  getCustomers(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `${ENDPOINTS.CUSTOMERS.LIST}?${query}` : ENDPOINTS.CUSTOMERS.LIST;
    return apiClient.get(endpoint);
  },

  /**
   * Get Customer by ID
   * GET /api/v1/customers/{customer_id}
   */
  getCustomerById(id) {
    return apiClient.get(ENDPOINTS.CUSTOMERS.DETAIL(id));
  },

  /**
   * Create New Customer
   * POST /api/v1/customers
   */
  createCustomer(customerData) {
    return apiClient.post(ENDPOINTS.CUSTOMERS.LIST, customerData);
  },

  /**
   * Get Customer Bills
   * GET /api/v1/customers/{customer_id}/bills
   */
  getCustomerBills(id) {
    return apiClient.get(ENDPOINTS.CUSTOMERS.BILLS(id));
  },

  /**
   * Get Customer Credit Bills
   * GET /api/v1/customers/{customer_id}/credit-bills
   */
  getCustomerCreditBills(id) {
    return apiClient.get(ENDPOINTS.CUSTOMERS.CREDIT_BILLS(id));
  },
};

export default customerApi;

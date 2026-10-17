/**
 * Customers Data Service
 * Central data management for customer profiles and directory
 */

import { customerApi } from "../api/customerApi";
import { queryCache } from "./queryCache";

/**
 * Safely extract customer ID from a bill object across possible API field structures
 * @param {object} bill
 * @returns {string|null}
 */
export function extractCustomerId(bill) {
  if (!bill || typeof bill !== "object") return null;

  const candidates = [
    bill.customer_id,
    bill.customerId,
    bill.customer?.id,
    bill.customer?.customer_id,
    bill.customer?.customerId,
    bill.kadan?.customer_id,
    bill.kadan?.customerId,
    bill.kadan_customer_id,
  ];

  for (const candidate of candidates) {
    if (candidate !== null && candidate !== undefined) {
      const str = String(candidate).trim();
      if (
        str &&
        str.toLowerCase() !== "null" &&
        str.toLowerCase() !== "undefined"
      ) {
        return str;
      }
    }
  }

  // If bill.customer itself is a string ID (e.g. UUID or CUST-xxx)
  if (typeof bill.customer === "string") {
    const str = bill.customer.trim();
    if (
      str &&
      str.toLowerCase() !== "walk-in customer" &&
      str.toLowerCase() !== "null" &&
      str.toLowerCase() !== "undefined"
    ) {
      // Check if it looks like an ID string (contains hyphens, or hex uuid, or starts with CUST)
      if (str.includes("-") || /^[a-f0-9]{8,}/i.test(str) || /^cust/i.test(str)) {
        return str;
      }
    }
  }

  return null;
}

/**
 * Unified customer resolution for bills:
 * - Match by customer ID against registered customer records
 * - No customer ID -> "Walk-in Customer"
 * - Customer ID found -> actual customer name & phone
 * - Customer ID exists but lookup fails -> "Unavailable Customer" (not classified as walk-in)
 *
 * @param {object} bill
 * @param {Map|Array|null} customersMapOrList
 * @returns {{ customerId: string|null, customerName: string, customerPhone: string, isWalkIn: boolean, isResolved: boolean, status: 'WALK_IN'|'MATCHED'|'NOT_FOUND' }}
 */
export function resolveCustomer(bill, customersMapOrList = null) {
  const customerId = extractCustomerId(bill);

  // 1. If the bill has no valid customer ID, display "Walk-in Customer"
  if (!customerId) {
    return {
      customerId: null,
      customerName: "Walk-in Customer",
      customerPhone: "",
      isWalkIn: true,
      isResolved: false,
      status: "WALK_IN",
    };
  }

  // Build or use customer lookup map
  let map = null;
  if (customersMapOrList instanceof Map) {
    map = customersMapOrList;
  } else if (Array.isArray(customersMapOrList)) {
    map = new Map();
    for (const c of customersMapOrList) {
      if (!c) continue;
      const ids = [c.id, c.customer_id, c.customerId].filter(Boolean);
      for (const id of ids) {
        const strId = String(id).trim();
        map.set(strId, c);
        map.set(strId.toLowerCase(), c);
      }
    }
  }

  let matchedCustomer = null;
  if (map) {
    matchedCustomer = map.get(customerId) || map.get(customerId.toLowerCase()) || null;
  }

  // If bill itself embeds the customer record matching this ID
  if (!matchedCustomer && bill?.customer && typeof bill.customer === "object") {
    const embId = bill.customer.id || bill.customer.customer_id || bill.customer.customerId;
    if (embId && String(embId).trim().toLowerCase() === customerId.toLowerCase()) {
      matchedCustomer = bill.customer;
    }
  }

  // 2. If matching customer found, display actual customer name and phone
  if (matchedCustomer) {
    const name = (matchedCustomer.name || matchedCustomer.customer_name || matchedCustomer.full_name || "").trim();
    const phone = (matchedCustomer.phone || matchedCustomer.phone_number || matchedCustomer.mobile || bill?.customer_phone || "").trim();

    return {
      customerId,
      customerName: name || "Unavailable Customer",
      customerPhone: phone,
      isWalkIn: false,
      isResolved: Boolean(name),
      status: "MATCHED",
    };
  }

  // 3. If customer ID exists but lookup fails, handle missing record appropriately
  // Never classify a bill with a customer ID as a walk-in customer
  return {
    customerId,
    customerName: "Unavailable Customer",
    customerPhone: (bill?.customer_phone || "").trim(),
    isWalkIn: false,
    isResolved: false,
    status: "NOT_FOUND",
  };
}

export const customerDataService = {
  /**
   * Get all customers from backend API (with query caching)
   * GET /api/v1/customers
   */
  async getCustomers(params = {}) {
    const hasParams = params && Object.keys(params).length > 0;
    if (hasParams) {
      return customerApi.getCustomers(params);
    }
    return queryCache.fetch("customers:all", () => customerApi.getCustomers(), 60_000);
  },

  /**
   * Get registered customers as an ID-indexed Map for O(1) bill mapping
   * @returns {Promise<Map<string, object>>}
   */
  async getCustomersMap() {
    try {
      const res = await this.getCustomers();
      const list = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.items)
            ? res.items
            : Array.isArray(res?.customers)
              ? res.customers
              : [];

      const map = new Map();
      for (const c of list) {
        if (!c) continue;
        const ids = [c.id, c.customer_id, c.customerId].filter(Boolean);
        for (const id of ids) {
          const strId = String(id).trim();
          map.set(strId, c);
          map.set(strId.toLowerCase(), c);
        }
      }
      return map;
    } catch {
      return new Map();
    }
  },

  /**
   * Create new customer
   * POST /api/v1/customers
   */
  async createCustomer(customerData) {
    const result = await customerApi.createCustomer(customerData);
    queryCache.invalidatePrefix("customers:");
    return result;
  },

  /**
   * Get customer by ID
   * GET /api/v1/customers/{id}
   */
  async getCustomerById(id) {
    if (!id) return null;
    return queryCache.fetch(`customers:detail:${id}`, () => customerApi.getCustomerById(id), 60_000);
  },

  /**
   * Get customer bills
   * GET /api/v1/customers/{customer_id}/bills
   */
  async getCustomerBills(id) {
    return customerApi.getCustomerBills(id);
  },

  extractCustomerId,
  resolveCustomer,
};

export default customerDataService;

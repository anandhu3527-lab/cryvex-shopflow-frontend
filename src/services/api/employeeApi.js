/**
 * Employee Management API Service
 * Centralized service for managing staff accounts under shop owner.
 * Connected to CRYVEX SHOPFLOW API:
 * - List Employees: GET /api/v1/users/employees (or embedded in GET /api/v1/tenants/me)
 * - Create Employee: POST /api/v1/users/employees
 */

import { apiClient } from "./client";
import { ENDPOINTS } from "./endpoints";

export const employeeApi = {
  /**
   * Get Employees / Staff List
   * GET /api/v1/users/employees
   */
  async getEmployees() {
    try {
      const response = await apiClient.get(ENDPOINTS.AUTH.EMPLOYEES);
      return Array.isArray(response) ? response : response?.employees || response?.data || [];
    } catch {
      // Fallback to tenant endpoint if GET /users/employees is restricted
      const tenantRes = await apiClient.get(ENDPOINTS.TENANTS.ME);
      return tenantRes?.employees || tenantRes?.data?.employees || [];
    }
  },

  /**
   * Create Employee / Staff Account
   * POST /api/v1/users/employees
   * @param {{ name: string, phone_number: string, password: string, role?: string, email?: string }} employeeData
   */
  async createEmployee(employeeData) {
    const payload = {
      name: String(employeeData?.name || "").trim(),
      email: employeeData?.email ? String(employeeData.email).trim() : null,
      phone_number: String(employeeData?.phone_number || employeeData?.phone || "").trim(),
      password: String(employeeData?.password || ""),
      role: String(employeeData?.role || "EMPLOYEE").toUpperCase(),
    };

    if (!payload.name || !payload.phone_number || !payload.password) {
      throw new Error("Name, phone number, and password are required.");
    }

    return apiClient.post(ENDPOINTS.AUTH.CREATE_EMPLOYEE, payload);
  },
};

export default employeeApi;

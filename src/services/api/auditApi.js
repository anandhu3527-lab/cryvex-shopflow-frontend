/**
 * Audit Logs API Service
 * Centralized service for viewing system audit/activity logs.
 * Connected to CRYVEX SHOPFLOW API:
 * - GET /api/v1/audit-logs/          — List audit logs (filterable)
 * - GET /api/v1/audit-logs/{id}      — Get single audit log detail
 */

import { apiClient } from "./client";
import { ENDPOINTS } from "./endpoints";

export const auditApi = {
  /**
   * List Audit Logs
   * GET /api/v1/audit-logs/
   * Supports filters: action, entity_type, entity_id, user_id, start_date, end_date, limit, offset
   * @param {object} params - Optional query params
   */
  getLogs(params = {}) {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""))
    ).toString();
    const endpoint = query ? `${ENDPOINTS.AUDIT_LOGS.LIST}?${query}` : ENDPOINTS.AUDIT_LOGS.LIST;
    return apiClient.get(endpoint);
  },

  /**
   * Get Single Audit Log Detail
   * GET /api/v1/audit-logs/{audit_id}
   */
  getLogById(auditId) {
    return apiClient.get(ENDPOINTS.AUDIT_LOGS.DETAIL(auditId));
  },
};

export default auditApi;

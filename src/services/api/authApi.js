/**
 * Authentication & Security API Service
 * CRYVEX SHOPFLOW Enterprise Security Standards
 * Connects to Cryvex Authentication Endpoints:
 * - Registration: POST /api/v1/auth/register
 * - Login: POST /api/v1/auth/login
 * - Session Profile: GET /api/v1/auth/me
 */

import { apiClient } from "./client";
import { ENDPOINTS } from "./endpoints";

export const authApi = {
  /**
   * User Login with Phone Number OR Email ID and Password
   *
   * @param {{ identifier: string, password: string }} credentials
   * @returns {Promise<{ success: boolean, message: string, access_token: string, user?: object }>}
   */
  async login(credentials) {
    const { identifier, password } = credentials || {};

    if (!identifier || !password) {
      throw new Error("Phone/Email and password are required.");
    }

    try {
      const response = await apiClient.post(ENDPOINTS.AUTH.LOGIN, {
        identifier: identifier.trim(),
        password,
      });

      const authData = response?.data || response;
      if (authData?.access_token) {
        apiClient.setToken(authData.access_token, response);
      }

      return {
        success: true,
        message: response?.message || "Login successful!",
        access_token: authData?.access_token,
        token_type: authData?.token_type || "bearer",
        expires_in: authData?.expires_in ?? authData?.expiresIn,
        expires_at: authData?.expires_at ?? authData?.expiresAt,
      };
    } catch (err) {
      // Map API errors to exact requirements without exposing database internals
      const status = err?.status || err?.details?.status;
      const rawDetail = (err?.data?.detail || err?.message || "").toLowerCase();

      if (status === 429 || rawDetail.includes("rate limit") || rawDetail.includes("too many")) {
        // Server-side rate limit — backend brute-force protection is active
        throw new Error("Too many login attempts. Please wait a moment before trying again.");
      } else if (status === 401 || rawDetail.includes("invalid") || rawDetail.includes("credential")) {
        throw new Error("Invalid phone/email or password.");
      } else if (status === 404 || rawDetail.includes("not found")) {
        throw new Error("Account not found. Please create an account to continue.");
      } else if (status === 403 || rawDetail.includes("not verified") || rawDetail.includes("inactive")) {
        throw new Error("Account not verified. Please contact administrator.");
      } else if (rawDetail.includes("timeout") || rawDetail.includes("aborted")) {
        throw new Error("Request timed out. Please check your internet connection and try again.");
      } else if (rawDetail.includes("network") || rawDetail.includes("failed to fetch")) {
        throw new Error("Network error. Please check your internet connection and try again.");
      } else if (typeof status === "number" && status >= 500) {
        throw new Error("Server error. Please try again in a few moments.");
      }

      throw new Error(err?.message || "Invalid phone/email or password.");
    }
  },

  /**
   * User & Shop Registration
   * Registers a new user account with Name, Phone Number, Email ID, and Password
   *
   * @param {{ name: string, phoneNumber?: string, phone?: string, email?: string, password: string, shopName?: string, address?: string }} registrationData
   * @returns {Promise<{ success: boolean, message: string, user?: object, shop?: object }>}
   */
  async register(registrationData) {
    const shopData = registrationData.shop || {};
    const userData = registrationData.user || {};
    const name = (userData.name || registrationData.name || "").trim();
    const phone = (userData.phone_number || userData.phone || registrationData.phoneNumber || registrationData.phone || "").trim();
    const email = (userData.email || registrationData.email || registrationData.emailAddress || "").trim();
    const password = userData.password || registrationData.password;
    const shopName = (shopData.name || registrationData.shopName || `${name}'s Store`).trim();
    const shopPhone = (shopData.phone_number || registrationData.shopPhoneNumber || "").trim();
    const shopEmail = (shopData.email || registrationData.shopEmailAddress || "").trim();
    const address = (shopData.address || registrationData.shopAddress || registrationData.address || "Cryvex Business Location").trim();

    // Prepare standard Cryvex API registration schema
    const payload = {
      shop: {
        name: shopName,
        business_name: registrationData.businessName || shopName,
        phone_number: shopPhone || null,
        email: shopEmail || null,
        address: address || null,
        ...(shopData.gstin || registrationData.gstin
          ? { gstin: shopData.gstin || registrationData.gstin }
          : {}),
      },
      user: {
        name,
        phone_number: phone,
        email: email || null,
        password,
      },
    };

    try {
      const response = await apiClient.post(ENDPOINTS.AUTH.REGISTER, payload);

      return {
        success: true,
        message: "Account created successfully. Please login to continue.",
        user: response?.user,
        shop: response?.shop,
      };
    } catch (err) {
      // Categorize backend errors
      const status = err?.status || err?.details?.status;
      const rawDetail = (err?.data?.detail || err?.message || "").toString();

      if (rawDetail.includes("already registered") || rawDetail.includes("unique") || rawDetail.includes("exists")) {
        throw new Error("An account with this phone number or email already exists. Please login instead.");
      } else if (status === 422) {
        throw new Error(err?.message || "Invalid registration details. Please verify your phone and email format.");
      } else if (rawDetail.includes("timeout") || rawDetail.includes("network") || rawDetail.includes("failed to fetch")) {
        throw new Error("Network error during registration. Please verify your connection.");
      } else if (status >= 500) {
        throw new Error("Server error. Please try again shortly or contact support.");
      }

      throw new Error(err?.message || "Failed to create account. Please check your details and try again.");
    }
  },

  /**
   * Get Current Authenticated Profile
   * GET /api/v1/auth/me
   */
  async getProfile() {
    return apiClient.get(ENDPOINTS.AUTH.ME);
  },

  /**
   * Update Profile Details
   * PATCH /api/v1/auth/me
   */
  async updateProfile(data) {
    return apiClient.patch(ENDPOINTS.AUTH.ME, data);
  },

  /**
   * Get Current Shop Details
   * GET /api/v1/tenants/me
   */
  async getTenant() {
    return apiClient.get(ENDPOINTS.TENANTS.ME);
  },

  /**
   * Update current shop details
   * PATCH /api/v1/tenants/me
   */
  async updateTenant(data) {
    return apiClient.patch(ENDPOINTS.TENANTS.ME, data);
  },

  /**
   * Securely logout current session and clear stored tokens
   */
  logout() {
    apiClient.clearToken();
    try {
      localStorage.removeItem("cryvex_auth_lockout");
    } catch {
      // ignore
    }
  },

  /**
   * Check if a token currently exists in client storage
   */
  isAuthenticated() {
    const token = apiClient.getToken();
    return !!token && token.length > 10;
  },

  /**
   * Get Employees / Staff List
   * GET /api/v1/users/employees
   */
  async getEmployees() {
    return apiClient.get(ENDPOINTS.AUTH.EMPLOYEES);
  },

  /**
   * Create a new employee under the authenticated owner's shop
   * POST /api/v1/users/employees
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

    if (!/^(EMPLOYEE|MANAGER)$/.test(payload.role)) {
      throw new Error("Role must be EMPLOYEE or MANAGER.");
    }

    return apiClient.post(ENDPOINTS.AUTH.CREATE_EMPLOYEE, payload);
  },
};

export default authApi;

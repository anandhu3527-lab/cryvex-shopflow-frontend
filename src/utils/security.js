/**
 * Security & Anti-Abuse Utilities
 * Implements client-side Rate Limiting and Brute Force protection
 */

const LOCKOUT_KEY = "cryvex_auth_lockout";
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000; // 60 seconds lockout
const TOKEN_STORAGE_KEY = "cryvex_auth_token";
const TOKEN_EXPIRY_KEY = "cryvex_auth_expires_at";
const SESSION_NOTICE_KEY = "cryvex_session_notice";
const SESSION_EVENT = "cryvex:session-change";
const DEFAULT_SESSION_DURATION_MS = 60 * 60 * 1000;

function getJwtExpiry(token) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
    const expirySeconds = JSON.parse(decoded).exp;
    return Number.isFinite(expirySeconds) ? expirySeconds * 1000 : null;
  } catch {
    return null;
  }
}

function getExpiryFromResponse(token, authResponse) {
  const response = authResponse?.data || authResponse || {};
  const jwtExpiry = getJwtExpiry(token);
  if (jwtExpiry) return jwtExpiry;

  const explicitExpiry = response.expires_at ?? response.expiresAt ?? response.expiry;
  if (explicitExpiry !== undefined && explicitExpiry !== null) {
    const numericExpiry = Number(explicitExpiry);
    const parsedExpiry = Number.isFinite(numericExpiry)
      ? (numericExpiry < 1e12 ? numericExpiry * 1000 : numericExpiry)
      : Date.parse(explicitExpiry);
    if (Number.isFinite(parsedExpiry)) return parsedExpiry;
  }

  const durationSeconds = Number(response.expires_in ?? response.expiresIn);
  if (Number.isFinite(durationSeconds) && durationSeconds > 0) {
    return Date.now() + durationSeconds * 1000;
  }

  return Date.now() + DEFAULT_SESSION_DURATION_MS;
}

function dispatchSessionChange(reason) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: { reason } }));
  }
}

export const securityManager = {
  /**
   * Get current brute-force lockout status
   */
  getLockoutStatus() {
    try {
      const stored = localStorage.getItem(LOCKOUT_KEY);
      if (!stored) return { isLocked: false, remainingSeconds: 0, failedAttempts: 0 };

      const data = JSON.parse(stored);
      const now = Date.now();

      if (data.lockedUntil && now < data.lockedUntil) {
        const remainingSeconds = Math.ceil((data.lockedUntil - now) / 1000);
        return {
          isLocked: true,
          remainingSeconds,
          failedAttempts: data.failedAttempts || MAX_FAILED_ATTEMPTS,
        };
      }

      // If lockout period expired, reset lockout flag but keep clean state
      if (data.lockedUntil && now >= data.lockedUntil) {
        this.resetAttempts();
        return { isLocked: false, remainingSeconds: 0, failedAttempts: 0 };
      }

      return {
        isLocked: false,
        remainingSeconds: 0,
        failedAttempts: data.failedAttempts || 0,
      };
    } catch {
      return { isLocked: false, remainingSeconds: 0, failedAttempts: 0 };
    }
  },

  /**
   * Record a failed login attempt
   */
  recordFailedAttempt() {
    try {
      const status = this.getLockoutStatus();
      const newAttempts = status.failedAttempts + 1;
      const now = Date.now();

      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        const lockedUntil = now + LOCKOUT_DURATION_MS;
        localStorage.setItem(
          LOCKOUT_KEY,
          JSON.stringify({
            failedAttempts: newAttempts,
            lockedUntil,
          })
        );
        return { isLocked: true, remainingSeconds: 60, failedAttempts: newAttempts };
      }

      localStorage.setItem(
        LOCKOUT_KEY,
        JSON.stringify({
          failedAttempts: newAttempts,
          lockedUntil: null,
        })
      );

      return {
        isLocked: false,
        remainingSeconds: 0,
        failedAttempts: newAttempts,
        remainingAttempts: MAX_FAILED_ATTEMPTS - newAttempts,
      };
    } catch {
      return { isLocked: false, remainingSeconds: 0, failedAttempts: 0 };
    }
  },

  /**
   * Reset attempts on successful login
   */
  resetAttempts() {
    try {
      localStorage.removeItem(LOCKOUT_KEY);
    } catch {
      // ignore
    }
  },

  /**
   * Read the saved session expiry, deriving it from a JWT for older sessions.
   */
  getExpiryTime() {
    try {
      const savedExpiry = Number(localStorage.getItem(TOKEN_EXPIRY_KEY));
      if (Number.isFinite(savedExpiry) && savedExpiry > 0) return savedExpiry;

      const expiry = getJwtExpiry(this.getToken());
      if (expiry) localStorage.setItem(TOKEN_EXPIRY_KEY, String(expiry));
      return expiry;
    } catch {
      return null;
    }
  },

  /**
   * Establish a session using the backend expiry or the JWT exp claim.
   */
  setToken(token, authResponse = {}) {
    try {
      if (!token) {
        this.clearAuth({ reason: "logout" });
        return null;
      }

      const expiry = getExpiryFromResponse(token, authResponse);
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      localStorage.setItem("token", token);
      localStorage.removeItem("access_token");
      localStorage.setItem(TOKEN_EXPIRY_KEY, String(expiry));
      localStorage.removeItem(SESSION_NOTICE_KEY);
      dispatchSessionChange("authenticated");
      return expiry;
    } catch {
      return null;
    }
  },

  getToken() {
    try {
      return (
        localStorage.getItem(TOKEN_STORAGE_KEY) ||
        localStorage.getItem("token") ||
        localStorage.getItem("access_token") ||
        ""
      );
    } catch {
      return "";
    }
  },

  isAuthenticated() {
    const token = this.getToken();
    const expiry = this.getExpiryTime();
    return token.length > 10 && Number.isFinite(expiry) && Date.now() < expiry;
  },

  expireSession() {
    if (!this.getToken() && !this.getExpiryTime()) return false;
    return this.clearAuth({ reason: "expired", notify: true });
  },

  clearAuth({ reason = "logout", notify = false } = {}) {
    const hadSession = Boolean(this.getToken() || this.getExpiryTime());
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem("token");
      localStorage.removeItem("access_token");
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
      if (notify && hadSession) {
        localStorage.setItem(SESSION_NOTICE_KEY, reason);
      } else {
        localStorage.removeItem(SESSION_NOTICE_KEY);
      }
    } catch {
      // Keep the in-memory navigation and notification flow working if storage is unavailable.
    }
    if (hadSession) dispatchSessionChange(reason);
    return hadSession;
  },

  getSessionNotice() {
    try {
      return localStorage.getItem(SESSION_NOTICE_KEY);
    } catch {
      return null;
    }
  },

  dismissSessionNotice() {
    try {
      localStorage.removeItem(SESSION_NOTICE_KEY);
    } catch {
      // ignore
    }
    dispatchSessionChange("notice-dismissed");
  },

  isSessionStorageKey(key) {
    return [TOKEN_STORAGE_KEY, "token", "access_token", TOKEN_EXPIRY_KEY, SESSION_NOTICE_KEY].includes(key);
  },
};

export default securityManager;

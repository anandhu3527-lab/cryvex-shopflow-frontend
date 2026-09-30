import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { securityManager } from "../../utils/security";

const WARNING_BEFORE_EXPIRY_MS = 5 * 60 * 1000;
const MAX_TIMEOUT_MS = 2147483647;

export default function SessionMonitor() {
  const location = useLocation();
  const navigate = useNavigate();
  const locationRef = useRef(location);
  const warningDismissedRef = useRef(false);
  const redirectedRef = useRef(false);
  const warningTimerRef = useRef(null);
  const expiryTimerRef = useRef(null);
  const [showWarning, setShowWarning] = useState(false);
  const [sessionNotice, setSessionNotice] = useState(() => securityManager.getSessionNotice());

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    const clearTimers = () => {
      clearTimeout(warningTimerRef.current);
      clearTimeout(expiryTimerRef.current);
      warningTimerRef.current = null;
      expiryTimerRef.current = null;
    };

    const redirectToLogin = (reason) => {
      const currentLocation = locationRef.current;
      if (currentLocation.pathname === "/login" || redirectedRef.current) return;

      redirectedRef.current = true;
      const state = reason === "expired"
        ? {
            from: {
              pathname: currentLocation.pathname,
              search: currentLocation.search,
              hash: currentLocation.hash,
            },
          }
        : undefined;
      navigate("/login", { replace: true, state });
    };

    const refreshSessionTimers = () => {
      clearTimers();

      const token = securityManager.getToken();
      if (!token) {
        setShowWarning(false);
        setSessionNotice(securityManager.getSessionNotice());
        return;
      }

      const expiry = securityManager.getExpiryTime();
      const remaining = expiry - Date.now();
      if (!Number.isFinite(expiry) || remaining <= 0) {
        securityManager.expireSession();
        return;
      }

      setSessionNotice(null);
      if (remaining <= WARNING_BEFORE_EXPIRY_MS) {
        if (!warningDismissedRef.current) setShowWarning(true);
      } else {
        setShowWarning(false);
        warningTimerRef.current = setTimeout(() => {
          if (!warningDismissedRef.current) setShowWarning(true);
        }, Math.min(remaining - WARNING_BEFORE_EXPIRY_MS, MAX_TIMEOUT_MS));
      }

      expiryTimerRef.current = setTimeout(() => {
        if (Date.now() >= expiry) {
          securityManager.expireSession();
        } else {
          refreshSessionTimers();
        }
      }, Math.min(remaining, MAX_TIMEOUT_MS));
    };

    const handleSessionChange = (event) => {
      const reason = event?.detail?.reason;
      if (reason === "authenticated") {
        warningDismissedRef.current = false;
        redirectedRef.current = false;
        setSessionNotice(null);
        setShowWarning(false);
      } else if (reason === "expired" || reason === "logout") {
        setSessionNotice(securityManager.getSessionNotice());
        setShowWarning(false);
        redirectToLogin(reason);
      } else if (reason === "notice-dismissed") {
        setSessionNotice(null);
      }
      refreshSessionTimers();
    };

    const handleStorageChange = (event) => {
      if (event.key !== null && !securityManager.isSessionStorageKey(event.key)) return;

      if (!securityManager.getToken()) {
        const notice = securityManager.getSessionNotice();
        const reason = notice === "expired" ? "expired" : "logout";
        setSessionNotice(notice);
        setShowWarning(false);
        redirectToLogin(reason);
      } else if (event.key === "cryvex_session_notice") {
        setSessionNotice(event.newValue);
      }
      refreshSessionTimers();
    };

    window.addEventListener("cryvex:session-change", handleSessionChange);
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("focus", refreshSessionTimers);
    document.addEventListener("visibilitychange", refreshSessionTimers);
    refreshSessionTimers();

    return () => {
      clearTimers();
      window.removeEventListener("cryvex:session-change", handleSessionChange);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", refreshSessionTimers);
      document.removeEventListener("visibilitychange", refreshSessionTimers);
    };
  }, [navigate]);

  if (sessionNotice === "expired") {
    return (
      <div
        className="fixed top-4 left-1/2 z-[100] flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 items-center justify-between gap-4 rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm text-rose-800 shadow-lg"
        role="alert"
      >
        <span>Your session has expired. Please login again.</span>
        <button
          type="button"
          onClick={() => securityManager.dismissSessionNotice()}
          className="shrink-0 font-semibold text-rose-700 hover:text-rose-900"
          aria-label="Dismiss session expired notification"
        >
          Dismiss
        </button>
      </div>
    );
  }

  if (!showWarning) return null;

  return (
    <div
      className="fixed top-4 left-1/2 z-[100] flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 items-center justify-between gap-4 rounded-xl border border-amber-300 bg-white px-4 py-3 text-sm text-amber-900 shadow-lg"
      role="status"
    >
      <span>Your session will expire soon. Please login again.</span>
      <button
        type="button"
        onClick={() => {
          warningDismissedRef.current = true;
          setShowWarning(false);
        }}
        className="shrink-0 font-semibold text-amber-800 hover:text-amber-950"
        aria-label="Dismiss session warning"
      >
        Dismiss
      </button>
    </div>
  );
}
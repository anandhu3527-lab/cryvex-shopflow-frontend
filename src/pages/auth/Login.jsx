import { useState, useEffect, useRef } from "react";
import cryvexLogo from "../../assets/cryvex-logo.png";
import cryvexShopBg from "../../assets/cryvex-shop-bg.jpg";
import cryvexShopBgMobile from "../../assets/cryvex-shop-bg-mobile.png";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { authApi } from "../../services/api/authApi";
import {
  validateIdentifier,
  validatePassword,
  sanitizeInput,
} from "../../validations/authValidation";
import { securityManager } from "../../utils/security";

export default function Login() {
  const [exiting, setExiting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname
    ? location.state.from
    : { pathname: "/dashboard" };

  const [identifier, setIdentifier] = useState(
    () => location.state?.registeredIdentifier || ""
  );
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [registrationNotice] = useState(
    () => location.state?.successMessage || ""
  );

  const [identifierFeedback, setIdentifierFeedback] = useState(() => {
    const preId = location.state?.registeredIdentifier;
    return preId ? validateIdentifier(preId) : { isValid: false, type: "none", error: null };
  });
  const [passwordFeedback, setPasswordFeedback] = useState(null);
  const [touched, setTouched] = useState({ identifier: false, password: false });

  const [lockoutStatus, setLockoutStatus] = useState(() => securityManager.getLockoutStatus());
  const [lockoutTimer, setLockoutTimer] = useState(() => {
    const status = securityManager.getLockoutStatus();
    return status.isLocked ? status.remainingSeconds : 0;
  });

  const intervalRef = useRef(null);
  const navTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (lockoutTimer > 0) {
      intervalRef.current = setInterval(() => {
        if (!isMountedRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          return;
        }
        setLockoutTimer((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            setLockoutStatus({ isLocked: false, remainingSeconds: 0, failedAttempts: 0 });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockoutTimer > 0 ? "active" : "idle"]);

  const handleIdentifierChange = (e) => {
    const val = sanitizeInput(e.target.value);
    setIdentifier(val);
    if (val.length > 0) {
      const result = validateIdentifier(val);
      setIdentifierFeedback(result);
    } else {
      setIdentifierFeedback({ isValid: false, type: "none", error: null });
    }
    setError("");
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);
    if (val.length > 0) {
      const result = validatePassword(val);
      setPasswordFeedback(result);
    } else {
      setPasswordFeedback(null);
    }
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setTouched({ identifier: true, password: true });

    if (lockoutStatus.isLocked) {
      setError(`Account security lockout active. Please wait ${lockoutTimer}s before retrying.`);
      return;
    }

    const identValidation = validateIdentifier(identifier);
    if (!identValidation.isValid) {
      setError(identValidation.error || "Please enter a valid phone number or email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setError("");
    setSuccessMessage("");
    setIsLoading(true);

    try {
      const sanitizedIdentifier = sanitizeInput(identifier);
      const res = await authApi.login({
        identifier: sanitizedIdentifier,
        password,
        // NOTE: Password is sent to API — never logged. See authApi.js for token handling.
      });
      securityManager.resetAttempts();
      if (!isMountedRef.current) return;
      setSuccessMessage(res?.message || "Login successful!");
      navTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          navigate(from, { replace: true });
        }
      }, 800);
    } catch (err) {
      if (!isMountedRef.current) return;
      const updatedStatus = securityManager.recordFailedAttempt();
      setLockoutStatus(updatedStatus);
      if (updatedStatus.isLocked) {
        setLockoutTimer(updatedStatus.remainingSeconds);
        setError(`Too many failed attempts. Security cooldown triggered for ${updatedStatus.remainingSeconds}s.`);
      } else {
        const remaining = updatedStatus.remainingAttempts;
        const baseMsg = err?.message || "Invalid phone/email or password.";
        setError(
          baseMsg +
            (typeof remaining === "number" && remaining > 0 && remaining <= 3
              ? ` (${remaining} attempts remaining before temporary security lock)`
              : "")
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a2366] flex flex-col lg:flex-row">
      {/* ───────────────────────────────────────────────────────── */}
      {/* 3D CRYVEX Shopkeeper & Store Illustration (FULL VISIBILITY) */}
      {/* Desktop: Left side 52% | Mobile: Top section 45vh        */}
      {/* ───────────────────────────────────────────────────────── */}
      <div className="relative w-full lg:w-[52%] xl:w-[55%] flex-none h-[44vh] sm:h-[48vh] lg:h-screen lg:min-h-full overflow-hidden">
        {/* Desktop view background image */}
        <img
          src={cryvexShopBg}
          alt="CRYVEX ShopFlow Store"
          className="hidden lg:block w-full h-full object-cover object-center"
          loading="eager"
        />
        {/* Mobile view background image */}
        <img
          src={cryvexShopBgMobile}
          alt="CRYVEX ShopFlow Store Mobile"
          className="block lg:hidden w-full h-full object-cover object-[center_top]"
          loading="eager"
        />
        {/* Gradient overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#051a4a]/80 via-[#051a4a]/20 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-[#0a2366]/60" />

        {/* CRYVEX Logo + Brand — glassmorphism overlay */}
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10">
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-black/40 backdrop-blur-md border border-white/25 shadow-xl">
            <div className="w-9 h-9 rounded-xl bg-white/20 p-1 flex items-center justify-center">
              <img
                src={cryvexLogo}
                alt="CRYVEX"
                className="w-full h-full object-contain drop-shadow"
              />
            </div>
            <div className="text-white drop-shadow">
              <div className="text-sm font-black tracking-tight leading-tight">CRYVEX</div>
              <div className="text-xs font-bold leading-tight text-blue-200">ShopFlow</div>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* FORM: Clean Card (Desktop: Right column | Mobile: Rounded card) */}
      {/* ───────────────────────────────────────────────────────── */}
      <div
        className={`relative flex-1 z-10 flex flex-col justify-center rounded-t-[28px] lg:rounded-none -mt-6 lg:mt-0 min-h-[56vh] lg:min-h-screen overflow-y-auto ${exiting ? "auth-slide-out-left" : "auth-slide-in-right"}`}
        style={{
          background: "rgba(255,255,255,0.82)",
          backdropFilter: "blur(22px) saturate(1.6)",
          WebkitBackdropFilter: "blur(22px) saturate(1.6)",
          borderLeft: "1px solid rgba(255,255,255,0.55)",
          boxShadow: "-8px 0 40px rgba(7,91,255,0.12), 0 0 0 1px rgba(255,255,255,0.3) inset",
        }}
      >
        <div className="px-6 py-8 sm:px-10 lg:px-14 max-w-md mx-auto w-full">
          {/* Card Heading */}
          <div className="mb-5">
            <h1 className="text-2xl font-black text-black tracking-tight">Welcome Back!</h1>
            <p className="text-sm text-black font-medium mt-0.5">Login with your phone number</p>
          </div>

          {/* Status messages */}
          <div aria-live="polite" aria-atomic="true">
            {registrationNotice && !successMessage && (
              <div
                role="status"
                className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2"
              >
                <span className="text-emerald-600 font-bold" aria-hidden="true">✓</span>
                <span>{registrationNotice}</span>
              </div>
            )}

            {successMessage && (
              <div
                role="status"
                className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-center gap-2 font-semibold"
              >
                <span className="text-emerald-600 text-base" aria-hidden="true">✓</span>
                <span>{successMessage} Redirecting to Dashboard...</span>
              </div>
            )}

            {lockoutStatus.isLocked && (
              <div
                role="alert"
                className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs"
              >
                <div className="flex items-center gap-2 font-semibold">
                  <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Security Lockout Active</span>
                </div>
                <p className="mt-1 text-amber-700">
                  Too many incorrect attempts. Please wait <strong>{lockoutTimer}s</strong> before trying again.
                </p>
              </div>
            )}

            {error && !lockoutStatus.isLocked && (
              <div
                role="alert"
                className="mb-4 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-medium text-center"
              >
                {error}
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
            {/* Phone Number */}
            <div>
              <label htmlFor="login-identifier" className="mb-1.5 block text-xs font-bold text-black">
                Phone Number
              </label>
              <div className="relative">
                {/* Icon */}
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10 text-[#0f348a]" aria-hidden="true">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                {/* Live badge */}
                {identifier.length > 0 && (
                  <span
                    className={`absolute inset-y-0 right-0 pr-3.5 flex items-center text-[10px] font-semibold z-10 ${
                      identifierFeedback.isValid ? "text-emerald-600" : "text-amber-600"
                    }`}
                    aria-live="polite"
                  >
                    {identifierFeedback.isValid
                      ? (identifierFeedback.type === "email" ? "✓ Email" : "✓ Phone")
                      : "..."}
                  </span>
                )}
                <input
                  id="login-identifier"
                  type="text"
                  value={identifier}
                  onChange={handleIdentifierChange}
                  onBlur={() => setTouched((p) => ({ ...p, identifier: true }))}
                  placeholder="Phone Number"
                  disabled={isLoading || lockoutStatus.isLocked || !!successMessage}
                  aria-describedby={
                    touched.identifier && identifierFeedback.error ? "identifier-error" : undefined
                  }
                  aria-invalid={touched.identifier && !!identifierFeedback.error && identifier.length > 0}
                  className={`w-full pl-11 pr-16 py-3.5 rounded-2xl border text-sm text-black font-medium placeholder-slate-600 bg-white/60 backdrop-blur-sm focus:bg-white/90 focus:outline-none focus:ring-2 transition-all ${
                    touched.identifier && !identifierFeedback.isValid && identifier.length > 0
                      ? "border-rose-300 focus:border-rose-400 focus:ring-rose-400/20"
                      : "border-white/60 focus:border-blue-400 focus:ring-blue-400/20"
                  } ${lockoutStatus.isLocked || isLoading ? "opacity-60 cursor-not-allowed" : ""}`}
                  autoComplete="username"
                />
              </div>
              {touched.identifier && identifierFeedback.error && (
                <p id="identifier-error" className="text-[11px] text-rose-500 mt-1.5 pl-1" role="alert">
                  {identifierFeedback.error}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="relative">
                {/* Lock icon */}
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10 text-[#0f348a]" aria-hidden="true">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={handlePasswordChange}
                  onBlur={() => setTouched((p) => ({ ...p, password: true }))}
                  placeholder="Password"
                  disabled={isLoading || lockoutStatus.isLocked || !!successMessage}
                  aria-describedby={touched.password && !password ? "password-error" : undefined}
                  aria-invalid={touched.password && !password}
                  className={`w-full pl-11 pr-12 py-3.5 rounded-2xl border text-sm text-black font-medium placeholder-slate-600 bg-white/60 backdrop-blur-sm focus:bg-white/90 focus:outline-none focus:ring-2 transition-all ${
                    touched.password && !password
                      ? "border-rose-300 focus:border-rose-400 focus:ring-rose-400/20"
                      : "border-white/60 focus:border-blue-400 focus:ring-blue-400/20"
                  } ${lockoutStatus.isLocked || isLoading ? "opacity-60 cursor-not-allowed" : ""}`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#0f348a] hover:text-blue-600 transition-colors cursor-pointer z-10"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {touched.password && !password && (
                <p id="password-error" className="text-[11px] text-rose-500 mt-1.5 pl-1" role="alert">
                  Please enter your password.
                </p>
              )}

              {/* Password strength bar */}
              {passwordFeedback && (
                <div className="mt-2" aria-hidden="true">
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${passwordFeedback.color}`}
                      style={{ width: `${passwordFeedback.score}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Login Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || lockoutStatus.isLocked || !!successMessage}
                className="w-full py-4 rounded-2xl font-extrabold text-white text-base tracking-wide transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                style={{
                  background: isLoading || lockoutStatus.isLocked || successMessage
                    ? "#94a3b8"
                    : "linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #1e40af 100%)",
                  boxShadow: "0 6px 24px rgba(37, 99, 235, 0.45)"
                }}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                    <span>LOGGING IN...</span>
                  </span>
                ) : (
                  "LOGIN"
                )}
              </button>
            </div>

            {/* Register link */}
            <div className="text-center pt-2 text-sm text-black font-medium">
              <span>Don't have an account? </span>
              <button
                type="button"
                onClick={() => {
                  setExiting(true);
                  setTimeout(() => navigate("/register"), 280);
                }}
                className="font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer bg-transparent border-none p-0"
              >
                Sign up
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

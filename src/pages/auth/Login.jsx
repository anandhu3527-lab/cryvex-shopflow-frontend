import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { authApi } from "../../services/api/authApi";
import {
  validateIdentifier,
  validatePassword,
  sanitizeInput,
} from "../../validations/authValidation";
import { securityManager } from "../../utils/security";

export default function Login() {
  // Router hooks must come first — lazy useState initializers below reference location.state
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect target if came from protected route
  const from = location.state?.from?.pathname
    ? location.state.from
    : { pathname: "/dashboard" };

  // Lazy initializers read location.state once on mount — avoids setState-in-effect
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

  // Validation state — initialize identifier feedback from pre-filled value if present
  const [identifierFeedback, setIdentifierFeedback] = useState(() => {
    const preId = location.state?.registeredIdentifier;
    return preId ? validateIdentifier(preId) : { isValid: false, type: "none", error: null };
  });
  const [passwordFeedback, setPasswordFeedback] = useState(null);
  const [touched, setTouched] = useState({ identifier: false, password: false });

  // Security & Lockout state
  const [lockoutStatus, setLockoutStatus] = useState(() => securityManager.getLockoutStatus());
  const [lockoutTimer, setLockoutTimer] = useState(() => {
    const status = securityManager.getLockoutStatus();
    return status.isLocked ? status.remainingSeconds : 0;
  });

  // Refs for cleanup — prevent state updates after unmount
  const intervalRef = useRef(null);
  const navTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);

  // Mark mounted/unmounted — prevent setState after unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Clean up any running interval and navigation timeout on unmount
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current);
    };
  }, []);

  // NOTE: Registration notice and pre-filled identifier are initialized via lazy useState above.
  // No useEffect needed — location.state is stable at the point Login mounts from Register redirect.

  // Countdown timer for brute force lockout — single stable interval via ref
  useEffect(() => {
    // Clear any existing interval before starting a new one
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
            // Timer expired — unlock
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
  // NOTE: We intentionally depend on the "active vs idle" state of the timer,
  // not the timer value itself — this prevents creating a new interval on every tick.

  // Live identifier validation (Phone Number OR Email ID)
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

  // Live password validation
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

    // Prevent duplicate API requests while processing
    if (isLoading) return;

    setTouched({ identifier: true, password: true });

    // Check brute force lockout — do NOT count this as a failed attempt
    if (lockoutStatus.isLocked) {
      setError(`Account security lockout active. Please wait ${lockoutTimer}s before retrying.`);
      return;
    }

    // Client-side validation — do NOT count as failed auth attempts
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
      // Send login credentials to backend API endpoint
      const sanitizedIdentifier = sanitizeInput(identifier);
      const res = await authApi.login({
        identifier: sanitizedIdentifier,
        password,
        // NOTE: Password is sent to API — never logged. See authApi.js for token handling.
      });

      // Reset failed attempts counter on success
      securityManager.resetAttempts();

      if (!isMountedRef.current) return;

      // Show frontend success message
      setSuccessMessage(res?.message || "Login successful!");

      // Delayed navigation — cleaned up on unmount to avoid stale navigate calls
      navTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          navigate(from, { replace: true });
        }
      }, 800);
    } catch (err) {
      if (!isMountedRef.current) return;

      // Record failed attempt for brute force protection ONLY on actual auth failure
      const updatedStatus = securityManager.recordFailedAttempt();
      setLockoutStatus(updatedStatus);

      if (updatedStatus.isLocked) {
        // Start lockout countdown
        setLockoutTimer(updatedStatus.remainingSeconds);
        setError(
          `Too many failed attempts. Security cooldown triggered for ${updatedStatus.remainingSeconds}s.`
        );
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
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900 relative">
      {/* Subtle Dot Grid Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-60 pointer-events-none"></div>

      {/* Top Bar for Desktop/Mobile Navigation */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-slate-200/80 shadow-sm"
        >
          <span>←</span>
          <span>Back to CRYVEX CLOUD</span>
        </Link>

      </header>

      {/* Center Main Login Card */}
      <main className="relative z-10 w-full flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-[400px] sm:max-w-[430px] bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/60 p-6 sm:p-8">
          {/* Logo Badge */}
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 rounded-full bg-[#051329] flex flex-col items-center justify-center text-white shadow-md border border-slate-800/80 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/20 to-transparent pointer-events-none"></div>
              <svg
                className="w-7 h-7 text-cyan-400"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
              </svg>
              <span className="text-[7px] font-black tracking-widest text-cyan-300 uppercase -mt-0.5">
                CRYVEX
              </span>
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Welcome back
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Login with your Phone Number or Email ID.
            </p>
          </div>

          {/* Dynamic status region — aria-live for screen reader announcements */}
          <div aria-live="polite" aria-atomic="true">
            {/* Success Banner from Registration */}
            {registrationNotice && !successMessage && (
              <div
                role="status"
                className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-fade-in"
              >
                <span className="text-emerald-600 font-bold" aria-hidden="true">✓</span>
                <span>{registrationNotice}</span>
              </div>
            )}

            {/* Successful Login Message */}
            {successMessage && (
              <div
                role="status"
                className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-center gap-2 font-semibold animate-fade-in shadow-sm"
              >
                <span className="text-emerald-600 text-base" aria-hidden="true">✓</span>
                <span>{successMessage} Redirecting to Dashboard...</span>
              </div>
            )}

            {/* Security Alert: Brute Force Cooldown */}
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

            {/* Failed Login Error message */}
            {error && !lockoutStatus.isLocked && (
              <div
                role="alert"
                className="mb-4 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs font-medium text-center animate-fade-in"
              >
                {error}
              </div>
            )}
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Phone Number / Email ID Field with Real-time Detection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-identifier"
                  className="block text-xs font-semibold text-slate-800"
                >
                  Phone Number or Email ID
                </label>
                {/* Live validation badge */}
                {identifier.length > 0 && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                      identifierFeedback.isValid
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                    aria-live="polite"
                  >
                    {identifierFeedback.isValid ? (
                      <>
                        <span aria-hidden="true">✓</span>
                        <span>{identifierFeedback.type === "email" ? "Email ID detected" : "Phone number detected"}</span>
                      </>
                    ) : (
                      <>
                        <span aria-hidden="true">!</span>
                        <span>Checking format</span>
                      </>
                    )}
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs" aria-hidden="true">
                  {identifierFeedback.type === "email" ? "✉️" : "📱"}
                </span>
                <input
                  id="login-identifier"
                  type="text"
                  value={identifier}
                  onChange={handleIdentifierChange}
                  onBlur={() => setTouched((p) => ({ ...p, identifier: true }))}
                  placeholder="e.g. 9876543210 or name@cryvex.com"
                  disabled={isLoading || lockoutStatus.isLocked || !!successMessage}
                  aria-describedby={
                    touched.identifier && identifierFeedback.error
                      ? "identifier-error"
                      : undefined
                  }
                  aria-invalid={
                    touched.identifier && !!identifierFeedback.error && identifier.length > 0
                  }
                  className={`w-full pl-9 pr-3.5 py-2.5 rounded-lg border text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                    touched.identifier && !identifierFeedback.isValid && identifier.length > 0
                      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/15"
                      : "border-slate-200 focus:border-[#026aa7] focus:ring-[#026aa7]/15"
                  } ${lockoutStatus.isLocked || isLoading ? "bg-slate-100 cursor-not-allowed" : "bg-white"}`}
                  autoComplete="username"
                />
              </div>
              {touched.identifier && identifierFeedback.error && (
                <p id="identifier-error" className="text-[11px] text-rose-500 mt-1" role="alert">
                  {identifierFeedback.error}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-slate-800"
                >
                  Password
                </label>
                {passwordFeedback && (
                  <span className="text-[10px] text-slate-500 font-medium" aria-live="polite">
                    Strength: <strong className="text-slate-700">{passwordFeedback.label}</strong>
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs" aria-hidden="true">
                  🔒
                </span>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={handlePasswordChange}
                  onBlur={() => setTouched((p) => ({ ...p, password: true }))}
                  placeholder="Enter your password"
                  disabled={isLoading || lockoutStatus.isLocked || !!successMessage}
                  aria-describedby={
                    touched.password && !password ? "password-error" : undefined
                  }
                  aria-invalid={touched.password && !password}
                  className={`w-full pl-9 pr-10 py-2.5 rounded-lg border text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                    touched.password && !password
                      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/15"
                      : "border-slate-200 focus:border-[#026aa7] focus:ring-[#026aa7]/15"
                  } ${lockoutStatus.isLocked || isLoading ? "bg-slate-100 cursor-not-allowed" : "bg-white"}`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {touched.password && !password && (
                <p id="password-error" className="text-[11px] text-rose-500 mt-1" role="alert">
                  Please enter your password.
                </p>
              )}

              {/* Password strength mini bar */}
              {passwordFeedback && (
                <div className="mt-1.5" aria-hidden="true">
                  <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${passwordFeedback.color}`}
                      style={{ width: `${passwordFeedback.score}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Login Button with Loading State */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || lockoutStatus.isLocked || !!successMessage}
                className="w-full py-2.5 sm:py-3 rounded-lg bg-[#005f9e] hover:bg-[#004e82] text-white font-semibold text-sm shadow-md shadow-blue-900/10 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true"></span>
                    <span>Logging in...</span>
                  </span>
                ) : (
                  <>
                    <span>Login</span>
                    <span aria-hidden="true">→</span>
                  </>
                )}
              </button>
            </div>

            {/* New to CRYVEX? Create Account */}
            <div className="text-center pt-2 text-xs text-slate-600">
              <span>New to CRYVEX? </span>
              <Link
                to="/register"
                className="text-[#005f9e] font-semibold hover:underline"
              >
                Create Account
              </Link>
            </div>

            {/* Security Pill */}
            <div className="pt-3">
              <div className="bg-slate-50 border border-slate-100/90 rounded-lg py-2 px-3 flex items-center justify-center gap-2 text-[11px] text-slate-500">
                <svg
                  className="w-3.5 h-3.5 text-emerald-600 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                <span>XSS protection • Brute-force rate limiting • TLS 1.3</span>
              </div>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center text-xs text-slate-400">
        © 2026 CRYVEX Cloud. Enterprise Security Standard.
      </footer>
    </div>
  );
}

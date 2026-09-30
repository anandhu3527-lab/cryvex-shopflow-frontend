import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  validateSetupForm,
  validatePassword,
  sanitizeInput,
} from "../../validations/authValidation";
import { authApi } from "../../services/api/authApi";

export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    shopName: "",
    ownerName: "",
    mobileNumber: "",
    gstNumber: "",
    emailAddress: "",
    shopPhoneNumber: "",
    shopEmailAddress: "",
    shopAddress: "",
    password: "",
    confirmPassword: "",
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (field, value) => {
    let finalValue = value;
    // Auto-uppercase GSTIN
    if (field === "gstNumber") {
      finalValue = value.toUpperCase();
    }
    setFormData((prev) => ({ ...prev, [field]: finalValue }));

    // Clear field-specific error when modified
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const currentValidation = validateSetupForm(formData);
    if (currentValidation.errors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: currentValidation.errors[field] }));
    }
  };

  // Password analysis
  const passwordAnalysis = formData.password
    ? validatePassword(formData.password)
    : null;

  // Calculate profile completion percentage based on filled fields
  const calculateCompletion = () => {
    const requiredKeys = [
      "shopName",
      "ownerName",
      "mobileNumber",
      "emailAddress",
      "shopPhoneNumber",
      "shopAddress",
      "password",
      "confirmPassword",
    ];
    let filledCount = 0;
    requiredKeys.forEach((key) => {
      if (formData[key] && formData[key].trim() !== "") {
        filledCount++;
      }
    });
    return Math.round((filledCount / requiredKeys.length) * 100);
  };

  const completionPercentage = calculateCompletion();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Mark all fields touched
    const allTouched = Object.keys(formData).reduce((acc, k) => {
      acc[k] = true;
      return acc;
    }, {});
    setTouched(allTouched);

    // Validate form
    const validation = validateSetupForm(formData);
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      setError("Please fix the errors highlighted below before proceeding.");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const payload = {
        shop: {
          name: sanitizeInput(formData.shopName),
          phone_number: formData.shopPhoneNumber ? sanitizeInput(formData.shopPhoneNumber) : null,
          email: formData.shopEmailAddress ? sanitizeInput(formData.shopEmailAddress) : null,
          address: sanitizeInput(formData.shopAddress),
          gstin: formData.gstNumber ? formData.gstNumber.trim() : null,
        },
        user: {
          name: sanitizeInput(formData.ownerName),
          phone: sanitizeInput(formData.mobileNumber),
          email: sanitizeInput(formData.emailAddress),
          password: formData.password,
        },
      };

      await authApi.register(payload);

      // Registration successful — navigate to dashboard
      navigate("/dashboard");
    } catch (err) {
      // Show the real API error to the user
      const status = err?.status || err?.details?.status;
      const rawMsg = (err?.data?.detail || err?.message || "").toString();

      if (rawMsg.includes("already registered") || rawMsg.includes("unique") || rawMsg.includes("exists")) {
        setError("An account with this phone number or email already exists. Please login instead.");
      } else if (status === 422) {
        setError(err?.message || "Invalid registration details. Please check all fields and try again.");
      } else if (rawMsg.toLowerCase().includes("network") || rawMsg.toLowerCase().includes("failed to fetch")) {
        setError("Network error. Please check your internet connection and try again.");
      } else if (status >= 500) {
        setError("Server error. Please try again shortly or contact support.");
      } else {
        setError(err?.message || "Failed to create shop account. Please check your details and try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900 relative">
      {/* Subtle Dot Grid Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-60 pointer-events-none"></div>

      {/* Top Header Bar */}
      <header className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors bg-white/80 backdrop-blur-xs px-3.5 py-1.5 rounded-full border border-slate-200/80 shadow-xs"
        >
          <span>←</span>
          <span>Back to CRYVEX CLOUD</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/login"
            className="text-xs font-semibold text-slate-600 hover:text-blue-600 bg-white/80 px-3.5 py-1.5 rounded-full border border-slate-200/80 transition-colors shadow-xs hidden sm:inline-block"
          >
            Already have an account? Login
          </Link>
        </div>
      </header>

      {/* Center Main Card */}
      <main className="relative z-10 w-full flex-1 flex items-center justify-center p-4 sm:p-6 my-4 sm:my-6">
        <div className="w-full max-w-2xl sm:max-w-3xl bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/60 p-6 sm:p-10">
          {/* Card Top Brand Label */}
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-extrabold tracking-wider text-slate-800 uppercase">
              CRYVEX SHOPFLOW
            </span>
            <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
              <span>🔒</span> Validated Onboarding
            </span>
          </div>

          {/* Heading and Subtitle */}
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Create your account & set up your shop
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
              Create your account and add your shop details in one step.
            </p>
          </div>

          {/* Profile Completion Bar */}
          <div className="mb-6 sm:mb-8 bg-slate-50/80 border border-slate-100 rounded-xl p-3 sm:p-3.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
              <span>Profile Completion</span>
              <span className="text-blue-600 font-bold">{completionPercentage}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-6 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-medium flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError("")}
                className="text-rose-400 hover:text-rose-700 font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5" noValidate>
            {/* PERSONAL / ACCOUNT DETAILS */}
            <div className="pt-1 pb-1">
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Personal & Account Details</h2>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                Create the owner account used to access CRYVEX SHOPFLOW.
              </p>
            </div>

            {/* Owner + Mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Shop Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Shop Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-sm">
                    🏪
                  </span>
                  <input
                    type="text"
                    value={formData.shopName}
                    onChange={(e) => handleChange("shopName", e.target.value)}
                    onBlur={() => handleBlur("shopName")}
                    placeholder="e.g. Shri Balaji Traders"
                    className={`w-full pl-9 pr-3.5 py-2.5 rounded-lg border text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                      fieldErrors.shopName && touched.shopName
                        ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/15"
                        : "border-slate-200 focus:border-[#026aa7] focus:ring-[#026aa7]/15"
                    }`}
                  />
                </div>
                {fieldErrors.shopName && touched.shopName && (
                  <p className="text-[11px] text-rose-500 mt-1">{fieldErrors.shopName}</p>
                )}
              </div>

              {/* Owner Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Owner Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-sm">
                    👤
                  </span>
                  <input
                    type="text"
                    value={formData.ownerName}
                    onChange={(e) => handleChange("ownerName", e.target.value)}
                    onBlur={() => handleBlur("ownerName")}
                    placeholder="Your full name"
                    className={`w-full pl-9 pr-3.5 py-2.5 rounded-lg border text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                      fieldErrors.ownerName && touched.ownerName
                        ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/15"
                        : "border-slate-200 focus:border-[#026aa7] focus:ring-[#026aa7]/15"
                    }`}
                  />
                </div>
                {fieldErrors.ownerName && touched.ownerName && (
                  <p className="text-[11px] text-rose-500 mt-1">{fieldErrors.ownerName}</p>
                )}
              </div>
            </div>

            {/* Email + GST */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Mobile Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.mobileNumber}
                  onChange={(e) => handleChange("mobileNumber", e.target.value)}
                  onBlur={() => handleBlur("mobileNumber")}
                  placeholder="10-digit mobile number"
                  className={`w-full px-3.5 py-2.5 rounded-lg border text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                    fieldErrors.mobileNumber && touched.mobileNumber
                      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/15"
                      : "border-slate-200 focus:border-[#026aa7] focus:ring-[#026aa7]/15"
                  }`}
                />
                {fieldErrors.mobileNumber && touched.mobileNumber && (
                  <p className="text-[11px] text-rose-500 mt-1">{fieldErrors.mobileNumber}</p>
                )}
              </div>

              {/* GST Number */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-800">
                    GST Number
                  </label>
                  <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                    Optional
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-sm">
                    🪪
                  </span>
                  <input
                    type="text"
                    value={formData.gstNumber}
                    onChange={(e) => handleChange("gstNumber", e.target.value)}
                    onBlur={() => handleBlur("gstNumber")}
                    placeholder="22AAAAA0000A1Z5"
                    maxLength={15}
                    className={`w-full pl-9 pr-3.5 py-2.5 rounded-lg border text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all font-mono uppercase ${
                      fieldErrors.gstNumber && touched.gstNumber
                        ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/15"
                        : "border-slate-200 focus:border-[#026aa7] focus:ring-[#026aa7]/15"
                    }`}
                  />
                </div>
                {fieldErrors.gstNumber && touched.gstNumber && (
                  <p className="text-[11px] text-rose-500 mt-1">{fieldErrors.gstNumber}</p>
                )}
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-sm">
                  ✉️
                </span>
                <input
                  type="email"
                  value={formData.emailAddress}
                  onChange={(e) => handleChange("emailAddress", e.target.value)}
                  onBlur={() => handleBlur("emailAddress")}
                  placeholder="e.g. contact@business.com"
                  className={`w-full pl-9 pr-3.5 py-2.5 rounded-lg border text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                    fieldErrors.emailAddress && touched.emailAddress
                      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/15"
                      : "border-slate-200 focus:border-[#026aa7] focus:ring-[#026aa7]/15"
                  }`}
                />
              </div>
              {fieldErrors.emailAddress && touched.emailAddress && (
                <p className="text-[11px] text-rose-500 mt-1">{fieldErrors.emailAddress}</p>
              )}
            </div>

            {/* BUSINESS / SHOP DETAILS */}
            <div className="pt-3 pb-1">
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Shop / Business Details</h2>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                Add the business information that will be connected to this account.
              </p>
            </div>

            {/* Shop Contact Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-800">
                    Shop Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                    Required
                  </span>
                </div>
                <input
                  type="tel"
                  value={formData.shopPhoneNumber}
                  onChange={(e) => handleChange("shopPhoneNumber", e.target.value)}
                  onBlur={() => handleBlur("shopPhoneNumber")}
                  placeholder="Shop contact number"
                  className={`w-full px-3.5 py-2.5 rounded-lg border text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                    fieldErrors.shopPhoneNumber && touched.shopPhoneNumber
                      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/15"
                      : "border-slate-200 focus:border-[#026aa7] focus:ring-[#026aa7]/15"
                  }`}
                />
                {fieldErrors.shopPhoneNumber && touched.shopPhoneNumber && (
                  <p className="text-[11px] text-rose-500 mt-1">{fieldErrors.shopPhoneNumber}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-800">Shop Email ID</label>
                  <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                    Optional
                  </span>
                </div>
                <input
                  type="email"
                  value={formData.shopEmailAddress}
                  onChange={(e) => handleChange("shopEmailAddress", e.target.value)}
                  onBlur={() => handleBlur("shopEmailAddress")}
                  placeholder="Shop contact email"
                  className={`w-full px-3.5 py-2.5 rounded-lg border text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                    fieldErrors.shopEmailAddress && touched.shopEmailAddress
                      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/15"
                      : "border-slate-200 focus:border-[#026aa7] focus:ring-[#026aa7]/15"
                  }`}
                />
                {fieldErrors.shopEmailAddress && touched.shopEmailAddress && (
                  <p className="text-[11px] text-rose-500 mt-1">{fieldErrors.shopEmailAddress}</p>
                )}
              </div>
            </div>

            {/* Row 5: Shop Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Shop Address <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={formData.shopAddress}
                onChange={(e) => handleChange("shopAddress", e.target.value)}
                onBlur={() => handleBlur("shopAddress")}
                placeholder="Complete physical store or office address..."
                className={`w-full px-3.5 py-2.5 rounded-lg border text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all resize-none ${
                  fieldErrors.shopAddress && touched.shopAddress
                    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/15"
                    : "border-slate-200 focus:border-[#026aa7] focus:ring-[#026aa7]/15"
                }`}
              />
              {fieldErrors.shopAddress && touched.shopAddress && (
                <p className="text-[11px] text-rose-500 mt-1">{fieldErrors.shopAddress}</p>
              )}
            </div>

            {/* Row 6: Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-800">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  {passwordAnalysis && (
                    <span className="text-[10px] text-slate-500 font-medium">
                      Strength: <strong className="text-slate-800">{passwordAnalysis.label}</strong>
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-sm">
                    🔒
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    onBlur={() => handleBlur("password")}
                    placeholder="Enter secure password"
                    className={`w-full pl-9 pr-10 py-2.5 rounded-lg border text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                      fieldErrors.password && touched.password
                        ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/15"
                        : "border-slate-200 focus:border-[#026aa7] focus:ring-[#026aa7]/15"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
                {passwordAnalysis && (
                  <div className="w-full bg-slate-100 rounded-full h-1 mt-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${passwordAnalysis.color}`}
                      style={{ width: `${passwordAnalysis.score}%` }}
                    ></div>
                  </div>
                )}
                {fieldErrors.password && touched.password && (
                  <p className="text-[11px] text-rose-500 mt-1">{fieldErrors.password}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-sm">
                    🔒
                  </span>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange("confirmPassword", e.target.value)}
                    onBlur={() => handleBlur("confirmPassword")}
                    placeholder="Re-enter password"
                    className={`w-full pl-9 pr-10 py-2.5 rounded-lg border text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                      fieldErrors.confirmPassword && touched.confirmPassword
                        ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/15"
                        : "border-slate-200 focus:border-[#026aa7] focus:ring-[#026aa7]/15"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
                {fieldErrors.confirmPassword && touched.confirmPassword && (
                  <p className="text-[11px] text-rose-500 mt-1">{fieldErrors.confirmPassword}</p>
                )}
              </div>
            </div>

            {/* Submit Action Button */}
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto px-7 py-3 rounded-xl bg-[#005f9e] hover:bg-[#004e82] text-white font-semibold text-sm shadow-md shadow-blue-900/10 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Creating Account...</span>
                  </span>
                ) : (
                  <>
                    <span>Create Account & Shop</span>
                    <span>→</span>
                  </>
                )}
              </button>
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

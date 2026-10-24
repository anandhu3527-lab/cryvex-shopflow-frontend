import { useState } from "react";
import cryvexLogo from "../../assets/cryvex-logo.png";
import cryvexHeroStore from "../../assets/cryvex-hero-store.jpg";
import cryvexShopBgMobile from "../../assets/cryvex-shop-bg-mobile.png";
<<<<<<< HEAD
import { useNavigate } from "react-router-dom";
=======
import { useNavigate, Link } from "react-router-dom";
>>>>>>> 0779c977551ab0c427eb4ebd82b89d18448dd602
import {
  validateSetupForm,
  validatePassword,
  sanitizeInput,
} from "../../validations/authValidation";
import { authApi } from "../../services/api/authApi";

<<<<<<< HEAD
/* ── Shared left icon wrapper ── */
function Icon({ children }) {
  return (
    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10 text-[#0f348a]" aria-hidden="true">
      {children}
    </span>
  );
}

/* ── SVG icons ── */
const icons = {
  shop: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    </svg>
  ),
  user: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  phone: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  ),
  mail: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  pin: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  lock: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  eyeOpen: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  eyeOff: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
    </svg>
  ),
};

/* ── Reusable field row ── */
function Field({ id, label, error, optional, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <label htmlFor={id} className="text-[11px] sm:text-xs font-bold text-black">
          {label}
        </label>
        {optional && (
          <span className="text-[10px] text-slate-900 font-bold">Optional</span>
        )}
      </div>
      {children}
      {error && (
        <p className="text-[10px] sm:text-[11px] text-rose-500 mt-0.5 pl-1">{error}</p>
      )}
    </div>
  );
}

=======
>>>>>>> 0779c977551ab0c427eb4ebd82b89d18448dd602
export default function Register() {
  const navigate = useNavigate();
  const [exiting, setExiting] = useState(false);

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
    if (field === "gstNumber") finalValue = value.toUpperCase();
    setFormData((prev) => ({ ...prev, [field]: finalValue }));
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: null }));
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const currentValidation = validateSetupForm(formData);
    if (currentValidation.errors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: currentValidation.errors[field] }));
    }
  };

  const passwordAnalysis = formData.password ? validatePassword(formData.password) : null;

  const calculateCompletion = () => {
    const requiredKeys = [
      "shopName", "ownerName", "mobileNumber", "emailAddress",
      "shopPhoneNumber", "shopAddress", "password", "confirmPassword",
    ];
    const filled = requiredKeys.filter((k) => formData[k]?.trim() !== "").length;
    return Math.round((filled / requiredKeys.length) * 100);
  };

  const completionPercentage = calculateCompletion();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const allTouched = Object.keys(formData).reduce((acc, k) => ({ ...acc, [k]: true }), {});
    setTouched(allTouched);

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
      navigate("/dashboard");
    } catch (err) {
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

  /* ── Shared input class ── */
  const inp = (field, extra = "") =>
    `w-full pl-10 pr-3 py-2 sm:py-2.5 rounded-xl border text-sm text-black font-medium placeholder-slate-600 bg-white/60 backdrop-blur-sm focus:bg-white/90 focus:outline-none focus:ring-2 transition-all ${extra} ${
      fieldErrors[field] && touched[field]
        ? "border-rose-300 focus:border-rose-400 focus:ring-rose-400/20"
        : "border-white/60 focus:border-blue-400 focus:ring-blue-400/20"
    }`;

<<<<<<< HEAD
  return (
    <div className="relative min-h-screen min-h-[100dvh] w-full overflow-x-hidden overflow-y-auto lg:overflow-hidden bg-[#09225f] flex flex-col lg:flex-row">
=======
  /* ── Shared left icon wrapper ── */
  const Icon = ({ children }) => (
    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10 text-[#0f348a]" aria-hidden="true">
      {children}
    </span>
  );

  /* ── SVG icons ── */
  const icons = {
    shop: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      </svg>
    ),
    user: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    phone: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    ),
    mail: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    pin: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    lock: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    eyeOpen: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    eyeOff: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
      </svg>
    ),
  };

  /* ── Reusable field row ── */
  const Field = ({ id, label, error, optional, children }) => (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <label htmlFor={id} className="text-[11px] sm:text-xs font-bold text-black">
          {label}
        </label>
        {optional && (
          <span className="text-[10px] text-slate-900 font-bold">Optional</span>
        )}
      </div>
      {children}
      {error && (
        <p className="text-[10px] sm:text-[11px] text-rose-500 mt-0.5 pl-1">{error}</p>
      )}
    </div>
  );

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#09225f] flex flex-col lg:flex-row">
>>>>>>> 0779c977551ab0c427eb4ebd82b89d18448dd602

      {/* ── 3D CRYVEX Shopkeeper & Store Illustration (FULL VISIBILITY) ── */}
      <div className="relative w-full lg:w-[48%] xl:w-[50%] flex-none h-[26vh] sm:h-[30vh] lg:h-screen lg:min-h-full overflow-hidden bg-[#09225f]">
        {/* Desktop view background image */}
        <img
          src={cryvexHeroStore}
          alt="CRYVEX ShopFlow Store - உங்கள் கடை இப்போது Digital!"
          className="hidden lg:block w-full h-full object-cover object-center filter saturate-[1.05]"
          loading="eager"
        />
        {/* Mobile view background image */}
        <img
          src={cryvexShopBgMobile}
          alt="CRYVEX ShopFlow Store Mobile"
          className="block lg:hidden w-full h-full object-cover object-[center_top] filter saturate-[1.05]"
          loading="eager"
        />
        {/* Gradient overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#051a4a]/80 via-[#051a4a]/20 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-[#0a2366]/60" />

        {/* Logo overlay */}
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10">
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-black/40 backdrop-blur-md border border-white/25 shadow-xl">
            <div className="w-9 h-9 rounded-xl bg-white/20 p-1 flex items-center justify-center">
              <img src={cryvexLogo} alt="CRYVEX" className="w-full h-full object-contain drop-shadow" />
            </div>
            <div className="text-white drop-shadow">
              <div className="text-sm font-black tracking-tight leading-tight">CRYVEX</div>
              <div className="text-xs font-bold leading-tight text-blue-200">ShopFlow</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── FORM: Clean Card (Desktop: Right column | Mobile: Rounded card) ── */}
      <div
<<<<<<< HEAD
        className={`relative flex-1 z-10 flex flex-col rounded-t-[24px] lg:rounded-none -mt-4 lg:mt-0 lg:h-screen lg:min-h-screen lg:overflow-hidden ${exiting ? "auth-slide-out-right" : "auth-slide-in-right"}`}
=======
        className={`relative flex-1 z-10 flex flex-col rounded-t-[24px] lg:rounded-none -mt-4 lg:mt-0 lg:h-screen lg:min-h-screen overflow-hidden ${exiting ? "auth-slide-out-right" : "auth-slide-in-right"}`}
>>>>>>> 0779c977551ab0c427eb4ebd82b89d18448dd602
        style={{
          background: "rgba(255,255,255,0.82)",
          backdropFilter: "blur(22px) saturate(1.6)",
          WebkitBackdropFilter: "blur(22px) saturate(1.6)",
          borderLeft: "1px solid rgba(255,255,255,0.55)",
          boxShadow: "-8px 0 40px rgba(7,91,255,0.12), 0 0 0 1px rgba(255,255,255,0.3) inset",
        }}
      >
<<<<<<< HEAD
        <div className="flex-1 lg:overflow-y-auto lg:overscroll-contain px-4 py-4 pb-12 sm:px-6 lg:px-10 lg:py-6 w-full max-w-xl lg:max-w-2xl mx-auto">
=======
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 lg:px-10 lg:py-6 w-full max-w-xl lg:max-w-2xl mx-auto">
>>>>>>> 0779c977551ab0c427eb4ebd82b89d18448dd602

          {/* Heading */}
          <div className="mb-1">
            <h1 className="text-lg sm:text-xl font-black text-black">Create Your Shop</h1>
            <p className="text-xs text-black font-medium mt-0.5">Start your digital shop journey with Cryvex ShopFlow</p>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%`, background: "linear-gradient(90deg,#2563eb,#1d4ed8)" }}
              />
            </div>
            <span className="text-[11px] font-bold text-blue-600 tabular-nums">{completionPercentage}%</span>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-3 px-3 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center justify-between">
              <span>{error}</span>
              <button type="button" onClick={() => setError("")} className="ml-2 text-rose-400 hover:text-rose-700 font-bold cursor-pointer" aria-label="Dismiss">✕</button>
            </div>
          )}

          {/* 2-col grid on desktop, 1-col on mobile */}
          <form onSubmit={handleSubmit} className="space-y-0" noValidate>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">

            {/* 1. Shop Name */}
            <Field id="reg-shop-name" label="Shop Name" error={fieldErrors.shopName && touched.shopName ? fieldErrors.shopName : null}>
              <div className="relative">
                <Icon>{icons.shop}</Icon>
                <input id="reg-shop-name" type="text" value={formData.shopName}
                  onChange={(e) => handleChange("shopName", e.target.value)}
                  onBlur={() => handleBlur("shopName")}
                  placeholder="e.g. Shri Balaji Traders"
                  className={inp("shopName")} />
              </div>
            </Field>

            {/* 2. Owner Name */}
            <Field id="reg-owner-name" label="Owner Name" error={fieldErrors.ownerName && touched.ownerName ? fieldErrors.ownerName : null}>
              <div className="relative">
                <Icon>{icons.user}</Icon>
                <input id="reg-owner-name" type="text" value={formData.ownerName}
                  onChange={(e) => handleChange("ownerName", e.target.value)}
                  onBlur={() => handleBlur("ownerName")}
                  placeholder="Your full name"
                  className={inp("ownerName")} />
              </div>
            </Field>

            {/* 3. Mobile Number */}
            <Field id="reg-mobile" label="Mobile Number" error={fieldErrors.mobileNumber && touched.mobileNumber ? fieldErrors.mobileNumber : null}>
              <div className="relative">
                <Icon>{icons.phone}</Icon>
                <input id="reg-mobile" type="tel" value={formData.mobileNumber}
                  onChange={(e) => handleChange("mobileNumber", e.target.value)}
                  onBlur={() => handleBlur("mobileNumber")}
                  placeholder="10-digit mobile number"
                  className={inp("mobileNumber")} />
              </div>
            </Field>

            {/* 4. GST Number */}
            <Field id="reg-gst" label="GST Number" optional error={fieldErrors.gstNumber && touched.gstNumber ? fieldErrors.gstNumber : null}>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10 text-[10px] font-bold text-[#0f348a] tracking-wider" aria-hidden="true">
                  GST
                </span>
                <input id="reg-gst" type="text" value={formData.gstNumber}
                  onChange={(e) => handleChange("gstNumber", e.target.value)}
                  onBlur={() => handleBlur("gstNumber")}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                  className={`${inp("gstNumber", "font-mono uppercase")} pl-11`} />
              </div>
            </Field>

            {/* 5. Email Address */}
            <Field id="reg-email" label="Email Address" error={fieldErrors.emailAddress && touched.emailAddress ? fieldErrors.emailAddress : null}>
              <div className="relative">
                <Icon>{icons.mail}</Icon>
                <input id="reg-email" type="email" value={formData.emailAddress}
                  onChange={(e) => handleChange("emailAddress", e.target.value)}
                  onBlur={() => handleBlur("emailAddress")}
                  placeholder="e.g. owner@business.com"
                  className={inp("emailAddress")} />
              </div>
            </Field>

            {/* 6. Shop Phone Number */}
            <Field id="reg-shop-phone" label="Shop Phone Number" error={fieldErrors.shopPhoneNumber && touched.shopPhoneNumber ? fieldErrors.shopPhoneNumber : null}>
              <div className="relative">
                <Icon>{icons.phone}</Icon>
                <input id="reg-shop-phone" type="tel" value={formData.shopPhoneNumber}
                  onChange={(e) => handleChange("shopPhoneNumber", e.target.value)}
                  onBlur={() => handleBlur("shopPhoneNumber")}
                  placeholder="Shop contact number"
                  className={inp("shopPhoneNumber")} />
              </div>
            </Field>

            {/* 7. Shop Email */}
            <Field id="reg-shop-email" label="Shop Email ID" optional error={fieldErrors.shopEmailAddress && touched.shopEmailAddress ? fieldErrors.shopEmailAddress : null}>
              <div className="relative">
                <Icon>{icons.mail}</Icon>
                <input id="reg-shop-email" type="email" value={formData.shopEmailAddress}
                  onChange={(e) => handleChange("shopEmailAddress", e.target.value)}
                  onBlur={() => handleBlur("shopEmailAddress")}
                  placeholder="Shop contact email"
                  className={inp("shopEmailAddress")} />
              </div>
            </Field>

            {/* 8. Shop Address - full width on desktop */}
            <div className="lg:col-span-2">
              <Field id="reg-address" label="Shop Address" error={fieldErrors.shopAddress && touched.shopAddress ? fieldErrors.shopAddress : null}>
                <div className="relative">
                  <span className="absolute top-3 left-3 pointer-events-none z-10 text-[#0f348a]" aria-hidden="true">{icons.pin}</span>
                  <textarea id="reg-address" rows={2} value={formData.shopAddress}
                    onChange={(e) => handleChange("shopAddress", e.target.value)}
                    onBlur={() => handleBlur("shopAddress")}
                    placeholder="Complete physical store or office address..."
                    className={`${inp("shopAddress")} resize-none`} />
                </div>
              </Field>
            </div>

            {/* 9. Password */}
            <Field id="reg-password" label="Password" error={fieldErrors.password && touched.password ? fieldErrors.password : null}>
              <div className="relative">
                <Icon>{icons.lock}</Icon>
                <input id="reg-password" type={showPassword ? "text" : "password"} value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  onBlur={() => handleBlur("password")}
                  placeholder="Enter secure password"
                  className={`${inp("password")} pr-10`} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#0f348a] hover:text-blue-600 transition-colors cursor-pointer z-10"
                  aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? icons.eyeOff : icons.eyeOpen}
                </button>
              </div>
              {/* Strength bar */}
              {passwordAnalysis && (
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${passwordAnalysis.color}`}
                      style={{ width: `${passwordAnalysis.score}%` }} />
                  </div>
                  <span className="text-[10px] text-black font-bold">{passwordAnalysis.label}</span>
                </div>
              )}
            </Field>

            {/* 10. Confirm Password */}
            <Field id="reg-confirm-password" label="Confirm Password" error={fieldErrors.confirmPassword && touched.confirmPassword ? fieldErrors.confirmPassword : null}>
              <div className="relative">
                <Icon>{icons.lock}</Icon>
                <input id="reg-confirm-password" type={showConfirmPassword ? "text" : "password"} value={formData.confirmPassword}
                  onChange={(e) => handleChange("confirmPassword", e.target.value)}
                  onBlur={() => handleBlur("confirmPassword")}
                  placeholder="Re-enter your password"
                  className={`${inp("confirmPassword")} pr-10`} />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#0f348a] hover:text-blue-600 transition-colors cursor-pointer z-10"
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}>
                  {showConfirmPassword ? icons.eyeOff : icons.eyeOpen}
                </button>
              </div>
            </Field>

            </div>{/* end grid */}

            {/* REGISTER Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-2xl font-extrabold text-white text-base tracking-wide transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                style={{
                  background: isLoading ? "#94a3b8" : "linear-gradient(135deg,#2563eb 0%,#1d4ed8 50%,#1e40af 100%)",
                  boxShadow: "0 6px 24px rgba(37,99,235,0.40)",
                }}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    CREATING ACCOUNT...
                  </span>
                ) : "REGISTER"}
              </button>
            </div>

            {/* Login link */}
            <p className="text-center text-sm text-black font-medium pb-4">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setExiting(true);
                  setTimeout(() => navigate("/login"), 280);
                }}
                className="font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer bg-transparent border-none p-0"
              >
                Login
              </button>
            </p>

          </form>
        </div>
      </div>
    </div>
  );
}

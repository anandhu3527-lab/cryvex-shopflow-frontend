/**
 * Authentication & Security Validation Suite
 * Cryvex ShopFlow Enterprise Security Standards
 */

// Basic XSS & script injection sanitizer
export const sanitizeInput = (str) => {
  if (typeof str !== "string") return str;
  return str
    .replace(/[<>]/g, "") // Strip raw HTML tags
    .trim();
};

/**
 * Validates whether an identifier is a valid Email or 10-digit Indian Mobile number
 * @param {string} identifier 
 * @returns {{ isValid: boolean, type: 'email' | 'phone' | 'invalid', error: string | null }}
 */
export const validateIdentifier = (identifier) => {
  const clean = (identifier || "").trim();
  if (!clean) {
    return {
      isValid: false,
      type: "invalid",
      error: "Please enter your mobile number or email address.",
    };
  }

  // Email format regex (RFC 5322 simplified standard)
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (emailRegex.test(clean)) {
    return {
      isValid: true,
      type: "email",
      error: null,
    };
  }

  // Indian Phone format: Optional +91 or 0, followed by 10 digits starting with 6, 7, 8, or 9
  const phoneDigits = clean.replace(/[\s\-()]/g, "");
  const phoneRegex = /^(?:\+91|91|0)?[6-9]\d{9}$/;
  if (phoneRegex.test(phoneDigits)) {
    return {
      isValid: true,
      type: "phone",
      error: null,
    };
  }

  // If user typed something looking like an email with missing domain
  if (clean.includes("@")) {
    return {
      isValid: false,
      type: "email",
      error: "Please enter a complete and valid email address (e.g. name@company.com).",
    };
  }

  // If user typed digits
  if (/^\d+$/.test(phoneDigits)) {
    return {
      isValid: false,
      type: "phone",
      error: "Mobile number must be a valid 10-digit Indian mobile number (starts with 6-9).",
    };
  }

  return {
    isValid: false,
    type: "invalid",
    error: "Enter a valid 10-digit mobile number or standard email address.",
  };
};

/**
 * Password strength analysis and validation
 * Checks length, lowercase, uppercase, number, and special symbols
 * @param {string} password 
 * @returns {{ isValid: boolean, score: number, label: string, color: string, rules: object, error: string | null }}
 */
export const validatePassword = (password = "") => {
  const rules = {
    minLength: password.length >= 8,
    hasLower: /[a-z]/.test(password),
    hasUpper: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[@$!%*?&#^()_\-+=[\]{}|;:,.<>]/.test(password),
  };

  let passedCount = 0;
  if (rules.minLength) passedCount += 1;
  if (rules.hasLower) passedCount += 1;
  if (rules.hasUpper) passedCount += 1;
  if (rules.hasNumber) passedCount += 1;
  if (rules.hasSpecial) passedCount += 1;

  let score = (passedCount / 5) * 100;
  let label = "Very Weak";
  let color = "bg-rose-500";

  if (passedCount === 5) {
    label = "Very Strong";
    color = "bg-emerald-500";
  } else if (passedCount >= 4) {
    label = "Strong";
    color = "bg-emerald-400";
  } else if (passedCount >= 3) {
    label = "Medium";
    color = "bg-amber-400";
  } else if (passedCount >= 2) {
    label = "Weak";
    color = "bg-orange-400";
  }

  const isValid = rules.minLength;
  const error = !isValid
    ? "Password must be at least 8 characters long."
    : null;

  return {
    isValid,
    score,
    label,
    color,
    rules,
    error,
  };
};

/**
 * Validates Indian GSTIN (Goods and Services Tax Identification Number)
 * Format: 2 digits (State code) + 5 chars (PAN entity) + 4 digits + 1 char (PAN check) + 1 entity num + 'Z' + 1 checksum
 * Example: 22AAAAA0000A1Z5
 * @param {string} gstin 
 * @returns {{ isValid: boolean, error: string | null }}
 */
export const validateGSTIN = (gstin = "") => {
  const clean = gstin.trim().toUpperCase();
  if (!clean) {
    return { isValid: true, error: null }; // GSTIN is often optional for small shops
  }

  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!gstinRegex.test(clean)) {
    return {
      isValid: false,
      error: "Invalid GSTIN format. Example format: 22AAAAA0000A1Z5 (15 characters).",
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validates Setup / Shop Registration Form
 * @param {object} formData 
 * @returns {{ isValid: boolean, errors: object }}
 */
export const validateSetupForm = (formData) => {
  const errors = {};

  if (!formData.shopName || !formData.shopName.trim()) {
    errors.shopName = "Shop name is required.";
  } else if (formData.shopName.trim().length < 3) {
    errors.shopName = "Shop name must be at least 3 characters.";
  }

  if (!formData.ownerName || !formData.ownerName.trim()) {
    errors.ownerName = "Owner's full name is required.";
  } else if (formData.ownerName.trim().length < 2) {
    errors.ownerName = "Owner name must be at least 2 characters.";
  }

  const phoneVal = validateIdentifier(formData.mobileNumber);
  if (!phoneVal.isValid) {
    errors.mobileNumber = phoneVal.error;
  }

  const emailVal = validateIdentifier(formData.emailAddress);
  if (!emailVal.isValid || emailVal.type !== "email") {
    errors.emailAddress = "Please enter a valid email address.";
  }

  if (formData.gstNumber && formData.gstNumber.trim()) {
    const gstVal = validateGSTIN(formData.gstNumber);
    if (!gstVal.isValid) {
      errors.gstNumber = gstVal.error;
    }
  }

  if (!formData.shopPhoneNumber || !formData.shopPhoneNumber.trim()) {
    errors.shopPhoneNumber = "Shop phone number is required.";
  } else {
    const shopPhoneVal = validateIdentifier(formData.shopPhoneNumber);
    if (!shopPhoneVal.isValid || shopPhoneVal.type !== "phone") {
      errors.shopPhoneNumber = "Please enter a valid shop phone number.";
    }
  }

  if (formData.shopEmailAddress && formData.shopEmailAddress.trim()) {
    const shopEmailVal = validateIdentifier(formData.shopEmailAddress);
    if (!shopEmailVal.isValid || shopEmailVal.type !== "email") {
      errors.shopEmailAddress = "Please enter a valid shop email address.";
    }
  }

  if (!formData.shopAddress || !formData.shopAddress.trim()) {
    errors.shopAddress = "Shop address is required.";
  } else if (formData.shopAddress.trim().length < 5) {
    errors.shopAddress = "Please enter a detailed physical address.";
  }

  const pwdVal = validatePassword(formData.password);
  if (!pwdVal.isValid) {
    errors.password = pwdVal.error || "Password does not meet minimum security requirements.";
  }

  if (!formData.confirmPassword) {
    errors.confirmPassword = "Please confirm your password.";
  } else if (formData.password !== formData.confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validates User Registration Form
 * Required fields: Name, Phone Number, Email ID, Password, Confirm Password
 * @param {{ name?: string, phoneNumber?: string, phone?: string, email?: string, emailAddress?: string, password?: string, confirmPassword?: string }} formData
 * @returns {{ isValid: boolean, errors: Record<string, string> }}
 */
export const validateRegistrationForm = (formData = {}) => {
  const errors = {};

  // 1. Name validation
  const name = (formData.name || "").trim();
  if (!name) {
    errors.name = "Full name is required.";
  } else if (name.length < 2) {
    errors.name = "Full name must be at least 2 characters.";
  }

  // 2. Phone Number validation
  const rawPhone = (formData.phoneNumber || formData.phone || "").trim();
  if (!rawPhone) {
    errors.phoneNumber = "Phone number is required.";
  } else {
    const phoneVal = validateIdentifier(rawPhone);
    if (!phoneVal.isValid || phoneVal.type !== "phone") {
      errors.phoneNumber = phoneVal.error || "Please enter a valid 10-digit mobile number.";
    }
  }

  // 3. Email ID validation
  const rawEmail = (formData.email || formData.emailAddress || "").trim();
  if (!rawEmail) {
    errors.email = "Email address is required.";
  } else {
    const emailVal = validateIdentifier(rawEmail);
    if (!emailVal.isValid || emailVal.type !== "email") {
      errors.email = "Please enter a valid email address (e.g. name@domain.com).";
    }
  }

  // 4. Password validation
  const password = formData.password || "";
  if (!password) {
    errors.password = "Password is required.";
  } else {
    const pwdVal = validatePassword(password);
    if (!pwdVal.isValid) {
      errors.password = pwdVal.error || "Password must be at least 8 characters.";
    }
  }

  // 5. Confirm Password validation
  const confirmPassword = formData.confirmPassword || "";
  if (!confirmPassword) {
    errors.confirmPassword = "Confirm password is required.";
  } else if (password !== confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};


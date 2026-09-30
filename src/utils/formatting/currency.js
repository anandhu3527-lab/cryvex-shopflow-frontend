/**
 * Currency formatting utilities for Indian Rupee (INR)
 */

export const formatINR = (val) => {
  if (typeof val === "string" && val.startsWith("₹")) return val;
  return `₹${Number(val || 0).toLocaleString("en-IN")}`;
};

export const formatINRWithPaise = (val) =>
  `₹${Number(val || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default formatINR;

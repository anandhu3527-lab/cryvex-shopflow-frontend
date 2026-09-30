/**
 * Central Error Handling Service
 * Normalizes error messages and logging across API, Data, and UI tiers.
 */

export const ERROR_TYPES = {
  API_ERROR: "API_ERROR",
  DATA_ERROR: "DATA_ERROR",
  INTEGRATION_ERROR: "INTEGRATION_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
};

export class AppError extends Error {
  constructor(message, type = ERROR_TYPES.UNKNOWN_ERROR, details = null) {
    super(message);
    this.name = "AppError";
    this.type = type;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

export const handleError = (error, context = "") => {
  const normalizedError = {
    message: error?.message || "An unexpected error occurred",
    type: error?.type || ERROR_TYPES.UNKNOWN_ERROR,
    context,
    details: error?.details || error,
    timestamp: new Date().toISOString(),
  };

  if (import.meta.env.DEV) {
    console.error(`[AppError][${context || "General"}]`, normalizedError);
  }

  return normalizedError;
};

export default { ERROR_TYPES, AppError, handleError };

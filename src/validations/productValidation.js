/**
 * Product & Variant Validation Logic
 * Follows Cryvex ShopFlow validation standards
 */

/**
 * Normalize tax_rate for API submission.
 * The live ShopFlow backend (FastAPI/Pydantic Decimal) requires a numeric value.
 * "" / null / undefined → 0 ("No tax specified" maps to 0)
 * Any non-finite result → 0 (safe fallback)
 */
export function normalizeTaxRate(value) {
  if (value === "" || value === null || value === undefined) {
    return 0;
  }
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

export const validateCategory = (categoryId) => {
  if (!categoryId || !categoryId.trim()) {
    return "Please select a category";
  }
  return null;
};

export const validateProductInfo = (product) => {
  const errors = {};

  if (!product.name || !product.name.trim()) {
    errors.name = "Product name is required";
  } else if (product.name.trim().length < 2) {
    errors.name = "Product name must be at least 2 characters";
  }

  if (!product.category_id || !product.category_id.trim()) {
    errors.category_id = "Please select a category";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateVariant = (variant, index) => {
  const errors = {};

  // Package quantity validation
  const pkgQty = Number(variant.package_quantity);
  if (variant.package_quantity === "" || isNaN(pkgQty)) {
    errors.package_quantity = "Package quantity is required";
  } else if (pkgQty <= 0) {
    errors.package_quantity = "Package quantity must be greater than 0";
  }

  // Unit validation
  if (!variant.unit || !variant.unit.trim()) {
    errors.unit = "Unit is required";
  }

  // Barcode validation
  if (!variant.barcode || !variant.barcode.trim()) {
    errors.barcode = "Barcode is required";
  }

  // Selling price validation
  const sellingPrice = Number(variant.selling_price);
  if (variant.selling_price === "" || isNaN(sellingPrice)) {
    errors.selling_price = "Selling price is required";
  } else if (sellingPrice <= 0) {
    errors.selling_price = "Selling price must be greater than 0";
  }

  // Stock quantity validation
  const stockQty = Number(variant.stock_quantity);
  if (variant.stock_quantity === "" || isNaN(stockQty)) {
    errors.stock_quantity = "Stock quantity is required";
  } else if (stockQty < 0) {
    errors.stock_quantity = "Stock quantity cannot be negative";
  }

  // Optional fields validation if provided
  if (variant.offer_price !== "" && variant.offer_price !== null && variant.offer_price !== undefined) {
    const offerPrice = Number(variant.offer_price);
    if (isNaN(offerPrice) || offerPrice < 0) {
      errors.offer_price = "Offer price cannot be negative";
    } else if (sellingPrice > 0 && offerPrice > sellingPrice) {
      errors.offer_price = "Offer price cannot exceed selling price";
    }
  }

  if (variant.tax_rate !== "" && variant.tax_rate !== null && variant.tax_rate !== undefined) {
    const taxRate = Number(variant.tax_rate);
    if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
      errors.tax_rate = "Tax rate must be between 0% and 100%";
    }
  }

  if (variant.low_stock_threshold === "" || variant.low_stock_threshold === null || variant.low_stock_threshold === undefined) {
    errors.low_stock_threshold = "Low stock threshold is required";
  } else {
    const threshold = Number(variant.low_stock_threshold);
    if (isNaN(threshold) || threshold < 0) {
      errors.low_stock_threshold = "Low stock threshold cannot be negative";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateFullProductForm = (product, variants) => {
  const productValidation = validateProductInfo(product);
  const variantErrors = [];
  let allVariantsValid = true;

  if (!variants || variants.length === 0) {
    return {
      isValid: false,
      productErrors: productValidation.errors,
      variantErrors: [{ general: "At least one variant is required" }],
    };
  }

  variants.forEach((v, index) => {
    const vVal = validateVariant(v, index);
    if (!vVal.isValid) {
      allVariantsValid = false;
    }
    variantErrors.push(vVal.errors);
  });

  return {
    isValid: productValidation.isValid && allVariantsValid,
    productErrors: productValidation.errors,
    variantErrors,
  };
};

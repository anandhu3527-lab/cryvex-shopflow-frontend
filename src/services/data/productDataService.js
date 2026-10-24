/**
 * Products Data Service
 * Central data management connected to CRYVEX SHOPFLOW Live Backend:
 * https://shopflowbackend-production.up.railway.app/docs
 */

import { productApi } from "../api/productApi";
import { normalizeTaxRate } from "../../validations/productValidation";
import { queryCache } from "./queryCache";


const CATEGORY_COLORS = [
  "bg-blue-50 text-blue-700 border-blue-200",
  "bg-emerald-50 text-emerald-700 border-emerald-200",
  "bg-rose-50 text-rose-700 border-rose-200",
  "bg-amber-50 text-amber-700 border-amber-200",
  "bg-purple-50 text-purple-700 border-purple-200",
  "bg-cyan-50 text-cyan-700 border-cyan-200",
  "bg-indigo-50 text-indigo-700 border-indigo-200",
  "bg-teal-50 text-teal-700 border-teal-200",
];

// In-memory category cache — populated from live API, never pre-seeded with fake data
let cachedCategories = [];

// Helper to transform backend product format to UI format
function transformBackendProduct(apiProd, categories = cachedCategories) {
  const primaryVariant = apiProd.variants?.[0] || {};
  const matchedCategory = categories.find((c) => String(c.id) === String(apiProd.category_id));
  const categoryName =
    apiProd.category_name ||
    (typeof apiProd.category === "object" && apiProd.category !== null ? apiProd.category.name : null) ||
    (typeof apiProd.category === "string" && apiProd.category.trim() && apiProd.category.toLowerCase() !== "uncategorized" ? apiProd.category : null) ||
    matchedCategory?.name ||
    apiProd.category_title ||
    "Uncategorized";
  const totalStock = (apiProd.variants || []).reduce(
    (acc, v) => acc + Number(v.stock_quantity || 0),
    0
  );

  return {
    id: apiProd.id,
    initials: (apiProd.name || "PR")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    name: apiProd.name,
    category_id: apiProd.category_id,
    category: categoryName,
    description: apiProd.description || "",
    price: Number(primaryVariant.selling_price || 0),
    selling_price: Number(primaryVariant.selling_price || 0),
    offer_price:
      primaryVariant.offer_price !== null &&
      primaryVariant.offer_price !== undefined &&
      typeof primaryVariant.offer_price !== 'boolean' &&
      String(primaryVariant.offer_price).trim() !== '' &&
      Number.isFinite(Number(primaryVariant.offer_price))
        ? Number(primaryVariant.offer_price)
        : null,
    stock: totalStock,
    unit: primaryVariant.unit || "Units",
    gst: Number(primaryVariant.tax_rate || 0),
    velocity: "Regular",
    status: totalStock > 0 ? "In Stock" : "Out of Stock",
    variants: apiProd.variants || [],
    createdAt: apiProd.created_at || new Date().toISOString(),
  };
}

export const productDataService = {
  /**
   * Fetch All Products from backend API
   * GET /api/v1/products
   */
  async getProducts() {
    return queryCache.fetch("products:all", async () => {
      const apiResponse = await productApi.getProducts();
      const productList = Array.isArray(apiResponse) ? apiResponse : apiResponse?.data || [];
      return productList.map((p) => transformBackendProduct(p, cachedCategories));
    }, 60_000);
  },

  /**
   * Search Products by backend name query
   * GET /api/v1/products/search?q=...
   */
  async searchProducts(query) {
    const trimmed = String(query || "").trim();
    if (!trimmed) return this.getProducts();

    const apiResponse = await productApi.searchProducts(trimmed);
    const productList = Array.isArray(apiResponse)
      ? apiResponse
      : apiResponse?.data || [];

    return productList.map((p) => transformBackendProduct(p, cachedCategories));
  },

  /**
   * Fetch product by backend barcode lookup
   * GET /api/v1/products/barcode/{barcode}
   */
  async getProductByBarcode(barcode) {
    const value = String(barcode || "").trim();
    if (!value) return null;

    const apiResponse = await productApi.getProductByBarcode(value);
    const data = apiResponse?.data || apiResponse;
    if (!data) return null;

    const variantId = data.variant_id || data.id;
    const productId = data.product_id || data.id;

    return {
      id: productId,
      product_id: productId,
      name: data.product_name || data.name || "Product",
      category: data.category_name || data.category || "Uncategorized",
      category_id: data.category_id || null,
      description: data.description || "",
      price: Number(data.selling_price || 0),
      stock: Number(data.stock_quantity || 0),
      unit: data.unit || "Units",
      gst: Number(data.tax_rate || 0),
      status: Number(data.stock_quantity || 0) > 0 ? "In Stock" : "Out of Stock",
      variants: [
        {
          id: variantId,
          product_id: productId,
          package_quantity: data.package_quantity || 1,
          unit: data.unit || "Units",
          barcode: data.barcode || value,
          sku: data.sku || "",
          selling_price: data.selling_price || 0,
          offer_price: data.offer_price ?? null,
          tax_rate: data.tax_rate || 0,
          stock_quantity: data.stock_quantity || 0,
          low_stock_threshold: data.low_stock_threshold || 0,
        },
      ],
      initials: (data.product_name || data.name || "PR")
        .split(" ")
        .map((word) => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    };
  },

  /**
   * Fetch low-stock alerts from backend API
   * GET /api/v1/products/low-stock
   */
  async getLowStockAlerts() {
    return queryCache.fetch("products:low-stock", async () => {
      const response = await productApi.getLowStockAlerts();
      return Array.isArray(response) ? response : response?.data || [];
    }, 60_000);
  },

  /**
   * Fetch stock overview from backend API
   * GET /api/v1/products/stock
   */
  async getStockOverview() {
    const response = await productApi.getStockOverview();
    return Array.isArray(response) ? response : response?.data || [];
  },

  /**
   * Fetch Categories from live backend API
   * GET /api/v1/categories
   */
  async fetchCategories() {
    try {
      const response = await queryCache.fetch("categories:all", () => productApi.getCategories(), 120_000);
      const list = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.data?.data)
        ? response.data.data
        : [];
      if (list.length > 0) {
        cachedCategories = list.map((item, idx) => ({
          id: item.id,
          name: item.name,
          description: item.description || "",
          status: item.status || "ACTIVE",
          color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
        }));
      }
      return cachedCategories;
    } catch {
      return cachedCategories;
    }
  },

  /**
   * Get cached category list (populated by fetchCategories)
   */
  getCategoryList() {
    return cachedCategories;
  },

  /**
   * Create New Category
   * POST /api/v1/categories
   */
  async createCategory(categoryData) {
    const res = await productApi.createCategory({
      name: categoryData.name.trim(),
      description: categoryData.description ? categoryData.description.trim() : null,
    });

    const newCategory = {
      id: res.id || res.data?.id,
      name: res.name || categoryData.name,
      description: res.description || categoryData.description || "",
      status: res.status || "ACTIVE",
      color: CATEGORY_COLORS[cachedCategories.length % CATEGORY_COLORS.length],
    };

    cachedCategories.push(newCategory);
    return newCategory;
  },

  /**
   * Create Product With Variants
   * POST /api/v1/products
   */
  async createProduct(payload) {
    const productName = String(payload?.product?.name || "").trim();
    const productDescription = String(payload?.product?.description || "").trim();
    const categoryId = payload?.product?.category_id;

    if (!productName || !categoryId) {
      throw new Error("A product name and category are required to create the product.");
    }

    // Format payload strictly matching the live Swagger schema; only send supported fields.
    const apiPayload = {
      product: {
        name: productName,
        description: productDescription || null,
        category_id: categoryId,
      },
      variants: (payload?.variants || []).map((v) => ({
        package_quantity: Number(v.package_quantity ?? 1),
        unit: String(v.unit || "kg"),
        barcode: v.barcode ? String(v.barcode).trim() : null,
        sku: v.sku ? String(v.sku).trim() : null,
        selling_price: Number(v.selling_price ?? 0),
        offer_price:
          v.offer_price !== "" && v.offer_price != null ? Number(v.offer_price) : null,
        tax_rate: v.tax_rate ? Number(v.tax_rate) : 0,

        stock_quantity: Number(v.stock_quantity ?? 0),
        low_stock_threshold: Number(v.low_stock_threshold ?? 10),
      })),
    };

    const apiResult = await productApi.createProduct(apiPayload);
    // Invalidate product caches so next visit shows the new product
    queryCache.invalidatePrefix("products:");
    queryCache.invalidate("categories:all");

    // Build unified local product record from API response
    const createdProduct = transformBackendProduct(
      {
        id: apiResult?.data?.product_id || apiResult?.id,
        name: payload.product.name,
        category_id: payload.product.category_id,
        description: payload.product.description,
        variants: payload.variants,
        created_at: new Date().toISOString(),
      },
      cachedCategories
    );

    return {
      success: true,
      message: apiResult?.message || "Product created successfully",
      data: createdProduct,
    };
  },

  /**
   * Add Variant to an existing product
   * POST /api/v1/products/{product_id}/variants
   */
  async createProductVariant(productId, variantData) {
    if (!productId) {
      throw new Error("Product ID is required to add a variant.");
    }

    const payload = {
      package_quantity: Number(variantData.package_quantity ?? 1),
      unit: String(variantData.unit || "kg"),
      barcode: variantData.barcode ? String(variantData.barcode).trim() : null,
      sku: variantData.sku ? String(variantData.sku).trim() : null,
      selling_price: Number(variantData.selling_price ?? 0),
      offer_price:
        variantData.offer_price !== "" && variantData.offer_price != null ? Number(variantData.offer_price) : null,
      tax_rate:
        variantData.tax_rate !== "" && variantData.tax_rate != null ? Number(variantData.tax_rate) : 0,
      stock_quantity: Number(variantData.stock_quantity ?? 0),
      low_stock_threshold: Number(variantData.low_stock_threshold ?? 0),
    };

    const result = await productApi.createProductVariant(productId, payload);
    queryCache.invalidatePrefix("products:");
    return result;
  },

  /**
   * Update Variant
   * PATCH /api/v1/products/variants/{variant_id}
   */
  async updateVariant(variantId, data) {
    const result = await productApi.updateVariant(variantId, data);
    queryCache.invalidatePrefix("products:");
    return result;
  },

  /**
   * Update Variant Inventory
   * PATCH /api/v1/products/variants/{variant_id}/inventory
   */
  async updateVariantInventory(variantId, data) {
    return productApi.updateVariantInventory(variantId, data);
  },
};

export default productDataService;

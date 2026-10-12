import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Layers,
  Sparkles,
  Search,
  Filter,
  ArrowUpDown,
  Grid,
  List,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Package,
  Barcode,
  ArrowRight,
  Plus,
  RefreshCw,
  TrendingUp,
  Tag,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  RotateCcw,
  Check,
  X,
} from "lucide-react";
import { billingApi } from "../../services/api/billingApi";
import { productApi } from "../../services/api/productApi";
import { productDataService } from "../../services/data/productDataService";
import ProductCard from "./components/ProductCard";
import { getCategoryTheme } from "./components/categoryTheme";
import Stock3DSymbol from "./components/Stock3DSymbol";

const BILL_PAGE_SIZE = 100;

function getCollection(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
}

function getLocalDateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getSalesDays(now = new Date()) {
  return ["Today", "Yesterday"].map((label, offset) => {
    const date = new Date(now);
    date.setDate(date.getDate() - offset);
    return {
      key: getLocalDateKey(date),
      label,
      date: date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      sales: [],
    };
  });
}

function getApiErrorMessage(error, fallback) {
  const status = error?.details?.status;
  if (status === 401) return "Authentication required. Please sign in again.";
  if (status === 403) return "You do not have permission to view this data.";
  if (status === 404) return "The requested data was not found.";
  if (status >= 500) return "The server could not load this data. Please try again.";
  if (!status && /network|fetch/i.test(error?.message || "")) {
    return "Network error. Check your connection and try again.";
  }
  return error?.message || fallback;
}

function getQuantity(value) {
  const quantity = Number(value);
  return Number.isFinite(quantity) ? quantity : null;
}

function formatQuantity(value) {
  const quantity = getQuantity(value);
  return quantity === null ? "—" : quantity.toLocaleString("en-IN");
}

function getStatusClass(status) {
  const value = String(status || "").toLowerCase();
  if (value.includes("low")) return "bg-amber-50 text-amber-700 border-amber-200";
  if (value.includes("out") || value.includes("zero")) return "bg-rose-50 text-rose-700 border-rose-200";
  if (value.includes("stock") || value.includes("active")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

function getProductRows(products, categories = []) {
  const categoryMap = new Map();

  (Array.isArray(categories) ? categories : []).forEach((c) => {
    if (c?.id != null && c?.name) {
      categoryMap.set(String(c.id), String(c.name).trim());
    }
  });

  const cached = productDataService.getCategoryList();
  (Array.isArray(cached) ? cached : []).forEach((c) => {
    if (c?.id != null && c?.name && !categoryMap.has(String(c.id))) {
      categoryMap.set(String(c.id), String(c.name).trim());
    }
  });

  return products.map((product) => {
    const variants = Array.isArray(product.variants) ? product.variants : [];
    let totalStock = 0;
    const barcodes = [];
    const skus = [];

    let minProductPrice = Infinity;
    let maxProductPrice = 0;
    const sizes = [];

    variants.forEach((v) => {
      totalStock += Number(v.stock_quantity) || 0;
      if (v.barcode) barcodes.push(String(v.barcode).toLowerCase());
      if (v.sku) skus.push(String(v.sku).toLowerCase());
      const p = Number(v.selling_price ?? v.price) || 0;
      if (p > 0) {
        if (p < minProductPrice) minProductPrice = p;
        if (p > maxProductPrice) maxProductPrice = p;
      }
      if (v.size) sizes.push(String(v.size));
      if (v.attributes?.size) sizes.push(String(v.attributes.size));
      if (v.name && /(?:size\s*:?\s*|#)(\w+)/i.test(v.name)) {
        const match = v.name.match(/(?:size\s*:?\s*|#)(\w+)/i);
        if (match) sizes.push(match[1]);
      }
    });

    const price = minProductPrice !== Infinity ? minProductPrice : 0;

    let status = product.status;
    if (!status) {
      status = totalStock > 0 ? "In Stock" : "Out of Stock";
    }

    const catId = product.category_id ?? product.categoryId ?? product.category?.id;
    const rawCategory = product.category;
    const catNameFromObj =
      typeof rawCategory === "object" && rawCategory !== null ? rawCategory.name : null;
    const catNameFromStr =
      typeof rawCategory === "string" && rawCategory.trim() && rawCategory.trim().toLowerCase() !== "uncategorized"
        ? rawCategory.trim()
        : null;

    const matchedCategory =
      product.category_name ||
      catNameFromObj ||
      (catId != null ? categoryMap.get(String(catId)) : null) ||
      catNameFromStr ||
      product.categoryName ||
      product.category_title ||
      "Uncategorized";

    return {
      id: product.id,
      name: product.name || "Unnamed product",
      category: matchedCategory,
      categoryId: catId,
      variantCount: variants.length,
      stockQuantity: totalStock,
      status: status,
      price,
      sizes,
      searchableBarcodes: barcodes.join(" "),
      searchableSkus: skus.join(" "),
      variants,
      description: product.description,
      rawProduct: product,
    };
  });
}

async function getRecentBills(salesDays) {
  const oldestSalesDay = salesDays[salesDays.length - 1].key;
  const newestSalesDay = salesDays[0].key;
  const recentBills = [];

  for (let offset = 0; ; offset += BILL_PAGE_SIZE) {
    const response = await billingApi.getBills(BILL_PAGE_SIZE, offset);
    const page = getCollection(response);
    if (page.length === 0) break;

    recentBills.push(
      ...page.filter((bill) => {
        const dateKey = getLocalDateKey(bill.created_at);
        return dateKey >= oldestSalesDay && dateKey <= newestSalesDay;
      })
    );

    const pageDateKeys = page
      .map((bill) => getLocalDateKey(bill.created_at))
      .filter(Boolean)
      .sort();
    const oldestPageDate = pageDateKeys[0];
    if (page.length < BILL_PAGE_SIZE || (oldestPageDate && oldestPageDate < oldestSalesDay)) break;
  }

  const billsWithItems = [];
  for (let start = 0; start < recentBills.length; start += 8) {
    const batch = await Promise.all(
      recentBills.slice(start, start + 8).map(async (bill) => {
        if (Array.isArray(bill.items)) return bill;
        const billId = bill.id || bill.bill_id;
        if (!billId) return bill;
        const detailResponse = await billingApi.getBillById(billId);
        return detailResponse?.data || detailResponse;
      })
    );
    billsWithItems.push(...batch);
  }

  return billsWithItems;
}

function calculateDailySales(bills, products, salesDays) {
  const salesByDay = new Map(salesDays.map((day) => [day.key, new Map()]));
  const productsById = new Map(products.map((product) => [String(product.id), product]));
  const variantsById = new Map();
  products.forEach((product) => {
    (Array.isArray(product.variants) ? product.variants : []).forEach((variant) => {
      if (variant.id != null) variantsById.set(String(variant.id), { ...variant, product });
    });
  });

  bills.forEach((bill) => {
    if ((bill.status || "").toUpperCase() === "CANCELLED") return;
    const dateKey = getLocalDateKey(bill.created_at);
    const daySales = salesByDay.get(dateKey);
    if (!daySales) return;

    (Array.isArray(bill.items) ? bill.items : []).forEach((item) => {
      const variantId = item.product_variant_id || item.variant_id;
      const productId = item.product_id || item.product?.id;
      const variantEntry = variantsById.get(String(variantId));
      const product = variantEntry?.product || productsById.get(String(productId));
      const variant =
        variantEntry || (product?.variants?.length === 1 ? product.variants[0] : null);
      const quantity = getQuantity(item.quantity);
      if (quantity === null || quantity <= 0) return;

      const barcode = variant?.barcode || "Barcode unavailable";
      const saleKey = String(variantId || `${productId || item.item_name}-${barcode}`);
      const sale = daySales.get(saleKey) || {
        productName: item.item_name || product?.name || "Product name unavailable",
        barcode,
        unitsSold: 0,
      };
      sale.unitsSold += quantity;
      daySales.set(saleKey, sale);
    });
  });

  return salesDays.map((day) => ({
    ...day,
    sales: [...salesByDay.get(day.key).values()],
  }));
}

function getInitialResource() {
  return { loading: true, data: [], error: "" };
}

export default function Products({ searchTerm = "" }) {
  const navigate = useNavigate();

  // Resource state
  const [productsState, setProductsState] = useState(getInitialResource);
  const [categoriesState, setCategoriesState] = useState(getInitialResource);
  const [lowStockState, setLowStockState] = useState(getInitialResource);
  const [stockState, setStockState] = useState(getInitialResource);
  const [salesState, setSalesState] = useState({ loading: true, days: [], error: "" });

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({
    Outerwear: true,
    Footwear: false,
    Underwear: false,
  });
  const [priceFilter, setPriceFilter] = useState(null);
  const [sizeFilter, setSizeFilter] = useState("ALL");
  const [colorFilter, setColorFilter] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL"); // 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  const [sortBy, setSortBy] = useState("stock-asc"); // 'stock-asc' | 'stock-desc' | 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc'
  const [localSearch, setLocalSearch] = useState("");
  const [isSizesExpanded, setIsSizesExpanded] = useState(true);
  const [isColorsExpanded, setIsColorsExpanded] = useState(true);
  const [isStockExpanded, setIsStockExpanded] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Barcode Lookup state
  const [barcode, setBarcode] = useState("");
  const [lookupState, setLookupState] = useState({ status: "idle", product: null, error: "" });
  const [isLookingUp, setIsLookingUp] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const salesDays = getSalesDays();

    const loadResource = async (request, setter, fallback) => {
      try {
        const response = await request();
        if (isMounted) setter({ loading: false, data: getCollection(response), error: "" });
      } catch (error) {
        if (isMounted) {
          setter({ loading: false, data: [], error: getApiErrorMessage(error, fallback) });
        }
      }
    };

    const productsRequest = productApi.getProducts();
    const categoriesRequest = productApi.getCategories();

    loadResource(() => productsRequest, setProductsState, "Could not load products.");
    loadResource(() => categoriesRequest, setCategoriesState, "Could not load categories.");
    loadResource(() => productApi.getLowStockAlerts(), setLowStockState, "Could not load low-stock products.");
    loadResource(() => productApi.getStockOverview(), setStockState, "Could not load stock overview.");

    // Prime productDataService cached categories
    productDataService
      .fetchCategories()
      .then((cats) => {
        if (isMounted && Array.isArray(cats) && cats.length > 0) {
          setCategoriesState((prev) =>
            prev.data.length === 0 ? { loading: false, data: cats, error: "" } : prev
          );
        }
      })
      .catch(() => {});

    const loadSales = async () => {
      try {
        const [productsResponse, bills] = await Promise.all([
          productsRequest,
          getRecentBills(salesDays),
        ]);
        const products = getCollection(productsResponse);
        if (isMounted) {
          setSalesState({
            loading: false,
            days: calculateDailySales(bills, products, salesDays),
            error: "",
          });
        }
      } catch (error) {
        if (isMounted) {
          setSalesState({
            loading: false,
            days: [],
            error: getApiErrorMessage(error, "Could not load daily product sales."),
          });
        }
      }
    };
    loadSales();

    return () => {
      isMounted = false;
    };
  }, []);

  const productRows = useMemo(() => {
    return getProductRows(productsState.data, categoriesState.data);
  }, [productsState.data, categoriesState.data]);

  // Categories list extracted dynamically
  const categories = useMemo(() => {
    const set = new Set();
    (categoriesState.data || []).forEach((c) => {
      if (c?.name && typeof c.name === "string" && c.name.trim()) {
        set.add(c.name.trim());
      }
    });
    (productDataService.getCategoryList() || []).forEach((c) => {
      if (c?.name && typeof c.name === "string" && c.name.trim()) {
        set.add(c.name.trim());
      }
    });
    productRows.forEach((p) => {
      if (p.category && p.category !== "Uncategorized") set.add(p.category);
    });

    const list = ["ALL", ...Array.from(set).sort()];
    if (productRows.some((p) => p.category === "Uncategorized")) {
      list.push("Uncategorized");
    }
    return list;
  }, [categoriesState.data, productRows]);

  // Maximum price in the current catalog
  const catalogMaxPrice = useMemo(() => {
    let max = 1000;
    productRows.forEach((p) => {
      if (p.price > max) max = Math.ceil(p.price);
    });
    return Math.max(1000, Math.ceil(max / 100) * 100);
  }, [productRows]);

  // Derived available sizes
  const availableSizes = useMemo(() => {
    const set = new Set();
    productRows.forEach((p) => {
      (p.sizes || []).forEach((s) => set.add(String(s).trim()));
    });
    ["6", "7", "8", "9", "10", "S", "M", "L", "XL"].forEach((s) => set.add(s));
    return Array.from(set);
  }, [productRows]);

  // Map of categories and their sub-items derived purely from real product data
  const categorySubItems = useMemo(() => {
    const map = {};
    categories.forEach((cat) => {
      if (cat === "ALL") return;
      const set = new Set();
      productRows.forEach((p) => {
        if (p.category === cat) {
          const sub = p.rawProduct?.sub_category || p.rawProduct?.subcategory || p.rawProduct?.brand || p.name;
          if (sub) set.add(String(sub).trim());
        }
      });
      if (set.size > 0) {
        map[cat] = Array.from(set).slice(0, 8);
      }
    });
    return map;
  }, [categories, productRows]);

  // Combined categories list for the sidebar — only real categories from backend
  const sidebarCategories = useMemo(() => {
    const set = new Set();
    categories.forEach((c) => {
      if (c !== "ALL" && c !== "Uncategorized") set.add(c);
    });
    if (categories.includes("Uncategorized")) set.add("Uncategorized");
    return Array.from(set);
  }, [categories]);

  // Active filters check & reset
  const hasActiveFilters =
    selectedCategory !== "ALL" ||
    selectedSubcategory !== null ||
    localSearch.trim() !== "";

  const resetAllFilters = () => {
    setSelectedCategory("ALL");
    setSelectedSubcategory(null);
    setLocalSearch("");
  };

  const toggleCategoryExpand = (cat) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  const handleSelectCategory = (cat) => {
    if (selectedCategory === cat && selectedSubcategory === null) {
      setSelectedCategory("ALL");
    } else {
      setSelectedCategory(cat);
      setSelectedSubcategory(null);
    }
  };

  const handleSelectSubcategory = (cat, sub) => {
    if (selectedCategory === cat && selectedSubcategory === sub) {
      setSelectedSubcategory(null);
    } else {
      setSelectedCategory(cat);
      setSelectedSubcategory(sub);
    }
  };

  // Filtered and sorted product rows
  const visibleProductRows = useMemo(() => {
    const query = (localSearch || searchTerm).trim().toLowerCase();

    return productRows
      .filter((row) => {
        // Query search
        if (query) {
          const matches =
            row.name.toLowerCase().includes(query) ||
            row.category.toLowerCase().includes(query) ||
            row.searchableBarcodes.includes(query) ||
            row.searchableSkus.includes(query);
          if (!matches) return false;
        }

        // Category filter
        if (selectedCategory !== "ALL" && row.category !== selectedCategory) {
          const rowCatLower = row.category.toLowerCase();
          const selCatLower = selectedCategory.toLowerCase();
          if (!rowCatLower.includes(selCatLower) && !row.name.toLowerCase().includes(selCatLower)) {
            return false;
          }
        }

        // Subcategory filter
        if (selectedSubcategory) {
          const subLower = selectedSubcategory.toLowerCase();
          const matchesSub =
            row.name.toLowerCase().includes(subLower) ||
            (row.rawProduct?.sub_category && String(row.rawProduct.sub_category).toLowerCase().includes(subLower)) ||
            (row.rawProduct?.brand && String(row.rawProduct.brand).toLowerCase().includes(subLower));
          if (!matchesSub) return false;
        }

        // Price filter
        if (priceFilter !== null && row.price > priceFilter) {
          return false;
        }

        // Size filter
        if (sizeFilter !== "ALL") {
          const sizeLower = sizeFilter.toLowerCase();
          const hasSize =
            row.sizes?.some((s) => s.toLowerCase() === sizeLower) ||
            row.name.toLowerCase().includes(` ${sizeLower}`) ||
            row.variants?.some((v) => String(v.name || "").toLowerCase().includes(sizeLower));
          if (!hasSize) return false;
        }

        // Color filter
        if (colorFilter !== null) {
          const colorLower = colorFilter.toLowerCase();
          const matchesColor =
            row.name.toLowerCase().includes(colorLower) ||
            row.description?.toLowerCase().includes(colorLower) ||
            row.variants?.some((v) => String(v.name || "").toLowerCase().includes(colorLower));
          if (!matchesColor) return false;
        }

        // Status filter
        if (statusFilter === "IN_STOCK") {
          if (row.stockQuantity <= 0 || row.status?.toLowerCase().includes("out")) return false;
        } else if (statusFilter === "LOW_STOCK") {
          // The low-stock endpoint is authoritative because a product can be
          // low even when its quantity is above the default threshold of 5.
          const rowProductId = String(row.id ?? row.rawProduct?.id ?? "");
          const rowVariantIds = new Set(
            (Array.isArray(row.variants) ? row.variants : [])
              .map((variant) => String(variant.id ?? variant.variant_id ?? variant.variantId ?? ""))
              .filter(Boolean)
          );
          const alertMatch = (Array.isArray(lowStockState.data) ? lowStockState.data : []).some((alert) => {
            const alertProductId = String(
              alert?.product_id ?? alert?.productId ?? alert?.product?.id ?? ""
            );
            const alertVariantId = String(
              alert?.variant_id ?? alert?.variantId ?? alert?.variant?.id ?? alert?.id ?? ""
            );
            const alertName = String(
              alert?.product_name ?? alert?.productName ?? alert?.product?.name ?? alert?.name ?? ""
            ).trim().toLowerCase();
            const sameProduct =
              (alertProductId && rowProductId && alertProductId === rowProductId) ||
              (alertName && alertName === String(row.name || "").trim().toLowerCase());
            const sameVariant = alertVariantId && rowVariantIds.has(alertVariantId);
            return Boolean(sameProduct || sameVariant);
          });
          const variantBelowItsOwnThreshold = (Array.isArray(row.variants) ? row.variants : []).some((variant) => {
            const quantity = Number(variant.stock_quantity ?? variant.stock ?? 0);
            const threshold = Number(
              variant.low_stock_threshold ??
              variant.minimum_stock ??
              variant.min_stock ??
              row.rawProduct?.low_stock_threshold ??
              row.rawProduct?.minimum_stock ??
              5
            );
            return quantity > 0 && quantity <= threshold;
          });
          const rowThreshold = Number(
            row.rawProduct?.low_stock_threshold ??
            row.rawProduct?.minimum_stock ??
            row.rawProduct?.min_stock ??
            5
          );
          const rowBelowThreshold = row.stockQuantity > 0 && row.stockQuantity <= rowThreshold;
          const isOut = row.stockQuantity <= 0 || row.status?.toLowerCase().includes("out");
          const isLowStock = !isOut && (
            alertMatch ||
            row.status?.toLowerCase().includes("low") ||
            variantBelowItsOwnThreshold ||
            rowBelowThreshold
          );
          if (!isLowStock) return false;
        } else if (statusFilter === "OUT_OF_STOCK") {
          if (row.stockQuantity > 0 && !row.status?.toLowerCase().includes("out")) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const aStock = Number(a.stockQuantity) || 0;
        const bStock = Number(b.stockQuantity) || 0;
        if (sortBy === "stock-asc") return aStock - bStock;
        if (sortBy === "stock-desc") return bStock - aStock;
        if (sortBy === "name-asc") return a.name.localeCompare(b.name);
        if (sortBy === "name-desc") return b.name.localeCompare(a.name);
        if (sortBy === "price-asc") return (a.price || 0) - (b.price || 0);
        if (sortBy === "price-desc") return (b.price || 0) - (a.price || 0);
        return 0;
      });
  }, [productRows, searchTerm, localSearch, selectedCategory, selectedSubcategory, priceFilter, sizeFilter, colorFilter, statusFilter, sortBy, lowStockState.data]);

  // All visible products displayed in 2xN grid
  const displayedRows = visibleProductRows;

  // Aggregated KPI Stats
  const kpiStats = useMemo(() => {
    let totalStockUnits = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    productRows.forEach((row) => {
      totalStockUnits += row.stockQuantity;
      if (row.stockQuantity <= 0 || row.status?.toLowerCase().includes("out")) {
        outOfStockCount++;
      } else if (row.status?.toLowerCase().includes("low") || row.stockQuantity <= 5) {
        lowStockCount++;
      }
    });

    return {
      totalProducts: productRows.length,
      totalStockUnits,
      lowStockCount: lowStockState.data.length || lowStockCount,
      outOfStockCount,
    };
  }, [productRows, lowStockState.data]);

  const handleBarcodeLookup = async (event) => {
    event.preventDefault();
    const value = barcode.trim();
    if (!value) return;

    setIsLookingUp(true);
    setLookupState({ status: "loading", product: null, error: "" });
    try {
      const response = await productApi.getProductByBarcode(value);
      const product = response?.data || response;
      setLookupState({ status: "found", product, error: "" });
    } catch (error) {
      if (error?.details?.status === 404) {
        setLookupState({
          status: "not-found",
          product: null,
          error: `No product found for barcode "${value}".`,
        });
      } else {
        setLookupState({
          status: "error",
          product: null,
          error: getApiErrorMessage(error, "Barcode lookup failed."),
        });
      }
    } finally {
      setIsLookingUp(false);
    }
  };

  return (
    <div className="relative mx-auto max-w-7xl space-y-8 pb-16">
      {/* Dynamic Ambient Gradient Backdrop Orbs */}
      <div className="pointer-events-none fixed -top-20 -right-20 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-blue-500/15 via-indigo-500/10 to-purple-500/20 blur-3xl -z-10" />
      <div className="pointer-events-none fixed top-1/3 -left-20 w-[450px] h-[450px] rounded-full bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/15 blur-3xl -z-10" />

      {/* ================= PAGE HEADER ================= */}
      <header className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#0B192C] tracking-tight">
              Products
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium">
              Real-time store catalogue, stock tracking, and inventory management.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate("/daily-price-update")}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-xs transition cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
              <span>Daily Price Update</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/products/add")}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/25 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add New Product</span>
            </button>
          </div>
        </div>
      </header>

      {/* ================= VIBRANT GRADIENT METRIC STATS COLUMNS ================= */}
      <section aria-labelledby="kpi-metrics-title" className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <h2 id="kpi-metrics-title" className="sr-only">Inventory KPI Metrics</h2>

        {/* Total Catalog Card - Electric Blue & Indigo Gradient */}
        <div className="relative overflow-hidden rounded-3xl border border-blue-400/30 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-800 p-5 text-white shadow-xl shadow-blue-500/20 transition-all duration-300 hover:-translate-y-1">
          <div className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-white/15 blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-blue-100">Total Catalog</span>
            <div className="rounded-xl bg-white/20 p-2.5 backdrop-blur-md border border-white/20 shadow-xs">
              <Box className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl sm:text-4xl font-black tracking-tight">{kpiStats.totalProducts}</span>
            <span className="ml-2 text-xs font-bold text-blue-200">products listed</span>
          </div>
          <div className="mt-2 text-[11px] text-blue-100 font-semibold">
            Active in store catalog
          </div>
        </div>

        {/* Total Stock Units Card - Lush Emerald & Teal Gradient */}
        <div className="relative overflow-hidden rounded-3xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-800 p-5 text-white shadow-xl shadow-emerald-500/20 transition-all duration-300 hover:-translate-y-1">
          <div className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-white/15 blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-100">Total Stock</span>
            <div className="rounded-2xl bg-white/20 p-2 backdrop-blur-md border border-white/30 shadow-md flex items-center justify-center">
              <Stock3DSymbol type="high" size="sm" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl sm:text-4xl font-black tracking-tight">
              {kpiStats.totalStockUnits.toLocaleString("en-IN")}
            </span>
            <span className="ml-2 text-xs font-bold text-emerald-200">units</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-100 font-semibold">
            Live on warehouse shelves
          </div>
        </div>

        {/* Low Stock Alerts Card (Clickable Filter) - Amber & Orange Gradient */}
        <div
          onClick={() => setStatusFilter(statusFilter === "LOW_STOCK" ? "ALL" : "LOW_STOCK")}
          className={`relative cursor-pointer overflow-hidden rounded-3xl border transition-all duration-300 p-5 shadow-xl hover:-translate-y-1 ${
            statusFilter === "LOW_STOCK"
              ? "ring-4 ring-amber-300 border-amber-300 bg-gradient-to-br from-amber-600 via-orange-600 to-red-700 text-white"
              : "border-amber-400/30 bg-gradient-to-br from-amber-500 via-orange-500 to-amber-700 text-white shadow-amber-500/20"
          }`}
        >
          <div className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-white/15 blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-amber-100">Low Stock Alert</span>
            <div className="rounded-2xl bg-white/20 p-2 backdrop-blur-md border border-white/30 shadow-md flex items-center justify-center">
              <Stock3DSymbol type="low" size="sm" className="animate-pulse" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl sm:text-4xl font-black tracking-tight">{kpiStats.lowStockCount}</span>
            <span className="ml-2 text-xs font-bold text-amber-100">need restock</span>
          </div>
          <div className="mt-2 text-[11px] text-amber-100 font-bold flex items-center justify-between">
            <span>{statusFilter === "LOW_STOCK" ? "Filtered: Active" : "Click to view alerts"}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Out of Stock Card (Clickable Filter) - Rose & Crimson Gradient */}
        <div
          onClick={() => setStatusFilter(statusFilter === "OUT_OF_STOCK" ? "ALL" : "OUT_OF_STOCK")}
          className={`relative cursor-pointer overflow-hidden rounded-3xl border transition-all duration-300 p-5 shadow-xl hover:-translate-y-1 ${
            statusFilter === "OUT_OF_STOCK"
              ? "ring-4 ring-rose-300 border-rose-300 bg-gradient-to-br from-rose-700 via-pink-700 to-purple-900 text-white"
              : "border-rose-400/30 bg-gradient-to-br from-rose-600 via-pink-600 to-rose-800 text-white shadow-rose-500/20"
          }`}
        >
          <div className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-white/15 blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-rose-100">Out of Stock</span>
            <div className="rounded-2xl bg-white/20 p-2 backdrop-blur-md border border-white/30 shadow-md flex items-center justify-center">
              <Stock3DSymbol type="out" size="sm" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl sm:text-4xl font-black tracking-tight">{kpiStats.outOfStockCount}</span>
            <span className="ml-2 text-xs font-bold text-rose-100">zero stock</span>
          </div>
          <div className="mt-2 text-[11px] text-rose-100 font-bold flex items-center justify-between">
            <span>{statusFilter === "OUT_OF_STOCK" ? "Filtered: Active" : "Click to isolate"}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </section>

      {/* ================= MAIN CATALOG WITH LEFT FILTERS SIDEBAR ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Mobile Filter Toggle Button */}
        <div className="lg:hidden col-span-1 flex items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <button
            type="button"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>{showMobileFilters ? "Hide Filters" : "Show Filters"}</span>
            {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-blue-400" />}
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* ── LEFT COLUMN: FILTERS SIDEBAR (Matches mockup) ── */}
        <aside
          className={`lg:col-span-3 xl:col-span-3 w-full ${
            showMobileFilters ? "block" : "hidden lg:block"
          }`}
        >
          <div className="sticky top-6 bg-white rounded-3xl border border-slate-200/80 shadow-md p-5 sm:p-6 space-y-6">
            {/* Header: Title "Filters" */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Filters
              </h2>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>

            {/* ── Categories Accordion List ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 tracking-tight">
                  Categories
                </h3>
                {selectedCategory !== "ALL" && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory("ALL");
                      setSelectedSubcategory(null);
                    }}
                    className="text-[11px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* All Categories Option */}
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("ALL");
                  setSelectedSubcategory(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedCategory === "ALL" && !selectedSubcategory
                    ? "bg-blue-50 text-blue-600 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      selectedCategory === "ALL" && !selectedSubcategory
                        ? "bg-blue-600"
                        : "bg-slate-300"
                    }`}
                  />
                  <span>All Categories</span>
                </span>
                <span className="text-[11px] font-semibold text-slate-400">
                  ({productRows.length})
                </span>
              </button>

              {/* Category Tree / Accordion Items */}
              <div className="space-y-1 pt-1">
                {sidebarCategories.map((cat) => {
                  const isExpanded = !!expandedCategories[cat];
                  const isCatActive = selectedCategory === cat;
                  const subItems = categorySubItems[cat] || [];

                  return (
                    <div key={cat} className="space-y-0.5">
                      {/* Category Header Row with Chevron */}
                      <div
                        className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                          isCatActive && !selectedSubcategory
                            ? "bg-blue-50/80 text-blue-600"
                            : "text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                        }`}
                        onClick={() => toggleCategoryExpand(cat)}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectCategory(cat);
                          }}
                          className="flex-1 text-left truncate flex items-center gap-2 cursor-pointer"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              isCatActive && !selectedSubcategory
                                ? "bg-blue-600"
                                : "bg-transparent group-hover:bg-slate-300"
                            }`}
                          />
                          <span className="truncate">{cat}</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCategoryExpand(cat);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                          aria-label={`Toggle ${cat}`}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* Sub-items (Bulleted List with Active Style matching Mockup) */}
                      {isExpanded && subItems.length > 0 && (
                        <div className="pl-4 pr-1 py-1 space-y-1">
                          {subItems.map((item) => {
                            const isSubActive =
                              selectedCategory === cat && selectedSubcategory === item;

                            return (
                              <button
                                key={item}
                                type="button"
                                onClick={() => handleSelectSubcategory(cat, item)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all cursor-pointer text-left ${
                                  isSubActive
                                    ? "bg-blue-50 text-blue-600 font-bold shadow-2xs"
                                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                    isSubActive ? "bg-blue-600" : "bg-slate-400"
                                  }`}
                                />
                                <span className="truncate">{item}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        {/* ── RIGHT COLUMN: PRODUCT CATALOG GRID ── */}
        <main className="lg:col-span-9 xl:col-span-9 w-full space-y-5">
          {/* Controls Bar: Search & Sorting */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="search"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Search product name, barcode, SKU or category..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 shadow-2xs"
              />
            </div>

            {/* Sorting Dropdown & Count */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <span className="text-xs font-bold text-slate-500">
                {visibleProductRows.length} item{visibleProductRows.length !== 1 ? "s" : ""}
              </span>

              <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs">
                <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent outline-none cursor-pointer text-slate-800 font-bold"
                >
                  <option value="stock-asc">Stock: Low to High</option>
                  <option value="stock-desc">Stock: High to Low</option>
                  <option value="name-asc">Name: A to Z</option>
                  <option value="name-desc">Name: Z to A</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                </select>
              </div>
            </div>
          </div>

          {/* Active Filter Chips Bar */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 px-1">
              <span className="text-xs font-bold text-slate-400">Active Filters:</span>
              
              {selectedCategory !== "ALL" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
                  <span>Category: {selectedCategory}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory("ALL");
                      setSelectedSubcategory(null);
                    }}
                    className="hover:text-blue-900 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              )}

              {selectedSubcategory && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
                  <span>Type: {selectedSubcategory}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedSubcategory(null)}
                    className="hover:text-blue-900 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              )}



              <button
                type="button"
                onClick={resetAllFilters}
                className="text-xs font-bold text-rose-600 hover:underline ml-1 cursor-pointer"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Product Cards Grid */}
          {productsState.loading ? (
            <div className="rounded-3xl border border-blue-200/80 bg-white p-16 text-center shadow-sm">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center animate-spin shadow-lg">
                <Box className="h-6 w-6 text-white" />
              </div>
              <p className="mt-4 text-sm font-bold text-slate-700">Loading catalog...</p>
            </div>
          ) : productsState.error ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50/50 p-8 text-center text-rose-700 shadow-sm">
              <p className="text-sm font-bold">{productsState.error}</p>
            </div>
          ) : visibleProductRows.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-16 text-center shadow-sm">
              <Package className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-3 text-base font-black text-slate-800">No matching products found</h3>
              <p className="mt-1 text-xs text-slate-500">Try adjusting your filters or search query.</p>
              <button
                type="button"
                onClick={resetAllFilters}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:from-blue-700 hover:to-indigo-700 transition cursor-pointer"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {visibleProductRows.map((row) => (
                <ProductCard key={row.id} product={row} />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* ================= LOW STOCK ALERT SECTION - FULL GRADIENT DIV ================= */}
      {lowStockState.data.length > 0 && (
        <section
          aria-labelledby="low-stock-products-title"
          className="overflow-hidden rounded-3xl border border-amber-300 bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-amber-500/5 shadow-md"
        >
          <div className="flex items-center justify-between border-b border-amber-200 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-4 sm:p-5 text-white">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-white animate-pulse" />
              <h2 id="low-stock-products-title" className="text-base font-black">
                Critical Low Stock Products
              </h2>
            </div>
            <span className="rounded-full bg-white/20 backdrop-blur-xs px-3 py-0.5 text-xs font-black text-white">
              {lowStockState.data.length} items
            </span>
          </div>

          <div className="overflow-x-auto bg-white/70">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-amber-100 bg-amber-50/50 text-[11px] font-black uppercase tracking-wider text-amber-900">
                  <th scope="col" className="px-5 py-3">Product</th>
                  <th scope="col" className="px-4 py-3">Barcode</th>
                  <th scope="col" className="px-4 py-3 text-right">Current Units</th>
                  <th scope="col" className="px-4 py-3 text-right">Threshold</th>
                  <th scope="col" className="px-5 py-3 text-right">Alert Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100/60">
                {lowStockState.data.map((item) => (
                  <tr key={item.variant_id || item.product_id} className="hover:bg-amber-100/30 transition">
                    <td className="px-5 py-3 font-bold text-slate-900">{item.product_name || "Unnamed product"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{item.barcode || "—"}</td>
                    <td className="px-4 py-3 text-right font-black text-amber-700">
                      {formatQuantity(item.stock_quantity)}{item.unit ? ` ${item.unit}` : ""}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 font-semibold">
                      {formatQuantity(item.low_stock_threshold)}{item.unit ? ` ${item.unit}` : ""}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="inline-flex rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                        {item.alert_type || "Low Stock"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ================= LIVE BARCODE QUICK LOOKUP - FULL GRADIENT CONTAINER ================= */}
      <section
        aria-labelledby="barcode-lookup-title"
        className="rounded-3xl border border-indigo-300/40 bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 p-6 sm:p-7 text-white shadow-xl relative overflow-hidden"
      >
        <div className="pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full bg-blue-500/20 blur-2xl" />

        <div className="relative z-10 flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 border border-white/20 flex items-center justify-center shadow-lg">
            <Barcode className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 id="barcode-lookup-title" className="text-base sm:text-lg font-black text-white">
              Live Barcode Scanner & Rapid Stock Lookup
            </h2>
            <p className="text-xs text-indigo-200">Scan or enter any barcode to instantly fetch live stock and packaging specifications.</p>
          </div>
        </div>

        <form onSubmit={handleBarcodeLookup} className="relative z-10 mt-4 flex flex-col gap-2.5 sm:flex-row">
          <label className="sr-only" htmlFor="barcode-lookup-input">Barcode</label>
          <input
            id="barcode-lookup-input"
            type="search"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Scan barcode or enter digits (e.g. 8901030...)..."
            className="flex-1 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md px-4 py-3 text-sm text-white placeholder:text-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30"
          />
          <button
            type="submit"
            disabled={isLookingUp || !barcode.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 px-6 py-3 text-xs font-black text-white disabled:opacity-50 transition shadow-lg shadow-blue-500/30 cursor-pointer"
          >
            {isLookingUp ? "Scanning..." : "Search Product"}
          </button>
        </form>

        {lookupState.status === "loading" && (
          <p className="relative z-10 mt-3 text-xs font-semibold text-blue-200">Querying database for barcode record...</p>
        )}
        {(lookupState.status === "not-found" || lookupState.status === "error") && (
          <p className="relative z-10 mt-3 text-xs font-bold text-rose-300">{lookupState.error}</p>
        )}
        {lookupState.status === "found" && lookupState.product && (
          <div className="relative z-10 mt-4 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-4 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 text-xs">
            <div>
              <span className="block text-indigo-200 font-medium">Product Name</span>
              <strong className="block text-white font-black text-sm mt-0.5">{lookupState.product.product_name}</strong>
            </div>
            <div>
              <span className="block text-indigo-200 font-medium">Barcode</span>
              <strong className="block font-mono text-cyan-300 text-sm mt-0.5">{lookupState.product.barcode}</strong>
            </div>
            <div>
              <span className="block text-indigo-200 font-medium">Stock On Hand</span>
              <strong className="block text-emerald-300 font-black text-sm mt-0.5">
                {formatQuantity(lookupState.product.stock_quantity)} {lookupState.product.unit || "units"}
              </strong>
            </div>
            <div>
              <span className="block text-indigo-200 font-medium">Threshold</span>
              <strong className="block text-amber-300 font-black text-sm mt-0.5">
                {formatQuantity(lookupState.product.low_stock_threshold)} {lookupState.product.unit || "units"}
              </strong>
            </div>
          </div>
        )}
      </section>

      {/* ================= DAILY PRODUCT SALES ACTIVITY COLUMNS ================= */}
      <section aria-labelledby="daily-sales-title" className="space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          <h2 id="daily-sales-title" className="text-base font-black text-slate-900">
            Daily Product Sales Activity
          </h2>
        </div>

        {salesState.loading ? (
          <p className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-xs font-semibold text-slate-500">
            Loading recent sales activity...
          </p>
        ) : salesState.error ? (
          <p className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-center text-xs font-bold text-rose-700">
            {salesState.error}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {salesState.days.map((day) => (
              <article key={day.key} className="rounded-3xl border border-blue-200/70 bg-gradient-to-br from-white via-blue-50/20 to-indigo-50/30 p-5 shadow-xs">
                <div className="flex items-baseline justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-black text-slate-900">{day.label}</h3>
                  <span className="text-xs font-bold text-slate-400">{day.date}</span>
                </div>
                {day.sales.length === 0 ? (
                  <p className="py-6 text-center text-xs font-medium text-slate-400">No sales transactions logged</p>
                ) : (
                  <ul className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1">
                    {day.sales.map((sale, idx) => (
                      <li key={`${sale.barcode}-${idx}`} className="py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-black text-slate-900 text-xs truncate">{sale.productName}</p>
                          <span className="font-mono text-[10px] text-slate-400">{sale.barcode}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="inline-block bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-2 py-0.5 rounded-lg text-xs font-black shadow-2xs">
                            {formatQuantity(sale.unitsSold)} sold
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        )}
      </section>


    </div>
  );
}
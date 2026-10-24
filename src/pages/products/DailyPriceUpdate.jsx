<<<<<<< HEAD
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  Calendar,
  TrendingUp,
  History,
  ArrowRight,
  Clock,
  Tag,
  Search,
  CheckCircle2,
  Plus,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { productApi } from "../../services/api/productApi";
import { dailyPriceHistoryService } from "../../services/data/dailyPriceHistoryService";
import { useAuth } from "../../context/AuthContext";
import { formatDate, formatTime } from "../../utils/formatting/date";
import { formatINRWithPaise } from "../../utils/formatting/currency";

export default function DailyPriceUpdate() {
  const navigate = useNavigate();
=======
import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { productApi } from "../../services/api/productApi";

export default function DailyPriceUpdate() {
>>>>>>> 0779c977551ab0c427eb4ebd82b89d18448dd602
  const [searchParams] = useSearchParams();
  const targetProductId = searchParams.get("productId") || "";
  const targetVariantId = searchParams.get("variantId") || "";
  const targetProductName = searchParams.get("productName") || "";
  const handledTargetRef = useRef("");
<<<<<<< HEAD

  const { currentTenant, currentUser } = useAuth();
  const tenantId = currentTenant?.id || currentUser?.tenant_id || "default_tenant";

=======
>>>>>>> 0779c977551ab0c427eb4ebd82b89d18448dd602
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

<<<<<<< HEAD
  // Daily Price History State from localStorage
  const [historyData, setHistoryData] = useState(() =>
    dailyPriceHistoryService.getTodayHistory(tenantId)
  );

  // Responsive Show More / Show Less display limit
  // Desktop (>= 768px): initial 3 cards; Mobile (< 768px): initial 2 cards
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 768;
    }
    return true;
  });

  const sessionKey = `${tenantId}:${historyData.dateKey}`;
  const [expandedSessionKey, setExpandedSessionKey] = useState(null);
  const isHistoryExpanded = expandedSessionKey === sessionKey;
  const toggleHistoryExpanded = () =>
    setExpandedSessionKey(isHistoryExpanded ? null : sessionKey);

  // Modal for Selecting a Parent Product to Add Variant
  const [showProductSelectModal, setShowProductSelectModal] = useState(false);
  const [productSelectQuery, setProductSelectQuery] = useState("");

=======
>>>>>>> 0779c977551ab0c427eb4ebd82b89d18448dd602
  // Edit Modal State
  const [editingVariant, setEditingVariant] = useState(null);
  const [editSellingPrice, setEditSellingPrice] = useState("");
  const [editOfferPrice, setEditOfferPrice] = useState("");
  const [editStockQuantity, setEditStockQuantity] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState("");

<<<<<<< HEAD
  // Refresh history handler
  const refreshHistory = useCallback(() => {
    setHistoryData(dailyPriceHistoryService.getTodayHistory(tenantId));
  }, [tenantId]);

  // Keep history synced with custom events, tab visibility changes, and tenant changes
  useEffect(() => {
    const handlePriceChangeEvent = (event) => {
      const eventTenant = event?.detail?.tenantId;
      if (!eventTenant || eventTenant === String(tenantId)) {
        refreshHistory();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshHistory();
      }
    };

    window.addEventListener("shopflow:daily-price-change", handlePriceChangeEvent);
    window.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("shopflow:daily-price-change", handlePriceChangeEvent);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [tenantId, refreshHistory]);

  // Viewport resize tracking for responsive history card limits
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);


  // Fetch product catalog
=======
  // Changed Products tracking
  const [changedProducts, setChangedProducts] = useState([]);

>>>>>>> 0779c977551ab0c427eb4ebd82b89d18448dd602
  useEffect(() => {
    let isMounted = true;
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await productApi.getProducts();
        let data = response;
        for (let i = 0; i < 3 && data && !Array.isArray(data); i += 1) {
          data = data.data ?? data.items ?? data.results ?? [];
        }
        if (isMounted) {
          setProducts(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.message || "Failed to load products");
          setLoading(false);
        }
      }
    };
    fetchProducts();
<<<<<<< HEAD
    return () => {
      isMounted = false;
    };
=======
    return () => { isMounted = false; };
>>>>>>> 0779c977551ab0c427eb4ebd82b89d18448dd602
  }, []);

  const variants = useMemo(() => {
    const list = [];
    products.forEach((p) => {
      const pVariants = Array.isArray(p.variants) ? p.variants : [];
      pVariants.forEach((v) => {
        list.push({
          ...v,
          productId: p.id ?? p.product_id ?? "",
          productName: p.name,
          categoryName: p.category?.name || p.category_name || "",
        });
      });
    });
    return list;
  }, [products]);

  const visibleVariants = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    if (!query) return variants;
<<<<<<< HEAD
    return variants.filter(
      (v) =>
        (v.productName || "").toLowerCase().includes(query) ||
        (v.barcode || "").toLowerCase().includes(query) ||
        (v.sku || "").toLowerCase().includes(query)
    );
  }, [variants, searchTerm]);

  // Filter products for the "Select Product for Add Variant" modal
  const filteredSelectProducts = useMemo(() => {
    const q = productSelectQuery.toLowerCase().trim();
    if (!q) return products;
    return products.filter((p) =>
      (p.name || "").toLowerCase().includes(q) ||
      (p.category_name || p.category?.name || "").toLowerCase().includes(q) ||
      (Array.isArray(p.variants) &&
        p.variants.some(
          (v) =>
            (v.barcode || "").toLowerCase().includes(q) ||
            (v.sku || "").toLowerCase().includes(q)
        ))
    );
  }, [products, productSelectQuery]);

  const handleSelectProductForVariant = (selectedProduct) => {
    const targetId = selectedProduct?.id || selectedProduct?.product_id;
    if (!targetId) return;
    setShowProductSelectModal(false);
    navigate(`/products/${targetId}/variants/new`, {
      state: { product: selectedProduct },
    });
  };

=======
    return variants.filter((v) =>
      (v.productName || "").toLowerCase().includes(query) ||
      (v.barcode || "").toLowerCase().includes(query) ||
      (v.sku || "").toLowerCase().includes(query)
    );
  }, [variants, searchTerm]);

>>>>>>> 0779c977551ab0c427eb4ebd82b89d18448dd602
  const handleOpenEdit = (variant) => {
    setEditingVariant(variant);
    setEditSellingPrice(variant.selling_price !== undefined ? String(variant.selling_price) : "");
    setEditOfferPrice(variant.offer_price ? String(variant.offer_price) : "");
    setEditStockQuantity(variant.stock_quantity !== undefined ? String(variant.stock_quantity) : "");
    setModalError("");
  };

<<<<<<< HEAD
  // When opened from a stock alert, focus the exact variant/product once products load
=======
  // When opened from a stock alert, focus the exact variant/product once products load.
>>>>>>> 0779c977551ab0c427eb4ebd82b89d18448dd602
  useEffect(() => {
    if (!targetProductId && !targetVariantId && !targetProductName) return;
    const targetKey = `${targetProductId}:${targetVariantId}:${targetProductName}`;
    if (handledTargetRef.current === targetKey || variants.length === 0) return;

    const target = variants.find((variant) => {
      const variantId = String(variant.id ?? variant.variant_id ?? "");
      const productId = String(variant.productId ?? variant.product_id ?? "");
      const name = String(variant.productName || "").toLowerCase();
      if (targetVariantId && variantId === String(targetVariantId)) return true;
      if (targetProductId && productId === String(targetProductId)) return true;
<<<<<<< HEAD
      return (
        !targetProductId &&
        !targetVariantId &&
        targetProductName &&
        name === targetProductName.toLowerCase()
      );
=======
      return !targetProductId && !targetVariantId && targetProductName && name === targetProductName.toLowerCase();
>>>>>>> 0779c977551ab0c427eb4ebd82b89d18448dd602
    });

    if (target) {
      handledTargetRef.current = targetKey;
<<<<<<< HEAD
      const term = target.barcode || target.sku || target.productName || targetProductName;
      const timer = setTimeout(() => {
        setSearchTerm(term);
        handleOpenEdit(target);
      }, 0);
      return () => clearTimeout(timer);
    } else if (targetProductName) {
      const timer = setTimeout(() => {
        setSearchTerm(targetProductName);
      }, 0);
      return () => clearTimeout(timer);
=======
      setSearchTerm(target.barcode || target.sku || target.productName || targetProductName);
      handleOpenEdit(target);
    } else if (targetProductName) {
      setSearchTerm(targetProductName);
>>>>>>> 0779c977551ab0c427eb4ebd82b89d18448dd602
    }
  }, [variants, targetProductId, targetVariantId, targetProductName]);

  const handleCloseEdit = () => {
    setEditingVariant(null);
    setModalError("");
    setIsSaving(false);
  };

  const handleSavePrice = async (e) => {
    if (e) e.preventDefault();
    if (!editingVariant) return;

    setModalError("");
    const selling = Number(editSellingPrice);
    const offer = editOfferPrice === "" ? 0 : Number(editOfferPrice);
    const stock = Number(editStockQuantity);

    if (Number.isNaN(selling) || selling < 0) {
      setModalError("Selling price must be a valid number greater than or equal to 0.");
      return;
    }
    if (Number.isNaN(offer) || offer < 0) {
      setModalError("Offer price must be a valid number greater than or equal to 0.");
      return;
    }
    if (offer > selling) {
      setModalError("Offer price cannot exceed selling price.");
      return;
    }
    if (Number.isNaN(stock) || stock < 0) {
      setModalError("Stock quantity must be a valid number greater than or equal to 0.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        selling_price: selling,
        offer_price: offer,
        stock_quantity: stock,
      };

      await productApi.updateVariantInventory(editingVariant.id, payload);

<<<<<<< HEAD
      // Record price change into persistent browser storage only if price actually changed
      const recorded = dailyPriceHistoryService.recordPriceChange({
        tenantId,
        productId: editingVariant.productId || editingVariant.product_id,
        productName: editingVariant.productName,
        sellingPriceBefore: editingVariant.selling_price,
        sellingPriceAfter: selling,
        offerPriceBefore: editingVariant.offer_price,
        offerPriceAfter: offer,
      });

      // Update product list in memory
=======
      const previousPrice = editingVariant.selling_price;
      const updatedTimestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      // Update product list state
>>>>>>> 0779c977551ab0c427eb4ebd82b89d18448dd602
      setProducts((prev) =>
        prev.map((p) => {
          if (Array.isArray(p.variants)) {
            return {
              ...p,
              variants: p.variants.map((v) =>
                v.id === editingVariant.id ? { ...v, ...payload } : v
              ),
            };
          }
          return p;
        })
      );

<<<<<<< HEAD
      // Refresh today's history state
      refreshHistory();

      setSuccessMessage(
        recorded
          ? `✓ Price change recorded for "${editingVariant.productName}"`
          : `✓ Stock updated for "${editingVariant.productName}"`
      );
      setTimeout(() => setSuccessMessage(""), 4000);
      handleCloseEdit();
    } catch (err) {
      setModalError(
        err?.message || "Failed to save price changes. Please check backend connection."
      );
=======
      // Track in Changed Products without duplicates
      setChangedProducts((prev) => {
        const existingIdx = prev.findIndex((item) => item.id === editingVariant.id);
        const record = {
          id: editingVariant.id,
          productName: editingVariant.productName,
          previousPrice: existingIdx >= 0 ? prev[existingIdx].previousPrice : previousPrice,
          newPrice: selling,
          newOffer: offer,
          timestamp: updatedTimestamp,
          status: "Saved",
        };

        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = record;
          return updated;
        }
        return [record, ...prev];
      });

      setSuccessMessage(`✓ Price updated for "${editingVariant.productName}"`);
      setTimeout(() => setSuccessMessage(""), 4000);
      handleCloseEdit();
    } catch (err) {
      setModalError(err?.message || "Failed to save price changes. Please check backend connection.");
>>>>>>> 0779c977551ab0c427eb4ebd82b89d18448dd602
    } finally {
      setIsSaving(false);
    }
  };

<<<<<<< HEAD
  const todayFormatted = useMemo(() => formatDate(new Date()), []);

  // Display limits: Desktop shows 3 initially, Mobile shows 2 initially
  const historyLimit = isDesktop ? 3 : 2;
  const totalHistoryCount = historyData.entries.length;
  const hasMoreHistory = totalHistoryCount > historyLimit;
  const visibleHistoryEntries = isHistoryExpanded
    ? historyData.entries
    : historyData.entries.slice(0, historyLimit);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pt-2 pb-14 px-3 sm:px-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Daily Price Changes
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
              <Calendar className="h-3 w-3" />
              {todayFormatted}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Track confirmed price updates for the current day and adjust product prices in real time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/products/add"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
=======
  return (
    <div className="max-w-7xl mx-auto space-y-5 pt-2 pb-12 px-2 sm:px-4">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#0B192C] tracking-tight">
            Daily Price Update
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Click any product card to update selling price and stock in real time.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/products/add"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0B192C] hover:bg-[#1E3E62] text-white text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
>>>>>>> 0779c977551ab0c427eb4ebd82b89d18448dd602
          >
            <span className="text-sm leading-none font-bold">+</span>
            <span>Add Product</span>
          </Link>
<<<<<<< HEAD

          {/* Add Variant Button with Product Selection Modal Trigger */}
          <button
            type="button"
            onClick={() => setShowProductSelectModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all shadow-2xs shrink-0 cursor-pointer"
            id="daily-price-top-add-variant-btn"
          >
            <Plus className="h-3.5 w-3.5 text-blue-600" />
            <span>Add Variant</span>
          </button>

=======
>>>>>>> 0779c977551ab0c427eb4ebd82b89d18448dd602
          <div className="relative w-full sm:w-64">
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search product, barcode..."
<<<<<<< HEAD
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-8 pr-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
            />
            <Search className="absolute left-2.5 top-2.5 text-slate-400 h-3.5 w-3.5" />
=======
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-8 pr-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
            />
            <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs">🔍</span>
>>>>>>> 0779c977551ab0c427eb4ebd82b89d18448dd602
          </div>
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
<<<<<<< HEAD
        <div
          className="text-xs font-semibold text-rose-600 bg-rose-50 p-3.5 rounded-xl border border-rose-200"
          role="alert"
        >
=======
        <div className="text-xs font-semibold text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200" role="alert">
>>>>>>> 0779c977551ab0c427eb4ebd82b89d18448dd602
          {error}
        </div>
      )}
      {successMessage && (
<<<<<<< HEAD
        <div
          className="text-xs font-bold text-emerald-700 bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 flex items-center gap-2"
          role="status"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
=======
        <div className="text-xs font-bold text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200 flex items-center gap-2" role="status">
>>>>>>> 0779c977551ab0c427eb4ebd82b89d18448dd602
          <span>{successMessage}</span>
        </div>
      )}

<<<<<<< HEAD
      {/* SUMMARY METRICS TILES */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Distinct Products Changed */}
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-500 to-teal-600 p-4 sm:p-5 text-white shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-100">
              Products Changed
            </span>
            <TrendingUp className="h-4 w-4 text-emerald-200" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black">
            {historyData.distinctProductsCount}
          </div>
          <span className="text-[11px] text-emerald-100">
            distinct {historyData.distinctProductsCount === 1 ? "product" : "products"} today
          </span>
        </div>

        {/* Total Price Change Events */}
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-500 to-indigo-600 p-4 sm:p-5 text-white shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-100">
              Total Updates
            </span>
            <History className="h-4 w-4 text-blue-200" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black">
            {historyData.totalEventsCount}
          </div>
          <span className="text-[11px] text-blue-100">
            recorded price {historyData.totalEventsCount === 1 ? "event" : "events"} today
          </span>
        </div>

        {/* Calendar Day Info */}
        <div className="col-span-2 sm:col-span-1 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 text-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Today's Session
            </span>
            <Clock className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 text-lg sm:text-xl font-black text-slate-800">
            {todayFormatted}
          </div>
          <span className="text-[11px] text-slate-500">
            Local device calendar day
          </span>
        </div>
      </div>

      {/* DAILY PRICE CHANGE HISTORY SECTION */}
      <section className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm sm:text-base font-black text-slate-900">
              Today's Price Change Log
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold">
              {historyData.entries.length}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Auto-refreshed for {todayFormatted}
          </span>
        </div>

        {historyData.entries.length === 0 ? (
          <div className="py-10 text-center px-4 rounded-xl bg-slate-50/60 border border-dashed border-slate-200">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-400">
              <Tag className="h-5 w-5" />
            </div>
            <p className="text-sm font-bold text-slate-700">No price changes recorded today.</p>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Any successful selling price or offer price update saved today will appear here with previous and new amounts.
            </p>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5">
              {visibleHistoryEntries.map((entry) => {
                const hasSellingChange = entry.changed_fields?.includes("selling_price");
                const hasOfferChange = entry.changed_fields?.includes("offer_price");
                const timeString = entry.changed_at ? formatTime(new Date(entry.changed_at)) : "";

                return (
                  <div
                    key={entry.id}
                    className="p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-blue-300 transition-all shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      {/* Header: Product Name + Time */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {entry.product_name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-400">
                            <Clock className="h-3 w-3 shrink-0" />
                            <span>Changed at {timeString || "Today"}</span>
                          </div>
                        </div>

                        {/* Badges for changed fields */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {hasSellingChange && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Selling Price
                            </span>
                          )}
                          {hasOfferChange && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                              Offer Price
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Price Diff Row */}
                      <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-2">
                        {hasSellingChange && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-500">Selling Price:</span>
                            <div className="flex items-center gap-1.5 font-bold">
                              <span className="text-slate-400 line-through">
                                {formatINRWithPaise(entry.selling_price_before)}
                              </span>
                              <ArrowRight className="h-3 w-3 text-slate-400" />
                              <span className="text-emerald-700 font-black">
                                {formatINRWithPaise(entry.selling_price_after)}
                              </span>
                            </div>
                          </div>
                        )}

                        {hasOfferChange && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-500">Offer Price:</span>
                            <div className="flex items-center gap-1.5 font-bold">
                              <span className="text-slate-400 line-through">
                                {entry.offer_price_before !== null
                                  ? formatINRWithPaise(entry.offer_price_before)
                                  : "None"}
                              </span>
                              <ArrowRight className="h-3 w-3 text-slate-400" />
                              <span className="text-indigo-700 font-black">
                                {entry.offer_price_after !== null
                                  ? formatINRWithPaise(entry.offer_price_after)
                                  : "None"}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Show More / Show Less Toggle Button (Responsive Viewport Limited) */}
            {hasMoreHistory && (
              <div className="flex justify-center pt-4 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={toggleHistoryExpanded}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition-all cursor-pointer hover:border-slate-300 active:scale-95"
                  id="toggle-daily-price-history-btn"
                >
                  <span>
                    {isHistoryExpanded
                      ? "Show Less"
                      : `Show More (${totalHistoryCount - historyLimit} more)`}
                  </span>
                  {isHistoryExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* QUICK PRICE EDITOR CATALOG */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900">
              Product Inventory & Price Editor
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Click any product to edit selling price or offer price. Changes are recorded immediately.
            </p>
          </div>
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            {/* Add Variant Button near heading */}
            <button
              type="button"
              onClick={() => setShowProductSelectModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
              id="editor-heading-add-variant-btn"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Variant</span>
            </button>

            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              {visibleVariants.length} {visibleVariants.length === 1 ? "variant" : "variants"}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm font-medium text-slate-400">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading inventory products...
          </div>
        ) : visibleVariants.length === 0 ? (
          <div className="py-14 text-center bg-white rounded-2xl border border-slate-200 p-8">
            <p className="text-sm font-bold text-slate-700">No products found</p>
            <p className="text-xs text-slate-400 mt-1">
              Try adjusting your search query or add new products.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {visibleVariants.map((item) => {
              const isChangedToday = historyData.entries.some(
                (e) => String(e.product_id) === String(item.productId)
              );
              const isLowStock = item.stock_quantity <= (item.low_stock_threshold || 5);

=======
      {/* CHANGED PRODUCTS SECTION */}
      {changedProducts.length > 0 && (
        <div className="bg-white rounded-2xl border border-emerald-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h2 className="text-sm font-black text-slate-900">
                Changed Products
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black">
                {changedProducts.length}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Updated this session</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {changedProducts.map((cp) => (
              <div
                key={cp.id}
                className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/40 border border-emerald-100 text-xs"
              >
                <div className="min-w-0 pr-2">
                  <p className="font-bold text-slate-900 truncate">{cp.productName}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Prev: <span className="line-through">₹{Number(cp.previousPrice).toFixed(2)}</span> · {cp.timestamp}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-emerald-700 text-sm">
                    ₹{Number(cp.newPrice).toFixed(2)}
                  </p>
                  <span className="inline-block text-[10px] font-bold text-emerald-600 bg-emerald-100/80 px-1.5 py-0.2 rounded">
                    {cp.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2 x N PRODUCT GRID */}
      {loading ? (
        <div className="py-16 text-center text-sm font-medium text-slate-400">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading inventory products...
        </div>
      ) : visibleVariants.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-8">
          <p className="text-sm font-bold text-slate-700">No products found</p>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or add new products.</p>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-bold text-slate-600">
              All Products ({visibleVariants.length})
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Tap any card to edit price</span>
          </div>

          {/* 2-column N-row grid */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
            {visibleVariants.map((item) => {
              const isChanged = changedProducts.some((cp) => cp.id === item.id);
              const isLowStock = item.stock_quantity <= (item.low_stock_threshold || 5);
>>>>>>> 0779c977551ab0c427eb4ebd82b89d18448dd602
              return (
                <div
                  key={item.id}
                  onClick={() => handleOpenEdit(item)}
                  className={`flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl bg-white border cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 text-left select-none relative ${
<<<<<<< HEAD
                    isChangedToday
=======
                    isChanged
>>>>>>> 0779c977551ab0c427eb4ebd82b89d18448dd602
                      ? "border-emerald-300 ring-2 ring-emerald-100"
                      : "border-slate-200/90 hover:border-blue-400"
                  }`}
                >
<<<<<<< HEAD
                  {isChangedToday && (
=======
                  {isChanged && (
>>>>>>> 0779c977551ab0c427eb4ebd82b89d18448dd602
                    <span className="absolute top-2.5 right-2.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                      Updated
                    </span>
                  )}

                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
                      {item.productName}
                    </h3>
                    <p className="text-[10px] sm:text-[11px] font-mono text-slate-400 mt-0.5 truncate">
                      {item.barcode || item.sku || "No code"}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-end justify-between gap-1">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
<<<<<<< HEAD
                        Selling Price
                      </p>
                      <p className="text-sm sm:text-base font-black text-slate-900">
                        {formatINRWithPaise(item.selling_price || 0)}
                      </p>
                      {item.offer_price > 0 && (
                        <p className="text-[10px] font-bold text-rose-500">
                          Offer: {formatINRWithPaise(item.offer_price)}
=======
                        Price
                      </p>
                      <p className="text-sm sm:text-base font-black text-slate-900">
                        ₹{Number(item.selling_price || 0).toFixed(2)}
                      </p>
                      {item.offer_price > 0 && (
                        <p className="text-[10px] font-bold text-rose-500">
                          Offer: ₹{Number(item.offer_price).toFixed(2)}
>>>>>>> 0779c977551ab0c427eb4ebd82b89d18448dd602
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-black ${
                          isLowStock
                            ? "bg-rose-50 text-rose-600 border border-rose-200"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {item.stock_quantity || 0} {item.unit || "pcs"}
                      </span>
                      <button
                        type="button"
                        className="mt-1 block text-[10px] font-bold text-blue-600 hover:text-blue-800 underline decoration-dotted"
                      >
                        Edit Price ✎
                      </button>
<<<<<<< HEAD
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const targetId = item.productId || item.product_id;
                          if (targetId) {
                            navigate(`/products/${targetId}/variants/new`, {
                              state: { product: { id: targetId, name: item.productName } },
                            });
                          }
                        }}
                        className="mt-0.5 block text-[10px] font-bold text-slate-400 hover:text-blue-600 cursor-pointer"
                      >
                        + Add Variant
                      </button>
=======
>>>>>>> 0779c977551ab0c427eb4ebd82b89d18448dd602
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
<<<<<<< HEAD
        )}
      </section>

      {/* COMPACT EDIT MODAL */}
=======
        </div>
      )}

      {/* COMPACT EDIT MODAL (Subtle ~40% backdrop) */}
>>>>>>> 0779c977551ab0c427eb4ebd82b89d18448dd602
      {editingVariant && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
          onClick={handleCloseEdit}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  Edit Daily Price
                </span>
                <h3 className="text-base font-black text-slate-900 truncate mt-1">
                  {editingVariant.productName}
                </h3>
                <p className="text-[11px] font-mono text-slate-400">
                  {editingVariant.barcode || editingVariant.sku || "No code"}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseEdit}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-black cursor-pointer transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSavePrice} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Selling Price (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  autoFocus
                  required
                  value={editSellingPrice}
                  onChange={(e) => setEditSellingPrice(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-base font-black text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Offer Price (₹) <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editOfferPrice}
                  onChange={(e) => setEditOfferPrice(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Stock Quantity
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editStockQuantity}
                    onChange={(e) => setEditStockQuantity(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 pr-12 text-sm font-bold text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400 font-medium pointer-events-none">
                    {editingVariant.unit || "pcs"}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
<<<<<<< HEAD

      {/* PRODUCT SELECTION DIALOG FOR ADD VARIANT */}
      {showProductSelectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setShowProductSelectModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  Select Parent Product
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  Add Variant to Product
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select an existing product from your catalog to attach a new variant.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowProductSelectModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-black cursor-pointer transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative">
              <input
                type="search"
                value={productSelectQuery}
                onChange={(e) => setProductSelectQuery(e.target.value)}
                placeholder="Search products by name, category, or code..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-8 pr-3 py-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                autoFocus
              />
              <Search className="absolute left-2.5 top-3 text-slate-400 h-3.5 w-3.5" />
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-slate-50/50">
              {filteredSelectProducts.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No products found matching your search.
                </div>
              ) : (
                filteredSelectProducts.map((p) => {
                  const pId = p.id || p.product_id;
                  const vCount = Array.isArray(p.variants) ? p.variants.length : 1;
                  const catName = p.category?.name || p.category_name || "General";

                  return (
                    <button
                      key={pId}
                      type="button"
                      onClick={() => handleSelectProductForVariant(p)}
                      className="w-full flex items-center justify-between p-3.5 hover:bg-blue-50/80 transition-colors text-left cursor-pointer group"
                    >
                      <div className="min-w-0 pr-3">
                        <p className="text-xs font-bold text-slate-900 group-hover:text-blue-700 truncate">
                          {p.name}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {catName} • {vCount} existing variant{vCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform shrink-0">
                        Select →
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowProductSelectModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
=======
>>>>>>> 0779c977551ab0c427eb4ebd82b89d18448dd602
    </div>
  );
}

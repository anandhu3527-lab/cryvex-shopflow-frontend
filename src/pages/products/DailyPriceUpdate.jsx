import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { productApi } from "../../services/api/productApi";

export default function DailyPriceUpdate() {
  const [searchParams] = useSearchParams();
  const targetProductId = searchParams.get("productId") || "";
  const targetVariantId = searchParams.get("variantId") || "";
  const targetProductName = searchParams.get("productName") || "";
  const handledTargetRef = useRef("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Edit Modal State
  const [editingVariant, setEditingVariant] = useState(null);
  const [editSellingPrice, setEditSellingPrice] = useState("");
  const [editOfferPrice, setEditOfferPrice] = useState("");
  const [editStockQuantity, setEditStockQuantity] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  // Changed Products tracking
  const [changedProducts, setChangedProducts] = useState([]);

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
    return () => { isMounted = false; };
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
    return variants.filter((v) =>
      (v.productName || "").toLowerCase().includes(query) ||
      (v.barcode || "").toLowerCase().includes(query) ||
      (v.sku || "").toLowerCase().includes(query)
    );
  }, [variants, searchTerm]);

  const handleOpenEdit = (variant) => {
    setEditingVariant(variant);
    setEditSellingPrice(variant.selling_price !== undefined ? String(variant.selling_price) : "");
    setEditOfferPrice(variant.offer_price ? String(variant.offer_price) : "");
    setEditStockQuantity(variant.stock_quantity !== undefined ? String(variant.stock_quantity) : "");
    setModalError("");
  };

  // When opened from a stock alert, focus the exact variant/product once products load.
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
      return !targetProductId && !targetVariantId && targetProductName && name === targetProductName.toLowerCase();
    });

    if (target) {
      handledTargetRef.current = targetKey;
      setSearchTerm(target.barcode || target.sku || target.productName || targetProductName);
      handleOpenEdit(target);
    } else if (targetProductName) {
      setSearchTerm(targetProductName);
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

      const previousPrice = editingVariant.selling_price;
      const updatedTimestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      // Update product list state
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
    } finally {
      setIsSaving(false);
    }
  };

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
          >
            <span className="text-sm leading-none font-bold">+</span>
            <span>Add Product</span>
          </Link>
          <div className="relative w-full sm:w-64">
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search product, barcode..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-8 pr-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
            />
            <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs">🔍</span>
          </div>
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="text-xs font-semibold text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200" role="alert">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="text-xs font-bold text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200 flex items-center gap-2" role="status">
          <span>{successMessage}</span>
        </div>
      )}

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
              return (
                <div
                  key={item.id}
                  onClick={() => handleOpenEdit(item)}
                  className={`flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl bg-white border cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 text-left select-none relative ${
                    isChanged
                      ? "border-emerald-300 ring-2 ring-emerald-100"
                      : "border-slate-200/90 hover:border-blue-400"
                  }`}
                >
                  {isChanged && (
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
                        Price
                      </p>
                      <p className="text-sm sm:text-base font-black text-slate-900">
                        ₹{Number(item.selling_price || 0).toFixed(2)}
                      </p>
                      {item.offer_price > 0 && (
                        <p className="text-[10px] font-bold text-rose-500">
                          Offer: ₹{Number(item.offer_price).toFixed(2)}
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
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* COMPACT EDIT MODAL (Subtle ~40% backdrop) */}
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
    </div>
  );
}

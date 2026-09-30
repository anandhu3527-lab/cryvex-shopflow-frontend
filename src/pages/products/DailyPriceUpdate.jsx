import { useState, useEffect, useMemo } from "react";
import { productApi } from "../../services/api/productApi";

export default function DailyPriceUpdate() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [updates, setUpdates] = useState({});
  const [savingVariantId, setSavingVariantId] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let isMounted = true;
    const fetchProducts = async () => {
      try {
        const response = await productApi.getProducts();
        const data = Array.isArray(response) ? response : response?.data || [];
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
        list.push({ ...v, productName: p.name });
      });
    });
    return list;
  }, [products]);

  const visibleVariants = useMemo(() => {
    const query = searchTerm.toLowerCase();
    if (!query) return variants;
    return variants.filter(v =>
      (v.productName || "").toLowerCase().includes(query) ||
      (v.barcode || "").toLowerCase().includes(query) ||
      (v.sku || "").toLowerCase().includes(query)
    );
  }, [variants, searchTerm]);

  const handleUpdateField = (variantId, field, value) => {
    setUpdates(prev => ({
      ...prev,
      [variantId]: {
        ...(prev[variantId] || {}),
        [field]: value
      }
    }));
  };

  const getVariantField = (variant, field) => {
    if (updates[variant.id] && updates[variant.id][field] !== undefined) {
      return updates[variant.id][field];
    }
    return variant[field] || "";
  };

  const handleSave = async (variant) => {
    const variantUpdates = updates[variant.id];
    if (!variantUpdates) return;
    
    setSavingVariantId(variant.id);
    setSuccessMessage("");
    setError("");
    
    try {
      let selling = variantUpdates.selling_price !== undefined ? variantUpdates.selling_price : variant.selling_price;
      let offer = variantUpdates.offer_price !== undefined ? variantUpdates.offer_price : variant.offer_price;
      let stock = variantUpdates.stock_quantity !== undefined ? variantUpdates.stock_quantity : variant.stock_quantity;
      
      selling = Number(selling);
      offer = (offer === "" || offer === null || offer === undefined) ? 0 : Number(offer);
      stock = Number(stock);

      if (Number.isNaN(selling) || selling < 0) {
        throw new Error("Selling price must be a valid number >= 0.");
      }
      if (Number.isNaN(offer) || offer < 0) {
        throw new Error("Offer price must be a valid number >= 0.");
      }
      if (offer > selling) {
        throw new Error("Offer price cannot be higher than selling price.");
      }
      if (Number.isNaN(stock) || stock < 0) {
        throw new Error("Stock quantity must be a valid number >= 0.");
      }

      const payload = {
        selling_price: selling,
        offer_price: offer,
        stock_quantity: stock,
      };
      
      await productApi.updateVariantInventory(variant.id, payload);
      setSuccessMessage(`✓ Updated successfully`); 
      
      // Update local state to reflect saved changes
      setProducts(prev => prev.map(p => {
        if (Array.isArray(p.variants)) {
          return {
            ...p,
            variants: p.variants.map(v => v.id === variant.id ? { ...v, ...payload } : v)
          };
        }
        return p;
      }));
      
      // Clear updates for this variant
      setUpdates(prev => {
        const next = { ...prev };
        delete next[variant.id];
        return next;
      });
      
    } catch (err) {
      setError(err?.message || "Failed to update price");
    } finally {
      setSavingVariantId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 pt-2 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Daily Price Update</h1>
          <p className="mt-1 text-sm text-slate-500">Quickly update selling price, offer price, and stock quantity.</p>
        </div>
        <div className="w-full sm:max-w-xs">
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search product, barcode, SKU..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {error && <p className="text-sm text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-200" role="alert">{error}</p>}
      {successMessage && <p className="text-sm text-emerald-600 bg-emerald-50 p-3 rounded-lg border border-emerald-200" role="status">{successMessage}</p>}

      {loading ? (
        <p className="py-12 text-center text-sm text-slate-500">Loading products...</p>
      ) : (
        <section className="border-y border-slate-200 bg-white rounded-xl overflow-hidden shadow-xs">
          <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_8rem_8rem_8rem_auto] items-center gap-4 px-4 py-3 text-[11px] font-semibold uppercase text-slate-500 bg-slate-50">
            <span>Product</span><span>Selling Price (₹)</span><span>Offer Price (₹)</span><span>Stock Qty</span><span>Actions</span>
          </div>
          <div className="divide-y divide-slate-100">
            {visibleVariants.map((item) => {
              const isEdited = updates[item.id] !== undefined;
              const hasOffer = getVariantField(item, "offer_price") > 0;
              return (
              <div key={item.id} className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_8rem_8rem_8rem_auto] items-center gap-3 sm:gap-4 px-4 py-4 hover:bg-slate-50 transition-colors">
                <div className="min-w-0 pb-2 sm:pb-0 border-b border-slate-100 sm:border-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{item.productName}</p>
                  <p className="mt-1 text-[11px] font-mono text-slate-500">Barcode: {item.barcode || item.sku || "No barcode"}</p>
                </div>
                <label className="text-xs font-medium text-slate-600 flex justify-between items-center sm:block">
                  <span className="sm:hidden block">Selling Price</span>
                  <input type="number" min="0" step="0.01" value={getVariantField(item, "selling_price")}
                    onChange={(event) => handleUpdateField(item.id, "selling_price", event.target.value)}
                    className="w-32 sm:w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none text-right sm:text-left" />
                </label>
                <label className="text-xs font-medium text-slate-600 flex justify-between items-center sm:block">
                  <span className="sm:hidden block">Offer Price</span>
                  <input type="number" min="0" step="0.01" value={getVariantField(item, "offer_price")}
                    onChange={(event) => handleUpdateField(item.id, "offer_price", event.target.value)}
                    placeholder="No offer"
                    className="w-32 sm:w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none text-right sm:text-left" />
                </label>
                <label className="text-xs font-medium text-slate-600 flex justify-between items-center sm:block">
                  <span className="sm:hidden block">Stock</span>
                  <div className="relative w-32 sm:w-full">
                    <input type="number" min="0" step="1" value={getVariantField(item, "stock_quantity")}
                      onChange={(event) => handleUpdateField(item.id, "stock_quantity", event.target.value)}
                      className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 pr-8 text-sm text-slate-900 focus:border-blue-500 focus:outline-none text-right sm:text-left" />
                    {item.unit && <span className="absolute right-2 top-1.5 text-slate-400 pointer-events-none">{item.unit}</span>}
                  </div>
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-2 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t border-slate-100 sm:border-0">
                  {isEdited && <span className="text-[11px] text-amber-600 font-medium whitespace-nowrap hidden sm:block">● Unsaved changes</span>}
                  <button type="button" onClick={() => handleSave(item)} disabled={savingVariantId === item.id || !updates[item.id]}
                    className="w-full sm:w-auto rounded-lg bg-blue-600 px-4 py-2 sm:py-1.5 text-sm sm:text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors flex justify-center items-center gap-2">
                    {savingVariantId === item.id ? "Saving..." : (isEdited ? (
                      <>
                        <span className="sm:hidden block">●</span>
                        <span>Save Changes</span>
                      </>
                    ) : (
                      "Save"
                    ))}
                  </button>
                </div>
              </div>
            );})}
            {visibleVariants.length === 0 && (
              <p className="py-12 text-center text-sm text-slate-500">No products found matching your search.</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

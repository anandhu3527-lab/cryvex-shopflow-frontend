import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { productApi } from "../../services/api/productApi";
import { billingApi } from "../../services/api/billingApi";

function unwrapResponse(response) {
  return response?.data?.data ?? response?.data ?? response;
}

function getCollection(response) {
  const data = unwrapResponse(response);
  return Array.isArray(data) ? data : [];
}

function getNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatPrice(value) {
  const amount = getNumber(value);
  return amount === null
    ? "Not provided"
    : new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount);
}

async function fetchProductData(id) {
  const [productResponse, categoriesResponse, stockResponse, lowStockResponse] = await Promise.all([
    productApi.getProductById(id),
    productApi.getCategories().catch(() => []),
    productApi.getStockOverview().catch(() => []),
    productApi.getLowStockAlerts().catch(() => []),
  ]);

  return {
    product: unwrapResponse(productResponse),
    categories: getCollection(categoriesResponse),
    stockRows: getCollection(stockResponse),
    lowStockRows: getCollection(lowStockResponse),
  };
}

function getStockRow(rows, variantId, productId) {
  return rows.find((row) => String(row.variant_id) === String(variantId))
    || rows.find((row) => String(row.product_id) === String(productId))
    || null;
}

function normalizeProductData(id, result) {
  const apiProduct = result.product;
  if (!apiProduct) throw new Error("Product details were not returned by the API.");

  const variants = Array.isArray(apiProduct.variants) ? apiProduct.variants : [];
  const category = result.categories.find((item) => String(item.id) === String(apiProduct.category_id));

  const variantsWithStock = variants.map(variant => {
    const stockRow = getStockRow(result.stockRows, variant.id, apiProduct.id || id);
    const lowStockRow = getStockRow(result.lowStockRows, variant.id, apiProduct.id || id);
    return {
      ...variant,
      currentStock: stockRow?.stock_quantity ?? lowStockRow?.stock_quantity ?? variant.stock_quantity,
      lowStock: stockRow?.low_stock_threshold ?? lowStockRow?.low_stock_threshold ?? variant.low_stock_threshold,
    };
  });

  return {
    id: apiProduct.id || id,
    name: apiProduct.name || "",
    category: apiProduct.category_name || apiProduct.category?.name || category?.name || "Uncategorized",
    description: apiProduct.description,
    status: apiProduct.status || "ACTIVE",
    variants: variantsWithStock,
  };
}

function getFieldValue(value, fallback = "Not provided") {
  return value === null || value === undefined || value === "" ? fallback : value;
}

function getStockStatus(stock, threshold) {
  if (stock === null) return { label: "Status unavailable", classes: "bg-slate-100 text-slate-600" };
  if (stock <= 0) return { label: "Out of Stock", classes: "bg-rose-50 text-rose-700" };
  if (threshold !== null && stock <= threshold) {
    return { label: "Low Stock", classes: "bg-amber-50 text-amber-700" };
  }
  return { label: "In Stock", classes: "bg-emerald-50 text-emerald-700" };
}

const inputClassName = "w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSellingPrice, setEditSellingPrice] = useState("");
  const [editOfferPrice, setEditOfferPrice] = useState("");
  const [editStockQuantity, setEditStockQuantity] = useState("");
  const [editError, setEditError] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  const reloadProduct = useCallback(async () => {
    try {
      const result = await fetchProductData(id);
      const updatedProduct = normalizeProductData(id, result);
      setLoadError("");
      setProduct(updatedProduct);
    } catch (error) {
      setLoadError(error?.message || "Could not load this product.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let isMounted = true;
    fetchProductData(id)
      .then((result) => {
        if (!isMounted) return;
        setProduct(normalizeProductData(id, result));
        setLoadError("");
      })
      .catch((error) => {
        if (isMounted) setLoadError(error?.message || "Could not load this product.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, [id]);

  const showToast = (message) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(""), 3500);
  };

  const [salesData, setSalesData] = useState(null);
  const [isSalesLoading, setIsSalesLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (!product || !product.variants.length) {
      setIsSalesLoading(false);
      return;
    }

    const fetchSales = async () => {
      try {
        // Build a map: variantId → { qty: 0, label: "100 g" }
        const variantMap = new Map();
        product.variants.forEach(v => {
          const label = [v.package_quantity, v.unit].filter(Boolean).join(" ") || String(v.id);
          variantMap.set(String(v.id), { label, qty: 0 });
        });

        const billsResponse = await billingApi.getBills(100, 0);
        const bills = Array.isArray(billsResponse?.data)
          ? billsResponse.data
          : (Array.isArray(billsResponse) ? billsResponse : []);

        // Fetch bill item details where missing
        const fullBills = await Promise.all(bills.map(async (bill) => {
          if (Array.isArray(bill.items)) return bill;
          const billId = bill.id || bill.bill_id;
          if (!billId) return bill;
          try {
            const detail = await billingApi.getBillById(billId);
            return detail?.data || detail;
          } catch (e) {
            return bill;
          }
        }));

        for (const bill of fullBills) {
          if ((bill.status || "").toUpperCase() === "CANCELLED") continue;
          const items = Array.isArray(bill.items) ? bill.items : [];
          for (const item of items) {
            const itemVariantId = String(item.product_variant_id || item.variant_id || "");
            if (variantMap.has(itemVariantId)) {
              const qty = Number(item.quantity) || 0;
              variantMap.get(itemVariantId).qty += qty;
            }
          }
        }

        const variantSales = [...variantMap.entries()].map(([id, { label, qty }]) => ({ id, label, qty }));
        const totalUnitsSold = variantSales.reduce((sum, v) => sum + v.qty, 0);

        if (isMounted) {
          setSalesData({ totalUnitsSold, variantSales });
          setIsSalesLoading(false);
        }
      } catch (error) {
        if (isMounted) setIsSalesLoading(false);
      }
    };

    fetchSales();

    return () => { isMounted = false; };
  }, [product]);

  const openEdit = () => {
    const firstVariant = product.variants[0] || {};
    setEditName(product.name);
    setEditSellingPrice(firstVariant.selling_price ?? "");
    setEditOfferPrice(firstVariant.offer_price ?? "");
    setEditStockQuantity(firstVariant.currentStock ?? "");
    setEditError("");
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    const firstVariant = product.variants[0] || {};
    const name = editName.trim();
    const sellingPrice = getNumber(editSellingPrice);
    const offerPrice = editOfferPrice.trim() === "" ? null : getNumber(editOfferPrice);
    const stockQuantity = getNumber(editStockQuantity);

    if (!name) return setEditError("Product name is required.");
    if (sellingPrice === null || sellingPrice < 0) {
      return setEditError("Selling price must be a valid non-negative number.");
    }
    if (editOfferPrice.trim() !== "" && (offerPrice === null || offerPrice < 0)) {
      return setEditError("Offer price must be a valid non-negative number.");
    }
    if (stockQuantity === null || stockQuantity < 0) {
      return setEditError("Stock quantity must be a valid non-negative number.");
    }
    if (!firstVariant.id) {
      return setEditError("This product has no inventory record that can be updated.");
    }

    setIsSaving(true);
    setEditError("");
    try {
      await productApi.updateVariant(firstVariant.id, {
        product_name: name,
        selling_price: sellingPrice,
        offer_price: offerPrice,
      });
      await productApi.updateVariantInventory(firstVariant.id, {
        stock_quantity: stockQuantity,
      });
      await reloadProduct();
      setIsEditOpen(false);
      showToast("Product updated successfully.");
    } catch (error) {
      setEditError(error?.message || "Could not save product changes.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl py-20 text-center" role="status">
        <p className="text-sm font-medium text-slate-500">Loading product details...</p>
      </div>
    );
  }

  if (loadError || !product) {
    return (
      <div className="mx-auto max-w-7xl py-16 text-center">
        <p className="text-sm font-semibold text-rose-700">
          Could not load product: {loadError || "Product not found."}
        </p>
        <Link to="/products" className="mt-4 inline-flex text-sm font-semibold text-blue-700 hover:text-blue-800">
          Back to Products
        </Link>
      </div>
    );
  }

  const firstVariant = product.variants[0] || {};
  const stock = getNumber(firstVariant.currentStock);
  const lowStock = getNumber(firstVariant.lowStock);
  const stockStatus = getStockStatus(stock, lowStock);

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-12">
      {toastMessage && (
        <div
          className="fixed right-5 top-5 z-50 flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white shadow-xl"
          role="status"
        >
          <span className="font-bold text-emerald-400" aria-hidden="true">✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link to="/products" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-blue-700">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            Back to Products
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Product Details</h1>
          <p className="mt-1 text-sm text-slate-500">{product.name || "Product name unavailable"}</p>
        </div>
        <button
          type="button"
          onClick={openEdit}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652l-9.193 9.193a4.5 4.5 0 0 1-1.897 1.13L7.5 16.5l.726-2.61a4.5 4.5 0 0 1 1.13-1.897l7.506-7.506Zm0 0L19.5 7.125M18 14.25v4.125A2.625 2.625 0 0 1 15.375 21H5.625A2.625 2.625 0 0 1 3 18.375V8.625A2.625 2.625 0 0 1 5.625 6H9.75" />
          </svg>
          Edit Product
        </button>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="product-information-title">
        <div className="mb-5 border-b border-slate-100 pb-3">
          <h2 id="product-information-title" className="text-sm font-bold uppercase tracking-wide text-slate-800">Product Information</h2>
        </div>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold text-slate-500">Product Name</dt>
            <dd className="mt-1.5 break-words text-sm font-semibold text-slate-900">{getFieldValue(product.name)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500">Category</dt>
            <dd className="mt-1.5 break-words text-sm font-semibold text-slate-900">{getFieldValue(product.category)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500">Status</dt>
            <dd className="mt-1.5 break-all text-sm font-medium text-slate-800">
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${product.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                {product.status || 'ACTIVE'}
              </span>
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold text-slate-500">Description</dt>
            <dd className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{getFieldValue(product.description)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden" aria-labelledby="product-variants-title">
        <div className="p-5 sm:p-6 border-b border-slate-100">
          <h2 id="product-variants-title" className="text-sm font-bold uppercase tracking-wide text-slate-800">Product Variants</h2>
        </div>
        {product.variants.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">No variants available</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th scope="col" className="px-6 py-3.5">Variant</th>
                  <th scope="col" className="px-6 py-3.5">Barcode</th>
                  <th scope="col" className="px-6 py-3.5">SKU</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Price</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Offer Price</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Stock</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Threshold</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {product.variants.map((variant, index) => {
                  const stock = getNumber(variant.currentStock);
                  const lowStock = getNumber(variant.lowStock);
                  const stockStatus = getStockStatus(stock, lowStock);

                  return (
                    <tr key={variant.id || index} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {variant.package_quantity || "—"} {variant.unit || ""}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-600">{variant.barcode || "—"}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-600">{variant.sku || "—"}</td>
                      <td className="px-6 py-4 text-right font-medium text-slate-900">{variant.selling_price != null ? formatPrice(variant.selling_price) : "—"}</td>
                      <td className="px-6 py-4 text-right font-medium text-slate-900">{variant.offer_price != null ? formatPrice(variant.offer_price) : "—"}</td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-800">
                        {stock === null ? "—" : stock.toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-600">
                        {lowStock === null ? "—" : lowStock.toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${stockStatus.classes}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                          {stockStatus.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="sales-snapshot-title">
        <div className="mb-5 border-b border-slate-100 pb-3">
          <h2 id="sales-snapshot-title" className="text-sm font-bold uppercase tracking-wide text-slate-800">Sales Snapshot</h2>
        </div>
        {isSalesLoading ? (
          <p className="py-8 text-center text-sm text-slate-500" role="status">Loading sales data...</p>
        ) : !salesData ? (
          <p className="py-8 text-center text-sm text-slate-500">Sales data not available yet</p>
        ) : (
          <div className="space-y-6">
            {/* Total Units Sold */}
            <div className="inline-block rounded-xl border border-slate-100 bg-slate-50 p-5 min-w-[160px]">
              <p className="text-xs font-semibold uppercase text-slate-500">Total Units Sold</p>
              <p className="mt-2 text-3xl font-extrabold text-slate-900">
                {salesData.totalUnitsSold.toLocaleString("en-IN")}
              </p>
            </div>

            {/* Variant-wise breakdown */}
            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Variant Sales</h3>
              {salesData.variantSales.length === 0 ? (
                <p className="text-sm text-slate-500">No sales recorded for this product yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] font-bold uppercase text-slate-500">
                        <th scope="col" className="py-2 pr-8">Variant</th>
                        <th scope="col" className="py-2 text-right">Units Sold</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {salesData.variantSales.map((v) => (
                        <tr key={v.id} className="hover:bg-slate-50/60">
                          <td className="py-2.5 pr-8 font-medium text-slate-800">{v.label}</td>
                          <td className="py-2.5 text-right font-semibold text-slate-900">
                            {v.qty.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 font-bold text-slate-900">
                        <td className="py-2.5 pr-8 text-xs uppercase text-slate-500">Total</td>
                        <td className="py-2.5 text-right text-base">
                          {salesData.totalUnitsSold.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4" role="presentation">
          <section
            className="my-auto w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-product-title"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 id="edit-product-title" className="text-lg font-bold text-slate-900">Edit Product</h2>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                disabled={isSaving}
                aria-label="Close edit product dialog"
                className="rounded-md p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414Z" />
                </svg>
              </button>
            </div>

            {editError && (
              <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
                {editError}
              </p>
            )}

            <form onSubmit={handleEditSubmit} className="mt-5 space-y-4">
              <div>
                <label htmlFor="edit-product-name" className="mb-1.5 block text-xs font-semibold text-slate-700">Product Name</label>
                <input id="edit-product-name" type="text" value={editName} onChange={(event) => setEditName(event.target.value)} className={inputClassName} required maxLength={200} />
              </div>
              <div>
                <label htmlFor="edit-selling-price" className="mb-1.5 block text-xs font-semibold text-slate-700">Selling Price (₹)</label>
                <input id="edit-selling-price" type="number" inputMode="decimal" step="any" min="0" value={editSellingPrice} onChange={(event) => setEditSellingPrice(event.target.value)} className={inputClassName} required />
              </div>
              <div>
                <label htmlFor="edit-offer-price" className="mb-1.5 block text-xs font-semibold text-slate-700">Offer Price (₹)</label>
                <input id="edit-offer-price" type="number" inputMode="decimal" step="any" min="0" value={editOfferPrice} onChange={(event) => setEditOfferPrice(event.target.value)} className={inputClassName} />
              </div>
              <div>
                <label htmlFor="edit-stock-quantity" className="mb-1.5 block text-xs font-semibold text-slate-700">Stock Quantity ({product.variants[0]?.unit || "Units"})</label>
                <input id="edit-stock-quantity" type="number" inputMode="decimal" step="any" min="0" value={editStockQuantity} onChange={(event) => setEditStockQuantity(event.target.value)} className={inputClassName} required />
              </div>
              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  disabled={isSaving}
                  className="min-h-10 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />}
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

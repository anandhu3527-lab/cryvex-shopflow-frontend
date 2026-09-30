import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { billingApi } from "../../services/api/billingApi";
import { productApi } from "../../services/api/productApi";

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

function getProductRows(products) {
  return products.map((product) => {
    const variants = Array.isArray(product.variants) ? product.variants : [];
    let totalStock = 0;
    const barcodes = [];
    const skus = [];

    variants.forEach(v => {
      totalStock += (Number(v.stock_quantity) || 0);
      if (v.barcode) barcodes.push(String(v.barcode).toLowerCase());
      if (v.sku) skus.push(String(v.sku).toLowerCase());
    });

    let status = product.status;
    if (!status) {
      status = totalStock > 0 ? "In Stock" : "Out of Stock";
    }

    return {
      id: product.id,
      name: product.name || "Unnamed product",
      category: product.category_name || product.category?.name || "Uncategorized",
      variantCount: variants.length,
      stockQuantity: totalStock,
      status: status,
      searchableBarcodes: barcodes.join(" "),
      searchableSkus: skus.join(" ")
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

    recentBills.push(...page.filter((bill) => {
      const dateKey = getLocalDateKey(bill.created_at);
      return dateKey >= oldestSalesDay && dateKey <= newestSalesDay;
    }));

    const pageDateKeys = page
      .map((bill) => getLocalDateKey(bill.created_at))
      .filter(Boolean)
      .sort();
    const oldestPageDate = pageDateKeys[0];
    if (page.length < BILL_PAGE_SIZE || (oldestPageDate && oldestPageDate < oldestSalesDay)) break;
  }

  const billsWithItems = [];
  for (let start = 0; start < recentBills.length; start += 8) {
    const batch = await Promise.all(recentBills.slice(start, start + 8).map(async (bill) => {
      if (Array.isArray(bill.items)) return bill;
      const billId = bill.id || bill.bill_id;
      if (!billId) return bill;
      const detailResponse = await billingApi.getBillById(billId);
      return detailResponse?.data || detailResponse;
    }));
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
      const variant = variantEntry || (
        product?.variants?.length === 1 ? product.variants[0] : null
      );
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
  const [productsState, setProductsState] = useState(getInitialResource);
  const [lowStockState, setLowStockState] = useState(getInitialResource);
  const [stockState, setStockState] = useState(getInitialResource);
  const [salesState, setSalesState] = useState({ loading: true, days: [], error: "" });
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
    loadResource(() => productsRequest, setProductsState, "Could not load products.");
    loadResource(() => productApi.getLowStockAlerts(), setLowStockState, "Could not load low-stock products.");
    loadResource(() => productApi.getStockOverview(), setStockState, "Could not load stock overview.");

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

    return () => { isMounted = false; };
  }, []);

  const productRows = useMemo(() => {
    return getProductRows(productsState.data).sort((a, b) => {
      const aStock = Number(a.stockQuantity) || 0;
      const bStock = Number(b.stockQuantity) || 0;
      return aStock - bStock;
    });
  }, [productsState.data]);

  const visibleProductRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return productRows;
    return productRows.filter((row) =>
      row.name.toLowerCase().includes(query) ||
      row.searchableBarcodes.includes(query) ||
      row.searchableSkus.includes(query)
    );
  }, [productRows, searchTerm]);

  const stockTotalsByUnit = useMemo(() => {
    const totals = new Map();
    stockState.data.forEach((item) => {
      const quantity = getQuantity(item.stock_quantity);
      if (quantity === null) return;
      const unit = item.unit || "units";
      totals.set(unit, (totals.get(unit) || 0) + quantity);
    });
    return [...totals.entries()];
  }, [stockState.data]);

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
        setLookupState({ status: "not-found", product: null, error: `No product found for barcode ${value}.` });
      } else {
        setLookupState({ status: "error", product: null, error: getApiErrorMessage(error, "Barcode lookup failed.") });
      }
    } finally {
      setIsLookingUp(false);
    }
  };

  const lowStockCount = lowStockState.data.length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <header className="flex flex-col gap-4 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">Stock / Inventory</h1>
          <p className="mt-1 text-sm text-slate-500">Current quantities and low-stock items from your inventory.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/products/add")}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          <span aria-hidden="true">+</span>
          <span>Add Product</span>
        </button>
      </header>

      <section aria-labelledby="stock-details-title" className="space-y-3">
        <h2 id="stock-details-title" className="text-base font-bold text-slate-900">Stock Details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-xs font-semibold uppercase text-slate-500">Current Stock</h3>
            {stockState.loading ? (
              <p className="mt-3 text-sm text-slate-500" role="status">Loading stock data...</p>
            ) : stockState.error ? (
              <p className="mt-3 text-sm text-rose-700" role="alert">{stockState.error}</p>
            ) : stockTotalsByUnit.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No stock overview available.</p>
            ) : (
              <div className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-2">
                {stockTotalsByUnit.map(([unit, total]) => (
                  <p key={unit} className="text-2xl font-extrabold text-slate-900">
                    {formatQuantity(total)} <span className="text-sm font-semibold text-slate-500">{unit}</span>
                  </p>
                ))}
              </div>
            )}
          </article>

          <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-xs font-semibold uppercase text-slate-500">Low Stock</h3>
            {lowStockState.loading ? (
              <p className="mt-3 text-sm text-slate-500" role="status">Loading low-stock data...</p>
            ) : lowStockState.error ? (
              <p className="mt-3 text-sm text-rose-700" role="alert">{lowStockState.error}</p>
            ) : (
              <p className="mt-2 text-3xl font-extrabold text-amber-700">
                {lowStockCount.toLocaleString("en-IN")}
                <span className="ml-2 text-sm font-semibold text-slate-500">items</span>
              </p>
            )}
          </article>
        </div>
      </section>

      <section aria-labelledby="product-inventory-title" className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="product-inventory-title" className="text-base font-bold text-slate-900">Product Inventory</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase text-slate-500">
                <th scope="col" className="px-4 py-3">Product</th>
                <th scope="col" className="px-3 py-3">Category</th>
                <th scope="col" className="px-3 py-3 text-right">Variants</th>
                <th scope="col" className="px-3 py-3 text-right">Total Stock</th>
                <th scope="col" className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {productsState.loading ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500" role="status">Loading stock data...</td></tr>
              ) : productsState.error ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-rose-700" role="alert">{productsState.error}</td></tr>
              ) : visibleProductRows.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500">No products found</td></tr>
              ) : visibleProductRows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => row.id && navigate(`/products/${row.id}`)}
                  className={row.id ? "cursor-pointer transition-colors hover:bg-slate-50" : ""}
                >
                  <td className="max-w-[260px] px-4 py-3 font-semibold text-slate-900">
                    <span className="block break-words">{row.name}</span>
                  </td>
                  <td className="px-3 py-3 text-sm text-slate-600">{row.category}</td>
                  <td className="px-3 py-3 text-right font-semibold text-slate-800">{row.variantCount}</td>
                  <td className="px-3 py-3 text-right font-semibold text-slate-800">
                    {formatQuantity(row.stockQuantity)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClass(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="low-stock-products-title" className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
          <h2 id="low-stock-products-title" className="text-base font-bold text-slate-900">Low Stock Products</h2>
          {!lowStockState.loading && !lowStockState.error && (
            <span className="text-xs font-semibold text-slate-500">{lowStockCount.toLocaleString("en-IN")} items</span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase text-slate-500">
                <th scope="col" className="px-4 py-3">Product</th>
                <th scope="col" className="px-3 py-3">Barcode</th>
                <th scope="col" className="px-3 py-3 text-right">Current Quantity</th>
                <th scope="col" className="px-3 py-3 text-right">Threshold</th>
                <th scope="col" className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lowStockState.loading ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500" role="status">Loading low-stock products...</td></tr>
              ) : lowStockState.error ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-rose-700" role="alert">{lowStockState.error}</td></tr>
              ) : lowStockState.data.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No low-stock products</td></tr>
              ) : lowStockState.data.map((item) => (
                <tr key={item.variant_id || item.product_id}>
                  <td className="px-4 py-3 font-semibold text-slate-900">{item.product_name || "Unnamed product"}</td>
                  <td className="px-3 py-3 font-mono text-xs text-slate-600">{item.barcode || "—"}</td>
                  <td className="px-3 py-3 text-right font-semibold text-slate-800">
                    {formatQuantity(item.stock_quantity)}{item.unit ? ` ${item.unit}` : ""}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-600">
                    {formatQuantity(item.low_stock_threshold)}{item.unit ? ` ${item.unit}` : ""}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClass(item.alert_type || "Low Stock")}`}>
                      {item.alert_type || "Low Stock"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="barcode-lookup-title" className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div>
          <h2 id="barcode-lookup-title" className="text-base font-bold text-slate-900">Barcode Lookup</h2>
          <p className="mt-1 text-sm text-slate-500">Scan a barcode or enter it manually to retrieve its live product record.</p>
        </div>
        <form onSubmit={handleBarcodeLookup} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="barcode-lookup-input">Barcode</label>
          <input
            id="barcode-lookup-input"
            type="search"
            value={barcode}
            onChange={(event) => setBarcode(event.target.value)}
            placeholder="Scan or enter barcode"
            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={isLookingUp || !barcode.trim()}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLookingUp ? "Looking up..." : "Find Product"}
          </button>
        </form>
        {lookupState.status === "loading" && <p className="mt-3 text-sm text-slate-500" role="status">Loading product data...</p>}
        {(lookupState.status === "not-found" || lookupState.status === "error") && (
          <p className="mt-3 text-sm text-rose-700" role="alert">{lookupState.error}</p>
        )}
        {lookupState.status === "found" && lookupState.product && (
          <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <p><span className="block text-xs text-slate-500">Product</span><strong className="mt-1 block text-slate-900">{lookupState.product.product_name}</strong></p>
            <p><span className="block text-xs text-slate-500">Barcode</span><strong className="mt-1 block break-all font-mono text-slate-900">{lookupState.product.barcode}</strong></p>
            <p><span className="block text-xs text-slate-500">Current Stock</span><strong className="mt-1 block text-slate-900">{formatQuantity(lookupState.product.stock_quantity)} {lookupState.product.unit}</strong></p>
            <p><span className="block text-xs text-slate-500">Low-Stock Threshold</span><strong className="mt-1 block text-slate-900">{formatQuantity(lookupState.product.low_stock_threshold)} {lookupState.product.unit}</strong></p>
          </div>
        )}
      </section>

      <section aria-labelledby="daily-sales-title" className="space-y-3">
        <h2 id="daily-sales-title" className="text-base font-bold text-slate-900">Daily Product Sales</h2>
        {salesState.loading ? (
          <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500" role="status">Loading daily sales data...</p>
        ) : salesState.error ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-5 text-sm text-rose-700" role="alert">{salesState.error}</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {salesState.days.map((day) => (
              <article key={day.key} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-baseline justify-between gap-3 border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900">{day.label}</h3>
                  <span className="text-xs text-slate-500">{day.date}</span>
                </div>
                {day.sales.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-500">No sales recorded</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {day.sales.map((sale, index) => (
                      <li key={`${sale.barcode}-${index}`} className="py-3 last:pb-0">
                        <p className="break-words text-sm font-semibold text-slate-900">{sale.productName}</p>
                        <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                          <span className="break-all font-mono">Barcode: {sale.barcode}</span>
                          <span><strong className="text-slate-800">{formatQuantity(sale.unitsSold)}</strong> units sold</span>
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
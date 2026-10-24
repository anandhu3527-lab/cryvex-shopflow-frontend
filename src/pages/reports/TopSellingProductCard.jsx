import { useState } from "react";
import { Award, Barcode, Check, Copy } from "lucide-react";
import { formatRupees } from "./reportUtils";

const themeConfigs = {
  emerald: {
    gradient: "from-slate-900 via-emerald-950 to-slate-900 border-emerald-900/50",
    awardBadge: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    barcodeBadge: "bg-emerald-500/15 border-emerald-400/30 text-emerald-200",
    barcodeIcon: "text-emerald-400",
    qtyColor: "text-emerald-400",
    totalColor: "text-emerald-300",
  },
  indigo: {
    gradient: "from-slate-900 via-indigo-950 to-slate-900 border-indigo-900/50",
    awardBadge: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    barcodeBadge: "bg-indigo-500/15 border-indigo-400/30 text-indigo-200",
    barcodeIcon: "text-indigo-400",
    qtyColor: "text-emerald-400",
    totalColor: "text-amber-300",
  },
  blue: {
    gradient: "from-slate-900 via-blue-950 to-slate-900 border-blue-900/50",
    awardBadge: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    barcodeBadge: "bg-blue-500/15 border-blue-400/30 text-blue-200",
    barcodeIcon: "text-blue-400",
    qtyColor: "text-emerald-400",
    totalColor: "text-amber-300",
  },
};

export default function TopSellingProductCard({
  product,
  title = "Top-Selling Product",
  accent = "indigo",
}) {
  const [copied, setCopied] = useState(false);

  if (!product) return null;

  const theme = themeConfigs[accent] || themeConfigs.indigo;
  const rawBarcode = product.barcode;
  const hasValidBarcode =
    Boolean(rawBarcode) &&
    rawBarcode !== "—" &&
    rawBarcode !== "null" &&
    rawBarcode !== "undefined";

  const handleCopy = async () => {
    if (!hasValidBarcode) return;
    try {
      await navigator.clipboard.writeText(String(rawBarcode).trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-r ${theme.gradient} text-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-md border`}
    >
      {/* Decorative ambient background glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />

      {/* Top Header Badge */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider border ${theme.awardBadge}`}
        >
          <Award className="w-4 h-4 shrink-0" />
          <span>{title}</span>
        </div>

        {hasValidBarcode && (
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
            <Barcode className={`w-3.5 h-3.5 ${theme.barcodeIcon}`} />
            Verified Barcode
          </span>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-5 text-xs">
        {/* Product Name */}
        <div className="col-span-2 sm:col-span-1 lg:col-span-1">
          <span className="text-slate-400 block mb-1 font-medium">Product Name</span>
          <span className="font-bold text-base sm:text-lg text-white block leading-snug">
            {product.product_name}
          </span>
        </div>

        {/* Barcode / SKU Display */}
        <div className="col-span-2 sm:col-span-2 lg:col-span-1">
          <span className="text-slate-400 block mb-1 font-medium flex items-center gap-1.5">
            <Barcode className={`w-3.5 h-3.5 ${theme.barcodeIcon}`} />
            Barcode / SKU
          </span>

          {hasValidBarcode ? (
            <div className="inline-flex items-center gap-1.5 mt-0.5">
              <div
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl border font-mono text-xs sm:text-sm font-bold tracking-wider ${theme.barcodeBadge}`}
              >
                <Barcode className="w-4 h-4 shrink-0" />
                <span className="select-all">{rawBarcode}</span>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                title={copied ? "Copied to clipboard" : "Copy barcode"}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-slate-300 hover:text-white transition-all border border-white/10"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-300" />
                )}
              </button>
            </div>
          ) : (
            <span className="font-mono text-sm text-slate-400 block mt-1">
              —
            </span>
          )}
        </div>

        {/* Quantity Sold */}
        <div>
          <span className="text-slate-400 block mb-1 font-medium">Quantity Sold</span>
          <span className={`font-extrabold text-base sm:text-lg block ${theme.qtyColor}`}>
            {product.quantity_sold.toLocaleString("en-IN")} units
          </span>
        </div>

        {/* Average Selling Price */}
        <div>
          <span className="text-slate-400 block mb-1 font-medium">Average Selling Price</span>
          <span className="font-bold text-sm sm:text-base text-slate-200 block">
            {formatRupees(product.average_selling_price)}
          </span>
        </div>

        {/* Total Product Sales */}
        <div>
          <span className="text-slate-400 block mb-1 font-medium">Total Product Sales</span>
          <span className={`font-black text-base sm:text-lg block ${theme.totalColor}`}>
            {formatRupees(product.total_product_sales)}
          </span>
        </div>
      </div>
    </div>
  );
}

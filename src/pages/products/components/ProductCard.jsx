import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  Barcode,
  ArrowRight,
  Sparkles,
  Plus,
} from "lucide-react";
import { getCategoryTheme } from "./categoryTheme";
import Stock3DSymbol from "./Stock3DSymbol";

export default function ProductCard({ product }) {
  const navigate = useNavigate();
  const theme = getCategoryTheme(product?.category);

  // Extract product details
  const stockQuantity = Number(product?.stockQuantity ?? 0);
  const variantCount = Number(product?.variantCount ?? 1);
  const status = String(product?.status || (stockQuantity > 0 ? "In Stock" : "Out of Stock"));

  const isOutOfStock = status.toLowerCase().includes("out") || stockQuantity <= 0;
  const isLowStock = !isOutOfStock && (status.toLowerCase().includes("low") || (stockQuantity > 0 && stockQuantity <= 10));
  const isHighStock = !isOutOfStock && !isLowStock;

  // Extract barcode and SKU
  const barcode = product?.searchableBarcodes?.split(" ")[0] || "";
  const sku = product?.searchableSkus?.split(" ")[0] || "";

  const handleCardClick = () => {
    if (product?.id) {
      navigate(`/products/${product.id}`);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative select-none cursor-pointer rounded-2xl sm:rounded-3xl transition-all duration-300 ease-out hover:-translate-y-1"
    >
      {/* Outer Gradient Halo Glow on Hover */}
      <div
        className={`pointer-events-none absolute -inset-1 rounded-3xl bg-gradient-to-r ${theme.gradient} opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-35`}
      />

      {/* Main Card Shell */}
      <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm transition-all duration-300 group-hover:border-transparent group-hover:shadow-xl h-full">
        {/* Top Gradient Mesh Accent Banner */}
        <div
          className={`absolute top-0 left-0 right-0 h-1.5 sm:h-2 bg-gradient-to-r ${theme.gradient}`}
        />

        {/* Top Header: Category Tag & 3D Stock Symbol Badge on the Side */}
        <div className="flex items-center justify-between gap-1.5 pt-1">
          <span
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] md:text-[11px] font-extrabold uppercase tracking-wider text-white shadow-xs bg-gradient-to-r ${theme.boxPrimary} truncate max-w-[120px] sm:max-w-none`}
            title={product?.category || "Standard"}
          >
            <Sparkles className="h-3 w-3 shrink-0" />
            <span className="truncate">{product?.category || "Standard"}</span>
          </span>


        </div>

        {/* Product Visual Center Icon Banner with 3D Symbol on the Side */}
        <div
          className={`relative my-3.5 sm:my-4 flex h-28 sm:h-32 w-full flex-col items-center justify-center overflow-hidden rounded-2xl border ${theme.border} bg-gradient-to-b ${theme.bgSoft} to-white/90 p-4 text-center transition-all group-hover:scale-[1.01]`}
        >
          {/* Subtle Ambient Radial Glow */}
          <div
            className="pointer-events-none absolute inset-0 opacity-25 blur-xl transition-opacity group-hover:opacity-45"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${theme.accent}, transparent 65%)`,
            }}
          />

          {/* Floating 3D Stock Symbol Tag on the Side of the Product */}
          <div className="absolute top-2 right-2.5 z-20">
            <div
              className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wider backdrop-blur-md border shadow-md transition-transform hover:scale-105 ${
                isOutOfStock
                  ? "bg-rose-600/90 text-white border-rose-300 shadow-[0_2px_0_#881337]"
                  : isLowStock
                  ? "bg-amber-500/95 text-white border-amber-200 shadow-[0_2px_0_#9a3412] animate-pulse"
                  : "bg-emerald-600/90 text-white border-emerald-200 shadow-[0_2px_0_#065f46]"
              }`}
            >
              <Stock3DSymbol type={isOutOfStock ? "out" : isLowStock ? "low" : "high"} size="xs" />
              <span>{isOutOfStock ? "0 Left" : isLowStock ? "Low Stock" : "High Stock"}</span>
            </div>
          </div>

          <div className="relative z-10 mx-auto flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-white shadow-md border border-slate-100 group-hover:scale-110 transition-transform duration-300">
            <Package className="h-6 w-6 sm:h-7 sm:w-7" style={{ color: theme.accent }} />
          </div>

          <span className="relative z-10 mt-2 text-xs sm:text-sm font-extrabold text-slate-800 line-clamp-1 px-2">
            {product?.name}
          </span>
        </div>

        {/* Product Details & Inventory Gauge */}
        <div className="space-y-2.5">
          <div>
            <h3
              className="font-black text-slate-900 text-sm sm:text-base line-clamp-1 group-hover:text-blue-600 transition"
              title={product?.name}
            >
              {product?.name || "Unnamed Product"}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 flex items-center gap-1.5 truncate">
              <span className="font-semibold text-slate-600">{variantCount} variant{variantCount !== 1 ? "s" : ""}</span>
            </p>
          </div>

          {/* Stock Level Gauge with 3D Symbol on the Side */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-2.5 sm:p-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-600 truncate">Inventory Stock</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <Stock3DSymbol type={isOutOfStock ? "out" : isLowStock ? "low" : "high"} size="xs" />
                <span
                  className={`font-black ${
                    isOutOfStock ? "text-rose-600" : isLowStock ? "text-amber-600" : "text-emerald-700"
                  }`}
                >
                  {stockQuantity.toLocaleString("en-IN")} units
                </span>
              </div>
            </div>

            {/* Visual gradient progress bar */}
            <div className="mt-2 h-2 w-full rounded-full bg-slate-200/80 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isOutOfStock
                    ? "bg-rose-500"
                    : isLowStock
                    ? "bg-gradient-to-r from-amber-400 to-orange-500"
                    : "bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500"
                }`}
                style={{
                  width: `${Math.min(100, Math.max(10, (stockQuantity / 50) * 100))}%`,
                }}
              />
            </div>

            {barcode && (
              <div className="mt-2 flex items-center justify-between border-t border-slate-200/60 pt-2 text-[10px] text-slate-500">
                <span className="flex items-center gap-1 truncate max-w-[140px] sm:max-w-none">
                  <Barcode className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="font-mono truncate">{barcode}</span>
                </span>
                {sku && <span className="font-mono text-slate-400 hidden sm:inline">SKU: {sku}</span>}
              </div>
            )}
          </div>
        </div>

        {/* Card Footer Actions: View Details & Add Variant */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            className="w-full sm:flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 py-2.5 text-xs font-bold text-white transition-all shadow-xs cursor-pointer"
          >
            <span>Details</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/products/${product.id}/variants/new`, { state: { product } });
            }}
            className="w-full sm:flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-50 hover:bg-blue-600 hover:text-white border border-blue-200 text-blue-700 py-2.5 text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Variant</span>
          </button>
        </div>
      </div>
    </div>
  );
}

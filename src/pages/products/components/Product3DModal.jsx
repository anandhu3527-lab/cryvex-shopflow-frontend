import React, { useState } from "react";
import {
  X,
  Box,
  Layers,
  Sparkles,
  Barcode,
  Tag,
  ArrowRight,
  ShieldCheck,
  Check,
  Copy,
  ExternalLink,
} from "lucide-react";
import Product3DViewer, { getCategoryTheme } from "./Product3DViewer";
import { useNavigate } from "react-router-dom";

export default function Product3DModal({ product, isOpen, onClose }) {
  const navigate = useNavigate();
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [copiedBarcode, setCopiedBarcode] = useState(false);

  if (!isOpen || !product) return null;

  const variants = Array.isArray(product.variants) ? product.variants : [];
  const currentVariant = variants[selectedVariantIndex] || variants[0] || null;
  const theme = getCategoryTheme(product.category || product.category_name);

  const stockQuantity = currentVariant?.stock_quantity ?? product.stockQuantity ?? product.stock_quantity ?? 0;
  const lowStockThreshold = currentVariant?.low_stock_threshold ?? 5;
  const isLowStock = stockQuantity <= lowStockThreshold && stockQuantity > 0;
  const isOutOfStock = stockQuantity <= 0;

  const sellingPrice = currentVariant?.selling_price;
  const offerPrice = currentVariant?.offer_price;
  const barcodeValue = currentVariant?.barcode || product.searchableBarcodes?.split(" ")[0] || "N/A";

  const handleCopyBarcode = () => {
    if (!barcodeValue || barcodeValue === "N/A") return;
    navigator.clipboard.writeText(barcodeValue);
    setCopiedBarcode(true);
    setTimeout(() => setCopiedBarcode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200/80 flex flex-col lg:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/60 text-white backdrop-blur-md transition hover:bg-slate-900"
          aria-label="Close 3D View"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Left Column: 3D Visualizer Room */}
        <div className="lg:w-7/12 relative bg-slate-950 p-4 sm:p-6 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 px-3 py-1 text-xs font-semibold text-blue-300">
              <Box className="h-3.5 w-3.5 text-blue-400" />
              <span>3D Showcase Room</span>
            </span>
            <span className="text-xs text-slate-400">Cryvex ShopFlow Rendering</span>
          </div>

          {/* 3D Canvas Element */}
          <div className="my-auto py-2">
            <Product3DViewer
              product={product}
              variant={currentVariant}
              interactive={true}
              autoSpinDefault={true}
            />
          </div>

          {/* Bottom helper tip */}
          <div className="mt-2 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Click & drag packaging to inspect 360° views and side specs</span>
          </div>
        </div>

        {/* Right Column: Detailed Specs & Inventory Actions */}
        <div className="lg:w-5/12 p-6 flex flex-col justify-between overflow-y-auto bg-slate-50/50">
          <div className="space-y-4">
            {/* Header info */}
            <div>
              <span className={`inline-block rounded-lg px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r ${theme.boxPrimary}`}>
                {product.category || product.category_name || "General Product"}
              </span>
              <h2 className="mt-2 text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                {product.name}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Product ID: <span className="font-mono text-slate-700">#{String(product.id).slice(0, 8)}</span>
              </p>
            </div>

            {/* Price section */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-xs font-semibold uppercase text-slate-400">Retail Pricing</span>
              <div className="mt-1 flex items-baseline gap-3">
                {sellingPrice != null ? (
                  <>
                    <span className="text-2xl font-black text-slate-900">
                      ₹{Number(offerPrice || sellingPrice).toLocaleString("en-IN")}
                    </span>
                    {offerPrice && Number(offerPrice) < Number(sellingPrice) && (
                      <span className="text-sm font-semibold text-slate-400 line-through">
                        ₹{Number(sellingPrice).toLocaleString("en-IN")}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-sm font-medium text-slate-500">Price on request / Not set</span>
                )}
              </div>
            </div>

            {/* Inventory Status Bar */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Live Inventory Level</span>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    isOutOfStock
                      ? "bg-rose-100 text-rose-700"
                      : isLowStock
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {isOutOfStock ? "Out of Stock" : isLowStock ? "Low Stock Warning" : "Healthy Stock"}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isOutOfStock
                      ? "bg-rose-500"
                      : isLowStock
                      ? "bg-amber-500"
                      : "bg-gradient-to-r from-emerald-500 to-teal-400"
                  }`}
                  style={{
                    width: `${Math.min(100, Math.max(8, (stockQuantity / (lowStockThreshold * 3 || 30)) * 100))}%`,
                  }}
                />
              </div>

              <div className="flex justify-between text-[11px] text-slate-500 pt-0.5">
                <span>Available: <strong className="text-slate-800 font-bold">{stockQuantity} units</strong></span>
                <span>Threshold: <strong className="text-slate-800">{lowStockThreshold} units</strong></span>
              </div>
            </div>

            {/* Variant Switcher (if product has multiple variants) */}
            {variants.length > 1 && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Select Variant</label>
                <div className="flex flex-wrap gap-2">
                  {variants.map((v, idx) => (
                    <button
                      key={v.id || idx}
                      type="button"
                      onClick={() => setSelectedVariantIndex(idx)}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                        selectedVariantIndex === idx
                          ? "border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      {v.package_quantity || ""} {v.unit || `Variant ${idx + 1}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Barcode & SKU Chip */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Barcode className="h-4 w-4 text-slate-400" />
                <div className="text-xs">
                  <div className="text-slate-400 text-[10px]">BARCODE</div>
                  <div className="font-mono font-bold text-slate-800">{barcodeValue}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyBarcode}
                className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 transition"
              >
                {copiedBarcode ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="mt-6 pt-4 border-t border-slate-200 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-300 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
            >
              Done Viewing
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                if (product.id) navigate(`/products/${product.id}`);
              }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700 transition"
            >
              <span>Full Details</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

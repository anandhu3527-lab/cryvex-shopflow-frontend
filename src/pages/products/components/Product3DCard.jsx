import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  Barcode,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Box,
  Sparkles,
  Maximize2,
} from "lucide-react";
import { getCategoryTheme } from "./categoryTheme";
import Stock3DSymbol, { Stock3DBadge } from "./Stock3DSymbol";

export default function Product3DCard({ product, onInspect3D }) {
  const navigate = useNavigate();
  const theme = getCategoryTheme(product?.category);
  const [isHovered, setIsHovered] = useState(false);

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

  const handleInspectClick = (e) => {
    e.stopPropagation();
    if (onInspect3D) {
      onInspect3D(product);
    } else if (product?.id) {
      navigate(`/products/${product.id}`);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative select-none cursor-pointer rounded-2xl sm:rounded-3xl transition-all duration-300 ease-out hover:-translate-y-1.5"
    >
      {/* Outer Gradient Halo Glow on Hover */}
      <div
        className={`pointer-events-none absolute -inset-1 rounded-3xl bg-gradient-to-r ${theme.gradient} opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-40`}
      />

      {/* Main Card Shell - Full Rich Gradient Background */}
      <div className={`relative flex flex-col justify-between overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-gradient-to-b from-white via-slate-50/70 to-white p-3.5 sm:p-5 shadow-sm transition-all duration-300 group-hover:border-transparent group-hover:shadow-2xl h-full`}>
        {/* Top Gradient Mesh Accent Banner */}
        <div
          className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${theme.gradient}`}
        />

        {/* Top Header: Category Tag & 3D Stock Symbol Badge on the Side */}
        <div className="flex items-center justify-between gap-1.5 pt-1">
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[9px] sm:text-[10px] md:text-[11px] font-black uppercase tracking-wider text-white shadow-xs bg-gradient-to-r ${theme.boxPrimary} truncate max-w-[120px] sm:max-w-none`}
            title={product?.category || "Standard"}
          >
            <Sparkles className="h-3 w-3 shrink-0" />
            <span className="truncate">{product?.category || "Standard"}</span>
          </span>

          {/* 3D Stock Symbol Badge on the Side */}
          <Stock3DBadge
            quantity={stockQuantity}
            status={status}
            size="sm"
            className="hover:scale-105"
          />
        </div>

        {/* ── HIGH VISIBILITY SIMPLE 3D PRODUCT VIEW BOX ── */}
        <div
          className={`relative my-3 sm:my-3.5 flex h-40 sm:h-48 w-full flex-col items-center justify-center overflow-hidden rounded-2xl border ${theme.border} bg-gradient-to-br ${theme.stageGradient} via-white/80 to-slate-50/90 p-3 text-center transition-all shadow-inner`}
          style={{ perspective: "900px" }}
        >
          {/* Ambient Radial Spotlight */}
          <div
            className="pointer-events-none absolute inset-0 opacity-40 blur-2xl transition-opacity group-hover:opacity-70"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${theme.accent}, transparent 70%)`,
            }}
          />

          {/* 3D Perspective Indicator Badge in top corner */}
          <div className="absolute top-2 left-2.5 z-20 flex items-center gap-1">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-white/95 backdrop-blur-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-800 border border-slate-200/90 shadow-xs">
              <Box className="h-3 w-3 text-blue-600" />
              <span>3D Box</span>
            </span>
          </div>

          {/* Quick Inspect Button on Hover in top right */}
          <button
            type="button"
            onClick={handleInspectClick}
            title="Open Interactive 360° 3D Model"
            className="absolute top-2 right-2.5 z-20 inline-flex items-center gap-1 rounded-md bg-white/95 hover:bg-gradient-to-r hover:from-blue-600 hover:to-indigo-600 hover:text-white backdrop-blur-md px-2.5 py-0.5 text-[9px] font-bold text-slate-700 border border-slate-200/90 shadow-xs transition-all cursor-pointer"
          >
            <Maximize2 className="h-3 w-3" />
            <span className="hidden sm:inline">360° View</span>
          </button>

          {/* ── 3D ISOMETRIC PACKAGING OBJECT (SIMPLE & VISIBLE) ── */}
          <div
            className="relative z-10 transition-transform duration-500 ease-out"
            style={{
              transformStyle: "preserve-3d",
              transform: isHovered
                ? "rotateX(18deg) rotateY(-12deg) scale(1.1)"
                : "rotateX(14deg) rotateY(-22deg) scale(1)",
            }}
          >
            {/* Contact Floor Shadow under the 3D box */}
            <div
              className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 rounded-full transition-all duration-300"
              style={{
                width: isHovered ? "120px" : "105px",
                height: "24px",
                background: "radial-gradient(ellipse at center, rgba(15, 23, 42, 0.45) 0%, rgba(15, 23, 42, 0.1) 60%, transparent 80%)",
                filter: "blur(3px)",
                transform: "rotateX(75deg)",
              }}
            />

            {/* Master 3D Box Geometry - Clean, Visible, High-Contrast */}
            <div
              className="relative w-28 sm:w-32 h-28 sm:h-32 rounded-xl shadow-2xl"
              style={{
                transformStyle: "preserve-3d",
              }}
            >
              {/* FRONT FACE (Facing User) - Vibrant Gradient */}
              <div
                className={`absolute inset-0 rounded-xl bg-gradient-to-br ${theme.boxPrimary} border border-white/50 p-2.5 flex flex-col justify-between text-white shadow-xl overflow-hidden`}
                style={{
                  transform: "translateZ(26px)",
                }}
              >
                {/* Specular glare overlay */}
                <div className="pointer-events-none absolute -top-10 -left-10 w-28 h-28 bg-white/25 rounded-full blur-md" />

                <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-wider text-white">
                  <span className="truncate max-w-[70px] drop-shadow-xs">{product?.category || "CRYVEX"}</span>
                  <div className="flex items-center gap-0.5 text-white bg-white/20 rounded px-1 py-0.2">
                    <ShieldCheck className="h-2.5 w-2.5 shrink-0" />
                    <span className="text-[7px]">VERIFIED</span>
                  </div>
                </div>

                <div className="my-auto text-center space-y-1">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 mx-auto rounded-lg bg-white/25 backdrop-blur-xs flex items-center justify-center border border-white/40 shadow-xs">
                    <Package className="h-4 w-4 text-white" />
                  </div>
                  <span className="block text-[9px] sm:text-[10px] font-black tracking-tight text-white line-clamp-1 drop-shadow px-0.5">
                    {product?.name || "Item"}
                  </span>
                </div>

                {/* Simulated barcode and SKU */}
                <div className="flex items-center justify-between border-t border-white/25 pt-1 text-[8px] text-white/90">
                  <span className="font-mono font-bold">#{String(product?.id || "").slice(0, 5)}</span>
                  <div className="flex gap-0.5 h-2.5 items-center">
                    <div className="w-[1.5px] h-2.5 bg-white" />
                    <div className="w-[1px] h-2.5 bg-white/70" />
                    <div className="w-[2px] h-2.5 bg-white" />
                    <div className="w-[1px] h-2.5 bg-white/50" />
                    <div className="w-[1.5px] h-2.5 bg-white" />
                  </div>
                </div>
              </div>

              {/* TOP FACE (Tilted Lid) */}
              <div
                className="absolute inset-0 rounded-xl border border-white/60 p-1 flex items-center justify-center"
                style={{
                  height: "52px",
                  top: "-26px",
                  background: theme.boxTop || "#60a5fa",
                  transform: "rotateX(90deg) translateZ(26px)",
                  boxShadow: "inset 0 1px 4px rgba(255, 255, 255, 0.8)",
                }}
              >
                <span className="text-[8px] font-black uppercase tracking-widest text-white drop-shadow-xs">
                  CRYVEX ORIGINAL
                </span>
              </div>

              {/* RIGHT SIDE FACE (Depth Wall) */}
              <div
                className="absolute inset-0 rounded-xl border border-white/25 p-2 flex flex-col justify-between text-white shadow-inner"
                style={{
                  width: "52px",
                  right: "-26px",
                  left: "auto",
                  background: theme.boxDark || "#1e3a8a",
                  transform: "rotateY(90deg) translateZ(26px)",
                  boxShadow: "inset -2px 0 8px rgba(0, 0, 0, 0.45)",
                }}
              >
                <div className="text-[7px] font-bold text-white/80 uppercase rotate-90 origin-top-left translate-x-5 translate-y-1 tracking-widest whitespace-nowrap">
                  GENUINE STOCK
                </div>
              </div>
            </div>
          </div>

          {/* Subtitle Under Box */}
          <span className="relative z-10 mt-1 text-[10px] sm:text-xs font-black text-slate-800 line-clamp-1 px-2">
            {product?.name}
          </span>
        </div>

        {/* Product Details & Inventory Gauge - Full Gradient Column */}
        <div className="space-y-2 sm:space-y-2.5">
          <div>
            <h3
              className="font-black text-slate-900 text-xs sm:text-sm md:text-base line-clamp-1 group-hover:text-blue-600 transition"
              title={product?.name}
            >
              {product?.name || "Unnamed Product"}
            </h3>
            <p className="mt-0.5 text-[10px] sm:text-xs text-slate-500 flex items-center gap-1 sm:gap-1.5 truncate">
              <span className="font-semibold text-slate-600">{variantCount} variant{variantCount !== 1 ? "s" : ""}</span>
              <span>•</span>
              <span className="font-mono text-slate-400 text-[10px] sm:text-[11px]">ID #{String(product?.id || "").slice(0, 6)}</span>
            </p>
          </div>

          {/* Stock Level Gauge with Gradient Column Background */}
          <div className="rounded-xl sm:rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/20 p-2 sm:p-2.5">
            <div className="flex items-center justify-between text-[10px] sm:text-xs font-semibold">
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
            <div className="mt-1.5 h-1.5 sm:h-2 w-full rounded-full bg-slate-200/80 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isOutOfStock
                    ? "bg-gradient-to-r from-rose-500 to-pink-600"
                    : isLowStock
                    ? "bg-gradient-to-r from-amber-400 via-orange-500 to-red-500"
                    : "bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500"
                }`}
                style={{
                  width: `${Math.min(100, Math.max(10, (stockQuantity / 50) * 100))}%`,
                }}
              />
            </div>

            {barcode && (
              <div className="mt-1.5 flex items-center justify-between border-t border-slate-200/60 pt-1.5 text-[9px] sm:text-[10px] text-slate-500">
                <span className="flex items-center gap-1 truncate max-w-[120px] sm:max-w-none">
                  <Barcode className="h-3 w-3 text-slate-400 shrink-0" />
                  <span className="font-mono truncate">{barcode}</span>
                </span>
                {sku && <span className="font-mono text-slate-400 hidden sm:inline">SKU: {sku}</span>}
              </div>
            )}
          </div>
        </div>

        {/* Card Footer Actions: 3D Modal & Details Button Filled with Gradients */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleInspectClick}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 py-2 text-[10px] sm:text-xs font-bold text-blue-700 transition cursor-pointer shadow-2xs"
          >
            <Box className="h-3.5 w-3.5 text-blue-600" />
            <span>3D View</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            className={`inline-flex items-center justify-center gap-1 rounded-xl bg-gradient-to-r ${theme.gradient} hover:opacity-95 py-2 text-[10px] sm:text-xs font-bold text-white transition shadow-sm cursor-pointer`}
          >
            <span>Details</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}


import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  RotateCcw,
  Sparkles,
  Maximize2,
  Layers,
  Sun,
  ShieldCheck,
  QrCode,
  Barcode,
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  Package,
} from "lucide-react";

/**
 * Returns a thematic color palette based on category name
 */
export function getCategoryTheme(categoryName = "") {
  const cat = String(categoryName).toLowerCase();
  if (cat.includes("drink") || cat.includes("bever") || cat.includes("water") || cat.includes("juice")) {
    return {
      gradient: "from-cyan-500 to-blue-600",
      accent: "#06b6d4",
      bgSoft: "bg-cyan-50",
      border: "border-cyan-200",
      badge: "bg-cyan-100 text-cyan-800",
      boxPrimary: "from-cyan-600 to-blue-700",
      boxSecondary: "#0891b2",
      boxDark: "#0e7490",
      boxTop: "#22d3ee",
      name: "Ocean / Beverage",
    };
  }
  if (cat.includes("snack") || cat.includes("food") || cat.includes("biscuit") || cat.includes("bakery")) {
    return {
      gradient: "from-amber-500 to-orange-600",
      accent: "#f59e0b",
      bgSoft: "bg-amber-50",
      border: "border-amber-200",
      badge: "bg-amber-100 text-amber-800",
      boxPrimary: "from-amber-500 to-orange-600",
      boxSecondary: "#ea580c",
      boxDark: "#c2410c",
      boxTop: "#fbbf24",
      name: "Warm / Snacks",
    };
  }
  if (cat.includes("fresh") || cat.includes("veg") || cat.includes("fruit") || cat.includes("organ") || cat.includes("dairy")) {
    return {
      gradient: "from-emerald-500 to-teal-600",
      accent: "#10b981",
      bgSoft: "bg-emerald-50",
      border: "border-emerald-200",
      badge: "bg-emerald-100 text-emerald-800",
      boxPrimary: "from-emerald-600 to-teal-700",
      boxSecondary: "#059669",
      boxDark: "#047857",
      boxTop: "#34d399",
      name: "Fresh / Green",
    };
  }
  if (cat.includes("beauty") || cat.includes("cosmetic") || cat.includes("care") || cat.includes("personal")) {
    return {
      gradient: "from-fuchsia-500 to-pink-600",
      accent: "#d946ef",
      bgSoft: "bg-pink-50",
      border: "border-pink-200",
      badge: "bg-pink-100 text-pink-800",
      boxPrimary: "from-fuchsia-600 to-pink-700",
      boxSecondary: "#c026d3",
      boxDark: "#a21caf",
      boxTop: "#e879f9",
      name: "Luxury / Beauty",
    };
  }
  // Default: Electric Blue / Purple
  return {
    gradient: "from-blue-600 to-indigo-600",
    accent: "#3b82f6",
    bgSoft: "bg-blue-50",
    border: "border-blue-200",
    badge: "bg-blue-100 text-blue-800",
    boxPrimary: "from-blue-600 to-indigo-700",
    boxSecondary: "#4f46e5",
    boxDark: "#3730a3",
    boxTop: "#60a5fa",
    name: "Tech / Standard",
  };
}

export default function Product3DViewer({
  product = {},
  variant = null,
  interactive = true,
  autoSpinDefault = false,
  compact = false,
}) {
  const containerRef = useRef(null);

  // 3D Rotation State
  const [rotX, setRotX] = useState(-16);
  const [rotY, setRotY] = useState(32);
  const [zoom, setZoom] = useState(1);
  const [isAutoSpin, setIsAutoSpin] = useState(autoSpinDefault);
  const [isExploded, setIsExploded] = useState(false);
  const [lightingPreset, setLightingPreset] = useState("studio"); // 'studio' | 'neon' | 'ambient'
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, rotX: -16, rotY: 32 });

  const theme = getCategoryTheme(product?.category || product?.category_name);

  // Normalize product data
  const productName = product?.name || "Premium Product";
  const categoryName = product?.category || product?.category_name || "Retail Item";
  const stockQuantity = product?.stockQuantity ?? product?.stock_quantity ?? (variant?.stock_quantity || 0);
  const barcodeValue = variant?.barcode || product?.searchableBarcodes?.split(" ")[0] || "8901030999912";
  const skuValue = variant?.sku || product?.searchableSkus?.split(" ")[0] || "SKU-99214";
  const priceValue = variant?.selling_price != null ? `₹${Number(variant.selling_price).toLocaleString("en-IN")}` : null;
  const statusLabel = product?.status || (stockQuantity > 0 ? "In Stock" : "Out of Stock");

  // Auto-Spin Loop
  useEffect(() => {
    if (!isAutoSpin || isDragging) return;
    const interval = setInterval(() => {
      setRotY((prev) => (prev + 1) % 360);
    }, 40);
    return () => clearInterval(interval);
  }, [isAutoSpin, isDragging]);

  // Pointer drag controls
  const handlePointerDown = (e) => {
    if (!interactive) return;
    setIsDragging(true);
    setIsAutoSpin(false);
    dragStartRef.current = {
      x: e.clientX || (e.touches && e.touches[0]?.clientX) || 0,
      y: e.clientY || (e.touches && e.touches[0]?.clientY) || 0,
      rotX,
      rotY,
    };
  };

  const handlePointerMove = useCallback(
    (e) => {
      if (!isDragging) return;
      const clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
      const clientY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;
      const deltaX = clientX - dragStartRef.current.x;
      const deltaY = clientY - dragStartRef.current.y;

      // Sensitivity factor
      const nextRotY = (dragStartRef.current.rotY + deltaX * 0.7) % 360;
      const nextRotX = Math.max(-65, Math.min(65, dragStartRef.current.rotX - deltaY * 0.7));

      setRotY(nextRotY);
      setRotX(nextRotX);
    },
    [isDragging]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("touchmove", handlePointerMove);
      window.addEventListener("touchend", handlePointerUp);
    }
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("touchend", handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  const handleReset = () => {
    setRotX(-16);
    setRotY(32);
    setZoom(1);
    setIsExploded(false);
    setIsAutoSpin(false);
  };

  const setAnglePreset = (x, y) => {
    setIsAutoSpin(false);
    setRotX(x);
    setRotY(y);
  };

  // Dimensions of 3D box
  const boxW = compact ? 130 : 170;
  const boxH = compact ? 180 : 230;
  const boxD = compact ? 75 : 95;

  // Half-dimensions for CSS 3D transforms
  const halfW = boxW / 2;
  const halfH = boxH / 2;
  const halfD = boxD / 2;

  // Exploded offsets
  const explodeOffset = isExploded ? 48 : 0;

  // Dynamic light glare calculation
  const specularOpacity = lightingPreset === "neon" ? 0.35 : lightingPreset === "ambient" ? 0.15 : 0.25;

  return (
    <div
      className={`relative w-full overflow-hidden select-none rounded-2xl bg-gradient-to-b from-slate-900 via-slate-850 to-slate-950 text-white ${
        compact ? "h-[290px]" : "h-[420px] md:h-[460px]"
      } flex flex-col items-center justify-center p-3 shadow-2xl`}
      style={{
        perspective: "1200px",
      }}
    >
      {/* Background 3D Ambient Lighting Glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-45 blur-3xl transition-all duration-700"
        style={{
          background:
            lightingPreset === "neon"
              ? "radial-gradient(circle at 50% 40%, #06b6d4 0%, #a855f7 40%, transparent 75%)"
              : lightingPreset === "ambient"
              ? "radial-gradient(circle at 50% 30%, #3b82f6 0%, #1e1b4b 60%, transparent 80%)"
              : `radial-gradient(circle at 50% 35%, ${theme.accent} 0%, rgba(15, 23, 42, 0.8) 60%, transparent 85%)`,
        }}
      />

      {/* Grid Floor Mesh in 3D Perspective */}
      <div
        className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[160%] h-48 opacity-25"
        style={{
          transform: "rotateX(75deg) translateY(40px)",
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse at center, black 25%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 25%, transparent 75%)",
        }}
      />

      {/* Top Floating Overlay Badge & Quick Angle Presets */}
      <div className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/50 px-2.5 py-1 text-[11px] font-bold tracking-wide backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-white">3D View Engine</span>
          </span>
          <span className="hidden sm:inline-flex rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-300 backdrop-blur-md">
            Drag to rotate 360°
          </span>
        </div>

        {/* Quick Angle Presets */}
        <div className="hidden sm:flex items-center gap-1 bg-black/40 backdrop-blur-md border border-white/15 rounded-xl p-0.5">
          <button
            type="button"
            onClick={() => setAnglePreset(0, 0)}
            className="px-2 py-0.5 text-[10px] font-bold rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            Front
          </button>
          <button
            type="button"
            onClick={() => setAnglePreset(-90, 0)}
            className="px-2 py-0.5 text-[10px] font-bold rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            Top
          </button>
          <button
            type="button"
            onClick={() => setAnglePreset(0, -90)}
            className="px-2 py-0.5 text-[10px] font-bold rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            Side
          </button>
          <button
            type="button"
            onClick={() => setAnglePreset(-16, 32)}
            className="px-2 py-0.5 text-[10px] font-bold rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            Iso
          </button>
        </div>
      </div>

      {/* 3D Scene Root */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        className="relative z-10 flex items-center justify-center cursor-grab active:cursor-grabbing w-full h-full"
        style={{
          touchAction: "none",
        }}
      >
        {/* Soft Contact Shadow beneath the box */}
        <div
          className="pointer-events-none absolute rounded-full transition-all duration-300"
          style={{
            width: `${boxW * 1.3}px`,
            height: `${boxD * 1.1}px`,
            bottom: compact ? "32px" : "48px",
            background: "radial-gradient(ellipse at center, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 50%, transparent 80%)",
            transform: `rotateX(78deg) scale(${1 / zoom})`,
            filter: "blur(6px)",
          }}
        />

        {/* 3D Master Pivot Object */}
        <div
          className="transition-transform ease-out"
          style={{
            transformStyle: "preserve-3d",
            transform: `scale(${zoom}) rotateX(${rotX}deg) rotateY(${rotY}deg)`,
            transitionDuration: isDragging ? "0ms" : "150ms",
            width: `${boxW}px`,
            height: `${boxH}px`,
          }}
        >
          {/* ================= FRONT FACE - VIBRANT GRADIENT ================= */}
          <div
            className="absolute inset-0 rounded-xl overflow-hidden border-2 border-white/40 flex flex-col justify-between p-3.5 shadow-2xl transition-transform duration-500"
            style={{
              width: `${boxW}px`,
              height: `${boxH}px`,
              transform: `translateZ(${halfD + explodeOffset}px)`,
              background: `linear-gradient(145deg, ${theme.hexPrimary1 || "#3b82f6"} 0%, ${theme.hexPrimary2 || "#4f46e5"} 65%, ${theme.hexDark || "#1e1b4b"} 100%)`,
            }}
          >
            {/* Front Specular Glare */}
            <div
              className="pointer-events-none absolute inset-0 transition-opacity duration-300"
              style={{
                background: `linear-gradient(${120 + rotY * 0.4}deg, rgba(255,255,255,${specularOpacity + 0.1}) 0%, transparent 60%)`,
              }}
            />

            {/* Front Header */}
            <div className="relative z-10 flex items-start justify-between gap-1">
              <span className={`inline-block rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-sm bg-white/20 backdrop-blur-xs border border-white/30`}>
                {categoryName}
              </span>
              <div className="flex items-center gap-1 text-[10px] text-white bg-black/25 backdrop-blur-xs rounded-md px-1.5 py-0.5 border border-white/20">
                <ShieldCheck className="h-3 w-3 text-emerald-300" />
                <span className="font-bold tracking-tight text-[8px]">ORIGINAL</span>
              </div>
            </div>

            {/* Front Center Title & Hologram */}
            <div className="relative z-10 my-auto text-center space-y-1">
              <div className="mx-auto w-11 h-11 rounded-xl bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-lg">
                <Package className="h-6 w-6 text-white drop-shadow" />
              </div>
              <h3 className="font-black text-white tracking-tight line-clamp-2 px-1 text-xs md:text-sm drop-shadow-md">
                {productName}
              </h3>
              <p className="text-[10px] text-white/90 font-bold drop-shadow-xs">
                {stockQuantity > 0 ? `${stockQuantity} units available` : "Zero Stock"}
              </p>
            </div>

            {/* Front Footer: Barcode & Price Tag */}
            <div className="relative z-10 border-t border-white/30 pt-2 flex items-end justify-between bg-black/20 -mx-3.5 -mb-3.5 p-2.5 backdrop-blur-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-0.5 text-[8px] font-mono text-white/90">
                  <Barcode className="h-3 w-3 inline text-white" />
                  <span>{barcodeValue.slice(0, 10)}</span>
                </div>
                <div className="text-[8px] text-emerald-300 font-bold">{statusLabel}</div>
              </div>
              {priceValue && (
                <div className="text-right">
                  <span className="block text-[8px] text-white/80 font-medium">M.R.P</span>
                  <span className="text-xs font-black text-amber-300 drop-shadow">{priceValue}</span>
                </div>
              )}
            </div>
          </div>

          {/* ================= BACK FACE ================= */}
          <div
            className="absolute inset-0 rounded-xl overflow-hidden border border-white/25 flex flex-col justify-between p-3.5 shadow-2xl transition-transform duration-500"
            style={{
              width: `${boxW}px`,
              height: `${boxH}px`,
              transform: `rotateY(180deg) translateZ(${halfD + explodeOffset}px)`,
              background: `linear-gradient(145deg, ${theme.hexDark || "#0f172a"} 0%, #030712 100%)`,
            }}
          >
            <div className="flex items-center justify-between border-b border-white/15 pb-1.5">
              <span className="text-[9px] font-black text-white uppercase tracking-wider">Item Manifest</span>
              <span className="text-[8px] font-mono text-blue-300">ID #{String(product?.id || "992").slice(0, 6)}</span>
            </div>

            <div className="my-auto space-y-1.5 text-[9px] text-slate-200">
              <div className="flex justify-between py-0.5 border-b border-white/10">
                <span className="text-slate-400">SKU Code</span>
                <span className="font-mono text-white font-bold">{skuValue}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-white/10">
                <span className="text-slate-400">Storage Zone</span>
                <span className="text-emerald-300 font-bold">Shelf A-12</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-white/10">
                <span className="text-slate-400">Batch Ref</span>
                <span className="font-mono text-white">CX-{barcodeValue.slice(-4)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/15 text-[8px] text-slate-300">
              <span className="font-semibold">CRYVEX SHOPFLOW VERIFIED</span>
              <QrCode className="h-4 w-4 text-white" />
            </div>
          </div>

          {/* ================= RIGHT FACE ================= */}
          <div
            className="absolute inset-0 rounded-xl overflow-hidden border border-white/25 flex flex-col justify-between p-3 shadow-2xl transition-transform duration-500"
            style={{
              width: `${boxD}px`,
              height: `${boxH}px`,
              left: `${halfW - halfD}px`,
              transform: `rotateY(90deg) translateZ(${halfW + explodeOffset}px)`,
              background: `linear-gradient(160deg, ${theme.hexPrimary2 || "#4f46e5"} 0%, ${theme.hexDark || "#1e1b4b"} 100%)`,
            }}
          >
            <div className="text-[8px] font-black tracking-widest text-white/90 uppercase rotate-90 origin-top-left translate-x-3 translate-y-2">
              SPECS
            </div>

            <div className="my-auto flex flex-col items-center justify-center space-y-2">
              <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/30 flex items-center justify-center">
                <Barcode className="h-5 w-5 text-white" />
              </div>
              <span className="font-mono text-[8px] text-white break-all text-center px-1 font-bold">
                {barcodeValue}
              </span>
            </div>

            <div className="text-center text-[7px] text-white/70 font-bold">
              RECYCLE • 100%
            </div>
          </div>

          {/* ================= LEFT FACE ================= */}
          <div
            className="absolute inset-0 rounded-xl overflow-hidden border border-white/25 flex flex-col justify-between p-3 shadow-2xl transition-transform duration-500"
            style={{
              width: `${boxD}px`,
              height: `${boxH}px`,
              left: `${halfW - halfD}px`,
              transform: `rotateY(-90deg) translateZ(${halfW + explodeOffset}px)`,
              background: `linear-gradient(160deg, ${theme.hexPrimary1 || "#3b82f6"} 0%, ${theme.hexDark || "#1e1b4b"} 100%)`,
            }}
          >
            <div className="text-[8px] font-black tracking-widest text-white/90 uppercase">
              SEALED
            </div>
            <div className="my-auto text-center space-y-1">
              <div className="h-8 w-8 mx-auto rounded-full bg-white/20 border border-white/40 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <p className="text-[8px] text-white font-bold leading-tight">ORIGINAL QUALITY</p>
            </div>
            <div className="text-[7px] text-white/80 text-center font-mono font-bold">
              QC-PASS-OK
            </div>
          </div>

          {/* ================= TOP FACE ================= */}
          <div
            className="absolute inset-0 rounded-lg overflow-hidden border border-white/40 flex items-center justify-between px-3 shadow-inner transition-transform duration-500"
            style={{
              width: `${boxW}px`,
              height: `${boxD}px`,
              top: `${halfH - halfD}px`,
              transform: `rotateX(90deg) translateZ(${halfH + explodeOffset}px)`,
              background: theme.boxTop || `linear-gradient(135deg, ${theme.hexPrimary1} 0%, #0284c7 100%)`,
            }}
          >
            <span className="text-[9px] font-black tracking-wider text-white drop-shadow">PULL TO OPEN</span>
            <div className="w-5 h-5 rounded-md bg-white/25 border border-white/40 flex items-center justify-center shadow">
              <QrCode className="h-3.5 w-3.5 text-white" />
            </div>
          </div>

          {/* ================= BOTTOM FACE ================= */}
          <div
            className="absolute inset-0 rounded-lg overflow-hidden border border-black/40 flex items-center justify-center shadow-2xl transition-transform duration-500"
            style={{
              width: `${boxW}px`,
              height: `${boxD}px`,
              top: `${halfH - halfD}px`,
              transform: `rotateX(-90deg) translateZ(${halfH + explodeOffset}px)`,
              background: "#020617",
            }}
          >
            <span className="text-[8px] font-mono text-slate-400">BASE • NOT FOR RESALE SEPARATELY</span>
          </div>
        </div>
      </div>

      {/* Bottom Interactive HUD Control Bar */}
      {interactive && (
        <div className="relative z-20 mt-auto flex flex-wrap items-center justify-between gap-2 w-full pt-2 px-1 border-t border-white/10 bg-slate-950/70 backdrop-blur-md rounded-b-xl">
          {/* Spin & Explode Controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsAutoSpin(!isAutoSpin)}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                isAutoSpin
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30"
                  : "bg-white/10 text-slate-300 hover:bg-white/20"
              }`}
              title="Toggle Auto Spin"
            >
              {isAutoSpin ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              <span>{isAutoSpin ? "Pause" : "Spin 360°"}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsExploded(!isExploded)}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                isExploded
                  ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/30"
                  : "bg-white/10 text-slate-300 hover:bg-white/20"
              }`}
              title="Explode 3D Layers"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>{isExploded ? "Assemble" : "Explode"}</span>
            </button>
          </div>

          {/* Lighting Mode Selector & Camera Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setLightingPreset(lightingPreset === "studio" ? "neon" : lightingPreset === "neon" ? "ambient" : "studio")}
              className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-xs text-slate-300 hover:bg-white/20 transition cursor-pointer"
              title="Cycle Lighting Style"
            >
              <Sun className="h-3 w-3 text-amber-400" />
              <span className="capitalize text-[11px]">{lightingPreset}</span>
            </button>

            {/* Zoom Controls */}
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}
              className="rounded-lg bg-white/10 p-1 text-slate-300 hover:bg-white/20 transition cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.7, z - 0.1))}
              className="rounded-lg bg-white/10 p-1 text-slate-300 hover:bg-white/20 transition cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>

            {/* Reset Orientation */}
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg bg-white/10 p-1 text-slate-300 hover:bg-white/20 transition cursor-pointer"
              title="Reset 3D Angle"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

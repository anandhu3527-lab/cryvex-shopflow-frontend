import React from "react";

/**
 * 3D Isometric Stock Symbol
 * Renders an authentic, vector-shaded isometric 3D cube with 3 lighting planes,
 * specular edge reflection, embossed iconography, and contact floor shadow.
 *
 * Types:
 *  - "high" : Green/Teal 3D Cube (High Stock / Abundant)
 *  - "low"  : Amber/Orange 3D Warning Cube (Low Stock Alert)
 *  - "out"  : Rose/Red 3D Depleted Cube (Out of Stock)
 */
export function Stock3DSymbol({ type = "high", size = "md", className = "" }) {
  // Dimension mapping
  const sizeMap = {
    xs: { w: 14, h: 14, stroke: 0.8 },
    sm: { w: 18, h: 18, stroke: 1 },
    md: { w: 24, h: 24, stroke: 1.2 },
    lg: { w: 34, h: 34, stroke: 1.5 },
    xl: { w: 48, h: 48, stroke: 1.8 },
  };

  const dim = sizeMap[size] || sizeMap.md;

  if (type === "low") {
    return (
      <svg
        width={dim.w}
        height={dim.h}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`inline-block shrink-0 drop-shadow-sm select-none ${className}`}
        aria-hidden="true"
      >
        <defs>
          {/* Top Face Gradient: Highlighted golden amber */}
          <linearGradient id="low-top" x1="12" y1="2" x2="12" y2="13" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="100%" stopColor="#FBBF24" />
          </linearGradient>
          {/* Left Face Gradient: Vibrant warm orange */}
          <linearGradient id="low-left" x1="3" y1="7.5" x2="12" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EA580C" />
          </linearGradient>
          {/* Right Face Gradient: Deep burnt orange shadow */}
          <linearGradient id="low-right" x1="21" y1="7.5" x2="12" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#9A3412" />
          </linearGradient>
          {/* Soft contact floor shadow */}
          <radialGradient id="low-shadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7C2D12" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#7C2D12" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient Floor Shadow under 3D cube */}
        <ellipse cx="12" cy="22" rx="7.5" ry="1.8" fill="url(#low-shadow)" />

        {/* Left Face (Sheared 3D front-left plane) */}
        <polygon
          points="3,7.8 12,13 12,21.5 3,16.3"
          fill="url(#low-left)"
          stroke="#B45309"
          strokeWidth={dim.stroke}
          strokeLinejoin="round"
        />

        {/* Right Face (Sheared 3D shadow-right plane) */}
        <polygon
          points="12,13 21,7.8 21,16.3 12,21.5"
          fill="url(#low-right)"
          stroke="#78350F"
          strokeWidth={dim.stroke}
          strokeLinejoin="round"
        />

        {/* Top Face (Tilted isometric lid catching direct light) */}
        <polygon
          points="12,2.5 21,7.8 12,13 3,7.8"
          fill="url(#low-top)"
          stroke="#F59E0B"
          strokeWidth={dim.stroke}
          strokeLinejoin="round"
        />

        {/* Specular Highlight Glint on top ridge */}
        <line x1="12" y1="2.8" x2="12" y2="12.6" stroke="#FEF3C7" strokeWidth="0.9" strokeLinecap="round" opacity="0.8" />

        {/* Embossed 3D Warning Exclamation on Top Face */}
        <circle cx="12" cy="6.2" r="0.9" fill="#78350F" />
        <rect x="11.4" y="8" width="1.2" height="2.2" rx="0.5" fill="#78350F" />
      </svg>
    );
  }

  if (type === "out") {
    return (
      <svg
        width={dim.w}
        height={dim.h}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`inline-block shrink-0 drop-shadow-sm select-none ${className}`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="out-top" x1="12" y1="2" x2="12" y2="13" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FECDD3" />
            <stop offset="100%" stopColor="#FB7185" />
          </linearGradient>
          <linearGradient id="out-left" x1="3" y1="7.5" x2="12" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F43F5E" />
            <stop offset="100%" stopColor="#E11D48" />
          </linearGradient>
          <linearGradient id="out-right" x1="21" y1="7.5" x2="12" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#BE123C" />
            <stop offset="100%" stopColor="#881337" />
          </linearGradient>
          <radialGradient id="out-shadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4C0519" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#4C0519" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient Floor Shadow */}
        <ellipse cx="12" cy="22" rx="7.5" ry="1.8" fill="url(#out-shadow)" />

        {/* Left Face */}
        <polygon
          points="3,7.8 12,13 12,21.5 3,16.3"
          fill="url(#out-left)"
          stroke="#9F1239"
          strokeWidth={dim.stroke}
          strokeLinejoin="round"
        />

        {/* Right Face */}
        <polygon
          points="12,13 21,7.8 21,16.3 12,21.5"
          fill="url(#out-right)"
          stroke="#4C0519"
          strokeWidth={dim.stroke}
          strokeLinejoin="round"
        />

        {/* Top Face */}
        <polygon
          points="12,2.5 21,7.8 12,13 3,7.8"
          fill="url(#out-top)"
          stroke="#E11D48"
          strokeWidth={dim.stroke}
          strokeLinejoin="round"
        />

        {/* Embossed Depleted X mark on Top Face */}
        <line x1="9.5" y1="5.8" x2="14.5" y2="9.8" stroke="#881337" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="14.5" y1="5.8" x2="9.5" y2="9.8" stroke="#881337" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }

  // Default: "high" (Emerald/Teal 3D High Stock Cube)
  return (
    <svg
      width={dim.w}
      height={dim.h}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 drop-shadow-sm select-none ${className}`}
      aria-hidden="true"
    >
      <defs>
        {/* Top Face: Pristine bright mint reflection */}
        <linearGradient id="high-top" x1="12" y1="2" x2="12" y2="13" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A7F3D0" />
          <stop offset="100%" stopColor="#6EE7B7" />
        </linearGradient>
        {/* Left Face: Lush vivid emerald */}
        <linearGradient id="high-left" x1="3" y1="7.5" x2="12" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        {/* Right Face: Deep rich pine shadow */}
        <linearGradient id="high-right" x1="21" y1="7.5" x2="12" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#047857" />
          <stop offset="100%" stopColor="#064E3B" />
        </linearGradient>
        {/* Contact Floor Shadow */}
        <radialGradient id="high-shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#064E3B" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#064E3B" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Ambient Floor Shadow under 3D cube */}
      <ellipse cx="12" cy="22" rx="7.5" ry="1.8" fill="url(#high-shadow)" />

      {/* Left Face (Sheared 3D front-left plane) */}
      <polygon
        points="3,7.8 12,13 12,21.5 3,16.3"
        fill="url(#high-left)"
        stroke="#047857"
        strokeWidth={dim.stroke}
        strokeLinejoin="round"
      />

      {/* Right Face (Sheared 3D shadow-right plane) */}
      <polygon
        points="12,13 21,7.8 21,16.3 12,21.5"
        fill="url(#high-right)"
        stroke="#064E3B"
        strokeWidth={dim.stroke}
        strokeLinejoin="round"
      />

      {/* Top Face (Tilted isometric lid catching direct light) */}
      <polygon
        points="12,2.5 21,7.8 12,13 3,7.8"
        fill="url(#high-top)"
        stroke="#10B981"
        strokeWidth={dim.stroke}
        strokeLinejoin="round"
      />

      {/* Specular Highlight Glint on top center ridge */}
      <line x1="12" y1="2.8" x2="12" y2="12.6" stroke="#ECFDF5" strokeWidth="0.9" strokeLinecap="round" opacity="0.85" />

      {/* Embossed Upward Chevron ↑ on Top Face for High Stock Abundance */}
      <path
        d="M9.5 9L12 6.5L14.5 9"
        stroke="#064E3B"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * 3D Stock Badge for placement on the side of product cards, headers, or widgets.
 * Features extruded 3D depth shadow, tactile click/hover state, and the 3D isometric cube symbol.
 */
export function Stock3DBadge({
  quantity = 0,
  status = "",
  size = "md",
  showLabel = true,
  className = "",
}) {
  const stockQty = Number(quantity);
  const statusStr = String(status || "").toLowerCase();

  const isOutOfStock = statusStr.includes("out") || stockQty <= 0;
  const isLowStock = !isOutOfStock && (statusStr.includes("low") || (stockQty > 0 && stockQty <= 10));
  const isHighStock = !isOutOfStock && !isLowStock;

  const type = isOutOfStock ? "out" : isLowStock ? "low" : "high";

  const label = isOutOfStock
    ? "Out of Stock"
    : isLowStock
    ? "Low Stock"
    : "High Stock";

  // Size styling
  const sizeClasses = {
    sm: "px-2 py-0.5 text-[9px]",
    md: "px-2.5 py-1 text-[10px] sm:text-[11px]",
    lg: "px-3 py-1.5 text-xs",
  }[size] || "px-2.5 py-1 text-[10px] sm:text-[11px]";

  const symbolSize = size === "lg" ? "md" : size === "sm" ? "xs" : "sm";

  // 3D theme styling: tactile bottom extrusion shadow + glossy top border
  const themeStyles = isOutOfStock
    ? "bg-gradient-to-b from-rose-500 via-rose-600 to-rose-700 text-white border-t border-l border-rose-300/60 border-b-2 border-r-2 border-rose-900 shadow-[0_3px_0_#881337,0_5px_10px_rgba(190,18,60,0.35)]"
    : isLowStock
    ? "bg-gradient-to-b from-amber-500 via-orange-500 to-amber-600 text-white border-t border-l border-amber-200/80 border-b-2 border-r-2 border-amber-900 shadow-[0_3px_0_#9a3412,0_5px_10px_rgba(234,88,12,0.35)] animate-pulse"
    : "bg-gradient-to-b from-emerald-500 via-teal-500 to-emerald-600 text-white border-t border-l border-emerald-200/80 border-b-2 border-r-2 border-emerald-950 shadow-[0_3px_0_#065f46,0_5px_10px_rgba(5,150,105,0.35)]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-xl font-black uppercase tracking-wider select-none shrink-0 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-xs cursor-default ${sizeClasses} ${themeStyles} ${className}`}
      style={{
        textShadow: "0 1px 2px rgba(0,0,0,0.4)",
      }}
      title={`Inventory Status: ${label} (${stockQty} units)`}
    >
      <Stock3DSymbol type={type} size={symbolSize} />
      {showLabel && <span className="truncate drop-shadow-xs">{label}</span>}
    </span>
  );
}

export default Stock3DSymbol;

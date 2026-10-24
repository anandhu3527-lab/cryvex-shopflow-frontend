import { useState, useEffect } from "react";
import cryvexStoreImg from "../../assets/cryvex-hero-store.jpg";
import cryvexStoreImgMobile from "../../assets/cryvex-shop-bg-mobile.png";

/**
 * PettiKadaiBackground
 * Displays an authentic Cryvex ShopFlow Store (உங்கள் கடை இப்போது Digital!)
 * background across home/merchant pages with light background visibility,
 * opacity controls, and cultural showcase badge.
 */
export default function PettiKadaiBackground({ variant = "ambient" }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [bgOpacity, setBgOpacity] = useState(() => {
    try {
      const saved = localStorage.getItem("cryvex_pettikadai_bg_opacity");
      return saved !== null ? Math.min(parseFloat(saved), 0.30) : 0.12;
    } catch {
      return 0.12;
    }
  });

  const handleOpacityChange = (value) => {
    setBgOpacity(value);
    try {
      localStorage.setItem("cryvex_pettikadai_bg_opacity", value.toString());
    } catch {
      // ignore
    }
  };

  return (
    <>
      {/* ── Full-Page Ambient Cryvex ShopFlow Store Background Wallpaper ── */}
      {bgOpacity > 0 && (
        <div
          className="fixed inset-0 z-0 pointer-events-none select-none overflow-hidden transition-opacity duration-300"
          style={{ opacity: bgOpacity }}
          aria-hidden="true"
        >
          {/* Desktop background image */}
          <img
            src={cryvexStoreImg}
            alt="Cryvex ShopFlow Store Background"
            className="hidden md:block w-full h-full object-cover object-center filter saturate-[1.1] contrast-[1.05]"
            loading="eager"
          />
          {/* Mobile background image */}
          <img
            src={cryvexStoreImgMobile}
            alt="Cryvex ShopFlow Store Background Mobile"
            className="block md:hidden w-full h-full object-cover object-center filter saturate-[1.1] contrast-[1.05]"
            loading="eager"
          />
          {/* Subtle multi-layer gradient mask for maximum readability of text, numbers and tables */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#F7FAFF]/80 via-transparent to-[#F7FAFF]/85 pointer-events-none" />
          <div className="absolute inset-0 bg-white/40 backdrop-blur-[0.5px] pointer-events-none" />
        </div>
      )}

      {/* ── Soft Warm Ambient Glow (Corner Accent) ── */}
      <div
        className="fixed bottom-0 right-0 z-0 pointer-events-none select-none overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -bottom-24 -right-24 w-80 h-80 sm:w-96 sm:h-96 rounded-full bg-blue-200/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 right-20 w-60 h-60 rounded-full bg-amber-300/10 blur-2xl pointer-events-none" />
      </div>

      {/* ── Interactive Floating Store Theme Badge (Bottom Right) ── */}
      <aside
        aria-label="Cryvex ShopFlow Store Theme Mascot"
        className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-30 pointer-events-auto"
      >
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="group flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-blue-200/80 shadow-lg shadow-blue-900/10 hover:shadow-blue-600/25 hover:border-blue-400 hover:scale-[1.03] active:scale-95 transition-all cursor-pointer text-left"
          title="Cryvex ShopFlow • உங்கள் கடை இப்போது Digital!"
        >
          <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-blue-500 shadow-sm shrink-0 bg-blue-50">
            <img
              src={cryvexStoreImg}
              alt="Cryvex Shopkeeper Mascot"
              className="w-full h-full object-cover object-top"
            />
          </div>
          <div className="hidden sm:block leading-tight pr-1">
            <p className="text-[11px] font-extrabold text-slate-800 tracking-tight group-hover:text-blue-700 transition-colors">
              உங்கள் கடை Digital!
            </p>
            <p className="text-[9px] font-semibold text-blue-600 flex items-center gap-1">
              <span>Store Background</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{Math.round(bgOpacity * 100)}%</span>
            </p>
          </div>
          <span className="text-[10px] text-blue-700 sm:hidden font-bold">
            தமிழ்
          </span>
        </button>

        {/* Modal / Popover on Click to inspect photo & configure background opacity */}
        {isExpanded && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in pointer-events-auto"
            onClick={() => setIsExpanded(false)}
          >
            <div
              className="bg-white rounded-3xl shadow-2xl border border-blue-200 max-w-sm w-full p-5 text-center relative overflow-hidden transform animate-scale-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400" />
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
                aria-label="Close"
              >
                ✕
              </button>

              {/* Real Store Photo Showcase */}
              <div className="w-full h-64 mx-auto rounded-2xl overflow-hidden shadow-lg border border-blue-200 mb-3.5 bg-blue-50 relative group">
                <img
                  src={cryvexStoreImg}
                  alt="Cryvex ShopFlow Store Showcase"
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute bottom-2 left-2 right-2 px-2.5 py-1 rounded-lg bg-black/65 backdrop-blur-xs text-white text-[10px] font-medium flex items-center justify-between">
                  <span>CRYVEX ShopFlow Store</span>
                  <span className="text-blue-300">உங்கள் கடை Digital!</span>
                </div>
              </div>

              <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-bold text-xs mb-1.5">
                தமிழ்நாடு பெட்டிக்கடை • Digital POS
              </span>
              <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                வணக்கம்! உங்கள் கடை இப்போது Digital!
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Smart retail and billing system crafted for Tamil Nadu grocery & retail merchants.
              </p>

              {/* Background Opacity Adjuster */}
              <div className="mt-4 p-3 rounded-2xl bg-blue-50/70 border border-blue-200/80 text-left">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                  <span>Background Wallpaper Intensity</span>
                  <span className="text-blue-800 font-extrabold">{Math.round(bgOpacity * 100)}%</span>
                </div>

                {/* Slider */}
                <input
                  type="range"
                  min="0"
                  max="0.4"
                  step="0.02"
                  value={bgOpacity}
                  onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                  aria-label="Background intensity slider"
                />

                {/* Quick Presets */}
                <div className="grid grid-cols-4 gap-1.5 mt-2.5">
                  {[
                    { label: "Off", val: 0 },
                    { label: "Subtle", val: 0.06 },
                    { label: "Light", val: 0.10 },
                    { label: "Rich", val: 0.22 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleOpacityChange(preset.val)}
                      className={`py-1 text-[10px] font-bold rounded-lg transition-colors cursor-pointer ${
                        Math.abs(bgOpacity - preset.val) < 0.03
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-white text-slate-700 hover:bg-blue-100 border border-blue-200"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="mt-3.5 w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-md"
              >
                Close & Continue
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

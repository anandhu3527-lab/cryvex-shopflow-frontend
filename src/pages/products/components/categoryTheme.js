/**
 * Returns an expanded, vibrant thematic color palette based on category name.
 * Provides full multi-stop gradients for cards, 3D packaging faces, tags, and column backgrounds.
 */
export function getCategoryTheme(categoryName = "") {
  const cat = String(categoryName || "").toLowerCase();

  // Beverage / Drinks
  if (
    cat.includes("drink") ||
    cat.includes("bever") ||
    cat.includes("water") ||
    cat.includes("juice") ||
    cat.includes("tea") ||
    cat.includes("coffee") ||
    cat.includes("soda")
  ) {
    return {
      gradient: "from-cyan-500 via-sky-500 to-blue-600",
      cardGradient: "from-cyan-500/10 via-sky-500/5 to-blue-600/15",
      stageGradient: "from-cyan-500/20 via-sky-500/10 to-transparent",
      accent: "#06b6d4",
      bgSoft: "bg-cyan-50/80",
      border: "border-cyan-200",
      borderGlow: "rgba(6, 182, 212, 0.4)",
      badge: "bg-gradient-to-r from-cyan-500 to-blue-600 text-white",
      boxPrimary: "from-cyan-500 via-sky-500 to-blue-600",
      boxSecondary: "#0284c7",
      boxDark: "#0369a1",
      boxTop: "linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)",
      hexPrimary1: "#06b6d4",
      hexPrimary2: "#2563eb",
      hexDark: "#0c4a6e",
      name: "Ocean / Beverage",
    };
  }

  // Snacks / Food / Bakery / Confectionery
  if (
    cat.includes("snack") ||
    cat.includes("food") ||
    cat.includes("biscuit") ||
    cat.includes("bakery") ||
    cat.includes("cookie") ||
    cat.includes("chip") ||
    cat.includes("namkeen")
  ) {
    return {
      gradient: "from-amber-500 via-orange-500 to-red-500",
      cardGradient: "from-amber-500/10 via-orange-500/5 to-red-500/15",
      stageGradient: "from-amber-500/20 via-orange-500/10 to-transparent",
      accent: "#f59e0b",
      bgSoft: "bg-amber-50/80",
      border: "border-amber-200",
      borderGlow: "rgba(245, 158, 11, 0.4)",
      badge: "bg-gradient-to-r from-amber-500 to-orange-600 text-white",
      boxPrimary: "from-amber-500 via-orange-500 to-red-500",
      boxSecondary: "#ea580c",
      boxDark: "#c2410c",
      boxTop: "linear-gradient(135deg, #fbbf24 0%, #ea580c 100%)",
      hexPrimary1: "#f59e0b",
      hexPrimary2: "#ea580c",
      hexDark: "#7c2d12",
      name: "Warm / Snacks",
    };
  }

  // Fresh / Organic / Fruits / Vegetables / Dairy
  if (
    cat.includes("fresh") ||
    cat.includes("veg") ||
    cat.includes("fruit") ||
    cat.includes("organ") ||
    cat.includes("dairy") ||
    cat.includes("milk") ||
    cat.includes("green")
  ) {
    return {
      gradient: "from-emerald-500 via-teal-500 to-green-600",
      cardGradient: "from-emerald-500/10 via-teal-500/5 to-green-600/15",
      stageGradient: "from-emerald-500/20 via-teal-500/10 to-transparent",
      accent: "#10b981",
      bgSoft: "bg-emerald-50/80",
      border: "border-emerald-200",
      borderGlow: "rgba(16, 185, 129, 0.4)",
      badge: "bg-gradient-to-r from-emerald-500 to-teal-600 text-white",
      boxPrimary: "from-emerald-500 via-teal-500 to-green-600",
      boxSecondary: "#059669",
      boxDark: "#047857",
      boxTop: "linear-gradient(135deg, #34d399 0%, #059669 100%)",
      hexPrimary1: "#10b981",
      hexPrimary2: "#059669",
      hexDark: "#064e3b",
      name: "Fresh / Green",
    };
  }

  // Beauty / Cosmetics / Personal Care / Luxury
  if (
    cat.includes("beauty") ||
    cat.includes("cosmetic") ||
    cat.includes("care") ||
    cat.includes("personal") ||
    cat.includes("soap") ||
    cat.includes("perfume") ||
    cat.includes("lotion")
  ) {
    return {
      gradient: "from-fuchsia-500 via-pink-500 to-rose-600",
      cardGradient: "from-fuchsia-500/10 via-pink-500/5 to-rose-600/15",
      stageGradient: "from-fuchsia-500/20 via-pink-500/10 to-transparent",
      accent: "#d946ef",
      bgSoft: "bg-pink-50/80",
      border: "border-pink-200",
      borderGlow: "rgba(217, 70, 239, 0.4)",
      badge: "bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white",
      boxPrimary: "from-fuchsia-500 via-pink-500 to-rose-600",
      boxSecondary: "#c026d3",
      boxDark: "#a21caf",
      boxTop: "linear-gradient(135deg, #f472b6 0%, #c026d3 100%)",
      hexPrimary1: "#d946ef",
      hexPrimary2: "#db2777",
      hexDark: "#701a75",
      name: "Luxury / Beauty",
    };
  }

  // Electronics / Tech / Digital
  if (
    cat.includes("elect") ||
    cat.includes("tech") ||
    cat.includes("phone") ||
    cat.includes("device") ||
    cat.includes("gadget")
  ) {
    return {
      gradient: "from-violet-600 via-purple-600 to-indigo-700",
      cardGradient: "from-violet-600/10 via-purple-600/5 to-indigo-700/15",
      stageGradient: "from-violet-600/20 via-purple-600/10 to-transparent",
      accent: "#8b5cf6",
      bgSoft: "bg-purple-50/80",
      border: "border-purple-200",
      borderGlow: "rgba(139, 92, 246, 0.4)",
      badge: "bg-gradient-to-r from-violet-600 to-indigo-600 text-white",
      boxPrimary: "from-violet-600 via-purple-600 to-indigo-700",
      boxSecondary: "#7c3aed",
      boxDark: "#5b21b6",
      boxTop: "linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)",
      hexPrimary1: "#8b5cf6",
      hexPrimary2: "#4f46e5",
      hexDark: "#312e81",
      name: "Electronics / Tech",
    };
  }

  // Default: Electric Royal Blue & Indigo Gradient
  return {
    gradient: "from-blue-600 via-indigo-600 to-purple-600",
    cardGradient: "from-blue-600/10 via-indigo-600/5 to-purple-600/15",
    stageGradient: "from-blue-600/20 via-indigo-600/10 to-transparent",
    accent: "#3b82f6",
    bgSoft: "bg-blue-50/80",
    border: "border-blue-200",
    borderGlow: "rgba(59, 130, 246, 0.4)",
    badge: "bg-gradient-to-r from-blue-600 to-indigo-600 text-white",
    boxPrimary: "from-blue-600 via-indigo-600 to-purple-600",
    boxSecondary: "#4f46e5",
    boxDark: "#3730a3",
    boxTop: "linear-gradient(135deg, #60a5fa 0%, #4f46e5 100%)",
    hexPrimary1: "#3b82f6",
    hexPrimary2: "#4f46e5",
    hexDark: "#1e1b4b",
    name: "Tech / Standard",
  };
}


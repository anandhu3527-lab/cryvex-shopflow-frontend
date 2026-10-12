import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, useMotionValue, useSpring, AnimatePresence } from "framer-motion";
import PettiKadaiBackground from "../../components/layout/PettiKadaiBackground";

/* ─── Navigation Links ────────────────────────────────────────── */
const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "POS Demo", href: "#pos-demo" },
  { label: "Workflow", href: "#workflow" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

/* ─── Metrics ─────────────────────────────────────────────────── */
const TRUST_METRICS = [
  { value: "10,000+", label: "Active Retail Counters", change: "+24% MoM" },
  { value: "2.4 sec", label: "Average Checkout Time", change: "4x Faster" },
  { value: "₹45 Cr+", label: "Monthly Gross Volume", change: "100% Synced" },
  { value: "99.99%", label: "Cloud Uptime SLA", change: "Offline-Ready" },
];

/* ─── Features ────────────────────────────────────────────────── */
const FEATURES = [
  {
    title: "Instant Counter Billing",
    desc: "Rapid 3-second billing with barcode laser auto-detection, customizable hotkeys, thermal receipt printing, and WhatsApp invoice dispatch.",
    tag: "High Velocity",
    icon: (
      <svg className="w-6 h-6 text-[#075BFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: "Live Cloud Inventory",
    desc: "Multi-counter stock deduction in real time. Automated low-stock thresholds, batch expiry tracking, and instant barcode generation.",
    tag: "Real-Time Sync",
    icon: (
      <svg className="w-6 h-6 text-[#1687FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0v10l-8 4m0-14v14m-8-4l8 4" />
      </svg>
    ),
  },
  {
    title: "Sales & Profit Intelligence",
    desc: "Granular gross margin breakdowns, top SKU velocities, peak traffic heatmaps, and automated daily P&L summaries directly to your phone.",
    tag: "Smart Insights",
    icon: (
      <svg className="w-6 h-6 text-[#075BFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3v18h18M7 16l4-4 4 4 6-7" />
      </svg>
    ),
  },
  {
    title: "Kadan Credit Ledger",
    desc: "Built-in digital khata / Udhar book with automated WhatsApp payment reminders, credit limits per customer, and full transaction history.",
    tag: "Zero Bad Debt",
    icon: (
      <svg className="w-6 h-6 text-[#22C55E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    title: "Multi-Store Mesh",
    desc: "Manage 1 to 50 retail locations from a single unified cloud console with centralized catalog management and inter-store stock transfers.",
    tag: "Enterprise Scalable",
    icon: (
      <svg className="w-6 h-6 text-[#123B8F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    title: "Offline-First Engine",
    desc: "Never stop selling during internet drops. Local SQLite sync buffers all transactions and automatically pushes to Cryvex Cloud once online.",
    tag: "Uninterrupted",
    icon: (
      <svg className="w-6 h-6 text-[#075BFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
];

/* ─── Pricing Plans ──────────────────────────────────────────── */
const PRICING_PLANS = [
  {
    name: "Starter Counter",
    tagline: "For neighborhood shops, bakeries & kiosks",
    monthlyPrice: 599,
    annualPrice: 499,
    features: [
      "1 POS Counter License",
      "Unlimited Bills & Invoices",
      "Up to 2,500 Products",
      "WhatsApp Invoice Delivery",
      "Standard Kadan Ledger",
      "Daily Sales Summary Email",
    ],
    highlighted: false,
    cta: "Start 30-Day Free Trial",
  },
  {
    name: "Growth Retail",
    tagline: "For busy supermarkets, pharmacies & apparel",
    monthlyPrice: 1299,
    annualPrice: 999,
    features: [
      "Up to 3 Simultaneous Counters",
      "Unlimited Products & SKUs",
      "Advanced Inventory & Batch Expiry",
      "Automated WhatsApp Debt Reminders",
      "Profit Margin & Hourly Analytics",
      "Role-Based Cashier Permissions",
      "Thermal & A4 Print Engine",
      "Priority 24/7 Phone Support",
    ],
    highlighted: true,
    badge: "MOST POPULAR",
    cta: "Start 30-Day Free Trial",
  },
  {
    name: "Multi-Store Chain",
    tagline: "For retail chains & enterprise franchises",
    monthlyPrice: 2899,
    annualPrice: 2399,
    features: [
      "Unlimited Counters & Outlets",
      "Centralized Multi-Store Catalog",
      "Inter-Branch Stock Transfers",
      "Custom ERP & API Integrations",
      "Dedicated Account Manager",
      "Custom Tax & Compliance Reports",
      "99.99% Uptime Guarantee SLA",
    ],
    highlighted: false,
    cta: "Talk to Retail Specialist",
  },
];

/* ─── Frequently Asked Questions ──────────────────────────────── */
const FAQS = [
  {
    q: "Can I use ShopFlow on my existing computer, tablet, or phone?",
    a: "Yes! Cryvex ShopFlow runs seamlessly in any modern web browser across Windows PCs, Mac, Android tablets, and iOS devices. You can use standard USB/Bluetooth barcode scanners and thermal receipt printers with zero driver headaches.",
  },
  {
    q: "What happens if our shop's internet goes down?",
    a: "ShopFlow includes an offline-resilient local cache engine. Counter staff can continue creating bills, taking payments, and printing thermal receipts offline. As soon as your internet reconnects, all bills and stock changes sync automatically to Cryvex Cloud.",
  },
  {
    q: "How does the WhatsApp invoice feature work?",
    a: "When a customer provides their phone number at checkout, ShopFlow automatically generates a secure, branded digital receipt and delivers it directly to their WhatsApp. This saves thermal paper costs and builds an active customer contact book for promotions.",
  },
  {
    q: "Can I migrate my existing product catalog from Excel or another POS?",
    a: "Absolutely. Cryvex ShopFlow provides a 1-click Excel/CSV import tool. Simply upload your product list with prices and stock levels, and your entire inventory is ready in under 60 seconds.",
  },
  {
    q: "Is customer Kadan (Udhar) tracked with audit trails?",
    a: "Yes. Every credit entry, partial payment, and repayment note is timestamped with the cashier's identity. Automated WhatsApp balance reminders keep debtors informed and speed up debt recovery by over 40%.",
  },
];

/* ─── White 3D Phone Mockup Component ─────────────────────────── */
function White3DPhoneHero() {
  const containerRef = useRef(null);

  const rotX = useMotionValue(4);
  const rotY = useMotionValue(-8);
  const springRotX = useSpring(rotX, { stiffness: 100, damping: 18 });
  const springRotY = useSpring(rotY, { stiffness: 100, damping: 18 });

  const handleMouseMove = useCallback(
    (e) => {
      if (!containerRef.current || window.innerWidth < 768) return;
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const targetY = ((e.clientX - cx) / (rect.width * 0.8)) * 14;
      const targetX = -((e.clientY - cy) / (rect.height * 0.8)) * 10;

      rotY.set(Math.max(-14, Math.min(14, targetY)));
      rotX.set(Math.max(-12, Math.min(12, targetX)));
    },
    [rotX, rotY]
  );

  const handleMouseLeave = useCallback(() => {
    rotX.set(4);
    rotY.set(-8);
  }, [rotX, rotY]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full flex items-center justify-center py-6 select-none"
      style={{ perspective: "1400px" }}
    >
      {/* Subtle soft blue ambient glow behind phone */}
      <div
        className="absolute w-[440px] sm:w-[540px] h-[440px] sm:h-[540px] rounded-full blur-[90px] pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(7, 91, 255, 0.14) 0%, rgba(22, 135, 255, 0.08) 50%, transparent 75%)",
        }}
      />

      {/* 3D Phone Assembly */}
      <motion.div
        style={{
          rotateX: springRotX,
          rotateY: springRotY,
          transformStyle: "preserve-3d",
        }}
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10 flex items-center justify-center"
      >
        {/* Soft shadow under the phone */}
        <div
          className="absolute -bottom-8 w-[80%] h-8 rounded-full blur-xl pointer-events-none"
          style={{
            background: "rgba(16, 42, 86, 0.15)",
            transform: "rotateX(75deg) translateZ(-30px)",
          }}
        />

        {/* Premium White Phone Frame */}
        <div
          className="relative mx-auto bg-white p-3 rounded-[3rem] border border-slate-200 shadow-[0_25px_60px_-15px_rgba(7,91,255,0.18),0_10px_25px_-5px_rgba(0,0,0,0.06)]"
          style={{
            width: "clamp(290px, 30vw, 360px)",
            height: "clamp(580px, 56vw, 710px)",
            transformStyle: "preserve-3d",
          }}
        >
          {/* Dynamic Island Pill */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center justify-between px-3 w-24 h-6 rounded-full bg-slate-900 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] font-bold text-white tracking-wider">POS LIVE</span>
            <div className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-700" />
          </div>

          {/* OLED Screen Content (White Dashboard) */}
          <div className="w-full h-full rounded-[2.5rem] bg-[#F7FAFF] overflow-hidden flex flex-col justify-between border border-slate-100 shadow-inner font-sans">
            {/* Status Bar */}
            <div className="pt-3 px-6 flex items-center justify-between text-[#102A56] text-[11px] font-bold flex-shrink-0">
              <span>9:41</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-[#075BFF]">5G</span>
                <div className="w-4 h-2 rounded-xs border border-slate-400 p-0.5 flex items-center">
                  <div className="h-full w-full bg-[#22C55E] rounded-3xs" />
                </div>
              </div>
            </div>

            {/* App Header */}
            <div className="px-4 py-2 flex items-center justify-between border-b border-slate-100 bg-white flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#075BFF] to-[#1687FF] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  S
                </div>
                <div>
                  <h4 className="text-xs font-black text-[#102A56]">CRYVEX ShopFlow</h4>
                  <p className="text-[9px] text-[#22C55E] font-semibold flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-[#22C55E]" />
                    Counter #01 · Online
                  </p>
                </div>
              </div>
              <span className="w-7 h-7 rounded-full bg-[#EAF3FF] text-[#075BFF] font-bold text-xs flex items-center justify-center border border-blue-100">
                SK
              </span>
            </div>

            {/* Phone Screen Dashboard Body */}
            <div className="p-3.5 space-y-2.5 flex-1 overflow-y-auto no-scrollbar">
              {/* Today's Sales Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#075BFF] to-[#1687FF] text-white shadow-lg shadow-blue-500/25 relative overflow-hidden">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-blue-100">TODAY'S SALES</span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">
                    +18.4%
                  </span>
                </div>
                <p className="text-2xl font-black tracking-tight">₹34,820.50</p>
                <div className="flex items-center justify-between text-[9px] text-blue-100 mt-2 pt-2 border-t border-white/15">
                  <span>Target: ₹40,000</span>
                  <span className="font-bold text-white">87% Achieved</span>
                </div>
              </div>

              {/* Duo Metrics */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                  <span className="text-[9px] font-bold text-[#64748B] uppercase">BILLS TODAY</span>
                  <p className="text-xl font-black text-[#102A56] mt-0.5">48</p>
                  <p className="text-[8px] text-[#22C55E] font-semibold">+8 in last hr</p>
                </div>
                <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                  <span className="text-[9px] font-bold text-[#64748B] uppercase">PRODUCTS</span>
                  <p className="text-xl font-black text-[#102A56] mt-0.5">1,420</p>
                  <p className="text-[8px] text-amber-500 font-semibold">8 Low Stock</p>
                </div>
              </div>

              {/* Quick Billing Action Button */}
              <Link
                to="/register"
                className="w-full py-2.5 px-3 rounded-xl bg-white border border-[#075BFF]/30 hover:border-[#075BFF] shadow-xs flex items-center justify-between group transition-all"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#EAF3FF] text-[#075BFF] flex items-center justify-center font-bold">
                    ⚡
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black text-[#102A56]">QUICK BILLING</p>
                    <p className="text-[8px] text-[#64748B]">Scan or search barcode</p>
                  </div>
                </div>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#075BFF] text-white">
                  NEW
                </span>
              </Link>

              {/* Sales Overview Sparkline */}
              <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-[#102A56]">Sales Overview</span>
                  <span className="text-[8px] text-[#075BFF] font-semibold">Weekly</span>
                </div>
                <div className="flex items-end justify-between h-10 gap-1 pt-1">
                  {[45, 60, 40, 75, 90, 100, 85].map((val, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={`w-full rounded-xs transition-all ${
                          idx === 5 ? "bg-[#075BFF]" : "bg-[#EAF3FF]"
                        }`}
                        style={{ height: `${val * 0.32}px` }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Nav Bar */}
            <div className="px-3 py-2 border-t border-slate-100 bg-white flex items-center justify-around flex-shrink-0">
              {[
                { label: "Home", active: true },
                { label: "Products", active: false },
                { label: "Customers", active: false },
                { label: "More", active: false },
              ].map((tab) => (
                <div key={tab.label} className="flex flex-col items-center">
                  <span className={`text-[9px] font-bold ${tab.active ? "text-[#075BFF]" : "text-[#64748B]"}`}>
                    {tab.label}
                  </span>
                  {tab.active && <span className="w-1 h-1 rounded-full bg-[#075BFF] mt-0.5" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── 3D FLOATING SATELLITE CARDS (Around Phone) ── */}

        {/* Card 1: Billing Receipt (Top Left) */}
        <motion.div
          className="absolute hidden sm:flex items-center gap-3 p-3.5 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl"
          style={{
            top: "8%",
            left: "-18%",
            width: "210px",
            transform: "translateZ(65px)",
          }}
          whileHover={{ scale: 1.05, translateY: -4 }}
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#22C55E] flex items-center justify-center font-bold text-sm">
            ✓
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#64748B]">INVOICE #1094</span>
            <p className="text-sm font-black text-[#102A56]">₹1,450.00</p>
            <p className="text-[9px] text-[#22C55E] font-medium">WhatsApp sent in 2.1s</p>
          </div>
        </motion.div>

        {/* Card 2: Product Box / Inventory (Bottom Left) */}
        <motion.div
          className="absolute hidden sm:flex items-center gap-3 p-3.5 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl"
          style={{
            bottom: "20%",
            left: "-16%",
            width: "200px",
            transform: "translateZ(75px)",
          }}
          whileHover={{ scale: 1.05, translateY: -4 }}
        >
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center font-bold">
            📦
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#64748B]">LIVE INVENTORY</span>
            <p className="text-sm font-black text-[#102A56]">1,420 SKUs</p>
            <p className="text-[9px] text-[#075BFF] font-medium">100% Synced in Cloud</p>
          </div>
        </motion.div>

        {/* Card 3: Analytics Card / 3s Speed (Top Right) */}
        <motion.div
          className="absolute hidden sm:flex items-center gap-3 p-3.5 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl"
          style={{
            top: "12%",
            right: "-18%",
            width: "215px",
            transform: "translateZ(60px)",
          }}
          whileHover={{ scale: 1.05, translateY: -4 }}
        >
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center font-bold">
            ⚡
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#64748B]">COUNTER VELOCITY</span>
            <p className="text-sm font-black text-[#102A56]">3.0s Average Bill</p>
            <p className="text-[9px] text-[#64748B]">Thermal receipt ready</p>
          </div>
        </motion.div>

        {/* Card 4: Sales Chart (Bottom Right) */}
        <motion.div
          className="absolute hidden sm:block p-3.5 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl"
          style={{
            bottom: "16%",
            right: "-16%",
            width: "195px",
            transform: "translateZ(80px)",
          }}
          whileHover={{ scale: 1.05, translateY: -4 }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-[#64748B]">MONTHLY GROWTH</span>
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-50 text-[#075BFF]">
              +34.8%
            </span>
          </div>
          <p className="text-lg font-black text-[#102A56]">₹7.4 Lakhs</p>
          <div className="mt-2 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-[#075BFF] to-[#1687FF]" style={{ width: "82%" }} />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ─── Main Landing Page ───────────────────────────────────────── */
export default function LandingPage() {
  const [pricingCycle, setPricingCycle] = useState("annual");
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div className="min-h-screen bg-[#F7FAFF] text-[#102A56] font-sans overflow-x-hidden selection:bg-[#075BFF] selection:text-white">
      {/* ── Top Header Navigation ── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#E2E8F0] shadow-xs">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-18 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#075BFF] to-[#1687FF] flex items-center justify-center text-white shadow-md shadow-blue-500/25">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-[#102A56]">CRYVEX</span>
                <span className="font-bold text-base text-[#075BFF]">ShopFlow</span>
              </div>
              <p className="text-[10px] text-[#64748B] font-semibold -mt-0.5">SMART RETAIL POS</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-[#64748B]">
            {NAV_LINKS.map((link) => (
              <a key={link.label} href={link.href} className="hover:text-[#075BFF] transition-colors">
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-bold text-[#64748B] hover:text-[#102A56] px-3 py-2 transition-colors">
              Sign In
            </Link>
            <Link to="/register" className="btn-primary text-xs sm:text-sm py-2 px-4.5">
              Start Free Trial →
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO SECTION (Section 8) ── */}
      <section className="relative pt-16 sm:pt-24 pb-20 px-5 sm:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* LEFT COLUMN: HERO HEADLINE & CTAS */}
          <div className="lg:col-span-6 text-center lg:text-left space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#EAF3FF] text-[#075BFF] border border-[#075BFF]/20 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#075BFF] animate-pulse" />
              Smart Billing for Small Businesses
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#102A56] tracking-tight leading-[1.1]">
              Smart Billing.
              <br />
              <span className="text-[#075BFF]">Bigger Growth.</span>
              <br />
              For Every Shop.
            </h1>

            <p className="text-base sm:text-lg text-[#64748B] leading-relaxed max-w-xl mx-auto lg:mx-0">
              Simple, powerful business software designed for small shops. Rapid barcode scanning, automated GST, WhatsApp invoices, and credit ledger (Kadan) all in one intuitive white dashboard.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <Link to="/register" className="btn-primary py-3.5 px-7 text-sm w-full sm:w-auto shadow-lg shadow-blue-500/25">
                Start 30-Day Free Trial
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>

              <a href="#pos-demo" className="btn-secondary py-3.5 px-6 text-sm w-full sm:w-auto">
                Watch Demo
              </a>
            </div>

            {/* Guarantees */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-xs text-[#64748B] pt-2">
              <span className="flex items-center gap-1.5 font-medium">✓ No credit card required</span>
              <span className="flex items-center gap-1.5 font-medium">✓ 2-minute counter setup</span>
              <span className="flex items-center gap-1.5 font-medium">✓ Offline-ready engine</span>
            </div>

            {/* Trust Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8 border-t border-[#E2E8F0]">
              {TRUST_METRICS.map((stat) => (
                <div key={stat.label} className="text-center lg:text-left">
                  <p className="text-2xl font-black text-[#102A56]">{stat.value}</p>
                  <p className="text-[11px] font-semibold text-[#64748B]">{stat.label}</p>
                  <span className="text-[10px] font-bold text-[#075BFF]">{stat.change}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN: 3D FLOATING PHONE DASHBOARD */}
          <div className="lg:col-span-6 relative flex items-center justify-center">
            <White3DPhoneHero />
          </div>
        </div>
      </section>

      {/* ── CORE SAAS FEATURES (White Cards, 16px-24px rounded) ── */}
      <section id="features" className="py-24 px-5 sm:px-8 max-w-7xl mx-auto border-t border-[#E2E8F0]">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-[#075BFF] px-3.5 py-1 rounded-full bg-[#EAF3FF] border border-[#075BFF]/20">
            BUSINESS-FIRST SOFTWARE
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-[#102A56] mt-3">
            Everything Your Retail Counter Needs to Thrive
          </h2>
          <p className="text-[#64748B] text-base mt-3">
            Designed to replace bulky old cash registers and confusing desktop POS systems with a clean, fast, and friendly white interface.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feat) => (
            <div key={feat.title} className="white-card white-card-hover p-7 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-[#EAF3FF] flex items-center justify-center shadow-xs">
                    {feat.icon}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#F5F9FF] text-[#075BFF] border border-[#E2E8F0]">
                    {feat.tag}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#102A56] mb-2">{feat.title}</h3>
                <p className="text-[#64748B] text-sm leading-relaxed">{feat.desc}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-[#F1F5F9] flex items-center gap-1 text-xs font-bold text-[#075BFF]">
                <span>Learn more</span>
                <span>→</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── WORKFLOW / 3-STEP PIPELINE ── */}
      <section id="workflow" className="py-20 px-5 sm:px-8 bg-white border-y border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-[#075BFF]">
              UNCOMPROMISING VELOCITY
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#102A56] mt-2">
              From Barcode to WhatsApp Receipt in 3 Seconds
            </h2>
            <p className="text-[#64748B] text-base mt-2">
              Every second at the counter counts during peak evening rushes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { num: "01", title: "Scan Product Barcode", desc: "Laser scanner or camera auto-identifies SKU with price and tax instantly.", badge: "0.8s" },
              { num: "02", title: "Select Payment Split", desc: "Customer pays via Cash, UPI QR code, Card, or records to Kadan Udhar ledger.", badge: "1.2s" },
              { num: "03", title: "Thermal Print & WhatsApp", desc: "Thermal bill prints automatically while a digital branded receipt is sent to WhatsApp.", badge: "0.4s" },
            ].map((step) => (
              <div key={step.num} className="p-8 rounded-3xl bg-[#F7FAFF] border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl font-black text-[#075BFF]">{step.num}</span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#EAF3FF] text-[#075BFF]">
                      ⚡ {step.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[#102A56] mb-2">{step.title}</h3>
                  <p className="text-[#64748B] text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING SECTION ── */}
      <section id="pricing" className="py-24 px-5 sm:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs font-bold uppercase tracking-wider text-[#075BFF] px-3.5 py-1 rounded-full bg-[#EAF3FF] border border-[#075BFF]/20">
            TRANSPARENT PRICING
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-[#102A56] mt-3">
            Predictable Plans for Growing Shops
          </h2>
          <p className="text-[#64748B] text-base mt-2">
            No hidden transaction fees or commissions. Choose monthly or save 20% annually.
          </p>

          <div className="inline-flex items-center p-1.5 rounded-full bg-white border border-[#E2E8F0] shadow-xs mt-6">
            <button
              onClick={() => setPricingCycle("monthly")}
              className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                pricingCycle === "monthly" ? "bg-[#075BFF] text-white shadow-xs" : "text-[#64748B]"
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setPricingCycle("annual")}
              className={`px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                pricingCycle === "annual" ? "bg-[#075BFF] text-white shadow-xs" : "text-[#64748B]"
              }`}
            >
              Annual Billing
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-[#22C55E] text-white">SAVE 20%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {PRICING_PLANS.map((plan) => {
            const price = pricingCycle === "annual" ? plan.annualPrice : plan.monthlyPrice;
            return (
              <div
                key={plan.name}
                className={`p-8 rounded-3xl border flex flex-col justify-between h-full relative transition-all duration-300 ${
                  plan.highlighted
                    ? "bg-white border-[#075BFF] shadow-xl shadow-blue-500/10 ring-2 ring-[#075BFF]/20"
                    : "bg-white border-[#E2E8F0] shadow-xs hover:border-slate-300"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#075BFF] text-white shadow-sm">
                    {plan.badge}
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold text-[#102A56]">{plan.name}</h3>
                  <p className="text-xs text-[#64748B] mt-1 min-h-[32px]">{plan.tagline}</p>

                  <div className="my-6 pb-6 border-b border-[#F1F5F9]">
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-bold text-[#075BFF]">₹</span>
                      <span className="text-4xl font-black text-[#102A56]">{price}</span>
                      <span className="text-xs text-[#64748B] font-medium">/ month</span>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-xs text-[#102A56]">
                        <span className="text-[#22C55E] font-bold">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  to="/register"
                  className={plan.highlighted ? "btn-primary w-full text-xs" : "btn-secondary w-full text-xs"}
                >
                  {plan.cta}
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── FAQ ACCORDION ── */}
      <section id="faq" className="py-24 px-5 sm:px-8 max-w-4xl mx-auto border-t border-[#E2E8F0]">
        <div className="text-center mb-14">
          <span className="text-xs font-bold uppercase tracking-wider text-[#075BFF]">QUESTIONS & ANSWERS</span>
          <h2 className="text-3xl font-black text-[#102A56] mt-2">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={faq.q} className="rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden shadow-xs">
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span className="text-sm sm:text-base font-bold text-[#102A56]">{faq.q}</span>
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center bg-[#F7FAFF] text-[#075BFF] transition-transform ${isOpen ? "rotate-180 bg-[#EAF3FF]" : ""}`}>
                    ▼
                  </span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-[#64748B] text-xs sm:text-sm leading-relaxed border-t border-slate-50 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="py-20 px-5 sm:px-8 max-w-5xl mx-auto">
        <div className="rounded-3xl p-10 sm:p-14 bg-gradient-to-br from-[#075BFF] to-[#1687FF] text-white text-center shadow-2xl shadow-blue-500/30 relative overflow-hidden">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
            Ready to Upgrade Your Retail Billing Counter?
          </h2>
          <p className="mt-3 text-blue-100 text-sm sm:text-base max-w-xl mx-auto">
            Join thousands of modern store owners saving hours daily on counter checkout, WhatsApp invoices, and stock tracking.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="px-8 py-3.5 rounded-full bg-white text-[#075BFF] font-black text-sm shadow-lg hover:bg-blue-50 transition-all">
              Start 30-Day Free Trial
            </Link>
            <Link to="/login" className="px-8 py-3.5 rounded-full border border-white/30 text-white font-bold text-sm hover:bg-white/10 transition-all">
              Sign In to Existing Account
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-12 px-5 sm:px-8 bg-white border-t border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-[#64748B]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#075BFF] to-[#1687FF] text-white flex items-center justify-center font-bold text-xs">
              S
            </div>
            <span className="font-extrabold text-[#102A56]">CRYVEX <span className="text-[#075BFF]">ShopFlow</span></span>
            <span>· Simple, powerful business software.</span>
          </div>
          <p>© {new Date().getFullYear()} Cryvex Cloud Systems. All rights reserved.</p>
        </div>
      </footer>

      {/* 3D Tamil Nadu Petti Kadai Background Mascot */}
      <PettiKadaiBackground />
    </div>
  );
}
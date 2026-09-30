import { useState } from "react";
import { Link } from "react-router-dom";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const productSuite = [
    {
      id: "work",
      title: "CRYVEX Work System",
      badge: "Manage daily work and business operations",
      badgeColor: "text-blue-600 bg-blue-50 border-blue-200",
      icon: (
        <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      description:
        "Organize tasks, teams, customers, and workflows with automated tracking and transparent accountability.",
      benefit: "Key Benefit: Eliminate manual follow-ups and simplify business management.",
      linkText: "Explore Work System →",
      preview: {
        title: "Workflow Pipeline",
        status: "In Progress",
        metric: "Workflow automation",
        detail: "Task routing and team progress.",
      },
    },
    {
      id: "commerce",
      title: "CRYVEX Commerce System",
      badge: "Manage products, sales, billing, and multi-store operations",
      badgeColor: "text-teal-700 bg-teal-50 border-teal-200",
      icon: (
        <svg className="w-6 h-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      description:
        "Connect business activities in one simple system with unified inventory sync across retail, wholesale, and B2B channels.",
      benefit: "Key Benefit: Master stock management and multi-channel visibility.",
      linkText: "Explore Commercial System →",
      preview: {
        title: "Commercial Metrics",
        status: "Inventory workflow",
        metric: "Product inventory",
        detail: "Catalog and stock from saved variants.",
      },
    },
    {
      id: "shopflow",
      title: "CRYVEX Shopflow",
      badge: "Built for local shops and retail businesses",
      badgeColor: "text-indigo-600 bg-indigo-50 border-indigo-200",
      icon: (
        <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      description:
        "Manage products, billing, customers, credit (udhar), and daily sales directly on your counter screen or mobile.",
      benefit: "Key Benefit: Simple shop management without complex retail software.",
      linkText: "Explore Shopflow →",
      preview: {
        title: "Counter Billing",
        status: "API-backed workflow",
        metric: "Billing and inventory",
        detail: "Products, bills, customers, and Kadan accounts.",
      },
    },
  ];

  const features = [
    {
      number: "1",
      title: "Simple to Use",
      desc: "Intuitive interface requiring zero technical training. Fast onboarding for retail staff. Multi-utility immediately.",
      icon: "⚡",
    },
    {
      number: "2",
      title: "Connected Business Systems",
      desc: "Real-time synchronization between daily retail storefronts, warehouses, back office, and logistics.",
      icon: "🔗",
    },
    {
      number: "3",
      title: "Faster Daily Operations",
      desc: "3-second billing, instant picture-based barcode lookup, fast automated dispatch, and daily closing reports.",
      icon: "⚡",
    },
    {
      number: "4",
      title: "Better Business Visibility",
      desc: "Clear cashflow, profit margins, outstanding credit ledgers, and inventory health available at a glance.",
      icon: "📊",
    },
    {
      number: "5",
      title: "Easy Billing and Management",
      desc: "GST & non-GST receipts, fast thermal printing, and one-tap WhatsApp billing straight to customers.",
      icon: "🧾",
    },
    {
      number: "6",
      title: "Cloud-Based and Accessible",
      desc: "Secure cloud storage accessible on desktop, tablet, and mobile anytime, anywhere with automatic backups.",
      icon: "☁️",
    },
  ];

  return (
    <div className="min-h-screen bg-[#fafbfc] text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* 1. TOP NAVIGATION */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <span className="text-xl font-bold">⚡</span>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl tracking-tight text-slate-900">
                CRYVEX <span className="text-blue-600 font-semibold">CLOUD</span>
              </span>
              <span className="text-[10px] text-slate-500 -mt-1 tracking-wider uppercase font-medium">
                For Modern Business
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#products" className="hover:text-blue-600 transition-colors">
              Products
            </a>
            <a href="#features" className="hover:text-blue-600 transition-colors">
              Features
            </a>
            <a href="#workflow" className="hover:text-blue-600 transition-colors">
              Workflow
            </a>
            <a href="#why-cryvex" className="hover:text-blue-600 transition-colors">
              Why CRYVEX
            </a>
            <a href="#pricing" className="hover:text-blue-600 transition-colors">
              Pricing
            </a>
          </nav>

          {/* Right
           Action Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              to="/login"
              className="text-sm font-semibold text-slate-700 hover:text-blue-600 px-3 py-2 transition-colors"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="px-5 py-2.5 rounded-full bg-[#0b132b] text-white text-sm font-semibold hover:bg-slate-800 shadow-md hover:shadow-lg transition-all"
            >
              Create Account & Start
            </Link>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-6 space-y-3 animate-fade-in shadow-xl">
            <a
              href="#products"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-base font-medium text-slate-700 hover:text-blue-600"
            >
              Products
            </a>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-base font-medium text-slate-700 hover:text-blue-600"
            >
              Features
            </a>
            <a
              href="#workflow"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-base font-medium text-slate-700 hover:text-blue-600"
            >
              Workflow
            </a>
            <a
              href="#why-cryvex"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-base font-medium text-slate-700 hover:text-blue-600"
            >
              Why CRYVEX
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-base font-medium text-slate-700 hover:text-blue-600"
            >
              Pricing
            </a>
            <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl bg-[#0b132b] text-white text-sm font-semibold hover:bg-slate-800 shadow-md"
              >
                Create Account & Start
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION */}
      <section className="pt-12 sm:pt-16 md:pt-20 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 text-center max-w-7xl mx-auto">
        {/* Top Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold mb-6 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
          CRYVEX CLOUD PLATFORM
        </div>

        {/* Main Hero Headline */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-[1.15]">
          One Cloud. Three Powerful Business Systems.
        </h1>

        {/* Subtitle */}
        <p className="mt-5 sm:mt-6 text-base sm:text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Simple digital tools to manage your work, commerce, and shops — all connected through{" "}
          <span className="font-semibold text-slate-800">CRYVEX Cloud</span>.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/register"
            className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#0b132b] hover:bg-slate-800 text-white font-semibold text-sm sm:text-base shadow-xl shadow-slate-900/10 hover:shadow-slate-900/20 transition-all flex items-center justify-center gap-2"
          >
            <span>Create Account & Start</span>
            <span>→</span>
          </Link>
          <a
            href="#products"
            className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm sm:text-base border border-slate-300 shadow-xs transition-all"
          >
            Explore Products
          </a>
        </div>

        <p className="mt-3 text-xs text-slate-500 font-medium">
          Create your account and start your CRYVEX Cloud trial.
        </p>

        {/* HERO MOCKUP CARD: Cloud Core + 3 System Branches + Dashboard */}
        <div className="mt-14 sm:mt-16 max-w-5xl mx-auto bg-white rounded-3xl border border-slate-200/90 shadow-2xl shadow-blue-900/5 p-4 sm:p-8 relative overflow-hidden">
          {/* Subtle Background Grid Accent */}
          <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none"></div>

          {/* Core Backbone Node */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-2xl bg-[#0b132b] text-white text-xs sm:text-sm font-semibold shadow-lg shadow-slate-900/20 border border-slate-700">
              <span className="text-cyan-400 font-bold">⚡</span>
              <span>CRYVEX CLOUD BACKBONE</span>
              <span className="text-slate-400 font-normal">| service enabling engine</span>
            </div>

            {/* Connecting lines for medium+ screens */}
            <div className="w-full max-w-3xl h-8 relative hidden sm:block">
              <div className="absolute left-1/2 -translate-x-1/2 top-0 w-0.5 h-4 bg-slate-300"></div>
              <div className="absolute left-[16.66%] right-[16.66%] top-4 h-0.5 bg-slate-300"></div>
              <div className="absolute left-[16.66%] top-4 w-0.5 h-4 bg-slate-300"></div>
              <div className="absolute left-1/2 top-4 w-0.5 h-4 bg-slate-300"></div>
              <div className="absolute right-[16.66%] top-4 w-0.5 h-4 bg-slate-300"></div>
            </div>

            {/* 3 System Nodes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full mt-4 sm:mt-0 text-left">
              {/* Node 1 */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 text-xs">📋</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Active
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-900">CRYVEX Work System</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Operations, Teams & Workflows</p>
                <p className="text-[10px] text-blue-600 font-semibold mt-2">● Real-Time Sync Active</p>
              </div>

              {/* Node 2 */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-teal-300 hover:bg-teal-50/40 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="p-1.5 rounded-lg bg-teal-100 text-teal-700 text-xs">🛒</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    Connected
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-900">CRYVEX Commerce System</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Inventory, Orders & Multi-channel</p>
                <p className="text-[10px] text-teal-600 font-semibold mt-2">● 1,240 SKUs Live</p>
              </div>

              {/* Node 3 */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 text-xs">🏪</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                    Access Now
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-900">CRYVEX Shopflow</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Billing, Local Sales Counter & Stock</p>
                <p className="text-[10px] text-indigo-600 font-semibold mt-2">● On-premise POS</p>
              </div>
            </div>

            {/* Dashboard Preview Window */}
            <div className="w-full mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden text-left">
              {/* Window Header */}
              <div className="px-4 py-3 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  </div>
                  <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600 hidden sm:inline">
                    cryvex.cloud/dashboard
                  </span>
                </div>
                <span className="font-semibold text-slate-600 text-[11px]">
                  Enterprise Cloud OS v2.4
                </span>
              </div>

              {/* Dashboard Metrics Content */}
              <div className="p-4 sm:p-6 space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="p-3 sm:p-4 rounded-xl bg-slate-50/80 border border-slate-100">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <span>Sales Reporting</span>
                      <span className="text-emerald-700 bg-emerald-100/70 font-bold px-1.5 py-0.5 rounded text-[10px]">
                        API
                      </span>
                    </div>
                    <p className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">Weekly and monthly summaries</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Totals use saved bills.</p>
                  </div>

                  <div className="p-3 sm:p-4 rounded-xl bg-slate-50/80 border border-slate-100">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <span>Quick Billing Counter</span>
                      <span className="text-blue-700 bg-blue-100/70 font-bold px-1.5 py-0.5 rounded text-[10px]">
                        Billing API
                      </span>
                    </div>
                    <p className="text-base sm:text-lg font-bold text-slate-900 mt-1">Quick billing</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Bills submit to the backend.</p>
                  </div>

                  <div className="p-3 sm:p-4 rounded-xl bg-slate-50/80 border border-slate-100">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <span>Active Inventory</span>
                      <span className="text-indigo-700 bg-indigo-100/70 font-bold px-1.5 py-0.5 rounded text-[10px]">
                        API
                      </span>
                    </div>
                    <p className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">Product variants</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Current prices and stock.</p>
                  </div>

                  <div className="p-3 sm:p-4 rounded-xl bg-slate-50/80 border border-slate-100">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <span>Pending Ledgers</span>
                      <span className="text-purple-700 bg-purple-100/70 font-bold px-1.5 py-0.5 rounded text-[10px]">
                        Khata
                      </span>
                    </div>
                    <p className="text-lg sm:text-2xl font-extrabold text-slate-900 mt-1">
                      Kadan balances
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Updated through saved payments.</p>
                  </div>
                </div>

                {/* Connected feature summary */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
                    <span className="text-xs font-bold text-slate-800">
                      Connected business data
                    </span>
                    <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Products, bills, customers and credit
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Operational data appears after signing in and loading your account.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PRODUCT SUITE SECTION */}
      <section id="products" className="py-16 sm:py-24 bg-slate-50/60 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="inline-block text-xs font-bold text-blue-700 uppercase tracking-widest px-3 py-1 bg-blue-100/60 rounded-full mb-3">
              THREE PRODUCT SUITE
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Built for Every Stage of Your Business
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Choose what you need today or run everything together seamlessly.
            </p>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {productSuite.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 flex flex-col justify-between hover:shadow-xl hover:border-blue-300 transition-all duration-300 group"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    {product.icon}
                  </div>

                  <h3 className="text-xl font-bold text-slate-900">{product.title}</h3>
                  <p className={`text-xs font-semibold px-2.5 py-1 rounded-lg border mt-2 inline-block ${product.badgeColor}`}>
                    {product.badge}
                  </p>

                  <p className="text-sm text-slate-600 mt-4 leading-relaxed">
                    {product.description}
                  </p>

                  <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 font-medium leading-normal">
                    {product.benefit}
                  </div>

                  {/* Mini Preview Widget */}
                  <div className="mt-6 p-4 rounded-xl bg-slate-50/90 border border-slate-200/90 space-y-2 text-xs">
                    <div className="flex items-center justify-between font-semibold text-slate-800">
                      <span>{product.preview.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                        {product.preview.status}
                      </span>
                    </div>
                    <p className="font-bold text-slate-900">{product.preview.metric}</p>
                    <p className="text-[11px] text-slate-500">{product.preview.detail}</p>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                  <Link
                    to={product.id === "shopflow" ? "/dashboard" : "/setup"}
                    className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 group-hover:gap-2 transition-all"
                  >
                    <span>{product.linkText}</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. HOW THE THREE SYSTEMS WORK TOGETHER */}
      <section id="workflow" className="py-16 sm:py-24 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              How the Three Systems Work Together
            </h2>
            <p className="mt-3 text-base text-slate-600">
              One centralized cloud engine synchronizing all your operations, sales, and retail counters in real time.
            </p>
          </div>

          <div className="max-w-5xl mx-auto p-6 sm:p-10 rounded-3xl bg-slate-50 border border-slate-200 shadow-sm space-y-8">
            {/* Center Core Header */}
            <div className="text-center max-w-md mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-[#0b132b] text-white flex items-center justify-center font-bold text-xl mx-auto shadow-md mb-3">
                ⚡
              </div>
              <h3 className="text-base font-extrabold text-slate-900">CRYVEX Cloud Core</h3>
              <p className="text-xs text-slate-500 mt-1">
                Central data backbone, automatic cloud sync, and enterprise business analytics.
              </p>
            </div>

            {/* 3 Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 uppercase">
                  Pillar 1
                </span>
                <h4 className="text-sm font-bold text-slate-900">Work System → Manage Work</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Flow details: Create tasks, assign teams, set permissions, manage project pipelines, and handle internal operations.
                </p>
                <div className="pt-2 text-[11px] text-blue-600 font-semibold">
                  ✓ Operations, workflows & billing
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800 uppercase">
                  Pillar 2
                </span>
                <h4 className="text-sm font-bold text-slate-900">Commerce System → Manage Commerce</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Real-time inventory sync between stores, wholesale operations, ledger tracking, and B2B transactions.
                </p>
                <div className="pt-2 text-[11px] text-teal-600 font-semibold">
                  ✓ Systems, invoices & live inventory
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 uppercase">
                  Pillar 3
                </span>
                <h4 className="text-sm font-bold text-slate-900">Shopflow → Manage Shop</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Rapid local counter point-of-sale, customer khata ledger, barcode scanning, thermal printing, and WhatsApp digital bills.
                </p>
                <div className="pt-2 text-[11px] text-indigo-600 font-semibold">
                  ✓ Fast billing & counter POS
                </div>
              </div>
            </div>

            {/* Single Source of Truth Banner */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-blue-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  🛡️
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-900">Single Source of Truth</h5>
                  <p className="text-xs text-slate-500">
                    Zero sync errors: inventory, permissions, customer accounts, and order records.
                  </p>
                </div>
              </div>
              <a
                href="#products"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 whitespace-nowrap"
              >
                Learn more about architecture →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 5. EVERYTHING YOUR BUSINESS NEEDS, CONNECTED */}
      <section id="features" className="py-16 sm:py-24 bg-slate-50/60 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Everything Your Business Needs, Connected.
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Designed specifically for modern enterprise with local business simplicity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((item, idx) => (
              <div
                key={idx}
                className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 hover:border-blue-300 hover:shadow-lg transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center text-lg mb-4">
                  {item.icon}
                </div>
                <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. CALL TO ACTION SECTION (DARK NAVY) */}
      <section className="py-16 sm:py-20 bg-[#0b132b] text-white text-center px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Glow circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-4xl mx-auto relative z-10 space-y-6">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
            Create Your CRYVEX Account
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            Create your account and set up your business in one simple registration page.
          </p>

          <div className="pt-2">
            <Link
              to="/register"
              className="inline-block px-8 py-3.5 rounded-full bg-white text-slate-900 font-bold text-sm sm:text-base hover:bg-slate-100 shadow-2xl shadow-white/10 transition-all"
            >
              Create Account & Start
            </Link>
            <p className="mt-3 text-xs text-slate-400">
              No complicated setup. Super simple and you start with CRYVEX.
            </p>
          </div>

          {/* Guarantees / Bullets */}
          <div className="pt-6 border-t border-slate-800/80 flex flex-wrap justify-center items-center gap-4 sm:gap-8 text-xs text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="text-cyan-400 font-bold">✓</span> 14-Day Free Trial
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-cyan-400 font-bold">✓</span> Zero Hardware Required
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-cyan-400 font-bold">✓</span> 2-Minute Setup
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-cyan-400 font-bold">✓</span> Dedicated Support Team
            </span>
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-12 sm:py-16 px-4 sm:px-6 lg:px-8 text-xs text-slate-600">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand Info */}
          <div className="col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#0b132b] flex items-center justify-center text-white font-bold">
                ⚡
              </div>
              <span className="font-extrabold text-base tracking-tight text-slate-900">
                CRYVEX <span className="text-blue-600">CLOUD</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 max-w-sm">
              Simple digital tools for modern commercial enterprises.
            </p>
            <p className="text-[11px] text-slate-400 pt-4">
              © 2026 CRYVEX Cloud. All rights reserved.
            </p>
          </div>

          {/* Products Column */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
              Products
            </h4>
            <ul className="space-y-1.5">
              <li>
                <a href="#products" className="hover:text-blue-600 transition-colors">
                  Work System
                </a>
              </li>
              <li>
                <a href="#products" className="hover:text-blue-600 transition-colors">
                  Commerce System
                </a>
              </li>
              <li>
                <Link to="/register" className="hover:text-blue-600 transition-colors">
                  Shopflow
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-blue-600 transition-colors">
                  Multi-Store Manager
                </Link>
              </li>
              <li>
                <span className="text-slate-400">Super Admin</span>
              </li>
            </ul>
          </div>

          {/* Features Column */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
              Features
            </h4>
            <ul className="space-y-1.5">
              <li>
                <span className="hover:text-blue-600 cursor-pointer">Quick Billing</span>
              </li>
              <li>
                <span className="hover:text-blue-600 cursor-pointer">Khata & Credit</span>
              </li>
              <li>
                <span className="hover:text-blue-600 cursor-pointer">Inventory Control</span>
              </li>
              <li>
                <span className="hover:text-blue-600 cursor-pointer">GST/Non-GST</span>
              </li>
              <li>
                <span className="hover:text-blue-600 cursor-pointer">WhatsApp Invoicing</span>
              </li>
            </ul>
          </div>

          {/* Company & Support Column */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
              Support & Legal
            </h4>
            <ul className="space-y-1.5">
              <li>
                <span className="hover:text-blue-600 cursor-pointer">Help Center</span>
              </li>
              <li>
                <span className="hover:text-blue-600 cursor-pointer">Contact Us</span>
              </li>
              <li>
                <span className="hover:text-blue-600 cursor-pointer">Privacy Policy</span>
              </li>
              <li>
                <span className="hover:text-blue-600 cursor-pointer">Terms of Service</span>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}

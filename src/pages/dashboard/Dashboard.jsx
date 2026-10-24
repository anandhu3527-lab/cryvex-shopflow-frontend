<<<<<<< HEAD
import { useState, useMemo, useEffect } from "react";
=======
import { useState, useMemo, useEffect, useCallback } from "react";
>>>>>>> 0779c977551ab0c427eb4ebd82b89d18448dd602
import { useNavigate, Link } from "react-router-dom";
import { billingDataService } from "../../services/data/billingDataService";
import { billingApi } from "../../services/api/billingApi";
import { customerDataService } from "../../services/data/customerDataService";
import { kadanDataService } from "../../services/data/kadanDataService";
import { productApi } from "../../services/api/productApi";
import { authApi } from "../../services/api/authApi";
import { useAuth } from "../../context/AuthContext";
import { formatINRWithPaise } from "../../utils/formatting/currency";
import { getLocalDateISO } from "../../utils/formatting/date";

export default function Dashboard({ searchTerm = "" }) {
  const navigate = useNavigate();
  const { currentUser, tenantEmployees, refreshTenant } = useAuth();
  const role = currentUser?.role || "OWNER";

  const [bills, setBills] = useState([]);
  const [billsLoading, setBillsLoading] = useState(true);
  const [todaySummary, setTodaySummary] = useState({ status: "loading" });
  const [salesTrend, setSalesTrend] = useState({ status: "loading", days: [] });
  const [customerSummary, setCustomerSummary] = useState({ status: "loading" });
  const [kadanSummary, setKadanSummary] = useState({ status: "loading" });
  const [productCount, setProductCount] = useState({ status: "loading", count: 0, lowStock: 0 });

  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [employeeForm, setEmployeeForm] = useState({
    name: "",
    phone_number: "",
    email: "",
    password: "",
    role: "EMPLOYEE",
  });
  const [employeeFormError, setEmployeeFormError] = useState("");
  const [isCreatingEmployee, setIsCreatingEmployee] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [selectedDay, setSelectedDay] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // 1. Fetch 7-day sales trend & today summary
  useEffect(() => {
    let isMounted = true;
    const dates = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      return date;
    });

    Promise.allSettled(dates.map((date) => billingDataService.getDateSummary(getLocalDateISO(date))))
      .then((results) => {
        if (!isMounted) return;
        const days = results.map((result, index) => {
          const summary = result.status === "fulfilled" ? result.value?.date_summary ?? {} : {};
          return {
            date: dates[index],
            totalSales: Number(summary.total_revenue || summary.total_sales || 0) - Number(summary.total_kadan_amount || summary.total_kadan || 0),
            totalBills: Number(summary.total_bills) || 0,
          };
        });
        const latestDay = days[days.length - 1];
        if (results[results.length - 1].status === "fulfilled") {
          setTodaySummary({
            status: "success",
            totalSales: latestDay.totalSales,
            totalBills: latestDay.totalBills,
          });
        } else {
          setTodaySummary({ status: "error", totalSales: 0, totalBills: 0 });
        }
        if (results.some((result) => result.status === "rejected")) {
          setSalesTrend({ status: "error", days: [] });
        } else {
          setSalesTrend({ status: "success", days });
        }
      });

    return () => { isMounted = false; };
  }, []);

  // 2. Fetch customer count
  useEffect(() => {
    let isMounted = true;
    const loadCustomerCount = async () => {
      try {
        const response = await customerDataService.getCustomers({ limit: 100 });
        if (!isMounted) return;
        const list = Array.isArray(response) ? response : response?.customers || response?.data || [];
        setCustomerSummary({ status: "success", totalCustomers: list.length });
      } catch {
        if (isMounted) setCustomerSummary({ status: "error", totalCustomers: 0 });
      }
    };
    loadCustomerCount();
    return () => { isMounted = false; };
  }, []);

  // 3. Fetch Kadan balance
  // Handles the API client's possible {data: ...} response wrappers and
  // the field names used by the Kadan summary/accounts endpoints.
  useEffect(() => {
    let isMounted = true;

    const loadKadan = async () => {
      try {
        const response = await kadanDataService.getSummary();
        if (!isMounted) return;

        // Some API responses are wrapped more than once (for example,
        // { type, message, data: { total_pending: ... } }).
        let summary = response;
        for (let depth = 0; depth < 4; depth += 1) {
          if (!summary || typeof summary !== "object" || Array.isArray(summary)) break;

          const nested =
            summary.data ??
            summary.summary ??
            summary.kadan_summary ??
            summary.result;

          if (!nested || nested === summary || typeof nested !== "object") break;
          summary = nested;
        }

        const amountKeys = [
          "total_pending",
          "total_outstanding",
          "total_outstanding_amount",
          "total_outstanding_balance",
          "outstanding_amount",
          "outstanding_balance",
          "total_balance",
          "pending_amount",
          "total_kadan",
          "total_kadan_amount",
          "amount",
          "balance",
        ];

        let total = 0;
        for (const key of amountKeys) {
          const value = summary?.[key];
          if (value !== undefined && value !== null && value !== "") {
            const parsed = Number(value);
            if (Number.isFinite(parsed)) {
              total = parsed;
              break;
            }
          }
        }

        // If summary endpoint has no recognized aggregate, derive the balance
        // from the Kadan account list instead of silently displaying ₹0.
        const hasSummaryAmount = amountKeys.some(
          (key) =>
            summary?.[key] !== undefined &&
            summary?.[key] !== null &&
            summary?.[key] !== "" &&
            Number.isFinite(Number(summary[key]))
        );

        if (!hasSummaryAmount) {
          const accountsResponse = await kadanDataService.getKadanRecords({ limit: 500, offset: 0 });
          if (!isMounted) return;

          let accounts = accountsResponse;
          for (let depth = 0; depth < 4; depth += 1) {
            if (Array.isArray(accounts)) break;
            if (!accounts || typeof accounts !== "object") break;

            const nested =
              accounts.data ??
              accounts.accounts ??
              accounts.items ??
              accounts.results ??
              accounts.records;

            if (!nested || nested === accounts) break;
            accounts = nested;
          }

          if (Array.isArray(accounts)) {
            total = accounts.reduce((sum, account) => {
              const balance =
                account?.outstanding_amount ??
                account?.outstanding_balance ??
                account?.balance ??
                account?.pending_amount ??
                account?.total_pending ??
                0;
              const parsed = Number(balance);
              return sum + (Number.isFinite(parsed) ? parsed : 0);
            }, 0);
          }
        }

        setKadanSummary({
          status: "success",
          totalAmount: Math.max(0, Number(total) || 0),
        });
      } catch (error) {
        console.error("Failed to load dashboard Kadan balance:", error);
        if (isMounted) setKadanSummary({ status: "error", totalAmount: 0 });
      }
    };

    loadKadan();
    return () => { isMounted = false; };
  }, []);

  // 4. Fetch Products Count & Low stock
  useEffect(() => {
    let isMounted = true;
    const loadProducts = async () => {
      try {
        const res = await productApi.getProducts({ limit: 100 });
        if (!isMounted) return;
        const items = Array.isArray(res) ? res : res?.data || [];
        const low = items.filter((p) => (p.stock_quantity ?? 10) <= (p.low_stock_threshold ?? 5)).length;
        setProductCount({ status: "success", count: items.length, lowStock: low });
      } catch {
        if (isMounted) setProductCount({ status: "error", count: 0, lowStock: 0 });
      }
    };
    loadProducts();
    return () => { isMounted = false; };
  }, []);

  // 5. Fetch Recent Bills
  useEffect(() => {
    let isMounted = true;
    const loadBills = async () => {
      setBillsLoading(true);
      try {
        const res = await billingApi.getBills(10, 0);
        if (!isMounted) return;
        const list = Array.isArray(res) ? res : res?.bills || res?.data || [];
        setBills(list);
      } catch {
        if (isMounted) setBills([]);
      } finally {
        if (isMounted) setBillsLoading(false);
      }
    };
    loadBills();
    return () => { isMounted = false; };
  }, []);

  // Handle Add Employee submit
  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    setEmployeeFormError("");
    setIsCreatingEmployee(true);

    try {
      await authApi.createEmployee({
        name: employeeForm.name.trim(),
        phone_number: employeeForm.phone_number.trim(),
        email: employeeForm.email.trim() || undefined,
        password: employeeForm.password,
        role: employeeForm.role,
      });

      setShowAddEmployeeModal(false);
      setEmployeeForm({ name: "", phone_number: "", email: "", password: "", role: "EMPLOYEE" });
      await refreshTenant();
      showToast("Employee created successfully!");
    } catch (err) {
      setEmployeeFormError(err?.message || "Could not create employee.");
    } finally {
      setIsCreatingEmployee(false);
    }
  };

  const filteredBills = useMemo(() => {
    if (!searchTerm.trim()) return bills;
    const term = searchTerm.toLowerCase();
    return bills.filter(
      (b) =>
        String(b.bill_number || b.id || "").toLowerCase().includes(term) ||
        String(b.customer_name || b.customer?.name || "").toLowerCase().includes(term)
    );
  }, [bills, searchTerm]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-white border border-[#E2E8F0] shadow-2xl px-4 py-3 rounded-2xl flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-[#102A56] animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── 1. WELCOME HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E2E8F0] shadow-xs">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#075BFF] bg-[#EAF3FF] px-2.5 py-1 rounded-full border border-blue-100">
            LIVE COUNTER CONSOLE
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#102A56] tracking-tight mt-1.5">
            Good day, {currentUser?.name || "Merchant"}! 👋
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
            Here's what's happening with your retail counter and sales today.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {role === "OWNER" && (
            <button
              type="button"
              onClick={() => setShowAddEmployeeModal(true)}
              className="btn-secondary text-xs sm:text-sm py-2 px-3.5"
            >
              <span>+ Add Employee</span>
            </button>
          )}

          <Link
            to="/quick-bill"
            className="btn-primary text-xs sm:text-sm py-2.5 px-5 shadow-lg shadow-blue-500/20"
          >
            <span>+ Quick Bill</span>
          </Link>
        </div>
      </div>

      {/* ── 2. MAIN KPI CARDS (Vibrant Colorful Gradients - No Blur) ── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Card 1: Today's Sales (Emerald Green) */}
        <div className="group relative overflow-hidden rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-[#059669] via-[#10B981] to-[#047857] border border-emerald-400/40 shadow-[0_12px_24px_-6px_rgba(16,185,129,0.35),inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_-2px_4px_rgba(0,0,0,0.2)] hover:-translate-y-1.5 transition-all duration-300">
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/15 pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/20 pointer-events-none rounded-3xl" />
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-100">Today's Sales</span>
              <div className="w-9 h-9 rounded-2xl bg-white/20 border border-white/30 text-white flex items-center justify-center font-black text-sm shadow-md">
                ₹
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-white mt-3 tracking-tight drop-shadow-sm">
              {todaySummary.status === "loading" ? (
                <span className="block h-8 w-28 rounded-xl bg-white/20 animate-pulse" />
              ) : (
                formatINRWithPaise(todaySummary.totalSales)
              )}
            </p>
            <div className="flex items-center gap-1.5 mt-3 text-[11px] font-semibold text-emerald-100">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 border border-white/30 text-white text-[10px] font-bold">
                Live Counter Revenue
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Bills (Vibrant Violet / Purple) */}
        <div className="group relative overflow-hidden rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-[#7C3AED] via-[#9333EA] to-[#5B21B6] border border-purple-400/40 shadow-[0_12px_24px_-6px_rgba(147,51,234,0.35),inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_-2px_4px_rgba(0,0,0,0.2)] hover:-translate-y-1.5 transition-all duration-300">
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/15 pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/20 pointer-events-none rounded-3xl" />
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-100">Total Bills</span>
              <div className="w-9 h-9 rounded-2xl bg-white/20 border border-white/30 text-white flex items-center justify-center font-bold text-sm shadow-md">
                🧾
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-white mt-3 tracking-tight drop-shadow-sm">
              {todaySummary.status === "loading" ? (
                <span className="block h-8 w-16 rounded-xl bg-white/20 animate-pulse" />
              ) : (
                todaySummary.totalBills
              )}
            </p>
            <div className="flex items-center gap-1.5 mt-3 text-[11px] font-semibold">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 border border-white/30 text-white text-[10px] font-bold">
                Active Invoices
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Products (Vibrant Amber / Orange) */}
        <div className="group relative overflow-hidden rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-[#EA580C] via-[#F97316] to-[#C2410C] border border-orange-400/40 shadow-[0_12px_24px_-6px_rgba(249,115,22,0.35),inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_-2px_4px_rgba(0,0,0,0.2)] hover:-translate-y-1.5 transition-all duration-300">
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/15 pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/20 pointer-events-none rounded-3xl" />
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-orange-100">Products</span>
              <div className="w-9 h-9 rounded-2xl bg-white/20 border border-white/30 text-white flex items-center justify-center font-bold text-sm shadow-md">
                📦
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-white mt-3 tracking-tight drop-shadow-sm">
              {productCount.status === "loading" ? (
                <span className="block h-8 w-16 rounded-xl bg-white/20 animate-pulse" />
              ) : (
                productCount.count
              )}
            </p>
            <div className="flex items-center gap-1.5 mt-3 text-[11px] font-semibold">
              {productCount.lowStock > 0 ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/25 border border-white/30 text-yellow-200 text-[10px] font-bold">
                  ⚠️ {productCount.lowStock} Low Stock Alert
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 border border-white/30 text-white text-[10px] font-bold">
                  ✓ Healthy Stock
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 4: Customers (Vibrant Rose / Pink) */}
        <div className="group relative overflow-hidden rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-[#DB2777] via-[#EC4899] to-[#9D174D] border border-pink-400/40 shadow-[0_12px_24px_-6px_rgba(236,72,153,0.35),inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_-2px_4px_rgba(0,0,0,0.2)] hover:-translate-y-1.5 transition-all duration-300">
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/15 pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/20 pointer-events-none rounded-3xl" />
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-pink-100">Customers</span>
              <div className="w-9 h-9 rounded-2xl bg-white/20 border border-white/30 text-white flex items-center justify-center font-bold text-sm shadow-md">
                👥
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-white mt-3 tracking-tight drop-shadow-sm">
              {customerSummary.status === "loading" ? (
                <span className="block h-8 w-16 rounded-xl bg-white/20 animate-pulse" />
              ) : (
                customerSummary.totalCustomers
              )}
            </p>
            <div className="flex items-center gap-1.5 mt-3 text-[11px] font-semibold text-pink-100">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 border border-white/30 text-white text-[10px] font-bold">
                Active Store Book
              </span>
            </div>
          </div>
        </div>

        {/* Card 5: Pending Kadan (Vibrant Crimson Red) */}
        <div className="group relative overflow-hidden rounded-3xl p-5 sm:p-6 col-span-2 bg-gradient-to-br from-[#991B1B] via-[#DC2626] to-[#7F1D1D] border border-red-400/40 shadow-[0_12px_24px_-6px_rgba(220,38,38,0.35),inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_-2px_4px_rgba(0,0,0,0.3)] hover:-translate-y-1.5 transition-all duration-300">
          <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-white/10 pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/15 via-transparent to-black/30 pointer-events-none rounded-3xl" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-red-100">Pending Kadan</span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                  Credit Due
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-white mt-2 tracking-tight drop-shadow-sm">
                {kadanSummary.status === "loading" ? (
                  <span className="block h-8 w-28 rounded-xl bg-white/20 animate-pulse" />
                ) : (
                  formatINRWithPaise(kadanSummary.totalAmount)
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <span className="text-xs font-semibold text-red-100">Total Outstanding Udhar</span>
                <p className="text-[11px] text-red-200/80">From customer credit ledgers</p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-white/20 border border-white/30 text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
                ⏳
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. ANALYTICS & SALES TREND ── */}
      <div className="white-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-extrabold text-[#102A56]">Sales & Revenue Trend</h2>
              <p className="text-xs text-[#64748B] mt-0.5">Last 7 days counter sales breakdown</p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#EAF3FF] text-[#075BFF]">
              Daily Volume
            </span>
          </div>

          {salesTrend.status === "loading" ? (
            <div className="h-52 flex items-center justify-center text-xs text-[#64748B]">
              Loading sales trend...
            </div>
          ) : salesTrend.status === "error" || salesTrend.days.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-xs text-[#64748B]">
              Sales data ready to record upon your first bill today.
            </div>
          ) : (
            <div className="flex flex-col gap-0">
              {/* Bar Chart */}
              <div className="h-52 flex items-end justify-between gap-3 pt-6 border-b border-slate-100 px-2">
                {salesTrend.days.map((day, idx) => {
                  const maxVal = Math.max(...salesTrend.days.map((d) => d.totalSales), 100);
                  const heightPercent = Math.max(12, Math.round((day.totalSales / maxVal) * 160));
                  const dayLabel = day.date.toLocaleDateString("en-IN", { weekday: "short" });
                  const isSelected = selectedDay && selectedDay.idx === idx;

                  const barGradients = [
                    "from-[#0544C7] via-[#075BFF] to-[#38BDF8]",
                    "from-[#4F46E5] via-[#6366F1] to-[#818CF8]",
                    "from-[#7C3AED] via-[#9333EA] to-[#C084FC]",
                    "from-[#DB2777] via-[#EC4899] to-[#F472B6]",
                    "from-[#D97706] via-[#F59E0B] to-[#FCD34D]",
                    "from-[#059669] via-[#10B981] to-[#34D399]",
                    "from-[#0284C7] via-[#0EA5E9] to-[#38BDF8]",
                  ];
                  const activeBarGrad = barGradients[idx % barGradients.length];

                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center gap-2 group relative cursor-pointer"
                      onClick={() =>
                        setSelectedDay(isSelected ? null : { idx, day })
                      }
                      role="button"
                      tabIndex={0}
                      aria-label={`View ${dayLabel} sales details`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          setSelectedDay(isSelected ? null : { idx, day });
                        }
                      }}
                    >
                      {/* Hover tooltip (shows on non-selected bars) */}
                      {!isSelected && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-[#102A56] text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-md pointer-events-none whitespace-nowrap z-10">
                          ₹{day.totalSales.toLocaleString("en-IN")} · {day.totalBills} bills
                        </div>
                      )}

                      {/* Selected indicator dot */}
                      {isSelected && (
                        <div className="absolute -top-2 w-2.5 h-2.5 rounded-full bg-[#102A56] border-2 border-white shadow-md z-10" />
                      )}

                      <div
                        className={`w-full max-w-[42px] rounded-t-xl bg-gradient-to-t ${activeBarGrad} transition-all shadow-[0_6px_16px_rgba(7,91,255,0.35),inset_0_2px_2px_rgba(255,255,255,0.4),inset_0_-2px_4px_rgba(0,0,0,0.2)] ${
                          isSelected
                            ? "scale-110 ring-2 ring-[#102A56] ring-offset-2"
                            : "group-hover:scale-105"
                        }`}
                        style={{ height: `${heightPercent}px` }}
                      />
                      <span
                        className={`text-[11px] font-bold transition-colors ${
                          isSelected ? "text-[#075BFF]" : "text-[#64748B]"
                        }`}
                      >
                        {dayLabel}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* ── Day Detail Panel (appears on click) ── */}
              {selectedDay && (
                <div className="mt-4 animate-fade-in">
                  <div className="bg-gradient-to-br from-[#EAF3FF] via-white to-[#F0F4FF] border border-[#BFDBFE] rounded-2xl p-4 relative">
                    {/* Close button */}
                    <button
                      type="button"
                      onClick={() => setSelectedDay(null)}
                      className="absolute top-3 right-3 w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                      aria-label="Close day detail"
                    >
                      ✕
                    </button>

                    {/* Date heading */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-xl bg-[#075BFF] text-white flex items-center justify-center text-sm font-black shadow-md">
                        📅
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#075BFF]">Day Breakdown</p>
                        <p className="text-sm font-extrabold text-[#102A56]">
                          {selectedDay.day.date.toLocaleDateString("en-IN", {
                            weekday: "long",
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Three stat pills */}
                    <div className="grid grid-cols-3 gap-2.5">
                      {/* Total Sales */}
                      <div className="bg-white border border-emerald-200 rounded-xl p-2.5 text-center shadow-xs">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 mb-0.5">Total Sales</p>
                        <p className="text-base font-black text-[#102A56] leading-tight">
                          {formatINRWithPaise(selectedDay.day.totalSales)}
                        </p>
                      </div>

                      {/* Total Bills */}
                      <div className="bg-white border border-blue-200 rounded-xl p-2.5 text-center shadow-xs">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600 mb-0.5">Bills</p>
                        <p className="text-base font-black text-[#102A56] leading-tight">
                          {selectedDay.day.totalBills}
                        </p>
                      </div>

                      {/* Avg Bill Value */}
                      <div className="bg-white border border-purple-200 rounded-xl p-2.5 text-center shadow-xs">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-purple-600 mb-0.5">Avg Bill</p>
                        <p className="text-base font-black text-[#102A56] leading-tight">
                          {selectedDay.day.totalBills > 0
                            ? formatINRWithPaise(selectedDay.day.totalSales / selectedDay.day.totalBills)
                            : "—"}
                        </p>
                      </div>
                    </div>

                    {/* Zero-sales note */}
                    {selectedDay.day.totalSales === 0 && (
                      <p className="text-center text-[11px] text-slate-400 mt-2.5 font-medium">
                        No sales recorded on this day.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-[#64748B] pt-4 mt-2">
            <span>Click any bar to view daily breakdown</span>
            <Link to="/report" className="font-bold text-[#075BFF] hover:underline">
              View Detailed P&amp;L →
            </Link>
          </div>
        </div>

      {/* ── 4. RECENT BILLS TABLE (Sleek Gradient Columns) ── */}
      <div className="white-card p-6 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-base font-extrabold text-[#102A56]">Recent Invoices &amp; Bills</h2>
            <p className="text-xs text-[#64748B] mt-0.5">Real-time counter transactions</p>
          </div>
          <Link to="/bill-history" className="text-xs font-bold text-[#075BFF] hover:underline">
            View All Bills ({bills.length}) →
          </Link>
        </div>

        {billsLoading ? (
          <div className="space-y-2 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl bg-[#F8FAFC]">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#075BFF] flex items-center justify-center mx-auto mb-3 font-bold text-lg">
              🧾
            </div>
            <h3 className="text-sm font-bold text-[#102A56]">No bills created yet</h3>
            <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto">
              Start your first transaction at the counter using Quick Bill to generate thermal receipts and WhatsApp invoices.
            </p>
            <Link to="/quick-bill" className="btn-primary text-xs mt-4 inline-flex">
              Create First Bill →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-700 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-slate-200 uppercase tracking-wider text-[10px] font-black">
                  <th className="py-3 px-4">Bill No</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Payment Method</th>
                  <th className="py-3 px-3">Time</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBills.slice(0, 6).map((b) => {
                  const pm = String(b.payment_method || "Cash").toUpperCase();
                  const badgeGrad = pm.includes("UPI")
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                    : pm.includes("CARD")
                    ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white"
                    : pm.includes("KADAN")
                    ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white"
                    : "bg-gradient-to-r from-emerald-600 to-teal-600 text-white";

                  return (
                    <tr key={b.id || b.bill_number} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-4 font-black text-[#102A56]">#{b.bill_number || b.id}</td>
                      <td className="py-3 px-3 text-[#102A56] font-medium">{b.customer_name || b.customer?.name || "Counter Walk-in"}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black shadow-2xs ${badgeGrad}`}>
                          {b.payment_method || "Cash"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#64748B]">
                        {b.created_at ? new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Today"}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-[#102A56]">
                        {formatINRWithPaise(b.grand_total || b.total_amount || 0)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => b.id && navigate(`/bills/${b.id}`)}
                          disabled={!b.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-600 hover:to-indigo-600 text-blue-700 hover:text-white border border-blue-200 text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <span>Receipt</span>
                          <span>→</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>


      {/* ── 5. OWNER EMPLOYEE MANAGEMENT ── */}
      {role === "OWNER" && (
<<<<<<< HEAD
        <div className="white-card p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4">
=======
        <div className="white-card p-6">
          <div className="flex items-center justify-between mb-4">
>>>>>>> 0779c977551ab0c427eb4ebd82b89d18448dd602
            <div>
              <h2 className="text-base font-extrabold text-[#102A56]">Staff & Cashier Permissions</h2>
              <p className="text-xs text-[#64748B]">Manage counter access for store employees</p>
            </div>
            <button
              onClick={() => setShowAddEmployeeModal(true)}
<<<<<<< HEAD
              className="btn-secondary text-xs py-2 px-3.5 self-start sm:self-auto shrink-0"
=======
              className="btn-secondary text-xs py-2 px-3.5"
>>>>>>> 0779c977551ab0c427eb4ebd82b89d18448dd602
            >
              + Add Staff Member
            </button>
          </div>

<<<<<<< HEAD
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
            {tenantEmployees && tenantEmployees.length > 0 ? (
              tenantEmployees.map((emp) => {
                const isInactive = emp.is_active === false || emp.status === "INACTIVE" || emp.status === "DISABLED";
                return (
                  <div key={emp.id} className="p-3.5 sm:p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between gap-3 min-w-0">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 text-[#075BFF] font-black flex items-center justify-center shadow-xs shrink-0 select-none">
                        {emp.name ? emp.name.charAt(0).toUpperCase() : "S"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-[#102A56] truncate" title={emp.name}>{emp.name}</h4>
                        <p className="text-[10px] text-[#64748B] truncate" title={emp.phone_number || emp.phone || emp.email}>
                          {emp.phone_number || emp.phone || emp.email}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 whitespace-nowrap ${
                        isInactive
                          ? "bg-slate-100 text-slate-500 border-slate-200"
                          : "bg-emerald-50 text-[#22C55E] border-emerald-100"
                      }`}
                    >
                      {isInactive ? "Inactive" : "Active"}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-[#64748B] col-span-full py-4 text-center">
=======
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
            {tenantEmployees && tenantEmployees.length > 0 ? (
              tenantEmployees.map((emp) => (
                <div key={emp.id} className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 text-[#075BFF] font-black flex items-center justify-center shadow-xs">
                      {emp.name ? emp.name.charAt(0).toUpperCase() : "S"}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#102A56]">{emp.name}</h4>
                      <p className="text-[10px] text-[#64748B]">{emp.phone_number || emp.phone || emp.email}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#22C55E] border border-emerald-100">
                    Active
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-[#64748B] col-span-3 py-4 text-center">
>>>>>>> 0779c977551ab0c427eb4ebd82b89d18448dd602
                No extra staff members added yet. Store owner currently has primary counter access.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── ADD EMPLOYEE MODAL ── */}
      {showAddEmployeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-extrabold text-base text-[#102A56]">Add Counter Cashier</h3>
              <button
                type="button"
                onClick={() => setShowAddEmployeeModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {employeeFormError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
                {employeeFormError}
              </div>
            )}

            <form onSubmit={handleCreateEmployee} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#102A56] mb-1">Full Name *</label>
                <input
                  type="text"
                  value={employeeForm.name}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                  placeholder="e.g. Suresh Patel"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#102A56] mb-1">Mobile Number (For Login) *</label>
                <input
                  type="tel"
                  value={employeeForm.phone_number}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, phone_number: e.target.value })}
                  placeholder="10-digit mobile number"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#102A56] mb-1">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={employeeForm.password}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, password: e.target.value })}
                    placeholder="Set counter password"
                    className="input-field pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-1"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddEmployeeModal(false)}
                  className="btn-secondary flex-1 text-xs py-2.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingEmployee}
                  className="btn-primary flex-1 text-xs py-2.5"
                >
                  {isCreatingEmployee ? "Creating..." : "Create Staff Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

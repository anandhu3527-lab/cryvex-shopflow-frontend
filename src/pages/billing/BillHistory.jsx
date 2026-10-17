
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { billingDataService } from "../../services/data/billingDataService";
import { customerDataService } from "../../services/data/customerDataService";
import { formatDateTime, getLocalDateISO } from "../../utils/formatting/date";
import { formatINRWithPaise } from "../../utils/formatting/currency";
import { reportsApi } from "../../services/api/reportsApi";

// ─── Payment badge styles ───────────────────────────────────────────────────────
const PAYMENT_BADGE = {
  UPI: "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-2xs font-extrabold px-2.5 py-0.5 rounded-lg",
  Cash: "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-2xs font-extrabold px-2.5 py-0.5 rounded-lg",
  Card: "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-2xs font-extrabold px-2.5 py-0.5 rounded-lg",
  Kadan: "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-2xs font-extrabold px-2.5 py-0.5 rounded-lg",
};

// ─── Date filter options ────────────────────────────────────────────────────────
const DATE_FILTERS = [
  { key: "all", label: "All Bills" },
  { key: "today", label: "Today" },
  { key: "this-week", label: "This Week" },
  { key: "this-month", label: "This Month" },
];

const ITEMS_PER_PAGE = 10;

// ─── Pagination ─────────────────────────────────────────────────────────────────
function Pagination({ currentPage, totalPages, onPageChange }) {
  const pages = [];

  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center gap-1">
      {/* Prev */}
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {pages.map((p, idx) =>
        typeof p === "string" ? (
          <span key={`ellipsis-${idx}`} className="w-7 h-7 flex items-center justify-center text-slate-400 text-xs select-none">
            ...
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            aria-label={`Page ${p}`}
            aria-current={currentPage === p ? "page" : undefined}
            className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
              currentPage === p
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {p}
          </button>
        )
      )}

      {/* Next */}
      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

// ─── Main BillHistory Page ─────────────────────────────────────────────────────
export default function BillHistory({ searchTerm: propSearchTerm = "" }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(propSearchTerm || "");
  const [bills, setBills] = useState([]);
  const [allBills, setAllBills] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeDateFilter, setActiveDateFilter] = useState("all");
  const [dateInput, setDateInput] = useState("");
  const [appliedDate, setAppliedDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDate, setSelectedDate] = useState(getLocalDateISO(new Date()));
  const [selectedDateSummary, setSelectedDateSummary] = useState({
    totalSales: 0,
    totalBills: 0,
  });
  const [resolvingBillId, setResolvingBillId] = useState(null);
  const [customerResolveError, setCustomerResolveError] = useState("");
  const [customersMap, setCustomersMap] = useState(new Map());

  const normalizeBillRecord = (bill, index = 0, currentCustomersMap = customersMap) => {
    const createdAt = bill.created_at ? new Date(bill.created_at) : null;
    const createdDate = createdAt ? getLocalDateISO(createdAt) : "";

    const resolved = customerDataService.resolveCustomer(bill, currentCustomersMap);
    const customerId = resolved.customerId || "";
    const customerName = resolved.customerName;
    const customerPhone = resolved.customerPhone;

    const totalAmount = Math.max(
      0,
      Number(bill.total_amount ?? bill.amount ?? 0) || 0
    );

    const payments = Array.isArray(bill.payments)
      ? bill.payments
      : [];

    const completedPayments = payments.filter((payment) => {
      const status = String(payment?.status || "")
        .trim()
        .toUpperCase();

      return (
        payment &&
        typeof payment === "object" &&
        (!status ||
          ["COMPLETED", "PAID", "SUCCESS"].includes(status))
      );
    });

    let cashReceived = 0;
    let upiReceived = 0;
    let otherReceived = 0;
    let paidAmount = 0;

    completedPayments.forEach((payment) => {
      const amount = Math.max(
        0,
        Number(payment.amount ?? payment.paid_amount ?? 0) || 0
      );

      const method = String(
        payment.payment_method ||
        payment.method ||
        payment.type ||
        ""
      )
        .trim()
        .toUpperCase();

      if (method === "CASH") {
        cashReceived += amount;
      } else if (method === "UPI") {
        upiReceived += amount;
      } else if (method !== "KADAN" && method !== "CREDIT") {
        otherReceived += amount;
      }
    });

    const hasPaymentRecords = completedPayments.length > 0;

    let paymentMethod = String(bill.payment_method || "")
      .trim()
      .toUpperCase();

    let kadanAmount = 0;

    if (hasPaymentRecords) {
      paidAmount = cashReceived + upiReceived + otherReceived;

      const explicitKadan =
        bill.kadan_amount ??
        bill.kadan?.kadan_amount ??
        bill.kadan?.credit_amount ??
        bill.kadan?.amount;

      kadanAmount =
        explicitKadan !== undefined && explicitKadan !== null
          ? Math.max(0, Number(explicitKadan) || 0)
          : Math.max(0, totalAmount - paidAmount);

      if (cashReceived > 0 && upiReceived > 0) {
        paymentMethod =
          kadanAmount > 0 ? "CASH + UPI + KADAN" : "CASH + UPI";
      } else if (cashReceived > 0) {
        paymentMethod =
          kadanAmount > 0 ? "CASH + KADAN" : "CASH";
      } else if (upiReceived > 0) {
        paymentMethod =
          kadanAmount > 0 ? "UPI + KADAN" : "UPI";
      } else if (kadanAmount > 0) {
        paymentMethod = "KADAN";
      } else if (otherReceived > 0) {
        paymentMethod = "OTHER";
      }
    } else {
      /*
       * Never treat the entire bill total as collected just because
       * payment records are missing.
       */
      const explicitPaid =
        bill.paid_amount ??
        bill.kadan?.paid_amount ??
        bill.received_amount;

      if (explicitPaid !== undefined && explicitPaid !== null) {
        paidAmount = Math.max(0, Number(explicitPaid) || 0);

        if (paymentMethod === "CASH") {
          cashReceived = paidAmount;
        } else if (paymentMethod === "UPI") {
          upiReceived = paidAmount;
        } else {
          // Unknown method: do not invent a cash or UPI collection.
          otherReceived = paidAmount;
        }
      } else if (
        paymentMethod === "KADAN" ||
        paymentMethod === "CREDIT"
      ) {
        paidAmount = 0;
      } else {
        paidAmount = 0;
      }

      const explicitKadan =
        bill.kadan_amount ??
        bill.kadan?.kadan_amount ??
        bill.kadan?.credit_amount ??
        bill.kadan?.amount;

      if (explicitKadan !== undefined && explicitKadan !== null) {
        kadanAmount = Math.max(0, Number(explicitKadan) || 0);
      } else if (
        paymentMethod === "KADAN" ||
        paymentMethod === "CREDIT"
      ) {
        kadanAmount = totalAmount;
      } else if (explicitPaid !== undefined && explicitPaid !== null) {
        kadanAmount = Math.max(0, totalAmount - paidAmount);
      } else {
        kadanAmount = 0;
      }

      if (!paymentMethod) {
        paymentMethod =
          kadanAmount > 0 ? "KADAN" : "—";
      }
    }

    const rawStatus = String(bill.status || "").toUpperCase();

    const status =
      rawStatus === "PAID"
        ? "Paid"
        : rawStatus === "COMPLETED"
          ? "Completed"
          : rawStatus === "PENDING"
            ? "Pending"
            : rawStatus === "CANCELLED"
              ? "Cancelled"
              : bill.status || "Completed";

    const discountAmount = Number(
      bill.discount_amount ??
      bill.discount ??
      (
        Array.isArray(bill.items)
          ? bill.items.reduce(
              (sum, item) =>
                sum +
                Number(
                  item.discount_amount || item.discount || 0
                ),
              0
            )
          : 0
      )
    ) || 0;

    return {
      id: bill.id || bill.bill_id || `b-${index}`,
      billNo: bill.bill_number || "—",
      dateTime: createdAt ? formatDateTime(createdAt) : "—",
      date: createdDate,
      customerId,
      customer: customerName,
      phone: customerPhone,
      amount: totalAmount,
      paidAmount,
      cashReceived,
      upiReceived,
      otherReceived,
      kadanAmount,
      discount: discountAmount,
      payment: paymentMethod || "—",
      status,
      rawStatus,
    };
  };

  const setBillsFromResponse = (responseBills = [], map = customersMap) => {
    const normalized = Array.isArray(responseBills)
      ? responseBills.map((b, i) => normalizeBillRecord(b, i, map))
      : [];
    setBills(normalized);
  };

  const handleBillRowClick = async (bill) => {
    navigate(`/bills/${encodeURIComponent(bill.id)}`);
  };

  const loadSelectedDateBills = async (dateValue) => {
    const selected = dateValue || getLocalDateISO(new Date());
    setIsLoading(true);
    setLoadError("");

    try {
      const response = await billingDataService.getDateSummary(selected);
      const dateSummary = response?.date_summary || {};
      setSelectedDate(response?.date || selected);
      setDateInput(response?.date || selected);
      setAppliedDate(response?.date || selected);
      setSelectedDateSummary({
        totalSales: Number(dateSummary.total_sales ?? 0),
        totalBills: Number(dateSummary.total_bills ?? 0),
      });
    } catch (err) {
      setSelectedDateSummary({ totalSales: 0, totalBills: 0 });
      setLoadError(err?.message || "Unable to load bills for the selected date.");
    } finally {
      setIsLoading(false);
    }
  };

  // Load live bill history & customer registry from backend on mount.
  useEffect(() => {
    let isMounted = true;
    const today = getLocalDateISO(new Date());
    setDateInput(today);
    setAppliedDate(today);
    setSelectedDate(today);

    Promise.allSettled([
      billingDataService.getBillHistory(50, 0),
      customerDataService.getCustomersMap(),
    ]).then(([historyResult, mapResult]) => {
      if (!isMounted) return;

      const loadedMap =
        mapResult.status === "fulfilled" && mapResult.value instanceof Map
          ? mapResult.value
          : new Map();

      setCustomersMap(loadedMap);

      if (historyResult.status === "fulfilled") {
        const response = historyResult.value;
        const rawBills = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
            ? response
            : Array.isArray(response?.bills)
              ? response.bills
              : [];
        setAllBills(rawBills);
        setBillsFromResponse(rawBills, loadedMap);
      } else {
        setAllBills([]);
        setBills([]);
        setLoadError(historyResult.reason?.message || "Unable to load bill history.");
      }
    });

    billingDataService
      .getDateSummary(today)
      .then((response) => {
        if (!isMounted) return;
        const dateSummary = response?.date_summary || {};
        setSelectedDateSummary({
          totalSales: Number(dateSummary.total_sales ?? 0),
          totalBills: Number(dateSummary.total_bills ?? 0),
        });
      })
      .catch((err) => {
        if (isMounted) {
          setSelectedDateSummary({ totalSales: 0, totalBills: 0 });
          setLoadError(err?.message || "Unable to load bills for the selected date.");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Keep bills normalized whenever the registered customers map updates
  useEffect(() => {
    if (allBills.length > 0 && customersMap.size > 0) {
      setBillsFromResponse(allBills, customersMap);
    }
  }, [customersMap, allBills]);

  // Combined filter: date filter (period or custom entered date) + search
  const filteredBills = useMemo(() => {
    const term = (searchQuery || propSearchTerm || "").toLowerCase().trim();
    const numericTerm = term.replace(/\D/g, "");

    const today = new Date();
    const todayStr = getLocalDateISO(today);
    const monthStartStr = todayStr.substring(0, 7) + "-01";
    const firstDayOfWeek = new Date(today);
    firstDayOfWeek.setDate(today.getDate() - today.getDay());
    const weekStartStr = getLocalDateISO(firstDayOfWeek);

    return bills.filter((bill) => {
      let matchesDate = true;

      if (appliedDate) {
        matchesDate = bill.date === appliedDate;
      } else if (activeDateFilter === "today") {
        matchesDate = bill.date === todayStr;
      } else if (activeDateFilter === "this-week") {
        matchesDate = bill.date >= weekStartStr;
      } else if (activeDateFilter === "this-month") {
        matchesDate = bill.date >= monthStartStr && bill.date <= todayStr;
      } else if (activeDateFilter === "all") {
        matchesDate = true;
      }

      const phoneMatch = numericTerm
        ? bill.phone.replace(/\D/g, "").includes(numericTerm)
        : false;

      const matchesSearch =
        !term ||
        bill.billNo.toLowerCase().includes(term) ||
        bill.customer.toLowerCase().includes(term) ||
        phoneMatch ||
        bill.payment.toLowerCase().includes(term) ||
        bill.status.toLowerCase().includes(term);

      return matchesDate && matchesSearch;
    });
  }, [bills, activeDateFilter, appliedDate, searchQuery, propSearchTerm]);

  const handleDateFilter = async (key) => {
    setActiveDateFilter(key);
    setCurrentPage(1);
    setAppliedDate("");

    if (key === "all") {
      setBillsFromResponse(allBills, customersMap);
      setDateInput("");
      setSelectedDate("");
      setSelectedDateSummary({ totalSales: 0, totalBills: 0 });
      return;
    }

    if (key === "today") {
      const today = getLocalDateISO(new Date());
      setDateInput(today);
      setAppliedDate(today);
      setSelectedDate(today);
      loadSelectedDateBills(today);
      return;
    }

    if (key === "this-week") {
      try {
        setIsLoading(true);
        const today = new Date();
        const firstDayOfWeek = new Date(
          today.setDate(today.getDate() - today.getDay())
        );
        const weekStartStr = getLocalDateISO(firstDayOfWeek);
        const res = await reportsApi.getWeeklyReport(weekStartStr);
        const data = res?.data || res;
        if (data) {
          setSelectedDateSummary({
            totalSales: Number(data.total_revenue || 0),
            totalBills: Number(data.total_bills || 0),
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (key === "this-month") {
      try {
        setIsLoading(true);
        const today = new Date();
        const monthStr = `${today.getFullYear()}-${String(
          today.getMonth() + 1
        ).padStart(2, "0")}`;
        const res = await reportsApi.getMonthlyReport(monthStr);
        const data = res?.data || res;
        if (data) {
          setSelectedDateSummary({
            totalSales: Number(data.total_revenue || 0),
            totalBills: Number(data.total_bills || 0),
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
      return;
    }
  };

  const handleApplyDate = () => {
    if (!dateInput) return;
    const normalizedDate = dateInput;
    setAppliedDate(normalizedDate);
    setActiveDateFilter("");
    setCurrentPage(1);
    loadSelectedDateBills(normalizedDate);
  };

  const handleClearDate = () => {
    const today = getLocalDateISO(new Date());
    setDateInput(today);
    setAppliedDate(today);
    setActiveDateFilter("all");
    setCurrentPage(1);
    loadSelectedDateBills(today);
  };

  // KPIs — keep bill value separate from money actually collected.
  const hasSearch = !!(searchQuery || propSearchTerm || "").trim();

  const useSummary =
    !hasSearch &&
    (
      ["this-week", "this-month"].includes(activeDateFilter) ||
      activeDateFilter === "today" ||
      !!appliedDate
    ) &&
    selectedDateSummary.totalBills > 0;

  const totalBills = useSummary
    ? selectedDateSummary.totalBills
    : filteredBills.length;

  // Sales represent the total value of non-cancelled bills.
  const totalSales = useSummary
    ? selectedDateSummary.totalSales
    : filteredBills
        .filter((b) => (b.rawStatus || "").toUpperCase() !== "CANCELLED")
        .reduce((sum, b) => sum + Number(b.amount || 0), 0);

  // Collections must use recorded payment amounts, never the full bill amount.
  const upiCollected = filteredBills
    .filter((b) => (b.rawStatus || "").toUpperCase() !== "CANCELLED")
    .reduce((sum, b) => sum + Number(b.upiReceived || 0), 0);

  const cashCollected = filteredBills
    .filter((b) => (b.rawStatus || "").toUpperCase() !== "CANCELLED")
    .reduce((sum, b) => sum + Number(b.cashReceived || 0), 0);

  const totalDiscount = filteredBills
    .filter((b) => (b.rawStatus || "").toUpperCase() !== "CANCELLED")
    .reduce((sum, b) => sum + Number(b.discount || 0), 0);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredBills.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * ITEMS_PER_PAGE;
  const pageBills = filteredBills.slice(pageStart, pageStart + ITEMS_PER_PAGE);

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* sr-only page heading */}
      <h1 className="sr-only">Bill History</h1>

      {/* ── LOAD ERROR BANNER ─────────────────────────────────────────────────── */}
      {loadError && (
        <div role="alert" className="flex items-center gap-3 px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{loadError}</span>
        </div>
      )}
      {customerResolveError && (
        <div role="alert" className="flex items-center gap-3 px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
          <span>{customerResolveError}</span>
        </div>
      )}

      {/* ── 1. FILTER BAR ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
        {/* Date Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Filter bills by date period">
          {DATE_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              id={`date-filter-${f.key}`}
              onClick={() => handleDateFilter(f.key)}
              aria-pressed={!appliedDate && activeDateFilter === f.key}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                !appliedDate && activeDateFilter === f.key
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Date Fill Field (Enter-based filter) */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleApplyDate();
          }}
          className="flex items-center gap-2 flex-wrap"
        >
          <label htmlFor="bill-date-filter-input" className="text-xs font-semibold text-slate-500 whitespace-nowrap">
            Filter by Date:
          </label>
          <div className="relative">
            <input
              id="bill-date-filter-input"
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleApplyDate();
                }
              }}
              className="px-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          <button
            type="submit"
            id="apply-date-filter-btn"
            title="Press Enter to apply date filter"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <span>Filter</span>
            <span className="text-[10px] opacity-75 font-mono">↵</span>
          </button>

          {appliedDate && (
            <button
              type="button"
              onClick={handleClearDate}
              title="Clear custom date filter"
              className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              Reset
            </button>
          )}
        </form>
      </div>

      {/* ── 2. KPI CARDS (Full Gradient Colors) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Total Bills Card */}
        <div className="group relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-[#0284C7] via-[#0369A1] to-[#0C4A6E] text-white border border-sky-400/30 shadow-[0_12px_24px_-4px_rgba(2,132,199,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:-translate-y-1 transition-all duration-300">
          <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none group-hover:scale-125 transition-transform" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-100/90">Total Bills</span>
            <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center font-bold text-xs shadow-xs">
              🧾
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white mt-2 tracking-tight drop-shadow-xs">
            {totalBills}
          </p>
          <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-bold text-sky-100">
            Recorded Invoices
          </span>
        </div>

        {/* Total Sales Card */}
        <div className="group relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-[#0F52FF] via-[#0047E0] to-[#0A2E8A] text-white border border-blue-400/30 shadow-[0_12px_24px_-4px_rgba(7,91,255,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:-translate-y-1 transition-all duration-300">
          <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none group-hover:scale-125 transition-transform" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-100/90">Total Sales</span>
            <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center font-black text-xs shadow-xs">
              ₹
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white mt-2 tracking-tight drop-shadow-xs">
            {formatINRWithPaise(totalSales)}
          </p>
          <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-bold text-blue-100">
            Counter Revenue
          </span>
        </div>

        {/* Total Discount Card */}
        <div className="group relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-[#D97706] via-[#B45309] to-[#78350F] text-white border border-amber-400/30 shadow-[0_12px_24px_-4px_rgba(217,119,6,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:-translate-y-1 transition-all duration-300">
          <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none group-hover:scale-125 transition-transform" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-100/90">Total Discount</span>
            <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center font-bold text-xs shadow-xs">
              🏷️
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white mt-2 tracking-tight drop-shadow-xs">
            {formatINRWithPaise(totalDiscount)}
          </p>
          <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-bold text-amber-100">
            Saved by Customers
          </span>
        </div>

        {/* UPI Collected Card */}
        <div className="group relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-[#7C3AED] via-[#6D28D9] to-[#4C1D95] text-white border border-purple-400/30 shadow-[0_12px_24px_-4px_rgba(124,58,237,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:-translate-y-1 transition-all duration-300">
          <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none group-hover:scale-125 transition-transform" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-100/90">UPI Collected</span>
            <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center font-bold text-xs shadow-xs">
              📱
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white mt-2 tracking-tight drop-shadow-xs">
            {formatINRWithPaise(upiCollected)}
          </p>
          <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-bold text-purple-100">
            Digital QR Settle
          </span>
        </div>

        {/* Cash Collected Card */}
        <div className="group relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-[#059669] via-[#047857] to-[#064E3B] text-white border border-emerald-400/30 shadow-[0_12px_24px_-4px_rgba(5,150,105,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:-translate-y-1 transition-all duration-300">
          <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none group-hover:scale-125 transition-transform" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-100/90">Cash Collected</span>
            <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center font-bold text-xs shadow-xs">
              💵
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white mt-2 tracking-tight drop-shadow-xs">
            {formatINRWithPaise(cashCollected)}
          </p>
          <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-bold text-emerald-100">
            Drawer Balance
          </span>
        </div>
      </div>

      {/* ── 3. BILL TABLE ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Table Search & Count Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-blue-50/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-lg">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              id="bill-history-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by bill #, customer name, mobile number, or payment..."
              className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm font-medium bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Clear search"
                aria-label="Clear search"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold self-end sm:self-center">
            <span className="px-3 py-1 bg-slate-100 rounded-full border border-slate-200/80 text-slate-700">
              {filteredBills.length} {filteredBills.length === 1 ? "bill" : "bills"} found
            </span>
          </div>
        </div>

        {/* Loading overlay */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <svg className="w-6 h-6 animate-spin mr-2" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="text-xs font-medium">Loading bill history…</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table
                className="w-full text-left text-xs"
                aria-label="Bill history table"
              >
                <thead>
                  <tr className="border-b border-slate-200/80 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-[11px] text-slate-200 font-black uppercase tracking-wider">
                    <th className="py-3.5 px-4">Bill No</th>
                    <th className="py-3.5 px-3">Date &amp; Time</th>
                    <th className="py-3.5 px-3">Customer</th>
                    <th className="py-3.5 px-3 text-right">Discount</th>
                    <th className="py-3.5 px-3 text-right">Amount</th>
                    <th className="py-3.5 px-3 text-center">Payment</th>
                    <th className="py-3.5 px-3 text-center">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {pageBills.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-14 text-center text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                          <svg
                            className="w-8 h-8 text-slate-300"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a2 2 0 01.707.293l5.414 5.414a2 2 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          <p className="text-sm font-medium">
                            {selectedDate ? "No bills found for this date." : "No bills found"}
                          </p>
                          <p className="text-xs">
                            {searchQuery || propSearchTerm
                              ? "Try adjusting your search."
                              : appliedDate
                                ? `No bills recorded for ${appliedDate}.`
                                : "No bills recorded for this period."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pageBills.map((bill) => (
                      <tr
                        key={bill.id}
                        onClick={() => handleBillRowClick(bill)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleBillRowClick(bill);
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        aria-label={`View customer details for ${bill.customer}, bill ${bill.billNo}`}
                        aria-busy={resolvingBillId === bill.id}
                        className="cursor-pointer hover:bg-slate-50/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 transition-colors"
                      >
                        {/* Bill No */}
                        <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                          {bill.billNo}
                        </td>

                        {/* Date & Time */}
                        <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                          {bill.dateTime}
                        </td>

                        {/* Customer + Phone */}
                        <td className="py-3 px-3">
                          <p className="font-semibold text-slate-900">
                            {resolvingBillId === bill.id ? "Checking customer…" : bill.customer}
                          </p>
                          {bill.phone && (
                            <p className="text-[11px] text-slate-400 mt-0.5">{bill.phone}</p>
                          )}
                        </td>

                        {/* Discount */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          {bill.discount > 0 ? (
                            <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                              -{formatINRWithPaise(bill.discount)}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium">₹0.00</span>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="py-3 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                          {formatINRWithPaise(bill.amount)}
                        </td>

                        {/* Payment Badge */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-black ${
                              PAYMENT_BADGE[bill.payment] || "bg-gradient-to-r from-slate-700 to-slate-800 text-white"
                            }`}
                          >
                            {bill.payment}
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                              bill.status === "Paid"
                                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-2xs"
                                : "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-2xs"
                            }`}
                          >
                            {bill.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* ── PAGINATION ─────────────────────────────────────────────────────── */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-slate-100 flex justify-end">
                <Pagination
                  currentPage={safePage}
                  totalPages={totalPages}
                  onPageChange={(p) => setCurrentPage(p)}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

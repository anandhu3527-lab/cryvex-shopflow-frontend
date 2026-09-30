import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { billingDataService } from "../../services/data/billingDataService";
import { customerDataService } from "../../services/data/customerDataService";
import { formatDateTime, getLocalDateISO } from "../../utils/formatting/date";
import { formatINRWithPaise } from "../../utils/formatting/currency";
import { reportsApi } from "../../services/api/reportsApi";


// ─── Payment badge styles ───────────────────────────────────────────────────────
const PAYMENT_BADGE = {
  UPI: "bg-blue-50 text-blue-600",
  Cash: "bg-slate-100 text-slate-600",
  Card: "bg-purple-50 text-purple-600",
  Kadan: "bg-amber-50 text-amber-700",
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
export default function BillHistory({ searchTerm = "" }) {
  const navigate = useNavigate();
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

  const normalizeBillRecord = (bill, index = 0) => {
    const createdAt = bill.created_at ? new Date(bill.created_at) : null;
    const createdDate = createdAt ? getLocalDateISO(createdAt) : "";

    const customer = bill.customer && typeof bill.customer === "object" ? bill.customer : null;
    const customerName = customer?.name || customer?.customer_name || bill.customer_name || "";
    const customerPhone = customer?.phone || bill.customer_phone || "";
    const customerId = customer?.id || customer?.customer_id || customer?.customerId || bill.customer_id || bill.customerId || "";

    const payments = Array.isArray(bill.payments) ? bill.payments : [];
    const firstPayment = payments[0] || {};
    const paymentMethod = (
      firstPayment.payment_method ||
      firstPayment.method ||
      bill.payment_method ||
      ""
    ).toString().toUpperCase();

    const rawStatus = (bill.status || "").toUpperCase();
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

    return {
      id: bill.id || bill.bill_id || `b-${index}-${Date.now()}`,
      billNo: bill.bill_number || "—",
      dateTime: createdAt ? formatDateTime(createdAt) : "—",
      date: createdDate,
      customerId,
      customer: customerName || "Walk-in Customer",
      phone: customerPhone,
      amount: Number(bill.total_amount ?? bill.amount ?? 0),
      payment: paymentMethod || "—",
      status,
      rawStatus,
    };
  };

  const setBillsFromResponse = (responseBills = []) => {
    const normalized = Array.isArray(responseBills) ? responseBills.map(normalizeBillRecord) : [];
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

  // Load live bill history from backend on mount.
  // Keep the general all-bills API separate from the selected-date API.
  useEffect(() => {
    let isMounted = true;
    const today = getLocalDateISO(new Date());
    setDateInput(today);
    setAppliedDate(today);
    setSelectedDate(today);

    billingDataService
      .getBillHistory(50, 0)
      .then((response) => {
        if (!isMounted) return;
        const rawBills = Array.isArray(response?.data) ? response.data : [];
        setAllBills(rawBills);
        setBillsFromResponse(rawBills);
      })
      .catch((err) => {
        if (isMounted) {
          setAllBills([]);
          setBills([]);
          setLoadError(err?.message || "Unable to load bill history.");
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

  // Combined filter: date filter (period or custom entered date) + header search
  const filteredBills = useMemo(() => {
    const term = (searchTerm || "").toLowerCase().trim();
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

      const phoneMatch = numericTerm ? bill.phone.replace(/\D/g, "").includes(numericTerm) : false;

      const matchesSearch =
        !term ||
        bill.billNo.toLowerCase().includes(term) ||
        bill.customer.toLowerCase().includes(term) ||
        phoneMatch ||
        bill.payment.toLowerCase().includes(term) ||
        bill.status.toLowerCase().includes(term);

      return matchesDate && matchesSearch;
    });
  }, [bills, activeDateFilter, appliedDate, searchTerm]);

  const handleDateFilter = async (key) => {
    setActiveDateFilter(key);
    setCurrentPage(1);
    setAppliedDate("");

    if (key === "all") {
      setBillsFromResponse(allBills);
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
        const firstDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
        const weekStartStr = getLocalDateISO(firstDayOfWeek);
        const res = await reportsApi.getWeeklyReport(weekStartStr);
        const data = res?.data || res;
        if (data) {
          setSelectedDateSummary({
            totalSales: Number(data.total_revenue || 0),
            totalBills: Number(data.total_bills || 0)
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
        const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        const res = await reportsApi.getMonthlyReport(monthStr);
        const data = res?.data || res;
        if (data) {
          setSelectedDateSummary({
            totalSales: Number(data.total_revenue || 0),
            totalBills: Number(data.total_bills || 0)
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

  // KPIs — derived from the selected backend date summary or filtered bills.
  const hasSearch = !!(searchTerm || "").trim();
  const useSummary = !hasSearch && (
    ["this-week", "this-month"].includes(activeDateFilter) || 
    (activeDateFilter === "today" || appliedDate)
  ) && selectedDateSummary.totalBills > 0;

  const totalBills = useSummary ? selectedDateSummary.totalBills : filteredBills.length;
  
  const totalSales = useSummary 
    ? selectedDateSummary.totalSales 
    : filteredBills.reduce((sum, b) => sum + ((b.payment || "").toUpperCase() === "KADAN" ? 0 : Number(b.amount || 0)), 0);
    
  const upiCollected = filteredBills
    .filter((b) => (b.payment || "").toUpperCase() === "UPI" && ["PAID", "COMPLETED"].includes((b.rawStatus || "").toUpperCase()))
    .reduce((sum, b) => sum + Number(b.amount || 0), 0);
    
  const cashCollected = filteredBills
    .filter((b) => (b.payment || "").toUpperCase() === "CASH" && ["PAID", "COMPLETED"].includes((b.rawStatus || "").toUpperCase()))
    .reduce((sum, b) => sum + Number(b.amount || 0), 0);

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

      {/* ── 2. KPI CARDS ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Bills</p>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1.5 tracking-tight">
            {totalBills}
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Sales</p>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1.5 tracking-tight">
            {formatINRWithPaise(totalSales)}
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">UPI Collected</p>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1.5 tracking-tight">
            {formatINRWithPaise(upiCollected)}
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Cash Collected</p>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1.5 tracking-tight">
            {formatINRWithPaise(cashCollected)}
          </p>
        </div>
      </div>

      {/* ── 3. BILL TABLE ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
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
              <tr className="border-b border-slate-100 text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                <th className="py-3 px-4">Bill No</th>
                <th className="py-3 px-3">Date &amp; Time</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3 text-right">Amount</th>
                <th className="py-3 px-3">Payment</th>
                <th className="py-3 px-3">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {pageBills.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-slate-400">
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
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <p className="text-sm font-medium">
                        {selectedDate ? "No bills found for this date." : "No bills found"}
                      </p>
                      <p className="text-xs">
                        {searchTerm
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

                    {/* Amount */}
                    <td className="py-3 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatINRWithPaise(bill.amount)}
                    </td>

                    {/* Payment Badge */}
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                          PAYMENT_BADGE[bill.payment] || "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {bill.payment}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          bill.status === "Paid"
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-rose-50 text-rose-600"
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

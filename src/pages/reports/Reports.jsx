import { useState, useMemo, useRef, useEffect } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { billingDataService } from "../../services/data/billingDataService";
import { useAuth } from "../../context/AuthContext";

// Helper: Format INR currency
const formatINR = (val) => {
  const amount = Number(val);
  return `₹${(Number.isFinite(amount) ? amount : 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const TIMEFRAME_OPTIONS = ["This Week", "Today", "This Month"];

function numericValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function localDateKey(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-CA");
}

function getWeekStart(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  const day = date.getDay();
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  return date.toLocaleDateString("en-CA");
}

function getWeekEnd(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  const daysUntilSunday = (7 - date.getDay()) % 7;
  date.setDate(date.getDate() + daysUntilSunday);
  return date.toLocaleDateString("en-CA");
}

function getMonthEnd(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setMonth(date.getMonth() + 1, 0);
  return date.toLocaleDateString("en-CA");
}

function formatReportDate(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? dateKey
    : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function getShopName(response) {
  const tenant = response?.tenant || response?.shop || response?.data?.tenant || response?.data?.shop || response?.data || response;
  return tenant?.business_name || tenant?.name || tenant?.shop_name || "CRYVEX SHOPFLOW";
}

async function getAllReportBills() {
  const pageSize = 50;
  const bills = [];
  let offset = 0;

  while (true) {
    const response = await billingDataService.getBillHistory(pageSize, offset);
    if (!Array.isArray(response?.data)) {
      throw new Error("The bills API returned an invalid data collection.");
    }
    bills.push(...response.data);
    if (response.data.length < pageSize) return bills;
    offset += pageSize;
  }
}

export default function Reports({ searchTerm = "" }) {
  const [selectedTimeframe, setSelectedTimeframe] = useState("This Week");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeHoverPoint, setActiveHoverPoint] = useState(null);
  const [toastMessage, setToastMessage] = useState("");
  const [billResult, setBillResult] = useState({ status: "loading", bills: [] });
  const [retryCount, setRetryCount] = useState(0);
  const { currentTenant } = useAuth();
  const shopName = currentTenant?.business_name || currentTenant?.name || currentTenant?.shop_name || "CRYVEX SHOPFLOW";

  const dropdownRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    getAllReportBills()
      .then((bills) => {
        if (isMounted) setBillResult({ status: "success", bills });
      })
      .catch((error) => {
        if (isMounted) setBillResult({
          status: "error",
          bills: [],
          message: error?.message || "Unable to load bills for sales analytics.",
        });
      });
    return () => { isMounted = false; };
  }, [retryCount]);

  // Close popovers on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  const handleTimeframeChange = (option) => {
    setSelectedTimeframe(option);
    setIsDropdownOpen(false);
  };

  const today = new Date().toLocaleDateString("en-CA");
  const rangeStart = selectedTimeframe === "Today"
    ? today
    : selectedTimeframe === "This Week"
      ? getWeekStart(today)
      : `${today.slice(0, 7)}-01`;
  const rangeEnd = selectedTimeframe === "Today"
    ? today
    : selectedTimeframe === "This Week"
      ? getWeekEnd(today)
      : getMonthEnd(today);

  const validBills = useMemo(() => billResult.status === "success"
    ? billResult.bills.filter((bill) =>
        bill && typeof bill === "object" &&
        typeof bill.status === "string" && bill.status.trim() !== "" &&
        bill.status.trim().toUpperCase() !== "CANCELLED")
    : [], [billResult]);

  const timeframeBills = useMemo(() => validBills.filter((bill) => {
    const date = localDateKey(bill.created_at);
    return date && date >= rangeStart && date <= today;
  }), [validBills, rangeStart, today]);

  const metrics = useMemo(() => {
    const totals = timeframeBills.reduce((result, bill) => {
      result.revenue += numericValue(bill.total_amount);
      result.tax += numericValue(bill.tax_amount);
      result.discount += numericValue(bill.discount_amount);
      if (Array.isArray(bill.items)) {
        result.units += bill.items.reduce((sum, item) => sum + numericValue(item?.quantity), 0);
      }
      return result;
    }, { revenue: 0, tax: 0, discount: 0, units: 0 });

    return {
      ...totals,
      bills: timeframeBills.length,
      averageBill: timeframeBills.length ? totals.revenue / timeframeBills.length : 0,
    };
  }, [timeframeBills]);

  const dailySales = useMemo(() => {
    const byDate = new Map();
    timeframeBills.forEach((bill) => {
      const date = localDateKey(bill.created_at);
      const row = byDate.get(date) || { date, amount: 0, bills: 0 };
      row.amount += numericValue(bill.total_amount);
      row.bills += 1;
      byDate.set(date, row);
    });
    return [...byDate.values()].sort((left, right) => left.date.localeCompare(right.date)).map((row) => {
      const parsedDate = new Date(`${row.date}T00:00:00`);
      return {
        ...row,
        day: parsedDate.toLocaleDateString("en-IN", { weekday: "short" }),
        isToday: row.date === today,
      };
    });
  }, [timeframeBills, today]);

  const activeData = { dailySales };

  // Search filter across rows
  const filteredDailySales = useMemo(() => {
    if (!searchTerm.trim()) return activeData.dailySales;
    const term = searchTerm.toLowerCase();
    return activeData.dailySales.filter(
      (item) =>
        item.day.toLowerCase().includes(term) ||
        item.date.toLowerCase().includes(term) ||
        String(item.amount).includes(term) ||
        String(item.bills).includes(term)
    );
  }, [activeData.dailySales, searchTerm]);

  // Aggregated totals for column & row table footer
  const totalPeriodSales = useMemo(() => {
    return filteredDailySales.reduce((sum, item) => sum + item.amount, 0);
  }, [filteredDailySales]);

  const totalPeriodBills = useMemo(() => {
    return filteredDailySales.reduce((sum, item) => sum + item.bills, 0);
  }, [filteredDailySales]);

  // Download the current sales report as a PDF.
  const handleDownloadReport = () => {
    try {
      const generatedAt = new Date();
      const report = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const margin = 14;
      const generatedDate = generatedAt.toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
      });
      const pdfCurrency = (value) => `INR ${numericValue(value).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

      report.setFont("helvetica", "bold");
      report.setFontSize(18);
      report.text("CRYVEX SHOPFLOW", margin, 18);
      report.setFontSize(12);
      report.text("SALES REPORT", margin, 25);
      report.setFont("helvetica", "normal");
      report.setFontSize(9);
      report.text(`Shop: ${shopName}`, margin, 33);
      report.text(`Period: ${formatReportDate(rangeStart)} - ${formatReportDate(rangeEnd)}`, margin, 39);
      report.text(`Generated: ${generatedDate}`, margin, 45);

      autoTable(report, {
        startY: 52,
        head: [["Summary", "Value"]],
        body: [
          ["Total Sales", pdfCurrency(metrics.revenue)],
          ["Total Bills", String(metrics.bills)],
          ["Total Tax", pdfCurrency(metrics.tax)],
          ["Total Discount", pdfCurrency(metrics.discount)],
          ["Average Bill", pdfCurrency(metrics.averageBill)],
          ["Total Units Sold", metrics.units.toLocaleString("en-IN")],
        ],
        theme: "grid",
        headStyles: { fillColor: [30, 41, 59] },
        styles: { font: "helvetica", fontSize: 9, cellPadding: 2.5 },
        margin: { left: margin, right: margin },
      });

      autoTable(report, {
        startY: report.lastAutoTable.finalY + 8,
        head: [["Day", "Date", "Total Bills", "Total Sales"]],
        body: filteredDailySales.map((day) => [
          day.day,
          formatReportDate(day.date),
          String(day.bills),
          pdfCurrency(day.amount),
        ]),
        theme: "grid",
        headStyles: { fillColor: [30, 41, 59] },
        styles: { font: "helvetica", fontSize: 9, cellPadding: 2.5 },
        margin: { left: margin, right: margin },
        didDrawPage: () => {
          report.setFont("helvetica", "bold");
          report.setFontSize(11);
          report.text("SALES TREND", margin, 50);
        },
      });

      const billRows = timeframeBills.map((bill) => {
        const customer = bill.customer && typeof bill.customer === "object" ? bill.customer : null;
        return [
          bill.bill_number || bill.bill_id || bill.id || "-",
          formatReportDate(localDateKey(bill.created_at)),
          customer?.name || customer?.customer_name || bill.customer_name || "Walk-in Customer",
          pdfCurrency(bill.total_amount ?? bill.amount),
        ];
      });
      autoTable(report, {
        startY: report.lastAutoTable.finalY + 12,
        head: [["Bill No", "Date", "Customer", "Amount"]],
        body: billRows,
        theme: "grid",
        headStyles: { fillColor: [30, 41, 59] },
        styles: { font: "helvetica", fontSize: 8, cellPadding: 2.5, overflow: "linebreak" },
        columnStyles: { 0: { cellWidth: 42 }, 1: { cellWidth: 30 }, 3: { cellWidth: 38 } },
        margin: { left: margin, right: margin, top: 20 },
        didDrawPage: (data) => {
          if (data.pageNumber > 1) {
            report.setFont("helvetica", "bold");
            report.setFontSize(11);
            report.text("BILL DETAILS", margin, 14);
          }
        },
      });

      const pageCount = report.internal.getNumberOfPages();
      for (let page = 1; page <= pageCount; page += 1) {
        report.setPage(page);
        report.setFont("helvetica", "normal");
        report.setFontSize(8);
        report.text(`Page ${page} of ${pageCount}`, report.internal.pageSize.getWidth() - margin, 290, { align: "right" });
      }

      report.save(`sales-report-${selectedTimeframe.toLowerCase().replace(/\s+/g, "-")}.pdf`);
      showToast("Sales report PDF downloaded successfully.");
    } catch (err) {
      console.error("Download failed:", err);
      showToast("Unable to download report. Please try again.");
    }
  };

  // Max value for chart scaling
  const maxSales = useMemo(() => {
    const list = activeData.dailySales;
    const highest = list.length ? Math.max(...list.map((d) => d.amount)) : 0;
    return highest > 0 ? highest * 1.2 : 1;
  }, [activeData.dailySales]);

  const metricsReady = billResult.status === "success" && timeframeBills.length > 0;
  const metricCards = [
    { label: "TOTAL REVENUE", value: formatINR(metrics.revenue), color: "text-slate-900" },
    { label: "TOTAL BILLS", value: String(metrics.bills), color: "text-blue-600" },
    { label: "TOTAL TAX", value: formatINR(metrics.tax), color: "text-slate-900" },
    { label: "TOTAL DISCOUNT", value: formatINR(metrics.discount), color: "text-slate-900" },
    { label: "AVERAGE BILL VALUE", value: formatINR(metrics.averageBill), color: "text-blue-600" },
    { label: "TOTAL UNITS SOLD", value: metrics.units.toLocaleString("en-IN"), color: "text-slate-900" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Feedback Notification */}
      {toastMessage && (
        <div
          className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-slate-700 animate-fade-in text-xs sm:text-sm"
          role="status"
        >
          <span className="text-emerald-400 font-bold" aria-hidden="true">✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. PAGE HEADER: Title & Subtitle + Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">CRYVEX SHOPFLOW</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Sales Report
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {shopName} | {formatReportDate(rangeStart)} to {formatReportDate(rangeEnd)} | Generated {formatReportDate(today)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Totals include bills recorded through {formatReportDate(today)}.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Download Report Button */}
          <button
            type="button"
            onClick={handleDownloadReport}
            disabled={billResult.status !== "success" || timeframeBills.length === 0}
            id="download-report-btn"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Download sales and bills report as PDF"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Download PDF</span>
          </button>

          {/* Timeframe Dropdown (Yesterday removed) */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              id="timeframe-filter-btn"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs sm:text-sm font-semibold shadow-2xs transition-colors cursor-pointer"
              aria-expanded={isDropdownOpen}
              aria-haspopup="true"
            >
              <svg
                className="w-4 h-4 text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span>{selectedTimeframe}</span>
              <svg
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Timeframe Menu Popover */}
            {isDropdownOpen && (
              <div
                className="absolute right-0 mt-1.5 w-40 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-30 animate-fade-in"
                role="menu"
              >
                {TIMEFRAME_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleTimeframeChange(opt)}
                    className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center justify-between transition-colors ${
                      selectedTimeframe === opt
                        ? "text-blue-600 bg-blue-50/70 font-bold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                    role="menuitem"
                  >
                    <span>{opt}</span>
                    {selectedTimeframe === opt && (
                      <span className="text-blue-600 font-bold">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search match badge if user is typing in top bar */}
      {searchTerm.trim() && (
        <div className="flex items-center gap-2 bg-blue-50/70 border border-blue-200/80 px-3.5 py-1.5 rounded-xl text-xs text-blue-800">
          <span>Filtering report breakdown for: <strong>"{searchTerm}"</strong></span>
          <span className="text-slate-400">({filteredDailySales.length} records found)</span>
        </div>
      )}

      {billResult.status === "loading" && (
        <p className="text-xs font-medium text-slate-500" role="status">Loading sales analytics from bills...</p>
      )}
      {billResult.status === "error" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
          <span>Could not load sales analytics: {billResult.message}</span>
          <button
            type="button"
            onClick={() => {
              setBillResult({ status: "loading", bills: [] });
              setRetryCount((count) => count + 1);
            }}
            className="font-semibold underline underline-offset-2"
          >
            Retry
          </button>
        </div>
      )}
      {billResult.status === "success" && timeframeBills.length === 0 && (
        <p className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600" role="status">
          No sales data found for {selectedTimeframe.toLowerCase()} in the returned bills.
        </p>
      )}

      {/* 2. KPI CARDS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {metricCards.map((metric) => (
          <div key={metric.label} className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {metric.label}
            </span>
            <p className={`text-2xl sm:text-[26px] font-extrabold mt-2 tracking-tight ${metric.color}`}>
              {billResult.status === "loading" ? (
                <span className="inline-block h-7 w-24 animate-pulse rounded bg-slate-100" aria-label="Loading metric" />
              ) : metricsReady ? metric.value : "—"}
            </p>
          </div>
        ))}
      </div>

      {/* 3. CHARTS SECTION: Sales Trend Overview (Full width, payment donut graph removed) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs flex flex-col justify-between relative min-h-[340px]">
        <div>
          {/* Header: Title & View Toggle */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Sales Trend Analysis
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Visual trend across {selectedTimeframe.toLowerCase()} periods
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  id="sales-chart-menu-btn"
                  onClick={() => setIsMenuOpen((prev) => !prev)}
                  className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Chart options"
                  aria-expanded={isMenuOpen}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="5" cy="12" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="19" cy="12" r="2" />
                  </svg>
                </button>

                {isMenuOpen && (
                  <div
                    className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-30 animate-fade-in text-xs font-medium text-slate-700"
                    role="menu"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        handleDownloadReport();
                        setIsMenuOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50"
                      role="menuitem"
                    >
                      Download Report Data
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Empty state if search found nothing */}
          {billResult.status !== "success" || filteredDailySales.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-center p-6">
              <svg className="w-10 h-10 text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs sm:text-sm font-semibold text-slate-700">
                {billResult.status === "loading"
                  ? "Loading sales trend..."
                  : billResult.status === "error"
                    ? "Sales trend unavailable."
                    : "No matching sales records found"}
              </p>
              {billResult.status === "success" && (
                <p className="text-xs text-slate-400 mt-1">Try clearing your search query in the top bar.</p>
              )}
            </div>
          ) : (
            /* Chart Visualization Container */
            <div className="relative pt-4 pb-2">
              <div className="absolute inset-x-0 top-16 border-b border-dashed border-slate-200/80 pointer-events-none" />
              <div className="absolute inset-x-0 top-32 border-b border-dashed border-slate-200/80 pointer-events-none" />

              <div className="h-48 sm:h-56 flex items-end justify-between gap-3 sm:gap-6 px-4">
                {filteredDailySales.map((item) => {
                  const heightPercent = Math.max(12, Math.round((item.amount / maxSales) * 100));
                  const isHovered = activeHoverPoint?.day === item.day;

                  return (
                    <div
                      key={item.day}
                      className="flex-1 flex flex-col items-center group cursor-pointer"
                      onMouseEnter={() => setActiveHoverPoint(item)}
                      onMouseLeave={() => setActiveHoverPoint(null)}
                    >
                      <div className="w-full max-w-[42px] bg-slate-100 rounded-t-md flex items-end h-40">
                        <div
                          className={`w-full rounded-t-md transition-all duration-200 ${
                            isHovered ? "bg-blue-600 shadow-md" : "bg-blue-500/80 group-hover:bg-blue-600"
                          }`}
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom X-Axis Days Labels */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-slate-400 text-xs font-medium px-2 sm:px-4">
                {filteredDailySales.map((item) => {
                  const isHovered = activeHoverPoint?.day === item.day;
                  return (
                    <button
                      type="button"
                      key={item.day}
                      onClick={() => {
                        setActiveHoverPoint(item);
                        showToast(`${item.day} (${item.date}): ${formatINR(item.amount)} with ${item.bills} bills`);
                      }}
                      className={`transition-colors cursor-pointer text-center ${
                        isHovered || item.isToday
                          ? "text-blue-600 font-bold"
                          : "hover:text-slate-700"
                      }`}
                      title={`${item.date} - ${formatINR(item.amount)}`}
                    >
                      {item.day}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. COLUMN AND ROW BASED SHOW: Total Bills, Total Sales & Weekly Sales Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Total Bills &amp; Sales Breakdown
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Column and row representation of Total Bills and Total Sales.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th scope="col" className="py-3.5 px-6">Day / Period</th>
                <th scope="col" className="py-3.5 px-6">Date</th>
                <th scope="col" className="py-3.5 px-6 text-right">Total Bills</th>
                <th scope="col" className="py-3.5 px-6 text-right">Total Sales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {billResult.status !== "success" || filteredDailySales.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-slate-600 mb-1">
                      {billResult.status === "loading"
                        ? "Loading sales records..."
                        : billResult.status === "error"
                          ? "Sales records unavailable"
                          : "No sales records found"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {searchTerm ? `No results matching "${searchTerm}"` : "No breakdown available for this timeframe."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredDailySales.map((row) => (
                  <tr
                    key={row.day}
                    className="hover:bg-slate-50/70 transition-colors duration-150"
                  >
                    <td className="py-4 px-6 whitespace-nowrap font-semibold text-slate-900">
                      {row.day}
                      {row.isToday && (
                        <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600">
                          Today
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap text-slate-500 font-medium">
                      {row.date}
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap text-right font-semibold text-slate-700">
                      {row.bills} bills
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap text-right font-bold text-slate-900">
                      {formatINR(row.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredDailySales.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50/80 font-bold text-slate-900 text-xs sm:text-sm">
                  <td className="py-4 px-6">Summary Total</td>
                  <td className="py-4 px-6 text-slate-500">{selectedTimeframe}</td>
                  <td className="py-4 px-6 text-right text-blue-600 font-extrabold">
                    {totalPeriodBills} bills
                  </td>
                  <td className="py-4 px-6 text-right text-emerald-600 font-extrabold">
                    {formatINR(totalPeriodSales)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Bill Details</h2>
          <p className="text-xs text-slate-500 mt-0.5">Invoices included in this report period.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th scope="col" className="py-3.5 px-6">Bill No</th>
                <th scope="col" className="py-3.5 px-6">Date</th>
                <th scope="col" className="py-3.5 px-6">Customer</th>
                <th scope="col" className="py-3.5 px-6 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {billResult.status !== "success" || timeframeBills.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-400">
                    {billResult.status === "loading"
                      ? "Loading bill details..."
                      : billResult.status === "error"
                        ? "Bill details unavailable."
                        : "No bills found for this report period."}
                  </td>
                </tr>
              ) : (
                timeframeBills.map((bill, index) => {
                  const customer = bill.customer && typeof bill.customer === "object" ? bill.customer : null;
                  return (
                    <tr key={bill.id || bill.bill_id || bill.bill_number || `${bill.created_at}-${index}`} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-6 whitespace-nowrap font-semibold text-slate-900">{bill.bill_number || bill.bill_id || bill.id || "—"}</td>
                      <td className="py-4 px-6 whitespace-nowrap text-slate-500">{formatReportDate(localDateKey(bill.created_at))}</td>
                      <td className="py-4 px-6 whitespace-nowrap text-slate-700">{customer?.name || customer?.customer_name || bill.customer_name || "Walk-in Customer"}</td>
                      <td className="py-4 px-6 whitespace-nowrap text-right font-bold text-slate-900">{formatINR(bill.total_amount ?? bill.amount)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

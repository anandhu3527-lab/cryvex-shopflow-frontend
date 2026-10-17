import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Download, Calendar, Filter, Loader2, Award, ChevronLeft, ChevronRight, Barcode, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import TopSellingProductCard from "./TopSellingProductCard";
import {
  fetchBillsForPeriod,
  fetchKadanAccounts,
  fetchProductsForReports,
  buildProductBarcodeMap,
  calculateReportData,
  formatRupees,
  formatDateDisplay,
  formatDateTimeDisplay,
  generatePdfReport,
} from "./reportUtils";

export default function MonthlyReport({ embedded = false } = {}) {
  const { currentTenant, currentUser } = useAuth();

  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth);

  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [bills, setBills] = useState([]);
  const [kadanList, setKadanList] = useState([]);
  const [products, setProducts] = useState([]);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setShowAllProducts(false);
  }, [selectedMonth]);

  const shopName = (
    currentTenant?.name ||
    currentTenant?.business_name ||
    currentUser?.shop?.name ||
    currentUser?.shop_name ||
    "CRYVEX SHOP"
  ).trim();

  // Calculate start and end date for month
  const { startDateStr, endDateStr, monthTitle } = useMemo(() => {
    const parts = selectedMonth.split("-");
    const year = Number(parts[0]) || now.getFullYear();
    const month = Number(parts[1]) || (now.getMonth() + 1);

    const start = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const dateObj = new Date(year, month - 1, 1);
    const title = dateObj.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

    return { startDateStr: start, endDateStr: end, monthTitle: title };
  }, [selectedMonth]);

  // Load bills, kadan, and products data for selected month
  useEffect(() => {
    let isMounted = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);

    Promise.all([
      fetchBillsForPeriod(startDateStr, endDateStr),
      fetchKadanAccounts(),
      fetchProductsForReports(),
    ])
      .then(([fetchedBills, fetchedKadan, fetchedProducts]) => {
        if (!isMounted) return;
        setBills(fetchedBills);
        setKadanList(fetchedKadan);
        setProducts(fetchedProducts);
      })
      .catch((err) => {
        console.error("Failed to load monthly report data:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [startDateStr, endDateStr]);

  // Process financial summary & breakdowns
  const summary = useMemo(() => {
    const barcodeMaps = buildProductBarcodeMap(products);
    return calculateReportData(bills, kadanList, barcodeMaps);
  }, [bills, kadanList, products]);

  // Paginated bills
  const paginatedBills = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return bills.slice(startIndex, startIndex + pageSize);
  }, [bills, currentPage]);

  const totalPages = Math.ceil(bills.length / pageSize) || 1;

  // PDF Download Handler
  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      await generatePdfReport({
        reportType: "Monthly",
        periodTitle: monthTitle,
        startDateStr,
        endDateStr,
        shopName,
        shopStartingDate: currentTenant?.created_at,
        summary,
        kadanList,
        bills,
        dateSalesList: summary.dateSalesList,
        productSalesList: summary.productSalesList,
        topSellingProduct: summary.topSellingProduct,
        filename: `CRYVEX_Monthly_Report_${selectedMonth}.pdf`,
      });
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF report. Please try again.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className={embedded ? "space-y-4 sm:space-y-8 animate-fade-in" : "max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-8 animate-fade-in"}>
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/80">
        <div>
          {!embedded && (
            <Link
              to="/reports"
              className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-800 mb-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to All Reports
            </Link>
          )}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Monthly Sales & Financial Report
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {shopName} • {monthTitle} ({formatDateDisplay(startDateStr)} — {formatDateDisplay(endDateStr)})
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {/* Month Selector Filter */}
          <div className="flex items-center justify-between sm:justify-start gap-2 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700">
            <span className="flex items-center gap-1.5 font-semibold text-slate-600">
              <Filter className="w-3.5 h-3.5 text-slate-500" /> Month:
            </span>
            <input
              id="month-select"
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent font-bold text-slate-900 focus:outline-hidden cursor-pointer"
            />
          </div>

          {/* Download PDF Button */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf || loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {downloadingPdf ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating PDF...
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" /> Download Monthly PDF
              </>
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-slate-200/80 space-y-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600">Loading monthly sales records & financial summary...</p>
        </div>
      ) : (
        <>
          {/* Financial Summary Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-medium text-slate-500 block">Total Sales of the Month</span>
              <span className="text-2xl font-black text-slate-900 block mt-1">
                {formatRupees(summary.totalSales)}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">Gross revenue across all bills</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-medium text-slate-500 block">Total Bills Generated</span>
              <span className="text-2xl font-black text-slate-900 block mt-1">
                {summary.totalBills}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">Valid billing transactions</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-medium text-slate-500 block">Total Cash Received</span>
              <span className="text-2xl font-black text-emerald-600 block mt-1">
                {formatRupees(summary.cashReceived)}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">Direct cash payments collected</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-medium text-slate-500 block">Total UPI Received</span>
              <span className="text-2xl font-black text-blue-600 block mt-1">
                {formatRupees(summary.upiReceived)}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">Digital UPI transactions</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-blue-200 bg-blue-50/40 shadow-xs">
              <span className="text-xs font-medium text-blue-800 block">Total Cash + UPI Received</span>
              <span className="text-2xl font-black text-blue-900 block mt-1">
                {formatRupees(summary.cashPlusUpi)}
              </span>
              <span className="text-[11px] text-blue-700 mt-1 block">Total money actually collected</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-medium text-slate-500 block">Credit Given (Period)</span>
              <span className="text-2xl font-black text-amber-600 block mt-1">
                {formatRupees(summary.creditGiven)}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">Newly recorded Kadan debt</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-rose-200 bg-rose-50/30 shadow-xs">
              <span className="text-xs font-medium text-rose-800 block">Outstanding Credit (As of Month End)</span>
              <span className="text-2xl font-black text-rose-600 block mt-1">
                {formatRupees(summary.outstandingCredit)}
              </span>
              <span className="text-[11px] text-rose-700 mt-1 block">Total unpaid customer balance</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-medium text-slate-500 block">Total Quantity Sold</span>
              <span className="text-2xl font-black text-slate-900 block mt-1">
                {summary.totalQuantitySold.toLocaleString("en-IN")} units
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">Line item product units</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-medium text-slate-500 block">Total Tax (GST)</span>
              <span className="text-2xl font-black text-indigo-600 block mt-1">
                {formatRupees(summary.totalTax || 0)}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">Total monthly GST on sales</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-medium text-slate-500 block">Number of Days with Sales</span>
              <span className="text-2xl font-black text-indigo-600 block mt-1">
                {summary.daysWithSales} Days
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">Excludes 0-sales days</span>
            </div>
          </div>

          {/* Top-Selling Product Card */}
          {summary.topSellingProduct && (
            <TopSellingProductCard
              product={summary.topSellingProduct}
              title="Monthly Top-Selling Product"
              accent="blue"
            />
          )}

          {/* Date-by-Date Sales Table (Excludes 0-Sales Days) */}
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900">Date-by-Date Sales Breakdown</h3>
                <p className="text-xs text-slate-500 mt-0.5">Displaying dates with active sales (dates with zero sales are excluded)</p>
              </div>
              <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-3 py-1 rounded-full">
                {summary.dateSalesList.length} Active Sales Days
              </span>
            </div>

            {summary.dateSalesList.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No active sales recorded for the selected month.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-900 font-bold border-b border-slate-200/80">
                    <tr>
                      <th className="px-3 sm:px-6 py-3">Date</th>
                      <th className="px-3 sm:px-6 py-3 text-center hidden sm:table-cell">Bills</th>
                      <th className="px-3 sm:px-6 py-3 text-right hidden sm:table-cell">Tax (GST)</th>
                      <th className="px-3 sm:px-6 py-3 text-right hidden md:table-cell">Cash</th>
                      <th className="px-3 sm:px-6 py-3 text-right hidden md:table-cell">UPI</th>
                      <th className="px-3 sm:px-6 py-3 text-right hidden sm:table-cell">Credit</th>
                      <th className="px-3 sm:px-6 py-3 text-right font-black">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.dateSalesList.map((row) => (
                      <tr key={row.date} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3 sm:px-6 py-3 font-semibold text-slate-900">{formatDateDisplay(row.date)}</td>
                        <td className="px-3 sm:px-6 py-3 text-center font-medium hidden sm:table-cell">{row.bills_count}</td>
                        <td className="px-3 sm:px-6 py-3 text-right text-slate-700 font-semibold hidden sm:table-cell">{formatRupees(row.total_tax || 0)}</td>
                        <td className="px-3 sm:px-6 py-3 text-right text-emerald-600 font-medium hidden md:table-cell">{formatRupees(row.cash_received)}</td>
                        <td className="px-3 sm:px-6 py-3 text-right text-blue-600 font-medium hidden md:table-cell">{formatRupees(row.upi_received)}</td>
                        <td className="px-3 sm:px-6 py-3 text-right text-amber-600 font-medium hidden sm:table-cell">{formatRupees(row.credit_sales)}</td>
                        <td className="px-3 sm:px-6 py-3 text-right font-extrabold text-slate-900">{formatRupees(row.total_sales)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold border-t border-slate-200">
                    <tr>
                      <td className="px-3 sm:px-6 py-3 text-slate-900">TOTAL</td>
                      <td className="px-3 sm:px-6 py-3 text-center hidden sm:table-cell">{summary.totalBills}</td>
                      <td className="px-3 sm:px-6 py-3 text-right text-slate-800 font-bold hidden sm:table-cell">{formatRupees(summary.totalTax || 0)}</td>
                      <td className="px-3 sm:px-6 py-3 text-right text-emerald-700 hidden md:table-cell">{formatRupees(summary.cashReceived)}</td>
                      <td className="px-3 sm:px-6 py-3 text-right text-blue-700 hidden md:table-cell">{formatRupees(summary.upiReceived)}</td>
                      <td className="px-3 sm:px-6 py-3 text-right text-amber-700 hidden sm:table-cell">{formatRupees(summary.creditGiven)}</td>
                      <td className="px-3 sm:px-6 py-3 text-right text-slate-950 font-black">{formatRupees(summary.totalSales)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Product Sales for the Month Table */}
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900">Product Sales for the Month</h3>
                <p className="text-xs text-slate-500 mt-0.5">Itemized product quantity and sales breakdown for {monthTitle}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-3 py-1 rounded-full">
                  {summary.productSalesList.length} Products Sold
                </span>
                {summary.productSalesList.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setShowAllProducts((prev) => !prev)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    {showAllProducts ? (
                      <>
                        <span>Show Top 5</span>
                        <ChevronUp className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      <>
                        <span>View All ({summary.productSalesList.length})</span>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {summary.productSalesList.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No product sales recorded for this month.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-900 font-bold border-b border-slate-200/80">
                      <tr>
                        <th className="px-3 sm:px-6 py-3">Product</th>
                        <th className="px-3 sm:px-6 py-3 hidden sm:table-cell">Barcode</th>
                        <th className="px-3 sm:px-6 py-3 text-center">Qty</th>
                        <th className="px-3 sm:px-6 py-3 text-right hidden md:table-cell">Avg Price</th>
                        <th className="px-3 sm:px-6 py-3 text-right font-black">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(showAllProducts ? summary.productSalesList : summary.productSalesList.slice(0, 5)).map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-3 sm:px-6 py-3 font-bold text-slate-900">
                            <div>{p.product_name}</div>
                            {p.barcode && p.barcode !== "—" && (
                              <div className="sm:hidden font-mono text-[10px] text-slate-500 mt-0.5 flex items-center gap-1 font-normal">
                                <Barcode className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{p.barcode}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-3 sm:px-6 py-3 font-mono text-slate-600 hidden sm:table-cell">
                            {p.barcode && p.barcode !== "—" ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold">
                                <Barcode className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{p.barcode}</span>
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-3 sm:px-6 py-3 text-center font-extrabold text-emerald-600">{p.quantity_sold.toLocaleString("en-IN")}</td>
                          <td className="px-3 sm:px-6 py-3 text-right font-medium hidden md:table-cell">{formatRupees(p.average_selling_price)}</td>
                          <td className="px-3 sm:px-6 py-3 text-right font-black text-slate-900">{formatRupees(p.total_product_sales)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {summary.productSalesList.length > 5 && (
                  <div className="px-4 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                    <span className="text-slate-500 font-medium">
                      {showAllProducts
                        ? `Showing all ${summary.productSalesList.length} products sold`
                        : `Showing top 5 of ${summary.productSalesList.length} products sold`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAllProducts((prev) => !prev)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold border border-slate-200 shadow-2xs transition-all cursor-pointer text-xs"
                    >
                      {showAllProducts ? (
                        <>
                          <span>Show Top 5 Products</span>
                          <ChevronUp className="w-4 h-4 text-slate-500" />
                        </>
                      ) : (
                        <>
                          <span>View All {summary.productSalesList.length} Products</span>
                          <ChevronDown className="w-4 h-4 text-blue-600" />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Monthly Outstanding Credit / Kadan Customers List */}
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900">Outstanding Credit / Kadan Customer List</h3>
                <p className="text-xs text-slate-500 mt-0.5">Showing customers with positive unpaid credit balance</p>
              </div>
              <span className="text-xs bg-rose-50 text-rose-700 font-semibold px-3 py-1 rounded-full">
                {kadanList.length} Debtors
              </span>
            </div>

            {kadanList.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No outstanding customer credit / Kadan accounts recorded.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-900 font-bold border-b border-slate-200/80">
                    <tr>
                      <th className="px-3 sm:px-6 py-3">Customer</th>
                      <th className="px-3 sm:px-6 py-3 hidden sm:table-cell">Phone</th>
                      <th className="px-3 sm:px-6 py-3 text-right font-black text-rose-600">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {kadanList.map((acc) => (
                      <tr key={acc.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3 sm:px-6 py-3 font-bold text-slate-900">{acc.customer_name}</td>
                        <td className="px-3 sm:px-6 py-3 font-mono text-slate-600 hidden sm:table-cell">{acc.phone}</td>
                        <td className="px-3 sm:px-6 py-3 text-right font-extrabold text-rose-600">{formatRupees(acc.outstanding_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Monthly Bill List with Pagination */}
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900">Monthly Bills List</h3>
                <p className="text-xs text-slate-500 mt-0.5">All valid bills generated within {monthTitle}</p>
              </div>
              <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-3 py-1 rounded-full">
                Total {bills.length} Bills
              </span>
            </div>

            {bills.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No bills found for the selected month.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-900 font-bold border-b border-slate-200/80">
                      <tr>
                        <th className="px-3 sm:px-6 py-3">Bill No.</th>
                        <th className="px-3 sm:px-6 py-3 hidden sm:table-cell">Date/Time</th>
                        <th className="px-3 sm:px-6 py-3">Customer</th>
                        <th className="px-3 sm:px-6 py-3 hidden md:table-cell">Payment</th>
                        <th className="px-3 sm:px-6 py-3 text-right font-bold text-slate-700 hidden sm:table-cell">Tax (GST)</th>
                        <th className="px-3 sm:px-6 py-3 text-right font-bold text-emerald-700">Paid</th>
                        <th className="px-3 sm:px-6 py-3 text-right font-bold text-rose-700 hidden sm:table-cell">Kadan</th>
                        <th className="px-3 sm:px-6 py-3 text-right font-black">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedBills.map((b) => (
                        <tr key={b.id || b.bill_number} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-3 sm:px-6 py-3 font-bold text-blue-600">
                            {b.id ? (
                              <Link to={`/bills/${b.id}`} className="hover:underline">
                                {b.bill_number || b.id}
                              </Link>
                            ) : (
                              b.bill_number || b.id
                            )}
                          </td>
                          <td className="px-3 sm:px-6 py-3 text-slate-600 hidden sm:table-cell">{formatDateTimeDisplay(b.created_at || b.date)}</td>
                          <td className="px-3 sm:px-6 py-3 font-medium text-slate-900">{b.customer_name || "Walk-in"}</td>
                          <td className="px-3 sm:px-6 py-3 font-semibold uppercase hidden md:table-cell">{b.payment_method || "CASH"}</td>
                          <td className="px-3 sm:px-6 py-3 text-right font-semibold text-slate-700 hidden sm:table-cell">{formatRupees(b.tax_amount || 0)}</td>
                          <td className="px-3 sm:px-6 py-3 text-right font-bold text-emerald-600">{formatRupees(b.paid_amount)}</td>
                          <td className="px-3 sm:px-6 py-3 text-right font-bold text-rose-600 hidden sm:table-cell">{formatRupees(b.kadan_amount)}</td>
                          <td className="px-3 sm:px-6 py-3 text-right font-extrabold text-slate-900">{formatRupees(b.total_amount ?? b.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      Showing Page {currentPage} of {totalPages}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100 cursor-pointer flex items-center gap-1 font-medium"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" /> Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100 cursor-pointer flex items-center gap-1 font-medium"
                      >
                        Next <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

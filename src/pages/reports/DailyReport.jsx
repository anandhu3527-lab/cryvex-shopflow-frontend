import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Download, Clock, Filter, Loader2, CheckCircle2, Barcode, ChevronDown, ChevronUp } from "lucide-react";
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
  toLocalDateKey,
  generatePdfReport,
} from "./reportUtils";

export default function DailyReport({ embedded = false } = {}) {
  const { currentTenant, currentUser } = useAuth();

  const todayStr = toLocalDateKey(new Date());
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [bills, setBills] = useState([]);
  const [kadanList, setKadanList] = useState([]);
  const [products, setProducts] = useState([]);
  const [showAllProducts, setShowAllProducts] = useState(false);

  useEffect(() => {
    setShowAllProducts(false);
  }, [selectedDate]);

  const shopName = (
    currentTenant?.name ||
    currentTenant?.business_name ||
    currentUser?.shop?.name ||
    currentUser?.shop_name ||
    "CRYVEX SHOP"
  ).trim();

  // Load bills, kadan, and products for selected date
  useEffect(() => {
    let isMounted = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);

    Promise.all([
      fetchBillsForPeriod(selectedDate, selectedDate),
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
        console.error("Failed to load daily report data:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [selectedDate]);

  const summary = useMemo(() => {
    const barcodeMaps = buildProductBarcodeMap(products);
    return calculateReportData(bills, kadanList, barcodeMaps);
  }, [bills, kadanList, products]);

  // Day-end financial reconciliation numbers
  const reconciliation = useMemo(() => {
    const totalCollections = summary.cashReceived + summary.upiReceived;
    const diff = (totalCollections + summary.creditGiven) - summary.totalSales;
    const isBalanced = Math.abs(diff) < 1;

    return {
      cash: summary.cashReceived,
      upi: summary.upiReceived,
      collections: totalCollections,
      credit: summary.creditGiven,
      totalSales: summary.totalSales,
      diff,
      isBalanced,
    };
  }, [summary]);

  // PDF Download Handler
  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      await generatePdfReport({
        reportType: "Daily",
        periodTitle: formatDateDisplay(selectedDate),
        startDateStr: selectedDate,
        endDateStr: selectedDate,
        shopName,
        shopStartingDate: currentTenant?.created_at,
        summary,
        kadanList,
        bills,
        dateSalesList: summary.dateSalesList,
        productSalesList: summary.productSalesList,
        topSellingProduct: summary.topSellingProduct,
        filename: `CRYVEX_Daily_Report_${selectedDate}.pdf`,
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
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Daily Sales & Financial Report
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {shopName} • Date: {formatDateDisplay(selectedDate)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {/* Date Selector */}
          <div className="flex items-center justify-between sm:justify-start gap-2 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700">
            <span className="flex items-center gap-1.5 font-semibold text-slate-600">
              <Filter className="w-3.5 h-3.5 text-slate-500" /> Date:
            </span>
            <input
              id="daily-report-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent font-bold text-slate-900 focus:outline-hidden cursor-pointer"
            />
          </div>

          {/* Download PDF Button */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf || loading}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {downloadingPdf ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating PDF...
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" /> Download Daily PDF
              </>
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-slate-200/80 space-y-3">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600">Loading daily sales transactions & reconciliation...</p>
        </div>
      ) : (
        <>
          {/* Daily Financial Summary Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-medium text-slate-500 block">Total Sales for Selected Day</span>
              <span className="text-2xl font-black text-slate-900 block mt-1">
                {formatRupees(summary.totalSales)}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">Gross day revenue</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-medium text-slate-500 block">Total Bills Generated</span>
              <span className="text-2xl font-black text-slate-900 block mt-1">
                {summary.totalBills}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">Total bills generated today</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-medium text-slate-500 block">Cash Received</span>
              <span className="text-2xl font-black text-emerald-600 block mt-1">
                {formatRupees(summary.cashReceived)}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">Cash collected in drawer</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-medium text-slate-500 block">UPI Received</span>
              <span className="text-2xl font-black text-blue-600 block mt-1">
                {formatRupees(summary.upiReceived)}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">UPI digital collections</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 shadow-xs">
              <span className="text-xs font-medium text-emerald-800 block">Total Cash + UPI Received</span>
              <span className="text-2xl font-black text-emerald-950 block mt-1">
                {formatRupees(summary.cashPlusUpi)}
              </span>
              <span className="text-[11px] text-emerald-700 mt-1 block">Actual cash/UPI collected</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-medium text-slate-500 block">Credit Given During Day</span>
              <span className="text-2xl font-black text-amber-600 block mt-1">
                {formatRupees(summary.creditGiven)}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">Newly recorded Kadan debt</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-rose-200 bg-rose-50/30 shadow-xs">
              <span className="text-xs font-medium text-rose-800 block">Outstanding Credit (As of Date)</span>
              <span className="text-2xl font-black text-rose-600 block mt-1">
                {formatRupees(summary.outstandingCredit)}
              </span>
              <span className="text-[11px] text-rose-700 mt-1 block">Total customer unpaid balance</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-medium text-slate-500 block">Total Quantity Sold</span>
              <span className="text-2xl font-black text-slate-900 block mt-1">
                {summary.totalQuantitySold.toLocaleString("en-IN")} units
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">Product items sold today</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-medium text-slate-500 block">Total Tax (GST)</span>
              <span className="text-2xl font-black text-indigo-600 block mt-1">
                {formatRupees(summary.totalTax || 0)}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">Total GST collected on sales</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-medium text-slate-500 block">Number of Customers Billed</span>
              <span className="text-2xl font-black text-indigo-600 block mt-1">
                {summary.billedCustomersCount || summary.totalBills} Customers
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">Unique billed customer count</span>
            </div>
          </div>

          {/* Day-End Financial Reconciliation Section */}
          <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white rounded-3xl p-6 shadow-md border border-slate-800">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Day-End Financial Reconciliation
              </h3>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${reconciliation.isBalanced ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/20 text-rose-300 border border-rose-500/30"}`}>
                {reconciliation.isBalanced ? "BALANCED & MATCHED" : `DIFFERENCE: ${formatRupees(reconciliation.diff)}`}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <span className="text-slate-400 block mb-1">Cash Collected</span>
                <span className="font-extrabold text-sm text-emerald-400">{formatRupees(reconciliation.cash)}</span>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <span className="text-slate-400 block mb-1">UPI Received</span>
                <span className="font-extrabold text-sm text-blue-400">{formatRupees(reconciliation.upi)}</span>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <span className="text-slate-400 block mb-1">Total Collections</span>
                <span className="font-extrabold text-sm text-emerald-300">{formatRupees(reconciliation.collections)}</span>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <span className="text-slate-400 block mb-1">Credit Given</span>
                <span className="font-extrabold text-sm text-amber-400">{formatRupees(reconciliation.credit)}</span>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <span className="text-slate-400 block mb-1">Total Day Sales</span>
                <span className="font-extrabold text-sm text-white">{formatRupees(reconciliation.totalSales)}</span>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <span className="text-slate-400 block mb-1">Reconciliation Status</span>
                <span className={`font-bold text-xs ${reconciliation.isBalanced ? "text-emerald-400" : "text-rose-400"}`}>
                  {reconciliation.isBalanced ? "100% Balanced" : "Mismatch"}
                </span>
              </div>
            </div>
          </div>

          {/* Top Selling Product of the Day Card */}
          {summary.topSellingProduct && (
            <TopSellingProductCard
              product={summary.topSellingProduct}
              title="Top-Selling Product of the Day"
              accent="emerald"
            />
          )}

          {/* Product Sales for the Day Table */}
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900">Product Sales for the Day</h3>
                <p className="text-xs text-slate-500 mt-0.5">Itemized product quantity and sales breakdown for {formatDateDisplay(selectedDate)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-3 py-1 rounded-full">
                  {summary.productSalesList.length} Products Sold
                </span>
                {summary.productSalesList.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setShowAllProducts((prev) => !prev)}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors cursor-pointer flex items-center gap-1"
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
                No product sales recorded for this date.
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
                          <ChevronDown className="w-4 h-4 text-emerald-600" />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Bills Generated on Selected Date Table */}
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900">Bills Generated on Selected Date</h3>
                <p className="text-xs text-slate-500 mt-0.5">Individual bills created on {formatDateDisplay(selectedDate)}</p>
              </div>
              <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-3 py-1 rounded-full">
                {bills.length} Bills
              </span>
            </div>

            {bills.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No bills generated on this date.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-900 font-bold border-b border-slate-200/80">
                    <tr>
                      <th className="px-3 sm:px-6 py-3">Bill No.</th>
                      <th className="px-3 sm:px-6 py-3 hidden sm:table-cell">Time</th>
                      <th className="px-3 sm:px-6 py-3">Customer</th>
                      <th className="px-3 sm:px-6 py-3 hidden md:table-cell">Payment</th>
                      <th className="px-3 sm:px-6 py-3 text-right font-bold text-slate-700 hidden sm:table-cell">Tax (GST)</th>
                      <th className="px-3 sm:px-6 py-3 text-right font-bold text-emerald-700">Paid</th>
                      <th className="px-3 sm:px-6 py-3 text-right font-bold text-rose-700 hidden sm:table-cell">Kadan</th>
                      <th className="px-3 sm:px-6 py-3 text-right font-black">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bills.map((b) => (
                      <tr key={b.id || b.bill_number} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3 sm:px-6 py-3 font-bold text-emerald-600">
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
            )}
          </div>

          {/* Outstanding Credit Customer List */}
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900">Outstanding Credit Customer List</h3>
                <p className="text-xs text-slate-500 mt-0.5">Customers with positive unpaid credit balance</p>
              </div>
              <span className="text-xs bg-rose-50 text-rose-700 font-semibold px-3 py-1 rounded-full">
                {kadanList.length} Debtors
              </span>
            </div>

            {kadanList.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No active outstanding credit accounts.
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
        </>
      )}
    </div>
  );
}

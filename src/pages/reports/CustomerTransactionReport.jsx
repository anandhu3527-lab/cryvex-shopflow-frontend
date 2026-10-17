import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Users,
  CreditCard,
  Receipt,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Filter,
  X,
  PlusCircle,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { customerApi } from "../../services/api/customerApi";
import { kadanApi } from "../../services/api/kadanApi";
import { billingApi } from "../../services/api/billingApi";

/* ─────────────────────────────────────────────
   FORMATTING UTILITIES
───────────────────────────────────────────── */

function formatTableDateTime(dateStrOrObj) {
  if (!dateStrOrObj) return "—";
  const d = new Date(dateStrOrObj);
  if (Number.isNaN(d.getTime())) return String(dateStrOrObj);
  const day = String(d.getDate()).padStart(2, "0");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${day}-${month}-${year}, ${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
}

/** Format currency to ₹ with 2 decimal places. ₹0.00 for zero/null. */
function fmt(val) {
  const num = Number(val);
  if (!Number.isFinite(num)) return "₹0.00";
  return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* ─────────────────────────────────────────────
   TRANSACTION TYPE
   Types:
     Bill  – from CustomerBillResponse
     Kadan – from kadan transactions / credit repayments
───────────────────────────────────────────── */

const TX_TYPE = { BILL: "Bill", KADAN: "Kadan", CREDIT_REPAYMENT: "Kadan" };

/**
 * Normalise backend kadan transaction_type.
 * Returns TX_TYPE.KADAN for all kadan entries.
 */
function normaliseKadanTxType(rawType) {
  return TX_TYPE.KADAN;
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */

/**
 * CustomerTransactionReport
 *
 * 9 table columns:
 *   Date & Time | Customer Name | Transaction Type | Bill Amount |
 *   Paid Amount | Credit Amount | Credit Repayment | Credit Balance | Status
 *
 * APIs used:
 *   GET /api/v1/customers                          → customer list
 *   GET /api/v1/kadan/accounts                     → kadan accounts + outstanding balances
 *   GET /api/v1/bills?limit=100                    → store-wide bills (walk-in detection)
 *   GET /api/v1/customers/{id}/bills               → per-customer bills
 *   GET /api/v1/kadan/customer/{id}/transactions   → per-customer kadan txs (balance_after!)
 *   POST /api/v1/kadan/customer/{id}/payment       → record credit repayment
 */
export default function CustomerTransactionReport() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlFilter = (searchParams.get("filter") || "").toUpperCase();

  const [filterType, setFilterType] = useState(() => {
    if (urlFilter === "KADAN" || urlFilter === "REPAYMENT" || urlFilter === "KADAN_REPAYMENT") return "KADAN_REPAYMENT";
    if (urlFilter === "BILLS" || urlFilter === "BILL") return "BILLS";
    if (urlFilter === "CREDIT_CUSTOMERS" || urlFilter === "CREDIT") return "CREDIT_CUSTOMERS";
    return "ALL";
  });
  const [searchQuery, setSearchQuery]   = useState("");
  const [currentPage, setCurrentPage]   = useState(1);
  const pageSize = 10;

  const handleFilterChange = useCallback((newFilter) => {
    setFilterType(newFilter);
    const newParams = new URLSearchParams(searchParams);
    if (newFilter === "ALL") {
      newParams.delete("filter");
    } else {
      newParams.set("filter", newFilter.toLowerCase());
    }
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleResetFilters = useCallback(() => {
    handleFilterChange("ALL");
    setSearchQuery("");
  }, [handleFilterChange]);

  const [isLoading, setIsLoading]           = useState(true);
  const [error, setError]                   = useState("");
  const [customerRecords, setCustomerRecords] = useState([]);
  const [walkInBills, setWalkInBills]       = useState([]);

  const [paymentModalCustomer, setPaymentModalCustomer] = useState(null);
  const [paymentSuccessToast, setPaymentSuccessToast]   = useState("");

  /* ──────────────────────────────────────────
     DATA LOADER
  ────────────────────────────────────────── */
  const loadCustomerData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [customersRes, kadanAccountsRes, storeBillsRes] = await Promise.allSettled([
        customerApi.getCustomers({ limit: 100 }),
        kadanApi.getAccounts({ limit: 100 }),
        billingApi.getBills(100, 0),
      ]);

      const rawCustomers = customersRes.status === "fulfilled"
        ? (Array.isArray(customersRes.value) ? customersRes.value : customersRes.value?.data || [])
        : [];
      const rawKadanAccounts = kadanAccountsRes.status === "fulfilled"
        ? (Array.isArray(kadanAccountsRes.value) ? kadanAccountsRes.value : kadanAccountsRes.value?.data || [])
        : [];
      const rawStoreBills = storeBillsRes.status === "fulfilled"
        ? (Array.isArray(storeBillsRes.value) ? storeBillsRes.value : storeBillsRes.value?.items || storeBillsRes.value?.data || [])
        : [];

      // Build customer identity map
      const customerMap = new Map();
      rawCustomers.forEach((c) => { if (c?.id) customerMap.set(String(c.id), { ...c }); });
      rawKadanAccounts.forEach((acc) => {
        const accId = String(acc.customer_id || acc.id || "");
        if (accId && !customerMap.has(accId)) {
          customerMap.set(accId, { id: accId, name: acc.customer_name || "Customer", phone: acc.customer_phone || "" });
        }
      });

      // Kadan account map: customer_id → { outstanding, accountId }
      const kadanAccountMap = new Map();
      rawKadanAccounts.forEach((acc) => {
        const cid = String(acc.customer_id || acc.id || "");
        if (cid) kadanAccountMap.set(cid, { outstanding: Number(acc.outstanding_amount ?? 0), accountId: acc.account_id });
      });

      const customerList = Array.from(customerMap.values());
      const seenBillIds  = new Set();
      const CONCURRENCY  = 6;
      const allRecords   = [];

      for (let i = 0; i < customerList.length; i += CONCURRENCY) {
        const chunk = customerList.slice(i, i + CONCURRENCY);
        const chunkResults = await Promise.allSettled(
          chunk.map(async (customer) => {
            const cid      = String(customer.id);
            const hasKadan = kadanAccountMap.has(cid);
            const [billsRes, kadanTxRes] = await Promise.allSettled([
              customerApi.getCustomerBills(cid),
              hasKadan ? kadanApi.getCustomerTransactions(cid) : Promise.resolve([]),
            ]);
            const bills    = (billsRes.status === "fulfilled" && Array.isArray(billsRes.value))   ? billsRes.value   : [];
            // Handle kadan transactions - may be a plain array or wrapped in { data, items, transactions }
            let kadanTxs = [];
            if (kadanTxRes.status === "fulfilled" && kadanTxRes.value != null) {
              const kVal = kadanTxRes.value;
              if (Array.isArray(kVal)) {
                kadanTxs = kVal;
              } else if (Array.isArray(kVal.data)) {
                kadanTxs = kVal.data;
              } else if (Array.isArray(kVal.items)) {
                kadanTxs = kVal.items;
              } else if (Array.isArray(kVal.transactions)) {
                kadanTxs = kVal.transactions;
              }
            }

            // Register bill IDs belonging to this customer
            bills.forEach((b) => { const bid = String(b.bill_id || b.id || ""); if (bid) seenBillIds.add(bid); });

            // Map bill_id → kadan CREDIT transaction (for historical balance_after per Bill row)
            const billIdToKadanTx = new Map();
            kadanTxs.forEach((tx) => {
              const txType = String(tx.transaction_type || "").toUpperCase();
              const isCreditAdd = txType.includes("CREDIT") || txType.includes("DEBIT") || txType.includes("BILL");
              if (isCreditAdd && tx.bill_id) billIdToKadanTx.set(String(tx.bill_id), tx);
            });

            return { customer, bills, kadanTxs, billIdToKadanTx, kadanAccountMap };
          })
        );
        for (const res of chunkResults) {
          if (res.status === "fulfilled" && res.value) allRecords.push(res.value);
        }
      }

      setCustomerRecords(allRecords);

      // Walk-in bills: no customer_id or customer not in our map
      const walkins = rawStoreBills.filter((b) => {
        const hasCustId = !!(b.customer_id || b.customer?.id);
        if (!hasCustId) return true;
        const cid = String(b.customer_id || b.customer?.id || "");
        const bid = String(b.bill_id || b.id || "");
        return cid && !customerMap.has(cid) && !seenBillIds.has(bid);
      });
      setWalkInBills(walkins);

    } catch (err) {
      console.error("CustomerTransactionReport load error:", err);
      setError(err?.message || "Failed to load customer transactions. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadCustomerData(); }, [loadCustomerData]);

  useEffect(() => {
    if (paymentSuccessToast) {
      const t = setTimeout(() => setPaymentSuccessToast(""), 4000);
      return () => clearTimeout(t);
    }
  }, [paymentSuccessToast]);

  /* ──────────────────────────────────────────
     COMPILE UNIFIED TRANSACTION LIST
     Row shape:
       id, date, customerId, customerName, customerPhone,
       transactionType ("Bill" | "Credit Repayment"),
       billAmount    – total bill amount (Bill only, else null)
       paidAmount    – amount paid
       creditAmount  – credit generated by this bill (Bill only, else null)
       creditRepayment – amount repaid (Repayment only, else null)
       creditBalance – balance AFTER this tx (from KadanTransactionResponse.balance_after)
                        null = backend did not supply per-row balance for this Bill
                        0    = confirmed zero balance (fully paid, no credit)
       status        – bill status string, or null
       isCreditCustomer – bool badge
  ────────────────────────────────────────── */
  const compiledData = useMemo(() => {
    const allTransactions  = [];
    const creditCustomerIds  = new Set();
    const customerBalanceMap = new Map();
    const seenIds = new Set();
    let totalOutstanding = 0;

    for (const record of customerRecords) {
      const { customer, bills, kadanTxs, billIdToKadanTx, kadanAccountMap } = record;
      const cid          = String(customer.id);
      const customerName = customer.name  || "Customer";
      const customerPhone= customer.phone || "";

      // Outstanding balance from kadan account
      const outstanding = Number(kadanAccountMap?.get(cid)?.outstanding ?? 0);
      customerBalanceMap.set(cid, outstanding);
      if (outstanding > 0) { creditCustomerIds.add(cid); totalOutstanding += outstanding; }

      /* ── TYPE A: Bill rows ────────────────────────────────── */
      for (const b of bills) {
        const billId = String(b.bill_id || b.id || "");
        const rowId  = `bill-${billId || cid + Math.random()}`;
        if (seenIds.has(rowId)) continue;
        seenIds.add(rowId);

        const totalAmt  = Number(b.total_amount ?? 0);
        const paidAmt   = Number(b.paid_amount  ?? 0);
        const kadanAmt  = Number(b.kadan_amount ?? 0); // credit generated

        if (kadanAmt > 0) creditCustomerIds.add(cid);

        // Historical credit balance for this Bill row:
        //   If the kadan ledger has a linked CREDIT tx → use its balance_after (authoritative)
        //   If no kadan activity for this bill          → 0 (no credit generated)
        //   If kadan_amount > 0 but no tx found        → null (don't fabricate)
        const linkedKadanTx = billId ? billIdToKadanTx.get(billId) : null;
        let historicalCreditBalance;
        if (linkedKadanTx) {
          historicalCreditBalance = linkedKadanTx.balance_after !== undefined && linkedKadanTx.balance_after !== null
            ? Number(linkedKadanTx.balance_after)
            : null;
        } else if (kadanAmt > 0) {
          historicalCreditBalance = null; // kadan tx exists but not returned; don't fabricate
        } else {
          historicalCreditBalance = 0;    // no credit was generated by this bill
        }

        allTransactions.push({
          id: rowId,
          date: b.created_at,
          customerId: cid,
          customerName,
          customerPhone,
          transactionType: TX_TYPE.BILL,
          billAmount:    totalAmt,
          paidAmount:    paidAmt,
          creditAmount:  kadanAmt > 0 ? kadanAmt : null,
          creditRepayment: null,
          creditBalance: historicalCreditBalance,
          status: b.status || null,
          isCreditCustomer: false,
        });
      }

      /* ── TYPE B: Kadan transaction rows ────────────────── */
      for (const tx of kadanTxs) {
        const txId  = String(tx.transaction_id || tx.id || "");
        const rowId = `kadan-${txId || cid + "-" + (tx.created_at || Math.random())}`;
        if (seenIds.has(rowId)) continue;
        seenIds.add(rowId);

        const txAmt = Number(tx.amount ?? 0);
        // balance_after from the API is the outstanding balance AFTER this transaction
        const balanceAfter = (tx.balance_after !== undefined && tx.balance_after !== null)
          ? Number(tx.balance_after) : null;

        creditCustomerIds.add(cid);

        allTransactions.push({
          id: rowId,
          date: tx.created_at,
          customerId: cid,
          customerName:  tx.customer_name  || customerName,
          customerPhone: tx.customer_phone || customerPhone,
          transactionType: TX_TYPE.KADAN,
          billAmount:      null,
          paidAmount:      txAmt,
          creditAmount:    null,
          creditRepayment: txAmt,
          creditBalance:   balanceAfter,
          status:          tx.notes || null,
          isCreditCustomer: true,
          rawType:         tx.transaction_type || "",
        });
      }
    }

    // Mark isCreditCustomer on Bill rows
    for (const tx of allTransactions) {
      if (tx.transactionType === TX_TYPE.BILL && creditCustomerIds.has(tx.customerId)) {
        tx.isCreditCustomer = true;
      }
    }

    /* ── Walk-in Bill rows ──────────────────────────────── */
    for (const b of walkInBills) {
      const billId = String(b.bill_id || b.id || "");
      const rowId  = `walkin-${billId || Math.random()}`;
      if (seenIds.has(rowId)) continue;
      seenIds.add(rowId);
      allTransactions.push({
        id: rowId,
        date: b.created_at,
        customerId:    `walkin-${billId}`,
        customerName:  "Walk-in Customer",
        customerPhone: "",
        transactionType: TX_TYPE.BILL,
        billAmount:      Number(b.total_amount ?? 0),
        paidAmount:      Number(b.paid_amount  ?? 0),
        creditAmount:    null,
        creditRepayment: null,
        creditBalance:   0,
        status:          b.status || null,
        isCreditCustomer: false,
      });
    }

    // Newest first
    allTransactions.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });

    const repRows = allTransactions.filter((t) => t.transactionType === TX_TYPE.KADAN || t.transactionType === "Kadan" || t.transactionType === "Credit Repayment");
    return {
      allTransactions,
      creditCustomerIds,
      customerBalanceMap,
      totalOutstanding,
      totalCreditRepaymentAmount: repRows.reduce((s, t) => s + (t.creditRepayment || 0), 0),
    };
  }, [customerRecords, walkInBills]);

  /* ── FILTER ─────────────────────────────────────────── */
  const filteredTransactions = useMemo(() => {
    let list = compiledData.allTransactions;
    if (filterType === "BILLS") {
      list = list.filter((t) => t.transactionType === TX_TYPE.BILL);
    } else if (filterType === "CREDIT_CUSTOMERS") {
      list = list.filter((t) => compiledData.creditCustomerIds.has(t.customerId));
    } else if (filterType === "KADAN_REPAYMENT") {
      list = list.filter(
        (t) =>
          t.transactionType === TX_TYPE.KADAN ||
          t.transactionType === "Kadan" ||
          t.transactionType === "Credit Repayment" ||
          (t.creditRepayment !== null && t.creditRepayment !== undefined && Number(t.creditRepayment) > 0)
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((t) =>
        t.customerName.toLowerCase().includes(q) ||
        t.customerPhone.includes(q) ||
        t.transactionType.toLowerCase().includes(q) ||
        (t.status && t.status.toLowerCase().includes(q))
      );
    }
    return list;
  }, [compiledData, filterType, searchQuery]);

  useEffect(() => { setCurrentPage(1); }, [filterType, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage]);

  const billsCount       = compiledData.allTransactions.filter((t) => t.transactionType === TX_TYPE.BILL).length;
  const kadanCount       = compiledData.allTransactions.filter(
    (t) =>
      t.transactionType === TX_TYPE.KADAN ||
      t.transactionType === "Kadan" ||
      t.transactionType === "Credit Repayment" ||
      (t.creditRepayment !== null && t.creditRepayment !== undefined && Number(t.creditRepayment) > 0)
  ).length;
  const creditCustTxCount= compiledData.allTransactions.filter((t) => compiledData.creditCustomerIds.has(t.customerId)).length;

  /* ── RENDER ──────────────────────────────────────────── */
  return (
    <section aria-label="Customer Transactions Report" className="space-y-4 pt-2">

      {/* Toast */}
      {paymentSuccessToast && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800 shadow-sm">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{paymentSuccessToast}</span>
        </div>
      )}

      <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">

        {/* ── Header ── */}
        <div className="border-b border-slate-100 p-4 sm:p-6 sm:flex sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600"><Receipt className="h-5 w-5" /></div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Customer Transactions</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">Bills, credit generated, and credit repayments — unified ledger.</p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center gap-2">
            <button
              type="button"
              id="record-repayment-btn"
              onClick={() => {
                const debtors = Array.from(compiledData.creditCustomerIds);
                if (debtors.length > 0) {
                  const cid  = debtors[0];
                  const rec  = customerRecords.find((r) => String(r.customer.id) === cid);
                  setPaymentModalCustomer({ id: cid, name: rec?.customer?.name || "Customer", balance: compiledData.customerBalanceMap.get(cid) || 0 });
                } else {
                  // No credit customers — show info alert
                  alert("No customers with outstanding credit balance found. Credit repayment is only available when customers have an outstanding balance.");
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer"
            >
              <PlusCircle className="h-3.5 w-3.5" /><span>Record Repayment</span>
            </button>
            <button
              type="button"
              id="refresh-transactions-btn"
              onClick={loadCustomerData}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 transition-all cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-blue-600" : "text-slate-500"}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* ── Summary Stat Cards (Quick Filter on Click) ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 sm:p-6 bg-slate-50/40 border-b border-slate-100">
          <button
            type="button"
            onClick={() => handleFilterChange("ALL")}
            className={`p-3.5 rounded-2xl bg-white border text-left transition-all cursor-pointer hover:shadow-xs ${
              filterType === "ALL"
                ? "border-blue-500 ring-2 ring-blue-100 shadow-xs"
                : "border-slate-200/80 shadow-2xs hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">All Transactions</span>
              <Receipt className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-xl font-extrabold text-slate-900">{compiledData.allTransactions.length}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Bills &amp; Kadan</div>
          </button>

          <button
            type="button"
            onClick={() => handleFilterChange("BILLS")}
            className={`p-3.5 rounded-2xl bg-white border text-left transition-all cursor-pointer hover:shadow-xs ${
              filterType === "BILLS"
                ? "border-indigo-500 ring-2 ring-indigo-100 shadow-xs"
                : "border-slate-200/80 shadow-2xs hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Bills</span>
              <TrendingDown className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="text-xl font-extrabold text-indigo-700">{billsCount}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Customer purchase records</div>
          </button>

          <button
            type="button"
            onClick={() => handleFilterChange("KADAN_REPAYMENT")}
            className={`p-3.5 rounded-2xl bg-white border text-left transition-all cursor-pointer hover:shadow-xs ${
              filterType === "KADAN_REPAYMENT"
                ? "border-emerald-500 ring-2 ring-emerald-100 shadow-xs"
                : "border-slate-200/80 shadow-2xs hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Kadan Repayments</span>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-xl font-extrabold text-emerald-700">{kadanCount}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Total: {fmt(compiledData.totalCreditRepaymentAmount)}</div>
          </button>

          <button
            type="button"
            onClick={() => handleFilterChange("CREDIT_CUSTOMERS")}
            className={`p-3.5 rounded-2xl bg-white border text-left transition-all cursor-pointer hover:shadow-xs ${
              filterType === "CREDIT_CUSTOMERS"
                ? "border-rose-500 ring-2 ring-rose-100 shadow-xs"
                : "border-slate-200/80 shadow-2xs hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Credit Customers</span>
              <CreditCard className="h-4 w-4 text-rose-600" />
            </div>
            <div className="text-xl font-extrabold text-rose-700">{compiledData.creditCustomerIds.size}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Outstanding: {fmt(compiledData.totalOutstanding)}</div>
          </button>
        </div>

        {/* ── Filter Controls ── */}
        <div className="border-b border-slate-100 bg-slate-50/70 p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-slate-400" /> Transaction Filters
            </span>
            {(filterType !== "ALL" || searchQuery) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Reset Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            <FilterPill
              active={filterType === "ALL"}
              onClick={() => handleFilterChange("ALL")}
              icon={<Users className="h-4 w-4" />}
              label="All Transactions"
              sub="Bills & Kadan"
              count={compiledData.allTransactions.length}
              color="blue"
            />
            <FilterPill
              active={filterType === "BILLS"}
              onClick={() => handleFilterChange("BILLS")}
              icon={<Receipt className="h-4 w-4" />}
              label="Bills"
              sub="Customer purchases"
              count={billsCount}
              color="indigo"
            />
            <FilterPill
              active={filterType === "KADAN_REPAYMENT"}
              onClick={() => handleFilterChange("KADAN_REPAYMENT")}
              icon={<TrendingUp className="h-4 w-4" />}
              label="Kadan Repayments"
              sub="Credit repayments"
              count={kadanCount}
              color="emerald"
            />
            <FilterPill
              active={filterType === "CREDIT_CUSTOMERS"}
              onClick={() => handleFilterChange("CREDIT_CUSTOMERS")}
              icon={<CreditCard className="h-4 w-4" />}
              label="Credit Customers"
              sub="All their transactions"
              count={creditCustTxCount}
              color="rose"
            />
          </div>

          <div className="pt-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              id="transaction-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customer name, phone, or transaction type…"
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-100 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── Table ── */}
        <div>
          {isLoading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState error={error} onRetry={loadCustomerData} />
          ) : paginatedTransactions.length === 0 ? (
            <EmptyState filterType={filterType} searchQuery={searchQuery} onReset={handleResetFilters} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 min-w-[960px]">
                <thead className="bg-slate-50 text-slate-900 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-3 sm:px-5 py-3 sm:py-4 whitespace-nowrap">Date &amp; Time</th>
                    <th className="px-3 sm:px-5 py-3 sm:py-4 whitespace-nowrap">Customer Name</th>
                    <th className="px-3 sm:px-5 py-3 sm:py-4 whitespace-nowrap">Transaction Type</th>
                    <th className="px-3 sm:px-5 py-3 sm:py-4 text-right whitespace-nowrap">Bill Amount</th>
                    <th className="px-3 sm:px-5 py-3 sm:py-4 text-right whitespace-nowrap">Paid Amount</th>
                    <th className="px-3 sm:px-5 py-3 sm:py-4 text-right whitespace-nowrap">Credit Amount</th>
                    <th className="px-3 sm:px-5 py-3 sm:py-4 text-right whitespace-nowrap">Credit Repayment</th>
                    <th className="px-3 sm:px-5 py-3 sm:py-4 text-right whitespace-nowrap">Credit Balance</th>
                    <th className="px-3 sm:px-5 py-3 sm:py-4 whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedTransactions.map((tx) => <TransactionRow key={tx.id} tx={tx} />)}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!isLoading && !error && filteredTransactions.length > 0 && (
            <div className="px-4 sm:px-6 py-3 sm:py-4 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-slate-500">
                Showing <span className="font-semibold text-slate-800">{(currentPage-1)*pageSize+1}</span> to{" "}
                <span className="font-semibold text-slate-800">{Math.min(currentPage*pageSize,filteredTransactions.length)}</span> of{" "}
                <span className="font-semibold text-slate-800">{filteredTransactions.length}</span> transactions
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setCurrentPage((p) => Math.max(1,p-1))} disabled={currentPage===1}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 disabled:opacity-40 hover:bg-slate-100 font-medium cursor-pointer flex items-center gap-1 transition-all">
                    <ChevronLeft className="h-3.5 w-3.5" /> Previous
                  </button>
                  <span className="font-bold text-slate-800 px-1">{currentPage} / {totalPages}</span>
                  <button type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages,p+1))} disabled={currentPage===totalPages}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 disabled:opacity-40 hover:bg-slate-100 font-medium cursor-pointer flex items-center gap-1 transition-all">
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Credit Repayment Modal */}
      {paymentModalCustomer && (
        <ReceiveCreditRepaymentModal
          customer={paymentModalCustomer}
          customersList={Array.from(compiledData.creditCustomerIds).map((cid) => {
            const rec = customerRecords.find((r) => String(r.customer.id) === cid);
            return { id: String(cid), name: rec?.customer?.name || "Customer", phone: rec?.customer?.phone || "", balance: compiledData.customerBalanceMap.get(cid) || 0 };
          })}
          balances={Object.fromEntries(
            Array.from(compiledData.customerBalanceMap.entries()).map(([k, v]) => [String(k), v])
          )}
          onClose={() => setPaymentModalCustomer(null)}
          onSuccess={(customerName, paidAmount) => {
            setPaymentSuccessToast(`Credit repayment of ${fmt(paidAmount)} recorded for ${customerName}!`);
            loadCustomerData();
          }}
        />
      )}
    </section>
  );
}

/* ─────────────────────────────────────────────
   TRANSACTION ROW
───────────────────────────────────────────── */
function TransactionRow({ tx }) {
  const isBill  = tx.transactionType === TX_TYPE.BILL;
  const isKadan = tx.transactionType === TX_TYPE.KADAN || tx.transactionType === "Kadan" || tx.transactionType === "Credit Repayment";

  return (
    <tr className="hover:bg-slate-50/80 transition-colors">
      {/* 1. Date & Time */}
      <td className="px-3 sm:px-5 py-3 sm:py-4 whitespace-nowrap font-medium text-slate-600 text-[11px]">
        {formatTableDateTime(tx.date)}
      </td>

      {/* 2. Customer Name */}
      <td className="px-3 sm:px-5 py-3 sm:py-4 whitespace-nowrap">
        <div className="flex items-center gap-1.5 font-bold text-slate-900">
          <span>{tx.customerName}</span>
          {tx.isCreditCustomer && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
              title="Customer has credit balance">Credit</span>
          )}
        </div>
        {tx.customerPhone && <div className="text-[11px] font-normal text-slate-500">{tx.customerPhone}</div>}
      </td>

      {/* 3. Transaction Type */}
      <td className="px-3 sm:px-5 py-3 sm:py-4 whitespace-nowrap">
        {isBill ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
            <Receipt className="h-3 w-3 text-blue-600 shrink-0" /> Bill
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" /> Kadan
          </span>
        )}
      </td>

      {/* 4. Bill Amount – Bill only */}
      <td className="px-3 sm:px-5 py-3 sm:py-4 text-right whitespace-nowrap">
        {isBill && tx.billAmount !== null
          ? <span className="font-semibold text-slate-800">{fmt(tx.billAmount)}</span>
          : <span className="text-slate-400">—</span>}
      </td>

      {/* 5. Paid Amount */}
      <td className="px-3 sm:px-5 py-3 sm:py-4 text-right whitespace-nowrap">
        {tx.paidAmount !== null && tx.paidAmount !== undefined
          ? <span className={`font-bold ${isKadan ? "text-emerald-700" : "text-slate-900"}`}>
              {isKadan ? `+${fmt(tx.paidAmount)}` : fmt(tx.paidAmount)}
            </span>
          : <span className="text-slate-400">—</span>}
      </td>

      {/* 6. Credit Amount – credit generated by a Bill, in rose (outstanding debt) */}
      <td className="px-3 sm:px-5 py-3 sm:py-4 text-right whitespace-nowrap">
        {isBill && tx.creditAmount !== null
          ? <span className="font-semibold text-rose-700">{fmt(tx.creditAmount)}</span>
          : <span className="text-slate-400">—</span>}
      </td>

      {/* 7. Credit Repayment – shown for Kadan transactions */}
      <td className="px-3 sm:px-5 py-3 sm:py-4 text-right whitespace-nowrap">
        {tx.creditRepayment !== null && tx.creditRepayment !== undefined
          ? <span className="font-bold text-emerald-700">+{fmt(tx.creditRepayment)}</span>
          : <span className="text-slate-400">—</span>}
      </td>

      {/* 8. Credit Balance
              null  → "—" with tooltip (historical balance not available from API)
              > 0   → red (outstanding debt)
              === 0 → neutral ₹0.00 (confirmed zero)
      */}
      <td className="px-3 sm:px-5 py-3 sm:py-4 text-right whitespace-nowrap">
        {tx.creditBalance === null
          ? <span className="text-slate-400 text-[11px]" title="Historical per-transaction balance not available from backend">—</span>
          : tx.creditBalance > 0
            ? <span className="font-extrabold text-rose-700">{fmt(tx.creditBalance)}</span>
            : <span className="font-semibold text-slate-600">{fmt(0)}</span>}
      </td>

      {/* 9. Status */}
      <td className="px-3 sm:px-5 py-3 sm:py-4 whitespace-nowrap">
        {tx.status ? <StatusBadge status={tx.status} /> : <span className="text-slate-400">—</span>}
      </td>
    </tr>
  );
}

/* ─────────────────────────────────────────────
   STATUS BADGE
───────────────────────────────────────────── */
function StatusBadge({ status }) {
  const s = String(status || "").toUpperCase();
  let cls = "px-2 py-0.5 rounded-md text-[10px] font-bold border ";
  if      (s === "COMPLETED" || s === "PAID") cls += "bg-emerald-50 text-emerald-800 border-emerald-200";
  else if (s === "PENDING")                   cls += "bg-amber-50 text-amber-800 border-amber-200";
  else if (s === "CANCELLED")                 cls += "bg-slate-100 text-slate-600 border-slate-200 line-through";
  else if (s === "PARTIAL")                   cls += "bg-orange-50 text-orange-800 border-orange-200";
  else                                        cls += "bg-slate-50 text-slate-700 border-slate-200";
  return <span className={cls}>{status}</span>;
}

/* ─────────────────────────────────────────────
   FILTER PILL
───────────────────────────────────────────── */
const PILL_COLORS = {
  blue:   { active:"border-blue-600 bg-blue-50/90 ring-2 ring-blue-100 text-blue-900 shadow-xs",     inactive:"border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-700", iconA:"bg-blue-600 text-white",   iconI:"bg-slate-100 text-slate-600", bA:"bg-blue-200 text-blue-900",     bI:"bg-slate-100 text-slate-600" },
  indigo: { active:"border-indigo-600 bg-indigo-50/90 ring-2 ring-indigo-100 text-indigo-900 shadow-xs", inactive:"border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-700", iconA:"bg-indigo-600 text-white", iconI:"bg-slate-100 text-slate-600", bA:"bg-indigo-200 text-indigo-900", bI:"bg-slate-100 text-slate-600" },
  emerald:{ active:"border-emerald-600 bg-emerald-50/90 ring-2 ring-emerald-100 text-emerald-900 shadow-xs", inactive:"border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-700", iconA:"bg-emerald-600 text-white", iconI:"bg-slate-100 text-slate-600", bA:"bg-emerald-200 text-emerald-900", bI:"bg-slate-100 text-slate-600" },
  rose:   { active:"border-rose-600 bg-rose-50/90 ring-2 ring-rose-100 text-rose-900 shadow-xs",       inactive:"border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-700", iconA:"bg-rose-600 text-white",   iconI:"bg-slate-100 text-slate-600", bA:"bg-rose-200 text-rose-900",     bI:"bg-slate-100 text-slate-600" },
};
function FilterPill({ active, onClick, icon, label, sub, count, color }) {
  const c = PILL_COLORS[color] || PILL_COLORS.blue;
  return (
    <button type="button" aria-pressed={active} onClick={onClick}
      className={`flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${active ? c.active : c.inactive}`}>
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <span className={`rounded-xl p-2 shrink-0 ${active ? c.iconA : c.iconI}`}>{icon}</span>
        <div className="min-w-0">
          <span className="block text-xs font-bold truncate">{label}</span>
          <span className="block text-[10px] text-slate-500 truncate">{sub}</span>
        </div>
      </div>
      <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full shrink-0 ml-1.5 ${active ? c.bA : c.bI}`}>{count}</span>
    </button>
  );
}

/* ─────────────────────────────────────────────
   LOADING / ERROR / EMPTY STATES
───────────────────────────────────────────── */
function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      <p className="text-sm font-bold text-slate-800">Loading transaction records…</p>
      <p className="text-xs text-slate-500 max-w-sm">Fetching customer bills, credit history, and repayment ledger from the backend.</p>
      <div className="w-full px-6 mt-4 space-y-2">
        {[...Array(5)].map((_,i) => (
          <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" style={{ opacity: 1 - i * 0.15 }} />
        ))}
      </div>
    </div>
  );
}
function ErrorState({ error, onRetry }) {
  return (
    <div className="p-8 text-center space-y-3">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="text-sm font-bold text-slate-900">Failed to load transactions</h3>
      <p className="text-xs text-slate-500 max-w-md mx-auto">{error}</p>
      <button type="button" onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm transition-all cursor-pointer">
        <RefreshCw className="h-3.5 w-3.5" /> Try Again
      </button>
    </div>
  );
}
function EmptyState({ filterType, searchQuery, onReset }) {
  const getFilterMessage = () => {
    if (searchQuery) return `No results for "${searchQuery}"`;
    if (filterType === "KADAN_REPAYMENT") return "No Kadan repayment records found.";
    if (filterType === "BILLS") return "No bill transactions recorded yet.";
    if (filterType === "CREDIT_CUSTOMERS") return "No credit customer transactions found.";
    return "No customer transactions recorded yet.";
  };

  return (
    <div className="p-12 text-center space-y-2">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Receipt className="h-6 w-6" />
      </div>
      <h3 className="text-sm font-bold text-slate-800">No transactions found</h3>
      <p className="text-xs text-slate-500 max-w-sm mx-auto">
        {getFilterMessage()}
      </p>
      {(filterType !== "ALL" || searchQuery) && (
        <button type="button" onClick={onReset}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer">
          <X className="h-3.5 w-3.5" /> Clear filters
        </button>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   RECEIVE CREDIT REPAYMENT MODAL
   Calls: POST /api/v1/kadan/customer/{customer_id}/payment
   Payload: { amount, payment_method, notes? }
   Response: KadanPaymentResponse (remaining_outstanding, paid_amount …)
───────────────────────────────────────────── */
function ReceiveCreditRepaymentModal({ customer, customersList = [], balances = {}, onClose, onSuccess }) {
  const [selectedCustId, setSelectedCustId] = useState(String(customer.id));
  // Always use String() for consistent key lookup
  const currentBalance = balances[String(selectedCustId)] ?? customer.balance ?? 0;
  const currentCust    = customersList.find((c) => String(c.id) === String(selectedCustId)) || customer;

  const [amount,        setAmount]        = useState(currentBalance > 0 ? String(currentBalance) : "");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [notes,         setNotes]         = useState("");
  const [isSubmitting,  setIsSubmitting]  = useState(false);
  const [errorMessage,  setErrorMessage]  = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) { setErrorMessage("Enter an amount greater than ₹0."); return; }
    const activeBalance = balances[String(selectedCustId)] ?? currentBalance;
    if (activeBalance > 0 && parsedAmount > activeBalance) {
      setErrorMessage(`Amount cannot exceed outstanding balance of ${fmt(activeBalance)}.`); return;
    }
    setIsSubmitting(true); setErrorMessage("");
    try {
      await kadanApi.receivePayment(selectedCustId, {
        amount: parsedAmount,
        payment_method: paymentMethod,
        notes: notes.trim() || null,
      });
      onSuccess(currentCust.name, parsedAmount);
      onClose();
    } catch (err) {
      console.error("Failed to record credit repayment:", err);
      setErrorMessage(err?.message || "Failed to record repayment. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
      role="dialog" aria-modal="true" aria-labelledby="credit-repayment-modal-title">
      <form onSubmit={handleSubmit}
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl space-y-3.5 sm:space-y-4">

        <div className="flex items-start justify-between">
          <div>
            <h3 id="credit-repayment-modal-title" className="text-lg font-extrabold text-slate-900 tracking-tight">
              Record Credit Repayment
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">Customer repays outstanding credit balance.</p>
          </div>
          <button type="button" onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Customer selector (shown only when multiple credit customers) */}
        {customersList.length > 1 && (
          <div>
            <label htmlFor="repay-customer-select" className="block text-xs font-bold text-slate-700 mb-1">Customer *</label>
            <select id="repay-customer-select" value={selectedCustId}
              onChange={(e) => { const newId = String(e.target.value); setSelectedCustId(newId); const b = balances[newId]||0; setAmount(b>0?String(b):""); setErrorMessage(""); }}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-100 cursor-pointer">
              {customersList.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.phone?` (${c.phone})`:""} — Bal: {fmt(balances[c.id]||0)}</option>
              ))}
            </select>
          </div>
        )}

        {/* Outstanding balance notice */}
        <div className="rounded-2xl bg-rose-50 border border-rose-200/80 p-3.5 flex items-center justify-between text-xs">
          <span className="font-semibold text-rose-900">Outstanding Credit Balance:</span>
          <span className="font-black text-rose-700 text-sm">{fmt(currentBalance)}</span>
        </div>

        {errorMessage && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
            {errorMessage}
          </div>
        )}

        {/* Repayment amount */}
        <div>
          <label htmlFor="repay-amount" className="block text-xs font-bold text-slate-700 mb-1">Repayment Amount (₹) *</label>
          <input id="repay-amount" type="number" min="1" step="any" value={amount} onChange={(e)=>setAmount(e.target.value)} required
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-bold text-slate-900 focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-100"
            placeholder="e.g. 500" />
        </div>

        {/* Payment method */}
        <div>
          <label htmlFor="repay-method" className="block text-xs font-bold text-slate-700 mb-1">Payment Method *</label>
          <select id="repay-method" value={paymentMethod} onChange={(e)=>setPaymentMethod(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-100 cursor-pointer">
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="CARD">Card</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="repay-notes" className="block text-xs font-bold text-slate-700 mb-1">Note (Optional)</label>
          <input id="repay-notes" type="text" value={notes} onChange={(e)=>setNotes(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-100"
            placeholder="e.g. Received via cash counter" />
        </div>

        {/* Actions */}
        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button type="button" onClick={onClose} disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" id="confirm-repayment-btn" disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50">
            {isSubmitting
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>
              : <><Wallet className="h-3.5 w-3.5" /> Confirm Repayment</>}
          </button>
        </div>
      </form>
    </div>
  );
}

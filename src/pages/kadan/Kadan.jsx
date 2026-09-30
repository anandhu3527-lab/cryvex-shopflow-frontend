import { useState, useMemo, useEffect } from "react";
import { kadanDataService } from "../../services/data/kadanDataService";

// Helper: Format INR currency
const formatINR = (val) => `₹${Number(val || 0).toLocaleString("en-IN")}`;

// Helper: Format date
const formatDate = (dateObj = new Date()) => {
  return dateObj.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const normalizeKadanRecords = (data) => (Array.isArray(data) ? data : []).map((item) => {
  const balance = Number(item.outstanding_amount ?? item.outstanding_balance ?? item.balance ?? 0);
  const totalCredit = Number(item.total_kadan_amount ?? item.total_credit ?? item.totalCredit ?? 0);

  return {
  id: item.customer_id || item.customerId || item.id,
  accountId: item.account_id || item.accountId,
  customer: item.customer_name || item.customer || "Customer",
  phone: item.customer_phone || item.phone || "",
  totalCredit,
  paid: totalCredit ? totalCredit - balance : null,
  balance,
  lastTransaction: item.last_transaction_date || item.created_at
    ? new Date(item.last_transaction_date || item.created_at).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
      })
    : (item.lastTransaction || "-"),
  ledger: item.ledger || [],
  };
});

/* ─────────────────────────────────────────────────────────────────────────────
   RECORD PAYMENT MODAL
───────────────────────────────────────────────────────────────────────────── */
function RecordPaymentModal({ item, onClose, onSave }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const num = Number(amount);
    if (!amount || isNaN(num) || num <= 0) {
      setError("Please enter a valid payment amount greater than ₹0.");
      return;
    }
    if (num > item.balance) {
      setError(`Payment cannot exceed outstanding balance of ${formatINR(item.balance)}.`);
      return;
    }
    onSave(item.id, num, method, notes);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="record-payment-title"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-fade-in border border-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 id="record-payment-title" className="text-base font-bold text-slate-900">
              Record Kadan Payment
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{item.customer} • {item.phone}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Balance overview banner */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex justify-between items-center text-xs">
            <div>
              <span className="text-slate-500">Outstanding Balance</span>
              <p className="font-bold text-rose-600 text-sm">{formatINR(item.balance)}</p>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="kadan-pay-amount" className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Amount (₹) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 font-semibold text-sm">₹</span>
              <input
                id="kadan-pay-amount"
                type="number"
                step="any"
                min="1"
                max={item.balance}
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError("");
                }}
                className={`w-full pl-8 pr-3 py-2 text-sm rounded-xl border ${
                  error ? "border-rose-400 ring-1 ring-rose-300" : "border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                } outline-none transition-all`}
                autoFocus
              />
            </div>
            {error && <p className="text-xs text-rose-600 mt-1 font-medium">{error}</p>}
            {/* Quick full-settle button */}
            <button
              type="button"
              onClick={() => {
                setAmount(item.balance);
                setError("");
              }}
              className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold mt-1 inline-block"
            >
              Pay full outstanding balance ({formatINR(item.balance)})
            </button>
          </div>

          {/* Payment Method */}
          <div>
            <label htmlFor="kadan-pay-method" className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Method
            </label>
            <select
              id="kadan-pay-method"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white transition-all"
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI / QR Code</option>
              <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="kadan-pay-notes" className="block text-xs font-semibold text-slate-700 mb-1">
              Reference / Note <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              id="kadan-pay-notes"
              type="text"
              placeholder="e.g. UPI ref or receipt number"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
            >
              Confirm Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   VIEW LEDGER MODAL
───────────────────────────────────────────────────────────────────────────── */
function ViewLedgerModal({ item, onClose, onOpenPayment }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ledger-modal-title"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 animate-fade-in border border-slate-100 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 id="ledger-modal-title" className="text-base font-bold text-slate-900">
              Customer Kadan Statement
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{item.customer} • {item.phone}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Balance Metrics Card */}
        <div className="grid grid-cols-3 gap-2 my-4 shrink-0 text-center">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-500 font-medium">Total Credit</span>
            <p className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5">{formatINR(item.totalCredit)}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100">
            <span className="text-[11px] text-blue-600 font-medium">Paid</span>
            <p className="text-xs sm:text-sm font-bold text-blue-600 mt-0.5">{formatINR(item.paid)}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-50/60 border border-rose-100">
            <span className="text-[11px] text-rose-600 font-medium">Balance</span>
            <p className="text-xs sm:text-sm font-bold text-rose-600 mt-0.5">{formatINR(item.balance)}</p>
          </div>
        </div>

        {/* Ledger Transaction History List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Transaction History</h3>
          {(!item.ledger || item.ledger.length === 0) ? (
            <p className="text-xs text-slate-400 py-4 text-center">No transaction records found.</p>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
              {item.ledger.map((tx) => {
                const isCredit = tx.type === "Credit";
                return (
                  <div key={tx.id} className="p-3 flex items-center justify-between hover:bg-slate-50/80 transition-colors text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isCredit ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"
                      }`}>
                        {isCredit ? (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{tx.note || (isCredit ? "Credit Extended" : "Payment Received")}</p>
                        <p className="text-[11px] text-slate-400">{tx.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`font-bold ${isCredit ? "text-rose-600" : "text-emerald-600"}`}>
                        {isCredit ? `+${formatINR(tx.amount)}` : `-${formatINR(tx.amount)}`}
                      </span>
                      <p className="text-[10px] text-slate-400 capitalize">{tx.type}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Close
          </button>
          {item.balance > 0 && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPayment(item);
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
            >
              <span>Record Payment</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ADD NEW KADAN ENTRY MODAL
───────────────────────────────────────────────────────────────────────────── */
function AddKadanModal({ onClose, onSave }) {
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!customer.trim()) errs.customer = "Customer name is required.";
    const digits = phone.replace(/\D/g, "");
    if (!digits) errs.phone = "Phone number is required.";
    else if (digits.length !== 10) errs.phone = "Enter valid 10-digit mobile number.";
    const num = Number(amount);
    if (!amount || isNaN(num) || num <= 0) errs.amount = "Enter valid credit amount.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      customer: customer.trim(),
      phone: phone.replace(/\D/g, ""),
      totalCredit: Number(amount),
      paid: 0,
      balance: Number(amount),
      lastTransaction: formatDate(),
      note: note.trim() || "Initial Kadan Credit",
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-kadan-title"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-fade-in border border-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h2 id="add-kadan-title" className="text-base font-bold text-slate-900">
            Add Customer Kadan Credit
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label htmlFor="new-kd-cust" className="block text-xs font-semibold text-slate-700 mb-1">
              Customer Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="new-kd-cust"
              type="text"
              placeholder="e.g. Ramesh Patel"
              value={customer}
              onChange={(e) => {
                setCustomer(e.target.value);
                if (errors.customer) setErrors((prev) => ({ ...prev, customer: undefined }));
              }}
              className={`w-full px-3 py-2 text-sm rounded-xl border ${
                errors.customer ? "border-rose-400 ring-1 ring-rose-300" : "border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              } outline-none transition-all`}
              autoFocus
            />
            {errors.customer && <p className="text-xs text-rose-600 mt-1 font-medium">{errors.customer}</p>}
          </div>

          <div>
            <label htmlFor="new-kd-phone" className="block text-xs font-semibold text-slate-700 mb-1">
              Mobile Number <span className="text-rose-500">*</span>
            </label>
            <input
              id="new-kd-phone"
              type="tel"
              maxLength={10}
              placeholder="10-digit mobile number"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
              }}
              className={`w-full px-3 py-2 text-sm rounded-xl border ${
                errors.phone ? "border-rose-400 ring-1 ring-rose-300" : "border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              } outline-none transition-all`}
            />
            {errors.phone && <p className="text-xs text-rose-600 mt-1 font-medium">{errors.phone}</p>}
          </div>

          <div>
            <label htmlFor="new-kd-amt" className="block text-xs font-semibold text-slate-700 mb-1">
              Credit Amount (₹) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 font-semibold text-sm">₹</span>
              <input
                id="new-kd-amt"
                type="number"
                step="any"
                min="1"
                placeholder="Enter credit balance"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
                }}
                className={`w-full pl-8 pr-3 py-2 text-sm rounded-xl border ${
                  errors.amount ? "border-rose-400 ring-1 ring-rose-300" : "border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                } outline-none transition-all`}
              />
            </div>
            {errors.amount && <p className="text-xs text-rose-600 mt-1 font-medium">{errors.amount}</p>}
          </div>

          <div>
            <label htmlFor="new-kd-note" className="block text-xs font-semibold text-slate-700 mb-1">
              Reason / Reference Bill <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              id="new-kd-note"
              type="text"
              placeholder="e.g. Bill #INV-0430"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
            >
              Add Credit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CONFIRM SETTLE / DELETE MODAL
───────────────────────────────────────────────────────────────────────────── */
/* ─────────────────────────────────────────────────────────────────────────────
   MAIN KADAN MANAGEMENT COMPONENT
───────────────────────────────────────────────────────────────────────────── */
export default function Kadan({ searchTerm = "" }) {
  const [kadanList, setKadanList] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [selectedPaymentItem, setSelectedPaymentItem] = useState(null);
  const [selectedLedgerItem, setSelectedLedgerItem] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Load live Kadan accounts from backend on mount
  useEffect(() => {
    let isMounted = true;
    kadanDataService.getKadanRecords().then((data) => {
      if (isMounted) {
        setKadanList(normalizeKadanRecords(data));
        setLoadError("");
      }
    }).catch((error) => {
      if (isMounted) setLoadError(error?.message || "Could not load Kadan records.");
    });
    return () => { isMounted = false; };
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // Filter list based on top or local search term
  const filteredList = useMemo(() => {
    if (!searchTerm.trim()) return kadanList;
    const q = searchTerm.toLowerCase();
    return kadanList.filter(
      (k) =>
        k.customer.toLowerCase().includes(q) ||
        k.phone.includes(q)
    );
  }, [kadanList, searchTerm]);

  // Total Pending Credit calculated dynamically from current balances
  const totalPendingCredit = useMemo(() => {
    return kadanList.reduce((sum, item) => sum + (Number(item.balance) || 0), 0);
  }, [kadanList]);

  // Handler: Record Payment
  const handleSavePayment = async (id, amountPaid, method, notes) => {
    try {
      await kadanDataService.receivePayment(id, {
        amount: amountPaid,
        payment_method: method,
        notes: notes.trim() || null,
      });
      const records = await kadanDataService.getKadanRecords();
      setKadanList(normalizeKadanRecords(records));
      setSelectedPaymentItem(null);
      showToast(`Payment of ${formatINR(amountPaid)} recorded successfully.`);
    } catch (error) {
      showToast(error?.message || "Could not record payment.");
    }
  };

  const handleViewLedger = async (item) => {
    try {
      const [account, transactions] = await Promise.all([
        kadanDataService.getCustomerLedger(item.id),
        kadanDataService.getCustomerTransactions(item.id),
      ]);
      const totalCredit = Number(account.total_kadan_amount || 0);
      const balance = Number(account.outstanding_amount || 0);
      setSelectedLedgerItem({
        ...item,
        totalCredit,
        paid: totalCredit - balance,
        balance,
        ledger: (Array.isArray(transactions) ? transactions : []).map((transaction) => {
          const transactionType = String(transaction.transaction_type || "").toUpperCase();
          return {
            id: transaction.transaction_id,
            date: transaction.created_at
              ? new Date(transaction.created_at).toLocaleDateString("en-IN", {
                  day: "2-digit", month: "short", year: "numeric",
                })
              : "-",
            type: transactionType.includes("CREDIT") || transactionType.includes("BILL") ? "Credit" : "Payment",
            amount: Number(transaction.amount || 0),
            note: transaction.notes || transaction.bill_number || "",
          };
        }),
      });
    } catch (error) {
      showToast(error?.message || "Could not load this Kadan statement.");
    }
  };

  // Handler: Add New Kadan Credit
  const handleAddKadan = (newData) => {
    const newEntry = {
      id: `kd-${Date.now()}`,
      customer: newData.customer,
      phone: newData.phone,
      totalCredit: newData.totalCredit,
      paid: 0,
      balance: newData.balance,
      lastTransaction: newData.lastTransaction,
      ledger: [
        {
          id: `tx-${Date.now()}`,
          date: newData.lastTransaction,
          type: "Credit",
          amount: newData.totalCredit,
          note: newData.note,
        },
      ],
    };
    setKadanList((prev) => [newEntry, ...prev]);
    setShowAddModal(false);
    showToast(`Kadan account created for ${newData.customer}.`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast notification */}
      {toastMessage && (
        <div
          className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-slate-700 animate-fade-in text-xs sm:text-sm"
          role="status"
        >
          <span className="text-emerald-400 font-bold" aria-hidden="true">✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Title: Kadan Overview */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1527] tracking-tight">
          Kadan Overview
        </h1>
      </div>

      {/* ── 1. Top Card: Total Pending Credit ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-2xs">
        <div>
          <span className="text-xs sm:text-sm font-medium text-slate-500">
            Total Pending Credit
          </span>
          <p className="text-3xl sm:text-4xl font-extrabold text-[#C92A2A] tracking-tight mt-1">
            {formatINR(totalPendingCredit)}
          </p>
        </div>
      </div>

      {/* ── 2. Table Card: Customer Kadan List ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Card Header with Title */}
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Customer Kadan List
          </h2>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/40 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th scope="col" className="py-3.5 px-6">Customer</th>
                <th scope="col" className="py-3.5 px-6">Phone</th>
                <th scope="col" className="py-3.5 px-6">Outstanding</th>
                <th scope="col" className="py-3.5 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-slate-600 mb-1">
                      {loadError ? "Could not load Kadan records" : "No Kadan records found"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {loadError || (searchTerm
                        ? `No results matching "${searchTerm}"`
                        : "No accounts were returned by the backend.")}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/70 transition-colors duration-150"
                  >
                    {/* Customer */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className="font-semibold text-slate-800">
                        {item.customer}
                      </span>
                    </td>

                    {/* Phone */}
                    <td className="py-4 px-6 text-slate-600 font-mono text-xs whitespace-nowrap">
                      {item.phone}
                    </td>

                    {/* Outstanding */}
                    <td className="py-4 px-6 font-medium text-slate-800 whitespace-nowrap">
                      {formatINR(item.balance)}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleViewLedger(item)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        View statement
                      </button>
                      {item.balance > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedPaymentItem(item)}
                          className="ml-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
                        >
                          Record payment
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Dialog Modals ── */}
      {selectedPaymentItem && (
        <RecordPaymentModal
          item={selectedPaymentItem}
          onClose={() => setSelectedPaymentItem(null)}
          onSave={handleSavePayment}
        />
      )}

      {selectedLedgerItem && (
        <ViewLedgerModal
          item={selectedLedgerItem}
          onClose={() => setSelectedLedgerItem(null)}
          onOpenPayment={(item) => setSelectedPaymentItem(item)}
        />
      )}

      {showAddModal && (
        <AddKadanModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddKadan}
        />
      )}
    </div>
  );
}

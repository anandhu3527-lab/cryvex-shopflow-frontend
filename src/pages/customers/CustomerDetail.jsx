import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { customerDataService } from "../../services/data/customerDataService";
import { kadanDataService } from "../../services/data/kadanDataService";

const formatINR = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

function PaymentModal({ customerName, balance, onClose, onSubmit }) {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter an amount greater than ₹0.");
      return;
    }
    if (balance > 0 && parsedAmount > balance) {
      setError(`Amount cannot exceed the pending credit of ${formatINR(balance)}.`);
      return;
    }
    if (!paymentMethod) {
      setError("Select a payment method.");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      await onSubmit({
        amount: parsedAmount,
        payment_method: paymentMethod,
        notes: notes.trim() || null,
      });
    } catch (submitError) {
      setError(submitError?.message || "Could not record payment.");
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1527]/55 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="payment-modal-title">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="payment-modal-title" className="text-lg font-bold text-[#0B1527]">Receive Payment</h2>
            <p className="mt-1 text-sm text-slate-500">For {customerName}</p>
          </div>
          <button type="button" onClick={onClose} disabled={isSaving} aria-label="Close payment dialog" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="mb-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
          <span className="text-slate-600">Pending credit</span>
          <strong className="text-rose-700">{formatINR(balance)}</strong>
        </div>
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-slate-700" htmlFor="payment-amount">
            Amount <span className="text-rose-600">*</span>
            <input id="payment-amount" type="number" min="0.01" step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="block text-sm font-semibold text-slate-700" htmlFor="payment-method">
            Payment Method <span className="text-rose-600">*</span>
            <select id="payment-method" required value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
              <option value="" disabled>Select a method</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="cheque">Cheque</option>
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-700" htmlFor="payment-notes">
            Notes <span className="font-normal text-slate-400">(optional)</span>
            <textarea id="payment-notes" rows={3} maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </label>
        </div>
        {error && <p className="mt-3 text-sm text-rose-600" role="alert">{error}</p>}
        <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} disabled={isSaving} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={isSaving} className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">{isSaving ? "Saving…" : "Receive Payment"}</button>
        </div>
      </form>
    </div>
  );
}

function SectionHeading({ title, count, expanded, onToggle }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <h2 className="text-base font-bold text-[#0B1527]">{title}</h2>
        {count !== undefined && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{count}</span>}
      </div>
      <button type="button" onClick={onToggle} className="shrink-0 text-xs font-bold text-blue-700 hover:text-blue-900">{expanded ? "Show less" : "View all"}</button>
    </div>
  );
}

function ErrorMessage({ children }) {
  return <p role="alert" className="px-5 py-4 text-sm text-rose-700 sm:px-6">{children}</p>;
}

export default function CustomerDetail() {
  const { customerId, id } = useParams();
  const location = useLocation();
  const resolvedCustomerId = customerId || id;
  const navigate = useNavigate();
  const backPath = location.pathname.startsWith("/kadan/") ? "/kadan" : "/customers";
  const backLabel = backPath === "/kadan" ? "Back to Kadan Management" : "Customers";
  const [customer, setCustomer] = useState(null);
  const [kadan, setKadan] = useState(null);
  const [bills, setBills] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(Boolean(resolvedCustomerId));
  const [customerError, setCustomerError] = useState("");
  const [kadanError, setKadanError] = useState("");
  const [billsError, setBillsError] = useState("");
  const [transactionsError, setTransactionsError] = useState("");
  const [showAllBills, setShowAllBills] = useState(false);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    let isCurrent = true;
    if (!resolvedCustomerId) {
      return undefined;
    }

    Promise.allSettled([
      customerDataService.getCustomerById(resolvedCustomerId),
      customerDataService.getCustomerBills(resolvedCustomerId),
      kadanDataService.getCustomerLedger(resolvedCustomerId),
      kadanDataService.getCustomerTransactions(resolvedCustomerId),
    ]).then(([customerResult, billsResult, kadanResult, transactionsResult]) => {
      if (!isCurrent) return;
      if (customerResult.status === "fulfilled") setCustomer(customerResult.value);
      else setCustomerError(customerResult.reason?.message || "Could not load customer details.");
      if (billsResult.status === "fulfilled") setBills(Array.isArray(billsResult.value) ? billsResult.value : []);
      else setBillsError(billsResult.reason?.message || "Could not load customer bills.");
      if (kadanResult.status === "fulfilled") setKadan(kadanResult.value);
      else if (kadanResult.reason?.details?.status !== 404) setKadanError(kadanResult.reason?.message || "Could not load Kadan details.");
      if (transactionsResult.status === "fulfilled") setTransactions(Array.isArray(transactionsResult.value) ? transactionsResult.value : []);
      else if (transactionsResult.reason?.details?.status !== 404) setTransactionsError(transactionsResult.reason?.message || "Could not load Kadan history.");
      setIsLoading(false);
    });

    return () => { isCurrent = false; };
  }, [resolvedCustomerId]);

  const outstanding = Number(kadan?.outstanding_amount || 0);
  const totalPurchases = customer?.summary?.total_purchase_amount;
  const name = customer?.name || kadan?.customer_name || "Customer";
  const phone = customer?.phone || kadan?.customer_phone || "";
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("");
  const visibleBills = showAllBills ? bills : bills.slice(0, 5);
  const visibleTransactions = showAllTransactions ? transactions : transactions.slice(0, 5);

  const refreshKadan = async () => {
    const [kadanResult, transactionsResult] = await Promise.allSettled([
      kadanDataService.getCustomerLedger(resolvedCustomerId),
      kadanDataService.getCustomerTransactions(resolvedCustomerId),
    ]);
    if (kadanResult.status === "fulfilled") {
      setKadan(kadanResult.value);
      setKadanError("");
    } else {
      setKadanError(kadanResult.reason?.message || "Payment was saved, but Kadan details could not be refreshed.");
    }
    if (transactionsResult.status === "fulfilled") {
      setTransactions(Array.isArray(transactionsResult.value) ? transactionsResult.value : []);
      setTransactionsError("");
    } else {
      setTransactionsError(transactionsResult.reason?.message || "Payment was saved, but Kadan history could not be refreshed.");
    }
  };

  const receivePayment = async (payment) => {
    await kadanDataService.receivePayment(resolvedCustomerId, payment);
    setIsPaymentOpen(false);
    setToast("Payment received successfully.");
    await refreshKadan();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-8">
      <button type="button" onClick={() => navigate(backPath)} className="inline-flex items-center gap-2 py-1 text-sm font-semibold text-slate-500 hover:text-[#0B1527]">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        {backLabel}
      </button>

      {!resolvedCustomerId && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">A customer ID is required to open this profile.</div>}
      {customerError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{customerError}</div>}
      {isLoading ? (
        <div className="flex min-h-56 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-500">Loading customer profile…</div>
      ) : customer && (
        <>
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="h-1.5 bg-gradient-to-r from-[#0B1527] via-blue-700 to-sky-400" />
            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg font-extrabold text-blue-800 sm:h-16 sm:w-16">{initials || "C"}</div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Customer profile</p>
                  <h1 className="mt-1 break-words text-2xl font-extrabold text-[#0B1527] sm:text-3xl">{name}</h1>
                  <p className="mt-1 text-sm text-slate-500">{phone || "Phone not provided"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                <button type="button" onClick={() => navigate("/quick-bill", { state: { customer } })} className="rounded-xl bg-[#0B1527] px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800">Create Bill</button>
                <button type="button" onClick={() => setIsPaymentOpen(true)} className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-800 hover:bg-blue-100">Add Payment</button>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Purchases</p>
              {isLoading ? <p className="mt-3 text-xl text-slate-400">Loading…</p> : totalPurchases === undefined ? <p className="mt-3 text-xl font-extrabold text-slate-400">Not available</p> : <p className="mt-2 text-2xl font-extrabold text-[#0B1527]">{formatINR(totalPurchases)}</p>}
              <p className="mt-1 text-xs text-slate-400">{customer.summary?.total_bills ?? 0} bills recorded</p>
            </div>
            <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-rose-700">Pending Credit</p>
                  {kadanError ? <p className="mt-2 text-sm text-rose-600">Unavailable</p> : <p className="mt-2 text-2xl font-extrabold text-rose-700">{formatINR(outstanding)}</p>}
                </div>
                <button type="button" onClick={() => setIsPaymentOpen(true)} className="rounded-xl bg-rose-700 px-3 py-2 text-xs font-bold text-white hover:bg-rose-800">Pay / Receive Payment</button>
              </div>
              {kadanError && <p className="mt-2 text-xs text-rose-600" role="alert">{kadanError}</p>}
              {kadan && <p className="mt-1 text-xs text-slate-500">Total Kadan: {formatINR(kadan.total_kadan_amount)}</p>}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <SectionHeading title="Recent Purchases" count={bills.length} expanded={showAllBills} onToggle={() => setShowAllBills((value) => !value)} />
            {billsError ? <ErrorMessage>{billsError}</ErrorMessage> : visibleBills.length === 0 ? <p className="px-5 py-8 text-center text-sm text-slate-500 sm:px-6">No purchases recorded for this customer.</p> : (
              <div className="divide-y divide-slate-100">
                {visibleBills.map((bill) => (
                  <div key={bill.bill_id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 sm:px-6">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">Bill {bill.bill_number}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{formatDate(bill.created_at)} · {bill.status}</p>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-[#0B1527]">{formatINR(bill.total_amount)}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <SectionHeading title="Kadan (Credit) History" count={transactions.length} expanded={showAllTransactions} onToggle={() => setShowAllTransactions((value) => !value)} />
            {transactionsError ? <ErrorMessage>{transactionsError}</ErrorMessage> : visibleTransactions.length === 0 ? <p className="px-5 py-8 text-center text-sm text-slate-500 sm:px-6">No Kadan transactions recorded.</p> : (
              <div className="divide-y divide-slate-100">
                {visibleTransactions.map((transaction) => {
                  const isCredit = /CREDIT|BILL|DEBIT/i.test(transaction.transaction_type || "");
                  return (
                    <div key={transaction.transaction_id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 sm:px-6">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{transaction.notes || transaction.bill_number || transaction.transaction_type}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{formatDate(transaction.created_at)}{transaction.bill_number ? ` · Bill ${transaction.bill_number}` : ""}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`text-sm font-bold ${isCredit ? "text-rose-700" : "text-emerald-700"}`}>{isCredit ? "+" : "−"}{formatINR(transaction.amount)}</p>
                        <p className="mt-0.5 text-[11px] capitalize text-slate-400">{(transaction.transaction_type || "").toLowerCase().replaceAll("_", " ")} · balance {formatINR(transaction.balance_after)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      {isPaymentOpen && <PaymentModal customerName={name} balance={outstanding} onClose={() => setIsPaymentOpen(false)} onSubmit={receivePayment} />}
      {toast && <div role="status" aria-live="polite" className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-[#0B1527] px-5 py-3 text-sm font-semibold text-white shadow-xl">{toast}</div>}
    </div>
  );
}
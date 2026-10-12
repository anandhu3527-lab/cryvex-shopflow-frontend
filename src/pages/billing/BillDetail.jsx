import { useEffect, useState, useCallback, useId } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { billingApi } from "../../services/api/billingApi";
import { kadanDataService } from "../../services/data/kadanDataService";
import { customerDataService } from "../../services/data/customerDataService";
import { formatINRWithPaise } from "../../utils/formatting/currency";
import { formatDateTime } from "../../utils/formatting/date";
import { 
  ArrowLeft, Printer, Share2, Receipt, CheckCircle2, Clock, User, 
  CreditCard, Wallet, Banknote, AlertCircle, X, Check, Copy, CheckCheck
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

/**
 * Modal to record Kadan payment for a single bill / customer
 * Calls POST /api/v1/kadan/customer/{customer_id}/payment
 * { "amount": number, "payment_method": string, "notes": string }
 */
function KadanPaymentModal({
  bill,
  customerId,
  customerName,
  customerPhone,
  billKadanDue,
  customerLedger,
  customersList = [],
  onClose,
  onPaymentSuccess,
}) {
  const [selectedCustomerId, setSelectedCustomerId] = useState(customerId || "");
  const [amount, setAmount] = useState(billKadanDue > 0 ? String(billKadanDue) : "1");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState(
    bill?.bill_number ? `Payment for Bill #${bill.bill_number}` : "Bill payment"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [copiedTxn, setCopiedTxn] = useState(false);
  const [responseResult, setResponseResult] = useState(null);
  const customerSelectId = useId();
  const paymentAmountId = useId();
  const paymentMethodId = useId();
  const paymentNotesId = useId();

  const activeCustomerId = selectedCustomerId || customerId;

  const handleCopyTxn = (txnId) => {
    if (!txnId) return;
    navigator.clipboard?.writeText(String(txnId));
    setCopiedTxn(true);
    setTimeout(() => setCopiedTxn(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!activeCustomerId) {
      setError("Please select or specify a customer account to record Kadan payment.");
      return;
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter a valid payment amount greater than ₹0.");
      return;
    }

    if (!paymentMethod.trim()) {
      setError("Please choose a payment method.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        amount: numericAmount,
        payment_method: paymentMethod.trim().toLowerCase(),
        notes: notes.trim() || undefined,
      };

      const res = await kadanDataService.receivePayment(activeCustomerId, payload);
      const resData = res?.data || res;
      setResponseResult(resData);
      if (onPaymentSuccess) {
        onPaymentSuccess(resData);
      }
    } catch (err) {
      setError(err?.message || "Failed to record Kadan payment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1527]/60 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kadan-modal-title"
    >
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
          aria-label="Close payment modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* If payment was just completed, show the full Response Data */}
        {responseResult ? (
          <div className="space-y-5 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-50">
              <Check className="w-7 h-7 stroke-[2.5]" />
            </div>

            <div>
              <h3 id="kadan-modal-title" className="text-lg font-bold text-[#102A56]">
                Kadan Payment Received!
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                The customer ledger and bill records have been successfully updated.
              </p>
            </div>

            {/* Response Data Details Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Payment Status
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  COMPLETED
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[11px] text-slate-500 block">Amount Paid</span>
                  <span className="text-base font-extrabold text-[#102A56]">
                    {formatINRWithPaise(responseResult.paid_amount || amount)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Payment Method</span>
                  <span className="font-bold text-slate-800 uppercase">
                    {responseResult.payment_method || paymentMethod}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Remaining Due</span>
                  <span className="font-bold text-amber-700">
                    {formatINRWithPaise(responseResult.remaining_outstanding ?? 0)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Previous Due</span>
                  <span className="font-bold text-slate-600">
                    {formatINRWithPaise(responseResult.previous_outstanding ?? 0)}
                  </span>
                </div>
              </div>

              {responseResult.transaction_id && (
                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500">Transaction ID:</span>
                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-700 font-semibold bg-white px-2 py-0.5 rounded border border-slate-200">
                    <span className="truncate max-w-[170px] sm:max-w-[210px]">
                      {responseResult.transaction_id}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyTxn(responseResult.transaction_id)}
                      className="text-slate-400 hover:text-blue-600"
                      title="Copy transaction ID"
                    >
                      {copiedTxn ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {responseResult.notes && (
                <div className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200 italic">
                  Note: {responseResult.notes}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-[#075BFF] hover:bg-[#064acc] text-white text-xs font-bold transition-all shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#075BFF] flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
              <div className="min-w-0 pr-6">
                <h3 id="kadan-modal-title" className="text-base font-bold text-[#102A56]">
                  Record Kadan Payment
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Settle customer credit for Bill #{bill?.bill_number || bill?.id}
                </p>
              </div>
            </div>

            {/* Customer Summary Card */}
            <div className="p-3.5 rounded-2xl bg-[#F7FAFF] border border-[#E2E8F0] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Customer:</span>
                <span className="font-bold text-[#102A56] truncate max-w-[200px]">
                  {customerName || "Customer"} {customerPhone ? `(${customerPhone})` : ""}
                </span>
              </div>
              {billKadanDue > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Bill Credit Due:</span>
                  <span className="font-bold text-red-600">{formatINRWithPaise(billKadanDue)}</span>
                </div>
              )}
              {customerLedger?.outstanding_amount !== undefined && (
                <div className="flex items-center justify-between text-xs pt-1.5 border-t border-[#E2E8F0]">
                  <span className="text-slate-500 font-medium">Total Customer Outstanding:</span>
                  <span className="font-bold text-amber-700">
                    {formatINRWithPaise(customerLedger.outstanding_amount)}
                  </span>
                </div>
              )}
            </div>

            {/* If bill doesn't have customer_id linked, show selector */}
            {!activeCustomerId && (
              <div>
                <label htmlFor={customerSelectId} className="block text-xs font-bold text-[#102A56] mb-1">
                  Select Customer Account <span className="text-red-500">*</span>
                </label>
                <select
                  id={customerSelectId}
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 bg-white text-[#102A56] focus:border-[#075BFF] focus:outline-none"
                  required
                >
                  <option value="">-- Choose registered customer --</option>
                  {customersList.map((c) => (
                    <option key={c.id || c.customer_id} value={c.id || c.customer_id}>
                      {c.name} {c.phone ? `(${c.phone})` : ""}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-amber-600 mt-1">
                  Kadan payment requires a registered customer account.
                </p>
              </div>
            )}

            {/* Amount Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor={paymentAmountId} className="text-xs font-bold text-[#102A56]">
                  Payment Amount <span className="text-red-500">*</span>
                </label>
                {billKadanDue > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmount(String(billKadanDue))}
                    className="text-[11px] font-semibold text-[#075BFF] hover:underline"
                  >
                    Full Due: {formatINRWithPaise(billKadanDue)}
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                  ₹
                </span>
                <input
                  id={paymentAmountId}
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm font-semibold rounded-xl border border-slate-200 text-[#102A56] focus:border-[#075BFF] focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="Enter amount"
                />
              </div>

              {/* Quick amount chips */}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {billKadanDue > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmount(String(billKadanDue))}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-blue-50 text-[#075BFF] hover:bg-blue-100 border border-blue-200 transition-colors"
                  >
                    ₹{billKadanDue} (Bill Balance)
                  </button>
                )}
                {[100, 500, 1000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(String(preset))}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    ₹{preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label htmlFor={paymentMethodId} className="block text-xs font-bold text-[#102A56] mb-1.5">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5" role="group" aria-labelledby={paymentMethodId}>
                {[
                  { key: "cash", label: "Cash" },
                  { key: "upi", label: "UPI" },
                  { key: "card", label: "Card" },
                  { key: "bank_transfer", label: "Bank" },
                  { key: "cheque", label: "Cheque" },
                ].map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setPaymentMethod(m.key)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                      paymentMethod === m.key
                        ? "bg-[#075BFF] text-white border-[#075BFF] shadow-xs"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor={paymentNotesId} className="block text-xs font-bold text-[#102A56] mb-1">
                Notes <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                id={paymentNotesId}
                rows={2}
                maxLength={500}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Remarks, reference number..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 text-[#102A56] focus:border-[#075BFF] focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !activeCustomerId}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Confirm Payment</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/**
 * Modal to send receipt via WhatsApp to any mobile number
 */
function ShareWhatsAppModal({ bill, customerName, defaultPhone, shopName: propShopName, onClose }) {
  const { currentTenant, currentUser } = useAuth();
  const shopName = propShopName || currentTenant?.name || currentTenant?.business_name || currentTenant?.shopName || currentTenant?.shop_name || currentUser?.shop?.name || currentUser?.shop_name || "";
  const [phone, setPhone] = useState(defaultPhone ? defaultPhone.replace(/\D/g, "").slice(-10) : "");
  const [error, setError] = useState("");

  const handleSend = () => {
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    const total = Number(bill.total_amount || 0);
    const discount = Number(
      bill.discount_amount ??
      bill.discount ??
      (bill.items?.reduce((sum, item) => sum + Number(item.discount_amount || item.discount || 0), 0) || 0)
    );
    const itemsTotal = (bill.items || []).reduce(
      (sum, item) => sum + (Number(item.price || item.unit_price || 0) * Number(item.quantity || 1)),
      0
    );
    const subtotal = Number(bill.subtotal ?? (itemsTotal > 0 ? itemsTotal : total + discount));
    const paid = Array.isArray(bill.payments) 
      ? bill.payments.filter((p) => p.status === "COMPLETED").reduce((sum, p) => sum + Number(p.amount || 0), 0)
      : Number(bill.paid_amount || 0);
    const kadan = Math.max(0, total - paid);

    const shopHeader = shopName ? `*${shopName.toUpperCase()}*\n` : "";
    let text = `${shopHeader}INVOICE\n--------------------------\nBill No: #${bill.bill_number || bill.id}\nDate: ${bill.created_at ? formatDateTime(new Date(bill.created_at)) : ""}\nCustomer: ${customerName}\n\n`;
    
    (bill.items || []).forEach((item) => {
      const name = item.item_name || item.product_name || item.name || "Item";
      const itemQty = Number(item.quantity || 1);
      const itemPrice = Number(item.price || item.unit_price || 0);
      text += `${name} x ${itemQty} = ₹${(itemPrice * itemQty).toFixed(2)}\n`;
    });

    if (discount > 0) {
      text += `\nSubtotal: ₹${subtotal.toFixed(2)}`;
      text += `\nDiscount: -₹${discount.toFixed(2)}`;
    }
    text += `\nTotal: ₹${total.toFixed(2)}`;
    text += `\nPaid: ₹${paid.toFixed(2)}`;
    if (kadan > 0) text += `\nBalance (Kadan): ₹${kadan.toFixed(2)}`;
    text += `\n\nThank you for shopping with ${shopName || "us"}!`;

    window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(text)}`, "_blank");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1527]/60 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-150 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#25D366] flex items-center justify-center shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#102A56]">Share Bill via WhatsApp</h3>
              <p className="text-xs text-slate-500">Send this bill invoice to any mobile number</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
          <div>
            <span className="text-slate-500 block">Bill #{bill.bill_number || bill.id}</span>
            <span className="font-bold text-[#102A56]">{customerName}</span>
          </div>
          <span className="text-sm font-black text-slate-900">
            {formatINRWithPaise(Number(bill.total_amount || 0))}
          </span>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">
            Enter WhatsApp Mobile Number
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-xs font-bold pointer-events-none">
              +91
            </span>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              autoFocus
              placeholder="Enter 10-digit mobile number"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="w-full pl-12 pr-3 py-2.5 text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-400/20 shadow-2xs placeholder-slate-400"
            />
          </div>
          {error && <p className="text-[11px] font-bold text-rose-600">{error}</p>}
          <p className="text-[11px] text-slate-400">
            You can enter any customer mobile number to send the digital receipt.
          </p>
        </div>

        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            className="flex-1 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Send on WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BillDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentTenant, currentUser } = useAuth();
  const effectiveShopName = (
    currentTenant?.name ||
    currentTenant?.business_name ||
    currentTenant?.shopName ||
    currentTenant?.shop_name ||
    currentUser?.shop?.name ||
    currentUser?.shop_name ||
    ""
  ).trim();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);

  // Kadan & Customer state
  const [customerLedger, setCustomerLedger] = useState(null);
  const [resolvedCustomerId, setResolvedCustomerId] = useState("");
  const [customersList, setCustomersList] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [latestPaymentResponse, setLatestPaymentResponse] = useState(null);

  const loadBill = useCallback(async () => {
    try {
      const res = await billingApi.getBillById(id);
      const billData = res?.data || res;
      setBill(billData);
      return billData;
    } catch (err) {
      setError(err.message || "Failed to load bill");
      return null;
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    loadBill().finally(() => setLoading(false));
  }, [loadBill]);

  // Load customer ledger if customer is linked
  useEffect(() => {
    if (!bill) return;

    const directCustomerId = 
      bill.customer_id || 
      bill.customer?.id || 
      bill.customer?.customer_id || 
      bill.customerId;

    if (directCustomerId) {
      setResolvedCustomerId(directCustomerId);
      kadanDataService.getCustomerLedger(directCustomerId)
        .then(res => setCustomerLedger(res?.data || res))
        .catch(() => setCustomerLedger(null));
    } else {
      // Check if customer can be found via phone
      const phone = bill.customer_phone || bill.customer?.phone;
      customerDataService.getCustomers()
        .then(res => {
          const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
          setCustomersList(list);
          if (phone) {
            const cleanPhone = phone.replace(/\D/g, "");
            const match = list.find(c => c.phone && c.phone.replace(/\D/g, "") === cleanPhone);
            if (match?.id) {
              setResolvedCustomerId(match.id);
              kadanDataService.getCustomerLedger(match.id)
                .then(lRes => setCustomerLedger(lRes?.data || lRes))
                .catch(() => {});
            }
          }
        })
        .catch(() => {});
    }
  }, [bill]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center">
        <div className="w-8 h-8 border-3 border-[#075BFF] border-t-transparent rounded-full animate-spin mb-3"></div>
        <div className="text-sm font-semibold text-[#102A56]">Loading invoice details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 white-card text-center border-red-200">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-3">
          !
        </div>
        <h3 className="text-base font-bold text-[#102A56] mb-1">Failed to Load Bill</h3>
        <p className="text-xs text-[#64748B] mb-4">{error}</p>
        <button onClick={() => navigate(-1)} className="btn-secondary text-xs">
          Go Back
        </button>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 white-card text-center">
        <h3 className="text-base font-bold text-[#102A56]">Bill Not Found</h3>
        <button onClick={() => navigate(-1)} className="btn-secondary text-xs mt-4">
          Go Back
        </button>
      </div>
    );
  }

  const total = Number(bill.total_amount || 0);
  const discount = Number(
    bill.discount_amount ??
    bill.discount ??
    (bill.items?.reduce((sum, item) => sum + Number(item.discount_amount || item.discount || 0), 0) || 0)
  );
  const itemsTotal = (bill.items || []).reduce(
    (sum, item) => sum + (Number(item.price || item.unit_price || 0) * Number(item.quantity || 1)),
    0
  );
  const subtotal = Number(bill.subtotal ?? (itemsTotal > 0 ? itemsTotal : total + discount));

  const paid = Array.isArray(bill.payments) 
    ? bill.payments
        .filter(payment => payment.status === "COMPLETED")
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
    : Number(bill.paid_amount || 0);
  const kadan = Math.max(0, total - paid);

  const payments = Array.isArray(bill.payments) ? bill.payments : [];
  const firstPayment = payments[0] || {};
  const pm = (firstPayment.payment_method || firstPayment.method || bill.payment_method || "").toString().toUpperCase();
  const paymentMethodLabel = pm || (kadan > 0 ? "KADAN" : "CASH");

  const effectiveCustomerId = resolvedCustomerId || bill.customer_id || bill.customer?.id || bill.customer?.customer_id;
  const customerName = bill.customer_name || bill.customer?.name || "Walk-in Customer";
  const customerPhone = bill.customer_phone || bill.customer?.phone || "";

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    const shopHeader = effectiveShopName ? `*${effectiveShopName.toUpperCase()}*\n` : "";
    let text = `${shopHeader}INVOICE\n--------------------------\nBill No: #${bill.bill_number || bill.id}\nDate: ${bill.created_at ? formatDateTime(new Date(bill.created_at)) : ""}\nCustomer: ${customerName}\n\n`;
    
    (bill.items || []).forEach(item => {
      const name = item.item_name || item.product_name || item.name || "Item";
      text += `${name} x ${item.quantity} = ₹${(Number(item.price || item.unit_price || 0) * Number(item.quantity || 1)).toFixed(2)}\n`;
    });

    if (discount > 0) {
      text += `\nSubtotal: ₹${subtotal.toFixed(2)}`;
      text += `\nDiscount: -₹${discount.toFixed(2)}`;
    }
    text += `\nTotal: ₹${total.toFixed(2)}`;
    text += `\nPaid: ₹${paid.toFixed(2)}`;
    if (kadan > 0) text += `\nBalance (Kadan): ₹${kadan.toFixed(2)}`;
    text += `\n\nThank you for shopping with ${effectiveShopName || "us"}!`;

    const phone = customerPhone.replace(/\D/g, "");
    const formattedPhone = phone.startsWith("91") ? phone : "91" + phone;
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handlePaymentSuccess = (resData) => {
    setLatestPaymentResponse(resData);
    // Refresh bill and customer ledger
    loadBill();
    if (effectiveCustomerId) {
      kadanDataService.getCustomerLedger(effectiveCustomerId)
        .then(res => setCustomerLedger(res?.data || res))
        .catch(() => {});
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pt-2 pb-12">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl white-card flex items-center justify-center text-[#64748B] hover:text-[#102A56] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[#102A56] flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#075BFF]" />
              Bill #{bill.bill_number || bill.id}
            </h1>
            <p className="text-xs text-[#64748B]">Digital Invoice Record</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Kadan Paid Button */}
          <button
            type="button"
            onClick={() => setShowPaymentModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white flex items-center gap-1.5 shadow-sm transition-all"
            title="Record Kadan Payment"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Kadan Paid</span>
          </button>

          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#25D366] hover:bg-[#20bd5a] text-white flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share Bill</span>
          </button>
          <button
            onClick={handlePrint}
            className="btn-secondary text-xs flex items-center gap-1.5 py-2"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>

      {/* Latest Payment Confirmation Banner (shows when a payment was just recorded) */}
      {latestPaymentResponse && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 sm:p-5 shadow-xs transition-all">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                  Kadan Payment Processed
                </h4>
                <p className="text-xs text-emerald-800">
                  Recorded {formatINRWithPaise(latestPaymentResponse.paid_amount)} via {String(latestPaymentResponse.payment_method).toUpperCase()}
                </p>
              </div>
            </div>
            {latestPaymentResponse.transaction_id && (
              <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-300/60 shrink-0">
                ID: {String(latestPaymentResponse.transaction_id).slice(0, 8)}...
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 pt-3 border-t border-emerald-200 text-xs">
            <div>
              <span className="text-[10px] text-emerald-800 uppercase block font-semibold">Paid Amount</span>
              <span className="font-extrabold text-emerald-950">{formatINRWithPaise(latestPaymentResponse.paid_amount)}</span>
            </div>
            <div>
              <span className="text-[10px] text-emerald-800 uppercase block font-semibold">Remaining Due</span>
              <span className="font-bold text-emerald-950">{formatINRWithPaise(latestPaymentResponse.remaining_outstanding ?? 0)}</span>
            </div>
            <div>
              <span className="text-[10px] text-emerald-800 uppercase block font-semibold">Previous Due</span>
              <span className="font-bold text-emerald-900">{formatINRWithPaise(latestPaymentResponse.previous_outstanding ?? 0)}</span>
            </div>
            <div>
              <span className="text-[10px] text-emerald-800 uppercase block font-semibold">Method</span>
              <span className="font-bold text-emerald-950 uppercase">{latestPaymentResponse.payment_method}</span>
            </div>
          </div>

          {latestPaymentResponse.notes && (
            <p className="text-[11px] text-emerald-900 mt-2 italic bg-emerald-100/60 p-2 rounded-lg border border-emerald-200/60">
              Note: {latestPaymentResponse.notes}
            </p>
          )}
        </div>
      )}

      {/* Main White Receipt Container */}
      <div className="white-card p-6 sm:p-8 space-y-6 relative overflow-hidden">
        {/* Accent top stripe */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#075BFF] to-[#1687FF]" />

        {/* Invoice Metadata Header */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-[#F7FAFF] border border-[#E2E8F0]">
          <div>
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block mb-1">
              Date & Time
            </span>
            <div className="text-xs font-bold text-[#102A56] flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#075BFF]" />
              {bill.created_at ? formatDateTime(new Date(bill.created_at)) : "—"}
            </div>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block mb-1">
              Customer
            </span>
            <div className="text-xs font-bold text-[#102A56] flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-[#075BFF]" />
              <span className="truncate">{customerName}</span>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block mb-1">
              Payment Method
            </span>
            <div className="text-xs font-bold text-[#102A56] flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-[#075BFF]" />
              <span>{paymentMethodLabel}</span>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block mb-1">
              Status
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                kadan === 0 
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-200" 
                  : "bg-amber-50 text-amber-600 border border-amber-200"
              }`}>
                <CheckCircle2 className="w-3 h-3" />
                {kadan === 0 ? "PAID" : "CREDIT / PARTIAL"}
              </span>
              {kadan > 0 && (
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(true)}
                  className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 underline ml-0.5"
                >
                  Pay Kadan
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Customer Credit / Kadan Summary Strip if ledger exists */}
        {customerLedger && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-xl bg-amber-50/70 border border-amber-200/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0">
                <Banknote className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-950">
                  Customer Kadan Account: {customerLedger.customer_name || customerName}
                </p>
                <p className="text-[11px] text-amber-800">
                  Total Outstanding Balance: <strong className="font-bold">{formatINRWithPaise(customerLedger.outstanding_amount)}</strong>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPaymentModal(true)}
              className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold shrink-0 transition-colors shadow-xs"
            >
              Pay Kadan
            </button>
          </div>
        )}

        {/* Item Table */}
        <div>
          <h2 className="text-sm font-bold text-[#102A56] mb-3">Purchased Items</h2>
          <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F7FAFF] text-[#64748B] font-semibold uppercase tracking-wider border-b border-[#E2E8F0]">
                  <th className="py-3 px-4">Item</th>
                  <th className="py-3 px-3 text-center">Qty</th>
                  <th className="py-3 px-3 text-right">Price</th>
                  <th className="py-3 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {bill.items?.map((item, idx) => {
                  const name = item.item_name || item.product_name || item.product?.name || item.name || "Unknown Product";
                  const variantName = item.variant_name || item.variant?.name;
                  const pkgQty = item.package_quantity || item.variant?.package_quantity;
                  const pkgUnit = item.unit || item.variant?.unit;
                  let variantInfo = variantName;
                  if (!variantInfo && pkgQty && pkgUnit) variantInfo = `${pkgQty} ${pkgUnit}`;
                  
                  const displayName = variantInfo ? `${name} (${variantInfo})` : name;
                  const qty = Number(item.quantity);
                  const price = item.price || item.unit_price || 0;

                  return (
                    <tr key={idx} className="hover:bg-[#F5F9FF]/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-[#102A56]">{displayName}</td>
                      <td className="py-3 px-3 text-center text-[#64748B]">{isNaN(qty) ? item.quantity : qty.toString()}</td>
                      <td className="py-3 px-3 text-right text-[#64748B]">{formatINRWithPaise(price)}</td>
                      <td className="py-3 px-4 text-right font-bold text-[#102A56]">{formatINRWithPaise(price * (isNaN(qty) ? 1 : qty))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals Summary */}
        <div className="border-t border-[#E2E8F0] pt-4 space-y-2.5 max-w-xs ml-auto">
          {discount > 0 && (
            <div className="flex justify-between text-xs text-[#64748B]">
              <span>Subtotal</span>
              <span className="font-semibold text-[#102A56]">{formatINRWithPaise(subtotal)}</span>
            </div>
          )}
          <div className="flex justify-between text-xs text-[#64748B]">
            <span>Discount</span>
            <span className={discount > 0 ? "font-bold text-amber-600" : "font-medium text-slate-500"}>
              {discount > 0 ? `- ${formatINRWithPaise(discount)}` : "₹0.00"}
            </span>
          </div>
          <div className="flex justify-between text-xs text-[#64748B] pt-0.5 border-t border-dashed border-[#E2E8F0]">
            <span className="font-semibold text-[#102A56]">Total Bill Amount</span>
            <span className="font-bold text-[#102A56] text-sm">{formatINRWithPaise(total)}</span>
          </div>
          <div className="flex justify-between text-xs text-emerald-600 font-semibold">
            <span>Amount Paid</span>
            <span>{formatINRWithPaise(paid)}</span>
          </div>
          {kadan > 0 && (
            <div className="pt-2 border-t border-[#E2E8F0] space-y-2">
              <div className="flex justify-between text-xs text-red-600 font-semibold">
                <span>Credit Due (Kadan)</span>
                <span>{formatINRWithPaise(kadan)}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(true)}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Pay Kadan ({formatINRWithPaise(kadan)})</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <KadanPaymentModal
          bill={bill}
          customerId={effectiveCustomerId}
          customerName={customerName}
          customerPhone={customerPhone}
          billKadanDue={kadan}
          customerLedger={customerLedger}
          customersList={customersList}
          onClose={() => setShowPaymentModal(false)}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* WhatsApp Share Modal for Any Number */}
      {showShareModal && (
        <ShareWhatsAppModal
          bill={bill}
          customerName={customerName}
          defaultPhone={customerPhone}
          shopName={effectiveShopName}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}

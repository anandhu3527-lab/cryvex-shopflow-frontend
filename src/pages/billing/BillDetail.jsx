import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { billingApi } from "../../services/api/billingApi";
import { formatINRWithPaise } from "../../utils/formatting/currency";
import { formatDateTime } from "../../utils/formatting/date";

export default function BillDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    billingApi.getBillById(id)
      .then(res => {
        setBill(res.data || res);
      })
      .catch(err => {
        setError(err.message || "Failed to load bill");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-10 text-center text-sm text-slate-500">Loading bill...</div>;
  if (error) return <div className="p-10 text-center text-rose-500">{error}</div>;
  if (!bill) return <div className="p-10 text-center text-slate-500">Bill not found</div>;

  const total = Number(bill.total_amount || 0);
  const paid = Array.isArray(bill.payments) 
    ? bill.payments
        .filter(payment => payment.status === "COMPLETED")
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
    : Number(bill.paid_amount || 0);
  const kadan = Math.max(0, total - paid);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pt-2 pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Bill #{bill.bill_number || bill.id}</h1>
        <button onClick={() => navigate(-1)} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Back</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-slate-500 uppercase font-semibold">Date</p>
            <p className="font-medium text-slate-900">{bill.created_at ? formatDateTime(new Date(bill.created_at)) : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase font-semibold">Customer</p>
            <p className="font-medium text-slate-900">{bill.customer_name || bill.customer?.name || "Walk-in Customer"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase font-semibold">Payment Method</p>
            <p className="font-medium text-slate-900">
              {(() => {
                const payments = Array.isArray(bill.payments) ? bill.payments : [];
                const firstPayment = payments[0] || {};
                const pm = (firstPayment.payment_method || firstPayment.method || bill.payment_method || "").toString().toUpperCase();
                if (pm) return pm;
                return kadan > 0 ? "KADAN" : "—";
              })()}
            </p>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-100 pt-4">
          <h2 className="font-semibold text-slate-900 mb-4">Items</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500">
                  <th className="pb-2 font-medium">Item</th>
                  <th className="pb-2 text-center font-medium">Qty</th>
                  <th className="pb-2 text-right font-medium">Price</th>
                  <th className="pb-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {bill.items?.map((item, idx) => {
                  const name = item.item_name || item.product_name || item.product?.name || item.name || "Unknown Product";
                  const variantName = item.variant_name || item.variant?.name;
                  const pkgQty = item.package_quantity || item.variant?.package_quantity;
                  const pkgUnit = item.unit || item.variant?.unit;
                  let variantInfo = variantName;
                  if (!variantInfo && pkgQty && pkgUnit) variantInfo = `${pkgQty} ${pkgUnit}`;
                  
                  const displayName = variantInfo ? `${name} (${variantInfo})` : name;
                  const qty = Number(item.quantity);

                  return (
                    <tr key={idx}>
                      <td className="py-3 text-slate-900 font-medium">{displayName}</td>
                      <td className="py-3 text-center text-slate-600">{isNaN(qty) ? item.quantity : qty.toString()}</td>
                      <td className="py-3 text-right text-slate-600">{formatINRWithPaise(item.price || item.unit_price || 0)}</td>
                      <td className="py-3 text-right text-slate-900 font-semibold">{formatINRWithPaise((item.price || item.unit_price || 0) * (isNaN(qty) ? 1 : qty))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4 space-y-2">
          <div className="flex justify-between font-bold text-lg text-slate-900">
            <span>Total Amount</span>
            <span>{formatINRWithPaise(total)}</span>
          </div>
          <div className="flex justify-between text-emerald-600 font-medium">
            <span>Paid Amount</span>
            <span>{formatINRWithPaise(paid)}</span>
          </div>
          {kadan > 0 && (
            <div className="flex justify-between text-rose-600 font-medium">
              <span>Remaining (Kadan)</span>
              <span>{formatINRWithPaise(kadan)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { customerDataService } from "../../services/data/customerDataService";
import { kadanDataService } from "../../services/data/kadanDataService";
import { billingApi } from "../../services/api/billingApi";


// ─── Avatar colour palette (fallback) ─────────────────────────────────────────
const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-orange-100 text-orange-700",
  "bg-purple-100 text-purple-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
  "bg-amber-100 text-amber-700",
  "bg-indigo-100 text-indigo-700",
];

const getAvatarColor = (index) => AVATAR_COLORS[index % AVATAR_COLORS.length];

// ─── INR formatter ─────────────────────────────────────────────────────────────
const formatINR = (amount) =>
  `\u20B9 ${Number(amount).toLocaleString("en-IN")}`;

// ─── Main Customers Page ───────────────────────────────────────────────────────
export default function Customers({ searchTerm = "" }) {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [kadanSummary, setKadanSummary] = useState({ total_kadan_amount: 0, total_customers_with_kadan: 0 });
  const [billsTotalPurchases, setBillsTotalPurchases] = useState(0);

  // Load live customers from backend on mount
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setLoadError("");
    customerDataService.getCustomers().then((data) => {
      if (!isMounted) return;
      if (Array.isArray(data)) {
        const normalized = data.map((c, idx) => ({
          id: c.id || c.customer_id,
          initials: (c.name || "?").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join(""),
          name: c.name || "Customer",
          phone: c.phone
            ? `+91 ${c.phone.replace(/\D/g, "").slice(-10, -5)} ${c.phone.replace(/\D/g, "").slice(-5)}`
            : "",
          totalPurchases: Number(c.total_purchases || c.totalPurchases || 0),
          pendingCredit: Number(c.outstanding_balance || c.pendingCredit || 0),
          lastPurchase: c.last_purchase_date
            ? new Date(c.last_purchase_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
            : (c.lastPurchase || "-"),
          avatarColor: getAvatarColor(idx),
        }));
        setCustomers(normalized);
      }
    }).catch((err) => {
      if (isMounted) setLoadError(err?.message || "Failed to load customers. Please try again.");
    }).finally(() => {
      if (isMounted) setIsLoading(false);
    });

    kadanDataService.getSummary().then(data => {
      if (!isMounted) return;
      if (data) {
        setKadanSummary({
          total_kadan_amount: Number(data.total_kadan_amount || 0),
          total_customers_with_kadan: Number(data.total_customers_with_kadan || 0)
        });
      }
    }).catch(() => {}); // silently fail Kadan summary if it errors, keep customers working

    const loadTotalPurchases = async () => {
      if (!isMounted) return;
      let allBills = [];
      let offset = 0;
      const limit = 50;
      let hasMore = true;
      
      try {
        while (hasMore && isMounted) {
          const res = await billingApi.getBills(limit, offset);
          
          let pageBills = [];
          if (Array.isArray(res)) pageBills = res;
          else if (Array.isArray(res?.items)) pageBills = res.items;
          else if (Array.isArray(res?.data)) pageBills = res.data;
          else if (Array.isArray(res?.data?.items)) pageBills = res.data.items;
          else if (Array.isArray(res?.data?.data)) pageBills = res.data.data;
          
          if (!pageBills || pageBills.length === 0) {
            hasMore = false;
            break;
          }
          
          allBills = [...allBills, ...pageBills];
          
          const totalMeta = res?.total || res?.data?.total || null;
          if (totalMeta !== null && allBills.length >= totalMeta) {
            hasMore = false;
          } else if (pageBills.length < limit) {
            hasMore = false;
          } else {
            offset += limit;
          }
        }
        
        let total = 0;
        const processedBillIds = new Set();
        
        allBills.forEach(bill => {
          const billId = bill.id || bill.bill_id;
          if (billId) {
            if (processedBillIds.has(billId)) return;
            processedBillIds.add(billId);
          }
          
          const customer = bill.customer && typeof bill.customer === "object" ? bill.customer : null;
          const customerId = customer?.id || customer?.customer_id || bill.customer_id || bill.customerId;
          
          const rawStatus = (bill.status || "").toUpperCase();
          const isValidStatus = ["COMPLETED", "PAID"].includes(rawStatus) || !rawStatus;
          
          if (customerId && isValidStatus) {
            total += Number(bill.total_amount || 0);
          }
        });
        
        if (isMounted) {
          setBillsTotalPurchases(total);
        }
      } catch (error) {
        // Log gracefully or ignore to not break page
      }
    };
    
    loadTotalPurchases();

    return () => { isMounted = false; };
  }, []);

  // Combined filter using header search
  const filteredCustomers = useMemo(() => {
    const term = (searchTerm || "").toLowerCase().trim();
    if (!term) return customers;
    
    const numericTerm = term.replace(/\D/g, "");
    
    return customers.filter((c) => {
      const nameMatch = (c.name || "").toLowerCase().includes(term);
      const phoneMatch = numericTerm ? (c.phone || "").replace(/\D/g, "").includes(numericTerm) : false;
      return nameMatch || phoneMatch;
    });
  }, [customers, searchTerm]);

  // KPIs
  const totalCustomers = customers.length;
  const totalPurchases = billsTotalPurchases;
  const totalCredit = kadanSummary.total_kadan_amount;
  const customersWithCredit = kadanSummary.total_customers_with_kadan;



  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Customers
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your customer database and credit.
          </p>
        </div>
      </div>

      {/* LOAD ERROR BANNER */}
      {loadError && (
        <div role="alert" className="flex items-center gap-3 px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{loadError}</span>
        </div>
      )}

      {/* 2. KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">Total Customers</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center" aria-hidden="true">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1.5 tracking-tight">
            {totalCustomers}
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">Pending Credit</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center" aria-hidden="true">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-rose-600 mt-1.5 tracking-tight">
            {formatINR(totalCredit)}
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">Total Purchases</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center" aria-hidden="true">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1.5 tracking-tight">
            {formatINR(totalPurchases)}
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">With Pending Credit</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 font-bold">Credit</span>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1.5 tracking-tight">
            {customersWithCredit}
          </p>
        </div>
      </div>


      {/* 4. CUSTOMERS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <svg className="w-6 h-6 animate-spin mr-2" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="text-xs font-medium">Loading customers…</span>
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" aria-label="Customers table">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-3">Phone</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-14 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="text-sm font-medium">No customers found</p>
                      <p className="text-xs">
                        {searchTerm
                          ? "Try adjusting your search."
                          : "No customers registered yet."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer, index) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    {/* Name + Avatar */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-[11px] shrink-0 ${customer.avatarColor || getAvatarColor(index)}`}
                          aria-hidden="true"
                        >
                          {customer.initials}
                        </div>
                        <button
                          type="button"
                          disabled={!customer.id}
                          onClick={() => navigate(`/customers/${customer.id}`)}
                          className="text-left font-semibold text-slate-900 text-xs sm:text-sm leading-tight hover:text-blue-700 disabled:cursor-default"
                        >
                          {customer.name}
                        </button>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="py-3 px-3 text-slate-600 font-medium whitespace-nowrap">
                      {customer.phone}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        disabled={!customer.id}
                        onClick={() => navigate(`/customers/${customer.id}`)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`View ${customer.name}`}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>



    </div>
  );
}

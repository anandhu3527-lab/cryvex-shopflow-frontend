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
export default function Customers({ searchTerm: propSearchTerm = "" }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(propSearchTerm || "");
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

  // Combined filter using search
  const filteredCustomers = useMemo(() => {
    const term = (searchQuery || propSearchTerm || "").toLowerCase().trim();
    if (!term) return customers;
    
    const numericTerm = term.replace(/\D/g, "");
    
    return customers.filter((c) => {
      const nameMatch = (c.name || "").toLowerCase().includes(term);
      const phoneMatch = numericTerm ? (c.phone || "").replace(/\D/g, "").includes(numericTerm) : false;
      return nameMatch || phoneMatch;
    });
  }, [customers, searchQuery, propSearchTerm]);

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

      {/* 2. KPI CARDS (Vibrant Gradients) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Total Customers */}
        <div className="group relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-[#0F52FF] via-[#0047E0] to-[#0A2E8A] text-white border border-blue-400/30 shadow-[0_12px_24px_-4px_rgba(7,91,255,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:-translate-y-1 transition-all duration-300">
          <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none group-hover:scale-125 transition-transform" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-100/90">Total Customers</span>
            <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white text-xs shadow-xs" aria-hidden="true">
              👥
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white mt-2 tracking-tight drop-shadow-xs">
            {totalCustomers}
          </p>
          <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-bold text-blue-100">
            Registered Directory
          </span>
        </div>

        {/* Card 2: Pending Credit */}
        <div className="group relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-[#E11D48] via-[#BE123C] to-[#881337] text-white border border-rose-400/30 shadow-[0_12px_24px_-4px_rgba(225,29,72,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:-translate-y-1 transition-all duration-300">
          <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none group-hover:scale-125 transition-transform" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-100/90">Pending Credit</span>
            <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white text-xs shadow-xs" aria-hidden="true">
              ⏳
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white mt-2 tracking-tight drop-shadow-xs">
            {formatINR(totalCredit)}
          </p>
          <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-bold text-rose-100">
            Kadan Due
          </span>
        </div>

        {/* Card 3: Total Purchases */}
        <div className="group relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-[#059669] via-[#047857] to-[#064E3B] text-white border border-emerald-400/30 shadow-[0_12px_24px_-4px_rgba(5,150,105,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:-translate-y-1 transition-all duration-300">
          <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none group-hover:scale-125 transition-transform" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-100/90">Total Purchases</span>
            <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white text-xs shadow-xs" aria-hidden="true">
              🛍️
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white mt-2 tracking-tight drop-shadow-xs">
            {formatINR(totalPurchases)}
          </p>
          <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-bold text-emerald-100">
            Counter Sales
          </span>
        </div>

        {/* Card 4: With Pending Credit */}
        <div className="group relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-[#D97706] via-[#B45309] to-[#78350F] text-white border border-amber-400/30 shadow-[0_12px_24px_-4px_rgba(217,119,6,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:-translate-y-1 transition-all duration-300">
          <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none group-hover:scale-125 transition-transform" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-100/90">Credit Accounts</span>
            <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white text-xs shadow-xs" aria-hidden="true">
              📋
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white mt-2 tracking-tight drop-shadow-xs">
            {customersWithCredit}
          </p>
          <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-bold text-amber-100">
            Active Debtors
          </span>
        </div>
      </div>


      {/* 4. CUSTOMERS TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Table Search & Count Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-blue-50/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-lg">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              id="customers-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer name or phone number..."
              className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm font-medium bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Clear search"
                aria-label="Clear search"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold self-end sm:self-center">
            <span className="px-3 py-1 bg-slate-100 rounded-full border border-slate-200/80 text-slate-700">
              {filteredCustomers.length} {filteredCustomers.length === 1 ? "customer" : "customers"} found
            </span>
          </div>
        </div>

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
              <tr className="border-b border-slate-200/80 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-[11px] text-slate-200 font-black uppercase tracking-wider">
                <th className="py-3.5 px-4">Customer Name</th>
                <th className="py-3.5 px-3">Phone</th>
                <th className="py-3.5 px-3 text-center">Actions</th>
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
                        {searchQuery || propSearchTerm
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

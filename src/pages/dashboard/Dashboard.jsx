import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { billingDataService } from "../../services/data/billingDataService";
import { customerDataService } from "../../services/data/customerDataService";
import { kadanDataService } from "../../services/data/kadanDataService";
import { authApi } from "../../services/api/authApi";
import { useAuth } from "../../context/AuthContext";
import { formatINRWithPaise } from "../../utils/formatting/currency";
import { getLocalDateISO } from "../../utils/formatting/date";

const getEmployeeLoadErrorMessage = (error) => {
  const status = error?.details?.status ?? error?.status;

  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You do not have permission to view employee details.";
  if (status === 404) return "Employee details could not be found.";
  if (status >= 500) return "Employee details are unavailable because of a server error.";

  const message = String(error?.message || "");
  if (/network|failed to fetch|timeout|aborted/i.test(message)) {
    return "Could not load employee details. Check your network connection and try again.";
  }

  return message || "Could not load employee details. Please try again.";
};

export default function Dashboard({ searchTerm = "" }) {
  const navigate = useNavigate();
  const { currentUser, tenantEmployees, refreshTenant } = useAuth();
  const role = currentUser?.role || "OWNER";
  
  const [bills, setBills] = useState([]);
  const [todaySummary, setTodaySummary] = useState({ status: "loading" });
  const [salesTrend, setSalesTrend] = useState({ status: "loading", days: [] });
  const [customerSummary, setCustomerSummary] = useState({ status: "loading" });
  const [kadanSummary, setKadanSummary] = useState({ status: "loading" });
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [employeeForm, setEmployeeForm] = useState({
    name: "",
    phone_number: "",
    email: "",
    password: "",
    role: "EMPLOYEE",
  });
  const [employeeFormError, setEmployeeFormError] = useState("");
  const [isCreatingEmployee, setIsCreatingEmployee] = useState(false);

  // We no longer manually fetch employees here. We use tenantEmployees from AuthContext.
  // Instead of a callback/useEffect, we just consume tenantEmployees.
  
  const refreshEmployees = useCallback(async () => {
    await refreshTenant();
  }, [refreshTenant]);

  useEffect(() => {
    let isMounted = true;
    const dates = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      return date;
    });

    Promise.allSettled(dates.map((date) => billingDataService.getDateSummary(getLocalDateISO(date))))
      .then((results) => {
        if (!isMounted) return;
        const days = results.map((result, index) => {
          const summary = result.status === "fulfilled" ? result.value?.date_summary ?? {} : {};
          return {
            date: dates[index],
            totalSales: Number(summary.total_revenue || summary.total_sales || 0) - Number(summary.total_kadan_amount || summary.total_kadan || 0),
            totalBills: Number(summary.total_bills) || 0,
          };
        });
        const latestDay = days[days.length - 1];
        if (results[results.length - 1].status === "fulfilled") {
          setTodaySummary({
            status: "success",
            totalSales: latestDay.totalSales,
            totalBills: latestDay.totalBills,
          });
        } else {
          setTodaySummary({ status: "error" });
        }
        if (results.some((result) => result.status === "rejected")) {
          setSalesTrend({ status: "error", days: [] });
        } else {
          setSalesTrend({ status: "success", days });
        }
      });

    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadCustomerCount = async () => {
      const limit = 100;
      let offset = 0;
      let count = 0;
      let page;

      do {
        page = await customerDataService.getCustomers({ limit, offset });
        if (!Array.isArray(page)) throw new Error("Invalid customer response.");
        count += page.length;
        offset += limit;
      } while (page.length === limit);

      return count;
    };

    Promise.allSettled([loadCustomerCount(), kadanDataService.getSummary()]).then(([customers, kadan]) => {
      if (!isMounted) return;

      if (customers.status === "fulfilled") {
        setCustomerSummary({ status: "success", totalCustomers: customers.value });
      } else {
        setCustomerSummary({ status: "error" });
      }

      if (kadan.status === "fulfilled") {
        setKadanSummary({
          status: "success",
          totalAmount: Number(kadan.value?.total_kadan_amount) || 0,
        });
      } else {
        setKadanSummary({ status: "error" });
      }
    });

    return () => { isMounted = false; };
  }, []);

  // Load live bills from backend on mount
  useEffect(() => {
    let isMounted = true;
    billingDataService.getRecentBills()
      .then((data) => {
        if (!isMounted) return;
        if (Array.isArray(data) && data.length > 0) {
          setBills(data.map((b) => ({
            billNo: b.bill_number || b.billNo || "—",
            customerId: b.customer_id || b.customer?.id || b.customer?.customer_id || null,
            dateTime: b.created_at
              ? new Date(b.created_at).toLocaleString("en-IN", {
                  weekday: "short", day: "2-digit", month: "short",
                  hour: "2-digit", minute: "2-digit",
                })
              : b.dateTime || "",
            customer: String(
              b.customer_name ||
                (typeof b.customer === "object"
                  ? b.customer?.name || b.customer?.full_name
                  : b.customer) ||
                "—"
            ),
            amount: `₹${Number(b.total_amount || b.amount || 0).toLocaleString("en-IN")}`,
            payment: b.payment_method || b.payment || "—",
            status: b.status === "PAID" ? "Paid" : b.status === "CREDIT" ? "Pending" : (b.status || "—"),
          })));
        } else {
          setBills([]);
        }
      })
      .catch(() => { if (isMounted) setBills([]); });

    return () => { isMounted = false; };
  }, []);


  // Toast feedback
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // Filter bills by search query
  const filteredBills = useMemo(() => {
    const term = String(searchTerm).trim().toLowerCase();
    if (!term) return bills;
    return bills.filter(
      (b) =>
        [b.billNo, b.dateTime, b.customer, b.amount, b.payment, b.status]
          .some((value) => String(value ?? "").toLowerCase().includes(term))
    );
  }, [bills, searchTerm]);

  // Filter employees by search query
  const filteredEmployees = useMemo(() => {
    const term = String(searchTerm).trim().toLowerCase();
    if (!term) return tenantEmployees || [];
    return (tenantEmployees || []).filter(
      (e) =>
        [e.name, e.phone, e.role, e.status, e.created_at]
          .some((value) => String(value ?? "").toLowerCase().includes(term))
    );
  }, [tenantEmployees, searchTerm]);

  const salesTrendMax = Math.max(...salesTrend.days.map((day) => day.totalSales), 1);

  const scrollToEmployees = () => {
    const el = document.getElementById("staff-employees-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleEmployeeFormChange = (field, value) => {
    setEmployeeForm((prev) => ({ ...prev, [field]: value }));
    if (employeeFormError) setEmployeeFormError("");
  };

  const handleCreateEmployee = async (event) => {
    event.preventDefault();

    const name = employeeForm.name.trim();
    const phoneNumber = employeeForm.phone_number.trim();
    const password = employeeForm.password;

    if (!name || !phoneNumber || !password) {
      setEmployeeFormError("Name, phone number, and password are required.");
      return;
    }

    setIsCreatingEmployee(true);
    setEmployeeFormError("");

    try {
      await authApi.createEmployee({
        name,
        phone_number: phoneNumber,
        email: employeeForm.email.trim() || null,
        password,
        role: employeeForm.role,
      });

      setShowAddEmployeeModal(false);
      setEmployeeForm({
        name: "",
        phone_number: "",
        email: "",
        password: "",
        role: "EMPLOYEE",
      });
      showToast("Employee created successfully.");
      await refreshEmployees();
    } catch (error) {
      setEmployeeFormError(error?.message || "Could not create employee.");
    } finally {
      setIsCreatingEmployee(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Interactive Toast Notification */}
      {toastMessage && (
        <div
          className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-slate-700 animate-fade-in text-xs sm:text-sm"
          role="status"
        >
          <span className="text-emerald-400 font-bold" aria-hidden="true">✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. OVERVIEW PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Here's what's happening with your business today.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {role === "OWNER" && (
            <>
              <button
                type="button"
                onClick={scrollToEmployees}
                className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs sm:text-sm font-semibold shadow-2xs transition-colors"
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
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                <span>Employees</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAddEmployeeModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition-all"
              >
                <span className="text-base leading-none font-bold">+</span>
                <span>Add Employee</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => navigate("/quick-bill")}
            className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-sm hover:shadow transition-all"
          >
            <span className="text-base leading-none font-bold">+</span>
            <span>Quick Bill</span>
          </button>
        </div>
      </div>

      {/* 2. 4 METRIC KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Sales */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Today's Sales</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm" aria-hidden="true">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl sm:text-[26px] font-extrabold text-slate-900 mt-2 tracking-tight">
            {todaySummary.status === "loading" ? (
              <span className="block h-8 w-32 rounded bg-slate-100 animate-pulse" aria-label="Loading today's sales" />
            ) : todaySummary.status === "error" ? (
              "—"
            ) : (
              formatINRWithPaise(todaySummary.totalSales)
            )}
          </p>
          <p className={`text-[11px] mt-2 ${todaySummary.status === "error" ? "font-medium text-rose-600" : "font-medium text-slate-400"}`}>
            {todaySummary.status === "loading" ? "Loading today's sales..." : todaySummary.status === "error" ? "Today's sales unavailable" : "Today's sales"}
          </p>
        </div>

        {/* Card 2: Bills Today */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Bills Today</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm" aria-hidden="true">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl sm:text-[26px] font-extrabold text-slate-900 mt-2 tracking-tight">
            {todaySummary.status === "loading" ? (
              <span className="block h-8 w-12 rounded bg-slate-100 animate-pulse" aria-label="Loading today's bills" />
            ) : todaySummary.status === "error" ? (
              "—"
            ) : (
              todaySummary.totalBills
            )}
          </p>
          <p className={`text-[11px] mt-2 ${todaySummary.status === "error" ? "font-medium text-rose-600" : "font-medium text-slate-400"}`}>
            {todaySummary.status === "loading" ? "Loading today's bills..." : todaySummary.status === "error" ? "Today's bills unavailable" : "Today's bills"}
          </p>
        </div>

        {/* Card 3: Customers */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Customers</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-sm" aria-hidden="true">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl sm:text-[26px] font-extrabold text-slate-900 mt-2 tracking-tight">
            {customerSummary.status === "loading" ? (
              <span className="block h-8 w-12 rounded bg-slate-100 animate-pulse" aria-label="Loading customer count" />
            ) : customerSummary.status === "error" ? (
              "—"
            ) : (
              customerSummary.totalCustomers
            )}
          </p>
          <p className={`text-[11px] mt-2 ${customerSummary.status === "error" ? "font-medium text-rose-600" : "font-medium text-slate-400"}`}>
            {customerSummary.status === "loading" ? "Loading customers..." : customerSummary.status === "error" ? "Customer count unavailable" : "Total customers"}
          </p>
        </div>

        {/* Card 4: Pending Kadan */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Pending Kadan</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center text-sm" aria-hidden="true">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
          <p className="text-2xl sm:text-[26px] font-extrabold text-rose-600 mt-2 tracking-tight">
            {kadanSummary.status === "loading" ? (
              <span className="block h-8 w-32 rounded bg-slate-100 animate-pulse" aria-label="Loading pending Kadan balance" />
            ) : kadanSummary.status === "error" ? (
              "—"
            ) : (
              formatINRWithPaise(kadanSummary.totalAmount)
            )}
          </p>
          <p className={`text-[11px] mt-2 flex items-center gap-1 ${kadanSummary.status === "error" ? "font-semibold text-rose-500" : "font-medium text-slate-400"}`}>
            {kadanSummary.status === "error" && <span aria-hidden="true">⚠</span>}
            <span>{kadanSummary.status === "loading" ? "Loading pending balance..." : kadanSummary.status === "error" ? "Pending Kadan unavailable" : "Outstanding Kadan balance"}</span>
          </p>
        </div>
      </div>

      {/* 3. MIDDLE SECTION: SALES TREND & RECENT BILLS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Sales Trend */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Sales Trend</h2>
              <span className="text-xs font-medium text-slate-400">
                {salesTrend.status === "success" ? "Last 7 days" : "Daily sales"}
              </span>
            </div>

            {salesTrend.status === "loading" ? (
              <div className="min-h-[220px] flex items-center justify-center text-sm text-slate-400" role="status">
                Loading sales trend...
              </div>
            ) : salesTrend.status === "error" ? (
              <div className="min-h-[220px] flex items-center justify-center text-sm text-rose-600" role="status">
                Sales trend unavailable. Please try again later.
              </div>
            ) : (
              <div className="min-h-[220px] flex flex-col justify-end" aria-label="Daily sales for the last seven days">
                <div className="flex h-40 items-end gap-2 border-b border-slate-200 px-1">
                  {salesTrend.days.map((day) => {
                    const height = day.totalSales > 0 ? Math.max((day.totalSales / salesTrendMax) * 100, 5) : 1;
                    const label = day.date.toLocaleDateString("en-IN", { weekday: "short" });
                    return (
                      <div
                        key={getLocalDateISO(day.date)}
                        className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                        title={`${label}: ${formatINRWithPaise(day.totalSales)} from ${day.totalBills} bills`}
                        role="img"
                        aria-label={`${label}: ${formatINRWithPaise(day.totalSales)} from ${day.totalBills} bills`}
                      >
                        <div
                          className="w-full max-w-8 rounded-t bg-blue-500 transition-[height]"
                          style={{ height: `${height}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2 px-1 pt-2">
                  {salesTrend.days.map((day) => (
                    <span key={getLocalDateISO(day.date)} className="min-w-0 flex-1 text-center text-[10px] font-medium text-slate-500">
                      {day.date.toLocaleDateString("en-IN", { weekday: "short" })}
                    </span>
                  ))}
                </div>
                {salesTrend.days.every((day) => day.totalSales === 0) && (
                  <p className="mt-3 text-center text-xs text-slate-400">No sales recorded in the last 7 days.</p>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Recent Bills */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[11px] font-medium text-slate-400">
                {new Date().toLocaleString("en-IN", {
                  weekday: "long",
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
                Recent Bills
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate("/customers")}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors"
              >
                View Customers
              </button>
              <button
                type="button"
                onClick={() => navigate("/bill-history")}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors"
              >
                View All Bills
              </button>
            </div>
          </div>

          {/* Bills Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-medium">
                  <th className="pb-3 px-2">Date & Time</th>
                  <th className="pb-3 px-2">Customer</th>
                  <th className="pb-3 px-2">Amount</th>
                  <th className="pb-3 px-2">Payment</th>
                  <th className="pb-3 px-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No recent bills match "{searchTerm}".
                    </td>
                  </tr>
                ) : (
                  filteredBills.map((bill) => (
                    <tr key={bill.billNo} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-2 text-slate-500 whitespace-nowrap">
                        {bill.dateTime}
                      </td>
                      <td className="py-3 px-2 font-medium text-slate-900">
                        {bill.customerId ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/customers/${bill.customerId}`)}
                            className="text-left text-blue-700 hover:text-blue-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                          >
                            {bill.customer}
                          </button>
                        ) : (
                          bill.customer
                        )}
                      </td>
                      <td className="py-3 px-2 font-bold text-slate-900">
                        {bill.amount}
                      </td>
                      <td className="py-3 px-2">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium text-[11px]">
                          {bill.payment}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            bill.status === "Paid"
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-rose-50 text-rose-600"
                          }`}
                        >
                          {bill.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showAddEmployeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-600">Create Staff</p>
                <h3 className="text-lg font-bold text-slate-900 mt-1">Add Employee</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddEmployeeModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                aria-label="Close add employee modal"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full name</label>
                <input
                  type="text"
                  value={employeeForm.name}
                  onChange={(e) => handleEmployeeFormChange("name", e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 bg-slate-50 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  placeholder="Enter employee name"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone number</label>
                <input
                  type="tel"
                  value={employeeForm.phone_number}
                  onChange={(e) => handleEmployeeFormChange("phone_number", e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 bg-slate-50 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email (optional)</label>
                <input
                  type="email"
                  value={employeeForm.email}
                  onChange={(e) => handleEmployeeFormChange("email", e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 bg-slate-50 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  placeholder="name@cryvex.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
                <input
                  type="password"
                  value={employeeForm.password}
                  onChange={(e) => handleEmployeeFormChange("password", e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 bg-slate-50 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  placeholder="Create login password"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Role</label>
                <select
                  value={employeeForm.role}
                  onChange={(e) => handleEmployeeFormChange("role", e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 bg-slate-50 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="MANAGER">Manager</option>
                </select>
              </div>

              {employeeFormError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
                  {employeeFormError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddEmployeeModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingEmployee}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isCreatingEmployee ? "Creating..." : "Create Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. BOTTOM SECTION: STAFF & EMPLOYEES */}
      {role === "OWNER" && (
        <div id="staff-employees-section" className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0" aria-hidden="true">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Staff & Employees
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Total employees: {tenantEmployees ? tenantEmployees.length : "—"}
                </p>
              </div>
            </div>

        </div>

        {/* Staff Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-medium">
                <th className="pb-3 px-3">Employee</th>
                <th className="pb-3 px-3">Phone Number</th>
                <th className="pb-3 px-3">Role</th>
                <th className="pb-3 px-3">Status</th>
                <th className="pb-3 px-3">Created Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(!tenantEmployees) ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400" role="status">
                    <span className="inline-block h-4 w-40 rounded bg-slate-100 animate-pulse" aria-label="Loading employee details" />
                  </td>
                </tr>
              ) : tenantEmployees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No employees added yet
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No employees match "{searchTerm}".
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee, index) => {
                  const name = employee.name ?? "Unknown";
                  const status = employee.status ?? "—";
                  const normalizedStatus = String(status).toUpperCase();
                  const createdAt = employee.created_at ? new Date(employee.created_at) : null;
                  const initials = String(name).trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

                  return (
                    <tr key={employee.id ?? `${employee.phone ?? "employee"}-${index}`} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {initials || "?"}
                          </div>
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">{name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-800 whitespace-nowrap">
                        {employee.phone ?? "—"}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {employee.role ?? "—"}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            normalizedStatus === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                              : normalizedStatus === "INACTIVE"
                                ? "bg-rose-50 text-rose-600 border border-rose-200"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                        {createdAt && !Number.isNaN(createdAt.getTime())
                          ? createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                          : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
}


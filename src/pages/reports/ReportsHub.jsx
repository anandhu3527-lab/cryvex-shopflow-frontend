import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Calendar, CalendarRange, Clock, FileText, Users } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import DailyReport from "./DailyReport";
import MonthlyReport from "./MonthlyReport";
import WeeklyReport from "./WeeklyReport";
import CustomerTransactionReport from "./CustomerTransactionReport";

const reportTypes = [
  {
    id: "daily",
    label: "Daily Report",
    shortLabel: "Daily",
    description: "One day's sales and cash reconciliation.",
    icon: Clock,
    accent: "emerald",
    Component: DailyReport,
  },
  {
    id: "weekly",
    label: "Weekly Report",
    shortLabel: "Weekly",
    description: "Seven-day sales & collection trend.",
    icon: CalendarRange,
    accent: "indigo",
    Component: WeeklyReport,
  },
  {
    id: "monthly",
    label: "Monthly Report",
    shortLabel: "Monthly",
    description: "Complete month financial performance.",
    icon: Calendar,
    accent: "blue",
    Component: MonthlyReport,
  },
  {
    id: "customer",
    label: "Customer Ledger",
    shortLabel: "Customer Txns",
    description: "Customer bills, Kadan credit, and repayments.",
    icon: Users,
    accent: "purple",
    Component: CustomerTransactionReport,
  },
];

const accentStyles = {
  emerald: {
    selected: "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100",
    icon: "bg-emerald-100 text-emerald-700",
    label: "text-emerald-800",
    mobileActive: "bg-emerald-600 text-white shadow-xs",
  },
  indigo: {
    selected: "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100",
    icon: "bg-indigo-100 text-indigo-700",
    label: "text-indigo-800",
    mobileActive: "bg-indigo-600 text-white shadow-xs",
  },
  blue: {
    selected: "border-blue-500 bg-blue-50 ring-2 ring-blue-100",
    icon: "bg-blue-100 text-blue-700",
    label: "text-blue-800",
    mobileActive: "bg-blue-600 text-white shadow-xs",
  },
  purple: {
    selected: "border-purple-500 bg-purple-50 ring-2 ring-purple-100",
    icon: "bg-purple-100 text-purple-700",
    label: "text-purple-800",
    mobileActive: "bg-purple-600 text-white shadow-xs",
  },
};

export default function ReportsHub() {
  const { currentTenant, currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlFilter = searchParams.get("filter")?.toLowerCase();
  const initialType = searchParams.get("tab") || (urlFilter ? "customer" : "daily");
  const [selectedType, setSelectedType] = useState(
    reportTypes.some((r) => r.id === initialType) ? initialType : "daily"
  );

  const handleSelectTab = (tabId) => {
    setSelectedType(tabId);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("tab", tabId);
    setSearchParams(newParams, { replace: true });
  };

  const shopName = (
    currentTenant?.name ||
    currentTenant?.business_name ||
    currentUser?.shop?.name ||
    currentUser?.shop_name ||
    "CRYVEX SHOP"
  ).trim();

  const selectedReport =
    reportTypes.find((report) => report.id === selectedType) || reportTypes[0];
  const ReportComponent = selectedReport.Component;

  return (
    <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-2 sm:py-6 space-y-3 sm:space-y-6 animate-fade-in">
      {/* ── Top Header Banner (Compact & Clean on Mobile) ── */}
      <section className="rounded-xl sm:rounded-3xl bg-gradient-to-r from-[#0B192C] via-[#1E3E62] to-[#0B192C] p-3.5 sm:p-6 lg:p-7 text-white shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="rounded-lg sm:rounded-2xl bg-white/10 p-2 sm:p-3 shrink-0">
              <FileText className="h-4 w-4 sm:h-6 sm:w-6 text-blue-200" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-blue-200 truncate">
                {shopName}
              </p>
              <h1 className="text-base sm:text-2xl lg:text-3xl font-extrabold tracking-tight truncate">
                Business &amp; Sales Reports
              </h1>
            </div>
          </div>
        </div>
      </section>

      {/* ── Report Type Switcher: Simple, ergonomic & mobile-friendly ── */}
      <section aria-label="Select report type" className="space-y-2">
        {/* Mobile View: 2x2 Grid or Segmented Tabs */}
        <div className="grid grid-cols-2 gap-2 sm:hidden">
          {reportTypes.map((report) => {
            const Icon = report.icon;
            const isSelected = selectedType === report.id;
            const styles = accentStyles[report.accent];

            return (
              <button
                key={report.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => handleSelectTab(report.id)}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? `${styles.selected} shadow-xs font-bold`
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span
                  className={`rounded-lg p-1.5 shrink-0 ${
                    isSelected ? styles.icon : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold truncate">
                  {report.shortLabel}
                </span>
              </button>
            );
          })}
        </div>

        {/* Desktop View: Full 4-Column Cards */}
        <div className="hidden sm:grid sm:grid-cols-4 gap-3">
          {reportTypes.map((report) => {
            const Icon = report.icon;
            const isSelected = selectedType === report.id;
            const styles = accentStyles[report.accent];

            return (
              <button
                key={report.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => handleSelectTab(report.id)}
                className={`flex flex-col items-start gap-2.5 rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                  isSelected
                    ? styles.selected
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <span className={`rounded-xl p-2 shrink-0 ${styles.icon}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <span
                    className={`block text-xs font-extrabold leading-tight ${
                      isSelected ? styles.label : "text-slate-900"
                    }`}
                  >
                    {report.label}
                  </span>
                  <span className="mt-1 block text-[11px] leading-snug text-slate-500">
                    {report.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Active Report View Only (No endless scrolling!) ── */}
      <div className="pt-1">
        <ReportComponent embedded />
      </div>
    </div>
  );
}

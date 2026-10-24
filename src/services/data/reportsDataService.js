/**
 * Reports & Analytics Data Service
 * Central data management for timeframe sales metrics and trend KPIs
 */

import { reportsApi } from "../api/reportsApi";
import { billingApi } from "../api/billingApi";
import { handleError } from "../error/errorHandler";

// Extract collection from any response structure
function extractList(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  if (Array.isArray(response?.bills)) return response.bills;
  if (Array.isArray(response?.items)) return response.items;
  return [];
}

function numericValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toLocalDateString(date = new Date()) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekMonday(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return toLocalDateString(d);
}

function getWeekSunday(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + diff);
  return toLocalDateString(d);
}

function getMonthKey(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatWeekday(dateStr) {
  if (!dateStr) return "";
  const parts = String(dateStr).split("-");
  if (parts.length === 3) {
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("en-IN", { weekday: "short" });
    }
  }
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-IN", { weekday: "short" });
}

export const reportsDataService = {
  /**
   * Get report data for a given timeframe label ("Today" | "This Week" | "This Month").
   * Tries dedicated backend reports API first, with graceful fallback to bills history aggregation.
   */
  async getReportData(timeframe = "This Week") {
    const now = new Date();
    const todayStr = toLocalDateString(now);
    const weekStartStr = getWeekMonday(now);
    const weekEndStr = getWeekSunday(now);
    const monthKey = getMonthKey(now);
    const monthStartStr = `${monthKey}-01`;
    const monthEndObj = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const monthEndStr = toLocalDateString(monthEndObj);

    let rangeStart = weekStartStr;
    let rangeEnd = weekEndStr;
    if (timeframe === "Today") {
      rangeStart = todayStr;
      rangeEnd = todayStr;
    } else if (timeframe === "This Month") {
      rangeStart = monthStartStr;
      rangeEnd = monthEndStr;
    }

    // Try primary dedicated API endpoint
    try {
      if (timeframe === "Today") {
        const res = await billingApi.getDateSummary(todayStr);
        const data = res?.data || res;
        const dateSummary = data?.date_summary || {};
        const billsRaw = extractList(data?.bills);

        const bills = billsRaw.map((b, idx) => ({
          id: b.id || b.bill_id || `bill-${idx}`,
          bill_number: b.bill_number || b.id || "—",
          customer_name: b.customer_name || b.customer?.name || "Walk-in Customer",
          total_amount: numericValue(b.total_amount ?? b.amount),
          tax_amount: numericValue(b.tax_amount),
          discount_amount: numericValue(b.discount_amount),
          payment_method: String(b.payment_method || "CASH").toUpperCase(),
          paid_amount: (function() {
            const hasPaid = b.paid_amount !== undefined && b.paid_amount !== null;
            const hasReceived = b.received_amount !== undefined && b.received_amount !== null;
            const m = String(b.payment_method || "").toUpperCase();
            if (hasPaid) return numericValue(b.paid_amount);
            if (hasReceived) return numericValue(b.received_amount);
            if (m === "CREDIT" || m === "KADAN") return 0;
            return numericValue(b.total_amount ?? b.amount); // fully paid non-credit
          })(),
          kadan_amount: (function() {
            if (b.kadan_amount !== undefined && b.kadan_amount !== null) return numericValue(b.kadan_amount);
            if (b.kadan?.kadan_amount !== undefined) return numericValue(b.kadan.kadan_amount);
            if (b.kadan?.amount !== undefined) return numericValue(b.kadan.amount);
            const hasPaid = b.paid_amount !== undefined && b.paid_amount !== null;
            const hasReceived = b.received_amount !== undefined && b.received_amount !== null;
            if (hasPaid || hasReceived) {
              const p = hasPaid ? numericValue(b.paid_amount) : numericValue(b.received_amount);
              return Math.max(0, numericValue(b.total_amount ?? b.amount) - p);
            }
            const m = String(b.payment_method || "").toUpperCase();
            if (m === "CREDIT" || m === "KADAN") return numericValue(b.total_amount ?? b.amount);
            return 0;
          })(),
          created_at: b.created_at || todayStr,
          status: b.status || "Completed",
          items: Array.isArray(b.items) ? b.items : [],
        }));

        const totalRevenue = numericValue(dateSummary.total_sales ?? bills.reduce((sum, b) => sum + b.total_amount, 0));
        const totalBills = numericValue(dateSummary.total_bills ?? bills.length);
        const totalTax = bills.reduce((sum, b) => sum + b.tax_amount, 0);
        const totalDiscount = bills.reduce((sum, b) => sum + b.discount_amount, 0);
        const totalUnits = bills.reduce((sum, b) => {
          return sum + (Array.isArray(b.items) ? b.items.reduce((s, it) => s + numericValue(it?.quantity), 0) : 0);
        }, 0);

        const dailySales = [
          {
            date: todayStr,
            day: formatWeekday(todayStr) || "Today",
            amount: totalRevenue,
            bills: totalBills,
            isToday: true,
          },
        ];

        return {
          timeframe,
          rangeStart,
          rangeEnd,
          today: todayStr,
          source: "date-summary-api",
          summary: {
            revenue: totalRevenue,
            bills: totalBills,
            tax: totalTax,
            discount: totalDiscount,
            averageBill: totalBills > 0 ? totalRevenue / totalBills : 0,
            units: totalUnits,
          },
          dailySales,
          bills,
        };
      }

      if (timeframe === "This Week") {
        const res = await reportsApi.getWeeklyReport(weekStartStr);
        const data = res?.data || res;
        if (data && (data.summary || Array.isArray(data.bills) || Array.isArray(data.daily_breakdown))) {
          return this._normalizeReportResponse(data, timeframe, rangeStart, rangeEnd, todayStr);
        }
      }

      if (timeframe === "This Month") {
        const res = await reportsApi.getMonthlyReport(monthKey);
        const data = res?.data || res;
        if (data && (data.summary || Array.isArray(data.bills) || Array.isArray(data.daily_breakdown))) {
          return this._normalizeReportResponse(data, timeframe, rangeStart, rangeEnd, todayStr);
        }
      }
    } catch (primaryErr) {
      console.warn(`[reportsDataService] Dedicated API call for ${timeframe} failed, utilizing bills fallback:`, primaryErr?.message || primaryErr);
    }

    // Graceful fallback: load bills from billing API and calculate metrics
    return this._calculateReportFromBills(timeframe, rangeStart, rangeEnd, todayStr);
  },

  /**
   * Normalize ReportResponse from weekly/monthly endpoints
   */
  _normalizeReportResponse(data, timeframe, rangeStart, rangeEnd, todayStr) {
    const summary = data?.summary || {};
    const rawBills = extractList(data?.bills);
    const rawDaily = Array.isArray(data?.daily_breakdown) ? data.daily_breakdown : [];

    const bills = rawBills
      .filter((b) => {
        const status = (b?.status || "").toUpperCase();
        return status !== "CANCELLED";
      })
      .map((b, idx) => ({
        id: b.bill_id || b.id || `bill-${idx}`,
        bill_number: b.bill_number || b.id || "—",
        customer_name: b.customer_name || b.customer?.name || "Walk-in Customer",
        total_amount: numericValue(b.total_amount ?? b.amount),
        tax_amount: numericValue(b.tax_amount),
        discount_amount: numericValue(b.discount_amount),
        payment_method: String(b.payment_method || "CASH").toUpperCase(),
        paid_amount: (function() {
          const hasPaid = b.paid_amount !== undefined && b.paid_amount !== null;
          const hasReceived = b.received_amount !== undefined && b.received_amount !== null;
          const m = String(b.payment_method || "").toUpperCase();
          if (hasPaid) return numericValue(b.paid_amount);
          if (hasReceived) return numericValue(b.received_amount);
          if (m === "CREDIT" || m === "KADAN") return 0;
          return numericValue(b.total_amount ?? b.amount);
        })(),
        kadan_amount: (function() {
          if (b.kadan_amount !== undefined && b.kadan_amount !== null) return numericValue(b.kadan_amount);
          if (b.kadan?.kadan_amount !== undefined) return numericValue(b.kadan.kadan_amount);
          if (b.kadan?.amount !== undefined) return numericValue(b.kadan.amount);
          const hasPaid = b.paid_amount !== undefined && b.paid_amount !== null;
          const hasReceived = b.received_amount !== undefined && b.received_amount !== null;
          if (hasPaid || hasReceived) {
            const p = hasPaid ? numericValue(b.paid_amount) : numericValue(b.received_amount);
            return Math.max(0, numericValue(b.total_amount ?? b.amount) - p);
          }
          const m = String(b.payment_method || "").toUpperCase();
          if (m === "CREDIT" || m === "KADAN") return numericValue(b.total_amount ?? b.amount);
          return 0;
        })(),
        created_at: b.created_at || rangeStart,
        status: b.status || "Completed",
        items: Array.isArray(b.items) ? b.items : [],
      }));

    const dailySales = rawDaily.length > 0
      ? rawDaily.map((item) => ({
          date: item.date,
          day: formatWeekday(item.date),
          amount: numericValue(item.total_sales ?? item.amount),
          bills: numericValue(item.total_bills ?? item.bills),
          isToday: item.date === todayStr,
        })).sort((a, b) => a.date.localeCompare(b.date))
      : (() => {
          // Group bills by date if daily_breakdown was empty
          const byDate = new Map();
          bills.forEach((bill) => {
            const dStr = toLocalDateString(bill.created_at);
            const row = byDate.get(dStr) || { date: dStr, amount: 0, bills: 0 };
            row.amount += bill.total_amount;
            row.bills += 1;
            byDate.set(dStr, row);
          });
          return [...byDate.values()]
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((row) => ({
              ...row,
              day: formatWeekday(row.date),
              isToday: row.date === todayStr,
            }));
        })();

    const totalRevenue = numericValue(summary.total_sales ?? bills.reduce((sum, b) => sum + b.total_amount, 0));
    const totalBills = numericValue(summary.total_bills ?? bills.length);
    const totalTax = numericValue(summary.total_tax ?? bills.reduce((sum, b) => sum + b.tax_amount, 0));
    const totalDiscount = numericValue(summary.total_discount ?? bills.reduce((sum, b) => sum + b.discount_amount, 0));
    const averageBill = numericValue(summary.average_bill_value ?? (totalBills > 0 ? totalRevenue / totalBills : 0));
    const totalUnits = bills.reduce((sum, b) => {
      return sum + (Array.isArray(b.items) ? b.items.reduce((s, it) => s + numericValue(it?.quantity), 0) : 0);
    }, 0);

    return {
      timeframe,
      rangeStart: data?.period?.start || rangeStart,
      rangeEnd: data?.period?.end || rangeEnd,
      today: todayStr,
      source: "report-api",
      summary: {
        revenue: totalRevenue,
        bills: totalBills,
        tax: totalTax,
        discount: totalDiscount,
        averageBill,
        units: totalUnits,
      },
      dailySales,
      bills,
    };
  },

  /**
   * Fallback report generation by pulling live bill records
   */
  async _calculateReportFromBills(timeframe, rangeStart, rangeEnd, todayStr) {
    const allBills = [];
    const pageSize = 100;
    let offset = 0;

    for (let page = 0; page < 5; page++) {
      try {
        const res = await billingApi.getBills(pageSize, offset);
        const list = extractList(res);
        if (!Array.isArray(list) || list.length === 0) break;
        allBills.push(...list);
        if (list.length < pageSize) break;
        offset += pageSize;
      } catch (err) {
        console.warn(`[reportsDataService] Bills fallback pagination failed at offset ${offset}:`, err?.message || err);
        break;
      }
    }

    const validBills = allBills.filter((bill) => {
      if (!bill || typeof bill !== "object") return false;
      const status = (bill.status || "").toUpperCase();
      if (status === "CANCELLED") return false;
      const date = toLocalDateString(bill.created_at);
      return date && date >= rangeStart && date <= rangeEnd;
    });

    const normalizedBills = validBills.map((b, idx) => ({
      id: b.id || b.bill_id || `bill-${idx}`,
      bill_number: b.bill_number || b.id || "—",
      customer_name: b.customer_name || b.customer?.name || "Walk-in Customer",
      total_amount: numericValue(b.total_amount ?? b.amount),
      tax_amount: numericValue(b.tax_amount),
      discount_amount: numericValue(b.discount_amount),
      payment_method: String(b.payment_method || "CASH").toUpperCase(),
      paid_amount: (function() {
        const hasPaid = b.paid_amount !== undefined && b.paid_amount !== null;
        const hasReceived = b.received_amount !== undefined && b.received_amount !== null;
        const m = String(b.payment_method || "").toUpperCase();
        if (hasPaid) return numericValue(b.paid_amount);
        if (hasReceived) return numericValue(b.received_amount);
        if (m === "CREDIT" || m === "KADAN") return 0;
        return numericValue(b.total_amount ?? b.amount);
      })(),
      kadan_amount: (function() {
        if (b.kadan_amount !== undefined && b.kadan_amount !== null) return numericValue(b.kadan_amount);
        if (b.kadan?.kadan_amount !== undefined) return numericValue(b.kadan.kadan_amount);
        if (b.kadan?.amount !== undefined) return numericValue(b.kadan.amount);
        const hasPaid = b.paid_amount !== undefined && b.paid_amount !== null;
        const hasReceived = b.received_amount !== undefined && b.received_amount !== null;
        if (hasPaid || hasReceived) {
          const p = hasPaid ? numericValue(b.paid_amount) : numericValue(b.received_amount);
          return Math.max(0, numericValue(b.total_amount ?? b.amount) - p);
        }
        const m = String(b.payment_method || "").toUpperCase();
        if (m === "CREDIT" || m === "KADAN") return numericValue(b.total_amount ?? b.amount);
        return 0;
      })(),
      created_at: b.created_at || rangeStart,
      status: b.status || "Completed",
      items: Array.isArray(b.items) ? b.items : [],
    }));

    const byDate = new Map();
    normalizedBills.forEach((bill) => {
      const dateKey = toLocalDateString(bill.created_at);
      const row = byDate.get(dateKey) || { date: dateKey, amount: 0, bills: 0 };
      row.amount += bill.total_amount;
      row.bills += 1;
      byDate.set(dateKey, row);
    });

    const dailySales = [...byDate.values()]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((row) => ({
        ...row,
        day: formatWeekday(row.date),
        isToday: row.date === todayStr,
      }));

    const totalRevenue = normalizedBills.reduce((sum, b) => sum + b.total_amount, 0);
    const totalBills = normalizedBills.length;
    const totalTax = normalizedBills.reduce((sum, b) => sum + b.tax_amount, 0);
    const totalDiscount = normalizedBills.reduce((sum, b) => sum + b.discount_amount, 0);
    const averageBill = totalBills > 0 ? totalRevenue / totalBills : 0;
    const totalUnits = normalizedBills.reduce((sum, b) => {
      return sum + (Array.isArray(b.items) ? b.items.reduce((s, it) => s + numericValue(it?.quantity), 0) : 0);
    }, 0);

    return {
      timeframe,
      rangeStart,
      rangeEnd,
      today: todayStr,
      source: "bills-fallback",
      summary: {
        revenue: totalRevenue,
        bills: totalBills,
        tax: totalTax,
        discount: totalDiscount,
        averageBill,
        units: totalUnits,
      },
      dailySales,
      bills: normalizedBills,
    };
  },

  /**
   * Compatibility alias for getTimeframeData
   */
  async getTimeframeData(timeframe = "This Week") {
    return this.getReportData(timeframe);
  },

  /**
   * Get most-sold products for the last 3 months.
   * GET /api/v1/reports/most-sold-products/last-3-months
   */
  async getMostSoldProducts() {
    try {
      const res = await reportsApi.getLast3MonthsMostSold();
      const payload = res?.data || res;

      const normalizeVariant = (item) => {
        if (!item || typeof item !== "object") return null;
        const skuVal = item.sku;
        const isSkuValid =
          skuVal !== null &&
          skuVal !== undefined &&
          String(skuVal).trim() !== "" &&
          String(skuVal).toLowerCase() !== "null";

        return {
          product_id: item.product_id || item.id || "",
          variant_id: item.variant_id || "",
          product_name: item.product_name || item.name || "—",
          package_quantity: numericValue(item.package_quantity),
          unit: item.unit ? String(item.unit) : "",
          barcode: item.barcode ? String(item.barcode) : "—",
          sku: isSkuValid ? String(skuVal).trim() : "—",
          raw_sku: item.sku ?? null,
          quantity_sold: numericValue(item.quantity_sold),
          total_sales_value: numericValue(item.total_sales_value),
          average_selling_price: numericValue(item.average_selling_price),
        };
      };

      const rawMonths = Array.isArray(payload?.months) ? payload.months : [];
      const months = rawMonths.map((m) => {
        const normalized = normalizeVariant(m) || {};
        return {
          ...normalized,
          month: m.month ? String(m.month) : "—",
        };
      });

      const overall = normalizeVariant(payload?.overall_top_selling_variant);

      return {
        type: res?.type || "success",
        message: res?.message || "Last 3 months sales analysis fetched successfully",
        data: {
          months,
          overall_top_selling_variant: overall,
        },
        months,
        overall_top_selling_variant: overall,
      };
    } catch (error) {
      handleError(error, "reportsDataService.getMostSoldProducts");
      throw error;
    }
  },

  /**
   * Get most-sold product for a specific month.
   * GET /api/v1/reports/most-sold-product?month=YYYY-MM
   */
  async getMostSoldProduct(month) {
    return reportsApi.getMostSoldProduct(month);
  },
};

export default reportsDataService;

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { billingApi } from "../../services/api/billingApi.js";
import { kadanDataService } from "../../services/data/kadanDataService.js";
import { productDataService } from "../../services/data/productDataService.js";
import { queryCache } from "../../services/data/queryCache.js";

// Helper: Format currency in Indian Rupees with symbol ₹ and standard formatting
export function formatRupees(value, includePaise = true) {
  if (value === null || value === undefined) return "—";
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return `₹${num.toLocaleString("en-IN", {
    minimumFractionDigits: includePaise ? 2 : 0,
    maximumFractionDigits: includePaise ? 2 : 0,
  })}`;
}

// Helper: Format dates for display
export function formatDateDisplay(dateStr) {
  if (!dateStr) return "—";
  const parts = String(dateStr).split("-");
  if (parts.length === 3) {
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    }
  }
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime())
    ? dateStr
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// Helper: Format timestamp (Date & Time)
export function formatDateTimeDisplay(dateStrOrObj) {
  if (!dateStrOrObj) return "—";
  const d = new Date(dateStrOrObj);
  if (Number.isNaN(d.getTime())) return String(dateStrOrObj);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// Helper: Local ISO Date Key YYYY-MM-DD
export function toLocalDateKey(dateInput = new Date()) {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) {
    if (typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
      return dateInput.slice(0, 10);
    }
    return new Date().toISOString().slice(0, 10);
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Helper: Extract items list from API response safely
function extractList(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  if (Array.isArray(response?.bills)) return response.bills;
  if (Array.isArray(response?.items)) return response.items;
  return [];
}

// Helper: Convert numeric values
export function numericVal(val) {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Normalize an individual bill's financial representation
 * Handles completed payments (CASH, UPI, mixed methods) and distinguishes
 * newly created bill Kadan from customer cumulative outstanding balance.
 */
export function normalizeBill(b) {
  if (!b || typeof b !== "object") return null;

  const totalAmount = numericVal(b.total_amount ?? b.amount);
  const rawPayments = Array.isArray(b.payments) ? b.payments : [];
  const hasPaymentArray = Array.isArray(b.payments) && b.payments.length > 0;

  let cashReceived = 0;
  let upiReceived = 0;
  let otherPaid = 0;
  let creditFromPayments = 0;
  let hasValidPayment = false;

  if (hasPaymentArray) {
    rawPayments.forEach((p) => {
      if (!p || typeof p !== "object") return;
      const rawStatus = p.status ? String(p.status).trim().toUpperCase() : "";
      const isCompleted = !rawStatus || ["COMPLETED", "PAID", "SUCCESS"].includes(rawStatus);
      if (!isCompleted) return;

      const pAmount = numericVal(p.amount ?? p.paid_amount);
      const pMethod = (p.payment_method || p.method || p.type || "").trim().toUpperCase();

      if (pMethod === "CASH") {
        cashReceived += pAmount;
        hasValidPayment = true;
      } else if (pMethod === "UPI") {
        upiReceived += pAmount;
        hasValidPayment = true;
      } else if (pMethod === "CREDIT" || pMethod === "KADAN") {
        creditFromPayments += pAmount;
        hasValidPayment = true;
      } else if (pMethod) {
        otherPaid += pAmount;
        hasValidPayment = true;
      }
    });
  }

  let paidAmount;
  let kadanAmount;
  let paymentDetailsSource;
  let paymentMethod = (b.payment_method || "").trim().toUpperCase();

  if (hasPaymentArray && hasValidPayment) {
    paymentDetailsSource = "actual_payments";
    paidAmount = cashReceived + upiReceived + otherPaid;

    // Bill-linked historical Kadan/Credit:
    // 1. Explicit kadan_amount on bill or kadan object
    // 2. Original bill-linked CREDIT payment record in payments[]
    // 3. Fallback: remainder totalAmount - paidAmount if uncollected
    // CRITICAL: b.kadan.outstanding_amount must NEVER be used as the bill's kadan_amount!
    const explicitBillKadan = b.kadan_amount ?? b.kadan?.kadan_amount ?? b.kadan?.credit_amount;
    if (explicitBillKadan !== undefined && explicitBillKadan !== null) {
      kadanAmount = numericVal(explicitBillKadan);
    } else if (creditFromPayments > 0) {
      kadanAmount = creditFromPayments;
    } else if (b.kadan?.amount !== undefined && b.kadan?.amount !== null) {
      kadanAmount = numericVal(b.kadan.amount);
    } else {
      kadanAmount = Math.max(0, totalAmount - paidAmount);
    }

    // Determine normalized payment method display label
    if (cashReceived > 0 && upiReceived > 0) {
      paymentMethod = kadanAmount > 0 ? "CASH + UPI + KADAN" : "CASH + UPI";
    } else if (cashReceived > 0) {
      paymentMethod = kadanAmount > 0 ? "CASH + KADAN" : "CASH";
    } else if (upiReceived > 0) {
      paymentMethod = kadanAmount > 0 ? "UPI + KADAN" : "UPI";
    } else if (otherPaid > 0) {
      paymentMethod = kadanAmount > 0 ? `${b.payment_method || "OTHER"} + KADAN` : (b.payment_method || "OTHER");
    } else if (kadanAmount > 0) {
      paymentMethod = "CREDIT";
    }
  } else {
    // When payments[] is absent or empty:
    // BillResponse from /api/v1/bills includes a `kadan` object (KadanSummary) with
    // authoritative `paid_amount` (actual amount collected) and `kadan_amount` (new credit).
    // Prefer these over bill-level method guessing whenever present.
    paymentDetailsSource = "fallback_list_method";
    const rawMethod = paymentMethod || "CASH";
    paymentMethod = rawMethod;

    // Priority for paid amount:
    // 1. bill.paid_amount (explicit field, present on BillDetailResponse)
    // 2. bill.kadan.paid_amount (KadanSummary, present on BillResponse list)
    // 3. bill.received_amount (legacy field)
    // 4. Method-based fallback — CREDIT/KADAN → 0, else total (UNSAFE but last resort)
    const hasExplicitPaid = b.paid_amount !== undefined && b.paid_amount !== null;
    const hasKadanPaid = b.kadan?.paid_amount !== undefined && b.kadan?.paid_amount !== null;
    const hasExplicitReceived = b.received_amount !== undefined && b.received_amount !== null;

    if (hasExplicitPaid) {
      paidAmount = numericVal(b.paid_amount);
    } else if (hasKadanPaid) {
      // KadanSummary.paid_amount is the authoritative amount actually collected for this bill
      paidAmount = numericVal(b.kadan.paid_amount);
    } else if (hasExplicitReceived) {
      paidAmount = numericVal(b.received_amount);
    } else {
      if (rawMethod === "CREDIT" || rawMethod === "KADAN") {
        paidAmount = 0;
      } else {
        // Last resort: assume fully paid if method is CASH/UPI and no payment records.
        // This will overstate collections for partial-pay bills without kadan data,
        // but is unavoidable without authoritative payment records from the backend.
        paidAmount = totalAmount;
      }
    }

    // Bill-linked Kadan amount — authoritative order:
    // 1. b.kadan_amount (BillCreateResponseData field, not on BillResponse list)
    // 2. b.kadan.kadan_amount (KadanSummary on BillResponse — authoritative for list)
    // 3. b.kadan.credit_amount (legacy alias)
    // 4. b.kadan.amount (legacy alias)
    // 5. Method-based: CREDIT/KADAN → full bill total
    // 6. Remainder: totalAmount - paidAmount when explicit paid is known
    // 7. 0 (no Kadan info at all)
    const explicitBillKadan = b.kadan_amount ?? b.kadan?.kadan_amount ?? b.kadan?.credit_amount;
    if (explicitBillKadan !== undefined && explicitBillKadan !== null) {
      kadanAmount = numericVal(explicitBillKadan);
    } else if (b.kadan?.amount !== undefined && b.kadan?.amount !== null) {
      kadanAmount = numericVal(b.kadan.amount);
    } else if (rawMethod === "CREDIT" || rawMethod === "KADAN") {
      kadanAmount = totalAmount;
    } else if (hasExplicitPaid || hasKadanPaid || hasExplicitReceived) {
      kadanAmount = Math.max(0, totalAmount - paidAmount);
    } else {
      kadanAmount = 0;
    }

    // Allocate fallback collections based on bill-level method and actual paid amount
    if (rawMethod === "UPI") {
      upiReceived = paidAmount;
      cashReceived = 0;
    } else if (rawMethod === "CREDIT" || rawMethod === "KADAN") {
      upiReceived = 0;
      cashReceived = 0;
    } else {
      cashReceived = paidAmount;
      upiReceived = 0;
    }
  }

  // Customer's current total outstanding balance kept strictly separate
  const customerOutstanding = numericVal(
    b.kadan?.outstanding_amount ?? b.customer?.outstanding_balance ?? b.customer?.balance ?? 0
  );

  let taxAmount = numericVal(b.tax_amount ?? b.tax ?? b.total_tax ?? 0);
  if (taxAmount === 0 && Array.isArray(b.items)) {
    taxAmount = b.items.reduce((sum, item) => {
      const itmTax = item.tax_amount ?? item.tax ?? item.gst_amount;
      if (itmTax !== undefined && itmTax !== null && !isNaN(Number(itmTax))) {
        return sum + numericVal(itmTax);
      }
      const rate = numericVal(item.tax_rate ?? item.taxRate ?? item.gst_rate ?? item.tax_percent ?? item.gst ?? item.variant?.tax_rate);
      const p = numericVal(item.unit_price ?? item.price ?? item.selling_price);
      const q = Math.max(1, numericVal(item.quantity ?? item.qty ?? 1));
      return sum + (p * q * rate) / 100;
    }, 0);
  }

  return {
    ...b,
    total_amount: totalAmount,
    paid_amount: paidAmount,
    kadan_amount: kadanAmount,
    cash_received: cashReceived,
    upi_received: upiReceived,
    tax_amount: taxAmount,
    payment_method: paymentMethod || "CASH",
    payment_details_source: paymentDetailsSource,
    has_payment_details: hasPaymentArray && hasValidPayment,
    customer_outstanding: customerOutstanding,
  };
}

/**
 * Fetch all bills for a date range (paginated) & normalize paid/kadan amounts
 */
export async function fetchBillsForPeriod(startDateStr, endDateStr) {
  const allBills = [];
  const pageSize = 100;
  let offset = 0;

  for (let page = 0; page < 8; page++) {
    try {
      const res = await billingApi.getBills(pageSize, offset);
      const list = extractList(res);
      if (!Array.isArray(list) || list.length === 0) break;
      allBills.push(...list);
      if (list.length < pageSize) break;
      offset += pageSize;
    } catch (err) {
      console.warn("Error fetching bills batch:", err);
      break;
    }
  }

  // Filter bills within start date and end date, excluding cancelled bills
  const filteredBills = allBills.filter((bill) => {
    if (!bill || typeof bill !== "object") return false;
    const status = (bill.status || "").toUpperCase();
    if (status === "CANCELLED") return false;
    const billDate = toLocalDateKey(bill.created_at || bill.created_date || bill.date);
    return billDate >= startDateStr && billDate <= endDateStr;
  });

  // Ensure bill items are populated if missing from list endpoint
  const billsWithItems = await Promise.all(
    filteredBills.map(async (bill) => {
      const billId = bill.id || bill.bill_id;
      const cached = billId ? (queryCache.get(`bill:${billId}`) || queryCache.get(`bill:detail:${billId}`)) : null;
      let merged = cached && typeof cached === "object"
        ? {
            ...cached,
            ...bill,
            items: (Array.isArray(cached.items) && cached.items.length > 0) ? cached.items : bill.items,
            payments: (Array.isArray(cached.payments) && cached.payments.length > 0) ? cached.payments : bill.payments,
            kadan: cached.kadan || bill.kadan,
          }
        : bill;

      // If items are still missing, fetch the bill details to get line items
      if ((!Array.isArray(merged.items) || merged.items.length === 0) && billId) {
        try {
          const detailRes = await billingApi.getBillById(billId);
          const detail = detailRes?.data || detailRes;
          if (detail && typeof detail === "object") {
            queryCache.set(`bill:${billId}`, detail, 120_000);
            merged = {
              ...merged,
              ...detail,
              items: Array.isArray(detail.items) ? detail.items : merged.items,
              payments: (Array.isArray(detail.payments) && detail.payments.length > 0) ? detail.payments : merged.payments,
            };
          }
        } catch {
          // ignore network error
        }
      }

      return normalizeBill(merged);
    })
  );

  return billsWithItems;
}

/**
 * Build fast lookup map for product barcodes by variant ID, product ID, and product name
 */
export function buildProductBarcodeMap(products = []) {
  const variantMap = new Map();
  const productMap = new Map();
  const nameMap = new Map();

  (Array.isArray(products) ? products : []).forEach((prod) => {
    if (!prod) return;
    const prodId = String(prod.id || prod.product_id || "");
    const prodName = String(prod.name || prod.product_name || "").trim().toLowerCase();
    const variants = Array.isArray(prod.variants) ? prod.variants : [];

    variants.forEach((v) => {
      if (!v) return;
      const vId = String(v.id || v.variant_id || "");
      const bCode = (v.barcode && String(v.barcode).trim() && String(v.barcode).trim() !== "—")
        ? String(v.barcode).trim()
        : (v.sku && String(v.sku).trim() && String(v.sku).trim() !== "—" ? String(v.sku).trim() : "");
      if (bCode) {
        if (vId) variantMap.set(vId, bCode);
        if (prodId && !productMap.has(prodId)) productMap.set(prodId, bCode);
        if (prodName && !nameMap.has(prodName)) nameMap.set(prodName, bCode);
      }
    });

    if (prod.barcode && String(prod.barcode).trim() && String(prod.barcode).trim() !== "—") {
      const bCode = String(prod.barcode).trim();
      if (prodId && !productMap.has(prodId)) productMap.set(prodId, bCode);
      if (prodName && !nameMap.has(prodName)) nameMap.set(prodName, bCode);
    }
  });

  return { variantMap, productMap, nameMap };
}

/**
 * Fetch products catalog to resolve product barcodes in reports
 */
export async function fetchProductsForReports() {
  try {
    const res = await productDataService.getProducts();
    return Array.isArray(res) ? res : [];
  } catch (err) {
    console.warn("Could not load products for reports barcode resolution:", err);
    return [];
  }
}

/**
 * Load Kadan (Outstanding Credit) customer accounts with positive balance.
 *
 * NOTE: The /api/v1/kadan/accounts endpoint (KadanAccountResponse) does NOT
 * return total_kadan_amount or any paid amount — only outstanding_amount.
 * To get total_kadan_amount, we fetch each customer's individual kadan detail
 * (/api/v1/kadan/customer/{id}) in parallel via Promise.all.
 */
export async function fetchKadanAccounts() {
  try {
    const res = await kadanDataService.getKadanRecords();
    const list = extractList(res);

    if (!Array.isArray(list) || list.length === 0) return [];

    // Fetch individual customer kadan details in parallel to get total_kadan_amount
    const detailedAccounts = await Promise.all(
      list.map(async (item) => {
        const customerId = item.customer_id || item.customerId || item.id || item.account_id;
        const rawBalance = item.outstanding_amount ?? item.outstanding_balance ?? item.balance;
        const balance = rawBalance !== undefined && rawBalance !== null
          ? numericVal(rawBalance)
          : 0;

        // Skip fetching detail for accounts with no outstanding balance
        if (balance <= 0) return null;

        let totalCredit = 0;
        try {
          // CustomerKadanResponse has total_kadan_amount and outstanding_amount
          const detail = await kadanDataService.getCustomerLedger(customerId);
          const rawCredit = detail?.total_kadan_amount ?? detail?.total_credit;
          if (rawCredit !== undefined && rawCredit !== null) {
            totalCredit = numericVal(rawCredit);
          }
        } catch {
          // If detail fetch fails, fall back to list-level fields
          const rawCredit = item.total_kadan_amount ?? item.total_credit ?? item.totalCredit;
          if (rawCredit !== undefined && rawCredit !== null) {
            totalCredit = numericVal(rawCredit);
          }
        }

        // Derived paid amount: cumulative credit minus current outstanding balance
        const paid = totalCredit > 0 ? Math.max(0, totalCredit - balance) : null;

        return {
          id: customerId,
          customer_name: item.customer_name || item.customer || "Walk-in Customer",
          phone: item.customer_phone || item.phone || "—",
          total_credit: totalCredit,
          amount_paid: paid,
          outstanding_amount: balance,
        };
      })
    );

    return detailedAccounts.filter(Boolean);
  } catch (err) {
    console.warn("Failed to fetch kadan accounts:", err);
    return [];
  }
}

/**
 * Process raw bills into standardized financial report metrics & breakdowns
 */
export function calculateReportData(bills = [], kadanList = [], barcodeMaps = null) {
  let totalSales = 0;
  let totalCash = 0;
  let totalUpi = 0;
  let totalCreditGiven = 0;
  let totalQuantitySold = 0;
  let totalTax = 0;
  const billedCustomers = new Set();
  const dateMap = new Map();
  const productMap = new Map();

  bills.forEach((rawBill) => {
    const bill = rawBill?.has_payment_details !== undefined ? rawBill : normalizeBill(rawBill);
    if (!bill) return;

    const billTotal = numericVal(bill.total_amount ?? bill.amount);
    totalSales += billTotal;

    const cashAmt = numericVal(bill.cash_received);
    const upiAmt = numericVal(bill.upi_received);
    const kadanAmt = numericVal(bill.kadan_amount);
    const billTax = numericVal(bill.tax_amount ?? 0);

    totalCash += cashAmt;
    totalUpi += upiAmt;
    totalCreditGiven += kadanAmt;
    totalTax += billTax;

    if (bill.customer_name && bill.customer_name.toLowerCase() !== "walk-in customer") {
      billedCustomers.add(bill.customer_name);
    } else if (bill.customer_phone) {
      billedCustomers.add(bill.customer_phone);
    }

    const dKey = toLocalDateKey(bill.created_at || bill.created_date || bill.date);
    const dateRow = dateMap.get(dKey) || {
      date: dKey,
      bills_count: 0,
      cash_received: 0,
      upi_received: 0,
      credit_sales: 0,
      total_sales: 0,
      total_tax: 0,
    };
    dateRow.bills_count += 1;
    dateRow.total_sales += billTotal;
    dateRow.cash_received += cashAmt;
    dateRow.upi_received += upiAmt;
    dateRow.credit_sales += kadanAmt;
    dateRow.total_tax += billTax;
    dateMap.set(dKey, dateRow);

    // Line items product sales breakdown
    const items = Array.isArray(bill.items) ? bill.items : [];
    items.forEach((item) => {
      const qty = Math.max(1, numericVal(item.quantity ?? item.qty ?? 1));
      totalQuantitySold += qty;

      const pName = item.item_name || item.product_name || item.name || item.title || "Product";
      const itemVariantId = String(item.product_variant_id || item.variant_id || item.variantId || "");
      const itemProductId = String(item.product_id || item.productId || "");
      const cleanName = pName.trim().toLowerCase();

      let rawBarcode = item.barcode || item.sku || item.variant?.barcode || item.variant?.sku;
      if (rawBarcode && (rawBarcode === "—" || rawBarcode === "null" || rawBarcode === "undefined")) {
        rawBarcode = "";
      }

      let resolvedBarcode = rawBarcode ? String(rawBarcode).trim() : "";
      if (!resolvedBarcode && barcodeMaps) {
        resolvedBarcode =
          (itemVariantId && barcodeMaps.variantMap?.get(itemVariantId)) ||
          (itemProductId && barcodeMaps.productMap?.get(itemProductId)) ||
          barcodeMaps.nameMap?.get(cleanName) ||
          "";
      }

      const displayBarcode = resolvedBarcode || "—";
      const unitPrice = numericVal(item.unit_price ?? item.price ?? item.selling_price);
      const lineTotal = numericVal(item.line_total ?? item.total_price ?? item.total ?? (qty * unitPrice));

      const pKey = itemVariantId
        ? `vid:${itemVariantId}`
        : (displayBarcode !== "—"
            ? `bc:${displayBarcode}`
            : `name:${cleanName}`);

      const prodRow = productMap.get(pKey) || {
        product_name: pName,
        barcode: displayBarcode,
        quantity_sold: 0,
        total_product_sales: 0,
      };

      if ((!prodRow.barcode || prodRow.barcode === "—") && displayBarcode !== "—") {
        prodRow.barcode = displayBarcode;
      }

      prodRow.quantity_sold += qty;
      prodRow.total_product_sales += lineTotal;
      productMap.set(pKey, prodRow);
    });
  });

  // Calculate day-by-day sales table — CRITICAL RULE: EXCLUDE 0 SALES / 0 BILL DAYS
  const dateSalesList = Array.from(dateMap.values())
    .filter((row) => row.bills_count > 0 && row.total_sales > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Product sales list sorted by quantity sold (Highest quantity sold = Top Selling)
  const productSalesList = Array.from(productMap.values())
    .map((p) => ({
      ...p,
      average_selling_price: p.quantity_sold > 0 ? p.total_product_sales / p.quantity_sold : 0,
    }))
    .sort((a, b) => b.quantity_sold - a.quantity_sold);

  const topSellingProduct = productSalesList.length > 0 ? productSalesList[0] : null;

  const totalOutstandingCredit = kadanList.reduce((sum, acc) => sum + acc.outstanding_amount, 0);

  return {
    totalSales,
    totalBills: bills.length,
    cashReceived: totalCash,
    upiReceived: totalUpi,
    cashPlusUpi: totalCash + totalUpi,
    creditGiven: totalCreditGiven,
    outstandingCredit: totalOutstandingCredit,
    totalQuantitySold,
    totalTax,
    daysWithSales: dateSalesList.length,
    billedCustomersCount: billedCustomers.size,
    dateSalesList,
    productSalesList,
    topSellingProduct,
  };
}

/**
 * Load Font into jsPDF to support native ₹ symbol rendering
 */
async function loadRupeeFontToPdf(doc) {
  try {
    const fontRes = await fetch("/fonts/SegoeUI.ttf");
    if (fontRes.ok) {
      const buffer = await fontRes.arrayBuffer();
      const base64Str = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );
      doc.addFileToVFS("SegoeUI.ttf", base64Str);
      doc.addFont("SegoeUI.ttf", "SegoeUI", "normal");

      const boldRes = await fetch("/fonts/SegoeUI-Bold.ttf");
      if (boldRes.ok) {
        const boldBuf = await boldRes.arrayBuffer();
        const boldBase64 = btoa(
          new Uint8Array(boldBuf).reduce((data, byte) => data + String.fromCharCode(byte), "")
        );
        doc.addFileToVFS("SegoeUI-Bold.ttf", boldBase64);
        doc.addFont("SegoeUI-Bold.ttf", "SegoeUI", "bold");
      } else {
        doc.addFont("SegoeUI.ttf", "SegoeUI", "bold");
      }

      doc.setFont("SegoeUI", "normal");
      return "SegoeUI";
    }
  } catch (err) {
    console.warn("Could not load custom font for PDF, fallback to helvetica:", err);
  }
  return "helvetica";
}

/**
 * Load CRYVEX logo as Base64 image
 */
async function loadLogoBase64() {
  try {
    const res = await fetch("/cryvex-logo.png");
    if (res.ok) {
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    }
  } catch {
    // fallback null
  }
  return null;
}

/**
 * Download Professional PDF Report (A4, CRYVEX Branding, ₹ Symbol, Print-friendly)
 */
export async function generatePdfReport({
  reportType, // "Monthly" | "Weekly" | "Daily"
  periodTitle,
  startDateStr,
  endDateStr,
  shopName,
  shopStartingDate,
  summary,
  kadanList = [],
  bills = [],
  dateSalesList = [],
  productSalesList = [],
  topSellingProduct,
  filename,
}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();

  const fontName = await loadRupeeFontToPdf(doc);
  const logoData = await loadLogoBase64();

  const now = new Date();
  const generatedAtStr = formatDateTimeDisplay(now);
  const shopStartDateStr = shopStartingDate ? formatDateDisplay(shopStartingDate) : "—";

  // Top header bar
  doc.setFillColor(11, 25, 44); // Dark Navy Blue
  doc.rect(0, 0, pageWidth, 28, "F");

  // Logo
  if (logoData) {
    try {
      doc.addImage(logoData, "PNG", margin, 4, 20, 20);
    } catch {
      // ignore logo errors
    }
  }

  // Header Title
  doc.setFont(fontName, "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("CRYVEX SHOP", logoData ? margin + 24 : margin, 12);

  doc.setFont(fontName, "normal");
  doc.setFontSize(10);
  doc.setTextColor(59, 130, 246); // Accent blue
  doc.text(`SALES AND FINANCIAL REPORT — ${reportType.toUpperCase()} REPORT`, logoData ? margin + 24 : margin, 19);

  // Subheader Details
  doc.setFont(fontName, "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);

  let curY = 35;
  doc.text(`Shop Name: ${shopName || "CRYVEX STORE"}`, margin, curY);
  doc.text(`Shop Starting Date: ${shopStartDateStr}`, pageWidth - margin - 60, curY);
  curY += 5;

  doc.text(`Report Period: ${formatDateDisplay(startDateStr)} to ${formatDateDisplay(endDateStr)} (${periodTitle})`, margin, curY);
  curY += 5;
  doc.text(`Report Generated On: ${generatedAtStr}`, margin, curY);
  curY += 7;

  // Horizontal divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, curY, pageWidth - margin, curY);
  curY += 6;

  // Section 1: Financial Summary
  autoTable(doc, {
    startY: curY,
    head: [["FINANCIAL METRIC", "VALUE"]],
    body: [
      ["Total Sales", formatRupees(summary.totalSales)],
      ["Total Bills Generated", String(summary.totalBills)],
      ["Total Tax (GST)", formatRupees(summary.totalTax || 0)],
      ["Total Cash Received", formatRupees(summary.cashReceived)],
      ["Total UPI Received", formatRupees(summary.upiReceived)],
      ["Total Cash + UPI Received", formatRupees(summary.cashPlusUpi)],
      ["Credit Given During Period", formatRupees(summary.creditGiven)],
      ["Outstanding Credit (As of Report Date)", formatRupees(summary.outstandingCredit)],
      ["Total Quantity of Products Sold", summary.totalQuantitySold.toLocaleString("en-IN")],
      [reportType === "Daily" ? "Number of Customers Billed" : "Number of Days with Sales", String(reportType === "Daily" ? summary.billedCustomersCount : summary.daysWithSales)],
    ],
    theme: "grid",
    headStyles: { fillColor: [11, 25, 44], textColor: [255, 255, 255], font: fontName, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { font: fontName, fontSize: 9, textColor: [30, 41, 59] },
    columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: "auto", fontStyle: "bold" } },
    margin: { left: margin, right: margin },
  });

  curY = doc.lastAutoTable.finalY + 8;

  // Section 2: Top Selling Product
  const effectiveTopProduct = topSellingProduct || summary?.topSellingProduct;
  if (effectiveTopProduct) {
    autoTable(doc, {
      startY: curY,
      head: [["TOP SELLING PRODUCT (RANKED BY QUANTITY)", "DETAIL"]],
      body: [
        ["Product Name", effectiveTopProduct.product_name],
        ["Barcode / SKU", effectiveTopProduct.barcode || "—"],
        ["Quantity Sold", `${numericVal(effectiveTopProduct.quantity_sold).toLocaleString("en-IN")} units`],
        ["Average Selling Price", formatRupees(effectiveTopProduct.average_selling_price)],
        ["Total Product Sales", formatRupees(effectiveTopProduct.total_product_sales)],
      ],
      theme: "grid",
      headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], font: fontName, fontStyle: "bold", fontSize: 9 },
      bodyStyles: { font: fontName, fontSize: 9 },
      columnStyles: { 0: { cellWidth: 100 }, 1: { fontStyle: "bold" } },
      margin: { left: margin, right: margin },
    });
    curY = doc.lastAutoTable.finalY + 8;
  }

  // Section 2B: Itemized Product Sales Breakdown with Barcode / SKU
  const effectiveProductSales = (Array.isArray(productSalesList) && productSalesList.length > 0)
    ? productSalesList
    : (Array.isArray(summary?.productSalesList) ? summary.productSalesList : []);

  if (effectiveProductSales.length > 0) {
    const totalProdQty = effectiveProductSales.reduce((sum, p) => sum + numericVal(p.quantity_sold), 0);
    const totalProdSales = effectiveProductSales.reduce((sum, p) => sum + numericVal(p.total_product_sales), 0);

    autoTable(doc, {
      startY: curY,
      head: [
        [
          {
            content: "PRODUCT SALES BREAKDOWN (WITH BARCODE / SKU)",
            colSpan: 5,
            styles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
          },
        ],
        ["Product Name", "Barcode / SKU", "Qty Sold", "Average Price", "Total Sales"],
      ],
      body: effectiveProductSales.map((p) => [
        p.product_name || "—",
        p.barcode || "—",
        numericVal(p.quantity_sold).toLocaleString("en-IN"),
        formatRupees(p.average_selling_price),
        formatRupees(p.total_product_sales),
      ]),
      foot: [[
        "TOTAL",
        "",
        totalProdQty.toLocaleString("en-IN"),
        "",
        formatRupees(totalProdSales),
      ]],
      theme: "grid",
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], font: fontName, fontStyle: "bold", fontSize: 8.5 },
      footStyles: { fillColor: [224, 242, 254], textColor: [11, 25, 44], font: fontName, fontStyle: "bold", fontSize: 8.5 },
      bodyStyles: { font: fontName, fontSize: 8.5, textColor: [30, 41, 59] },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { cellWidth: 42, fontStyle: "normal" },
        2: { halign: "center", cellWidth: 20 },
        3: { halign: "right", cellWidth: 28 },
        4: { halign: "right", cellWidth: 32, fontStyle: "bold" },
      },
      margin: { left: margin, right: margin },
    });
    curY = doc.lastAutoTable.finalY + 8;
  }

  // Section 3: Date Sales Breakdown (Excluded 0 Sales dates)
  if (reportType !== "Daily" && dateSalesList.length > 0) {
    autoTable(doc, {
      startY: curY,
      head: [["Date", "Bills", "Cash Received", "UPI Received", "Credit Sales", "Total Sales"]],
      body: dateSalesList.map((row) => [
        formatDateDisplay(row.date),
        String(row.bills_count),
        formatRupees(row.cash_received),
        formatRupees(row.upi_received),
        formatRupees(row.credit_sales),
        formatRupees(row.total_sales),
      ]),
      foot: [[
        "TOTAL",
        String(summary.totalBills),
        formatRupees(summary.cashReceived),
        formatRupees(summary.upiReceived),
        formatRupees(summary.creditGiven),
        formatRupees(summary.totalSales),
      ]],
      theme: "grid",
      headStyles: { fillColor: [11, 25, 44], textColor: [255, 255, 255], font: fontName, fontStyle: "bold", fontSize: 8.5 },
      footStyles: { fillColor: [224, 242, 254], textColor: [11, 25, 44], font: fontName, fontStyle: "bold", fontSize: 8.5 },
      bodyStyles: { font: fontName, fontSize: 8.5 },
      margin: { left: margin, right: margin },
    });
    curY = doc.lastAutoTable.finalY + 8;
  }

  // Section 4: Daily Financial Reconciliation (For Daily Report)
  if (reportType === "Daily") {
    const reconDiff = (summary.cashReceived + summary.upiReceived + summary.creditGiven) - summary.totalSales;
    autoTable(doc, {
      startY: curY,
      head: [["DAY-END FINANCIAL RECONCILIATION", "AMOUNT"]],
      body: [
        ["Actual Cash Collected", formatRupees(summary.cashReceived)],
        ["Actual UPI Received", formatRupees(summary.upiReceived)],
        ["Total Collections (Cash + UPI)", formatRupees(summary.cashPlusUpi)],
        ["Credit Given Today", formatRupees(summary.creditGiven)],
        ["Total Day Sales", formatRupees(summary.totalSales)],
        ["Reconciliation Check Status", Math.abs(reconDiff) < 1 ? "BALANCED (MATCHED)" : `DIFFERENCE: ${formatRupees(reconDiff)}`],
      ],
      theme: "grid",
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], font: fontName, fontStyle: "bold", fontSize: 9 },
      bodyStyles: { font: fontName, fontSize: 9 },
      columnStyles: { 0: { cellWidth: 120 }, 1: { fontStyle: "bold" } },
      margin: { left: margin, right: margin },
    });
    curY = doc.lastAutoTable.finalY + 8;
  }

  // Section 5: Outstanding Credit Customer / Kadan List (Customer Name, Phone, Credit Given, Repaid, Pending Balance)
  if (kadanList.length > 0) {
    autoTable(doc, {
      startY: curY,
      head: [["Customer Name", "Phone Number", "Total Credit Given", "Amount Paid Back", "Pending / Outstanding Balance"]],
      body: kadanList.map((acc) => [
        acc.customer_name,
        acc.phone,
        formatRupees(acc.total_credit),
        formatRupees(acc.amount_paid),
        formatRupees(acc.outstanding_amount),
      ]),
      foot: [[
        "TOTAL OUTSTANDING",
        "",
        "",
        "",
        formatRupees(summary.outstandingCredit),
      ]],
      theme: "grid",
      headStyles: { fillColor: [153, 27, 27], textColor: [255, 255, 255], font: fontName, fontStyle: "bold", fontSize: 8.5 },
      footStyles: { fillColor: [254, 226, 226], textColor: [153, 27, 27], font: fontName, fontStyle: "bold", fontSize: 8.5 },
      bodyStyles: { font: fontName, fontSize: 8.5 },
      margin: { left: margin, right: margin },
    });
    curY = doc.lastAutoTable.finalY + 8;
  }

  // Section 6: Bills Generated List with Paid Amount & Kadan Amount
  if (bills.length > 0) {
    const totalPaidSum = bills.reduce((sum, b) => sum + numericVal(b.paid_amount), 0);
    const totalKadanSum = bills.reduce((sum, b) => sum + numericVal(b.kadan_amount), 0);

    const billRows = bills.map((b) => [
      b.bill_number || b.id || "—",
      formatDateTimeDisplay(b.created_at || b.date),
      b.customer_name || b.customer?.name || "Walk-in Customer",
      String(b.payment_method || "CASH").toUpperCase(),
      formatRupees(numericVal(b.paid_amount)),
      formatRupees(numericVal(b.kadan_amount)),
      formatRupees(numericVal(b.total_amount ?? b.amount)),
    ]);

    autoTable(doc, {
      startY: curY,
      head: [["Bill No", "Date & Time", "Customer Name", "Payment Mode", "Paid Amount", "Kadan Amount", "Bill Total"]],
      body: billRows,
      foot: [[
        "TOTAL",
        "",
        "",
        "",
        formatRupees(totalPaidSum),
        formatRupees(totalKadanSum),
        formatRupees(summary.totalSales),
      ]],
      theme: "grid",
      headStyles: { fillColor: [11, 25, 44], textColor: [255, 255, 255], font: fontName, fontStyle: "bold", fontSize: 8 },
      footStyles: { fillColor: [224, 242, 254], textColor: [11, 25, 44], font: fontName, fontStyle: "bold", fontSize: 8 },
      bodyStyles: { font: fontName, fontSize: 8 },
      margin: { left: margin, right: margin },
    });
  }

  // Page Numbers & Footer on every page
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont(fontName, "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);

    // Footer line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, 282, pageWidth - margin, 282);

    doc.text(`CRYVEX SHOPFLOW • ${reportType.toUpperCase()} SALES AND FINANCIAL REPORT`, margin, 287);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 20, 287);
  }

  doc.save(filename);
}

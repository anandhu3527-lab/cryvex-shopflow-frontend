/**
 * Daily Price Change History Service
 * Persists and manages product price change events in browser localStorage.
 * Scoped by tenant, filtered by local calendar day (YYYY-MM-DD), with automatic expiration.
 */

const STORAGE_KEY = "shopflow_daily_price_changes_v1";
const CHANGE_EVENT_NAME = "shopflow:daily-price-change";

/**
 * Get current local calendar date key (YYYY-MM-DD)
 */
export function getTodayDateKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Safely parse JSON from localStorage
 */
function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Safely write JSON to localStorage
 */
function writeStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Handle storage quota or private browsing exceptions silently
  }
}

function resolveTenantKey(tenantId) {
  if (tenantId && typeof tenantId === "object") {
    return String(tenantId.id || tenantId.tenant_id || "default_tenant");
  }
  return String(tenantId || "default_tenant").trim() || "default_tenant";
}

export const dailyPriceHistoryService = {
  STORAGE_KEY,

  /**
   * Get today's recorded price change events for a given tenant.
   * Automatically prunes expired entries from previous days.
   *
   * @param {string} tenantId
   * @returns {{ entries: Array, distinctProductsCount: number, totalEventsCount: number, dateKey: string }}
   */
  getTodayHistory(tenantId) {
    const key = resolveTenantKey(tenantId);
    const store = readStorage();
    const todayKey = getTodayDateKey();

    const tenantEntries = Array.isArray(store[key]) ? store[key] : [];

    // Filter to today's entries only
    const validEntries = tenantEntries.filter(
      (entry) => entry && entry.date_key === todayKey && entry.id && entry.product_id
    );

    // If there were expired entries, clean up storage
    if (validEntries.length !== tenantEntries.length) {
      store[key] = validEntries;
      writeStorage(store);
    }

    // Sort descending by timestamp (most recent first)
    validEntries.sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at));

    // Calculate distinct products changed today
    const distinctProductIds = new Set(validEntries.map((e) => String(e.product_id)));

    return {
      entries: validEntries,
      distinctProductsCount: distinctProductIds.size,
      totalEventsCount: validEntries.length,
      dateKey: todayKey,
    };
  },

  /**
   * Record a verified, successful price change event.
   * Only records if selling_price or offer_price actually changed.
   *
   * @param {{
   *   tenantId: string,
   *   productId: string,
   *   productName: string,
   *   sellingPriceBefore: number|string,
   *   sellingPriceAfter: number|string,
   *   offerPriceBefore?: number|string|null,
   *   offerPriceAfter?: number|string|null,
   * }} params
   * @returns {object|null} The recorded event, or null if no price changed.
   */
  recordPriceChange({
    tenantId,
    productId,
    productName,
    sellingPriceBefore,
    sellingPriceAfter,
    offerPriceBefore,
    offerPriceAfter,
  }) {
    if (!productId) return null;

    const numSellingBefore = Number(sellingPriceBefore ?? 0);
    const numSellingAfter = Number(sellingPriceAfter ?? 0);

    const hasOfferBefore = offerPriceBefore !== null && offerPriceBefore !== undefined && offerPriceBefore !== "";
    const hasOfferAfter = offerPriceAfter !== null && offerPriceAfter !== undefined && offerPriceAfter !== "";

    const numOfferBefore = hasOfferBefore ? Number(offerPriceBefore) : null;
    const numOfferAfter = hasOfferAfter ? Number(offerPriceAfter) : null;

    const sellingChanged = Number.isFinite(numSellingAfter) && numSellingBefore !== numSellingAfter;
    const offerChanged =
      (hasOfferBefore !== hasOfferAfter) ||
      (hasOfferBefore && hasOfferAfter && numOfferBefore !== numOfferAfter);

    // If neither selling price nor offer price changed, do not record an event
    if (!sellingChanged && !offerChanged) {
      return null;
    }

    const changedFields = [];
    if (sellingChanged) changedFields.push("selling_price");
    if (offerChanged) changedFields.push("offer_price");

    const key = resolveTenantKey(tenantId);
    const todayKey = getTodayDateKey();
    const timestamp = new Date().toISOString();

    const newEvent = {
      id: `change-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      product_id: String(productId),
      product_name: String(productName || "Product").trim(),
      changed_at: timestamp,
      date_key: todayKey,
      selling_price_before: numSellingBefore,
      selling_price_after: numSellingAfter,
      offer_price_before: numOfferBefore,
      offer_price_after: numOfferAfter,
      changed_fields: changedFields,
    };

    const store = readStorage();
    const existing = Array.isArray(store[key])
      ? store[key].filter((e) => e && e.date_key === todayKey)
      : [];

    store[key] = [newEvent, ...existing];
    writeStorage(store);

    // Notify any active components
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(CHANGE_EVENT_NAME, {
          detail: { tenantId: key, event: newEvent },
        })
      );
    }

    return newEvent;
  },

  /**
   * Clear history for a specific tenant
   */
  clearTenantHistory(tenantId) {
    const key = resolveTenantKey(tenantId);
    const store = readStorage();
    delete store[key];
    writeStorage(store);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(CHANGE_EVENT_NAME, {
          detail: { tenantId: key, cleared: true },
        })
      );
    }
  },
};

export default dailyPriceHistoryService;

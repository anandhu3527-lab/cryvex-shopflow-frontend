/**
 * Bill calculation utilities (Totals, GST taxes, Discounts)
 */

export const calculateLineTotal = (price = 0, quantity = 1) => {
  return Number(price || 0) * Number(quantity || 0);
};

export const calculateGstAmount = (subtotal = 0, gstRate = 0) => {
  return (Number(subtotal || 0) * Number(gstRate || 0)) / 100;
};

export const calculateBillSummary = (items = [], discount = 0) => {
  const subtotal = items.reduce((acc, item) => acc + (Number(item.price || 0) * Number(item.qty || item.quantity || 1)), 0);
  const gstTotal = items.reduce((acc, item) => {
    const itemSubtotal = Number(item.price || 0) * Number(item.qty || item.quantity || 1);
    const itemGst = (itemSubtotal * Number(item.gst || 0)) / 100;
    return acc + itemGst;
  }, 0);
  const grandTotal = Math.max(0, subtotal + gstTotal - Number(discount || 0));

  return {
    subtotal,
    gstTotal,
    discount: Number(discount || 0),
    grandTotal,
  };
};

export const resolveBillItemPricing = (item = {}) => {
  const rawUnit =
    item?.regular_price ??
    item?.original_price ??
    item?.unit_price ??
    item?.selling_price ??
    item?.price ??
    item?.variant?.selling_price ??
    item?.variant?.price ??
    item?.product_variant?.selling_price ??
    0;
  const regularPrice =
    Number.isFinite(Number(rawUnit)) && Number(rawUnit) > 0
      ? Number(rawUnit)
      : 0;

  const rawOffer =
    item?.offer_price ??
    item?.offerPrice ??
    item?.variant?.offer_price ??
    item?.variant?.offerPrice ??
    item?.product_variant?.offer_price ??
    item?.product_variant?.offerPrice ??
    item?.product?.offer_price;
  let parsedOffer =
    rawOffer !== null &&
    rawOffer !== undefined &&
    typeof rawOffer !== 'boolean' &&
    String(rawOffer).trim() !== '' &&
    Number.isFinite(Number(rawOffer)) &&
    Number(rawOffer) > 0
      ? Number(rawOffer)
      : null;

  const rawQty = item?.quantity ?? item?.qty ?? 1;
  const quantity = Number.isFinite(Number(rawQty)) ? Math.max(0, Number(rawQty)) : 1;

  if (parsedOffer === null && regularPrice > 0 && quantity > 0) {
    const rawDisc = item?.discount_amount ?? item?.discount;
    if (Number.isFinite(Number(rawDisc)) && Number(rawDisc) > 0) {
      const discPerUnit = Number(rawDisc) / quantity;
      if (discPerUnit < regularPrice) {
        parsedOffer = regularPrice - discPerUnit;
      }
    }
  }

  const hasOffer =
    parsedOffer !== null &&
    regularPrice > 0 &&
    parsedOffer < regularPrice;

  const effectivePrice = hasOffer
    ? parsedOffer
    : parsedOffer !== null && regularPrice === 0
      ? parsedOffer
      : regularPrice;

  const lineTotal =
    Number.isFinite(Number(item?.line_total)) && Number(item.line_total) >= 0
      ? Number(item.line_total)
      : effectivePrice * quantity;

  const unitSavings = hasOffer ? Math.max(0, regularPrice - effectivePrice) : 0;
  const totalSavings = unitSavings * quantity;

  return {
    hasOffer,
    regularPrice,
    offerPrice: hasOffer ? effectivePrice : null,
    effectivePrice,
    quantity,
    lineTotal,
    unitSavings,
    totalSavings,
  };
};

export default { calculateLineTotal, calculateGstAmount, calculateBillSummary, resolveBillItemPricing };

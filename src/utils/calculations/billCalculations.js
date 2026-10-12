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

export default { calculateLineTotal, calculateGstAmount, calculateBillSummary };

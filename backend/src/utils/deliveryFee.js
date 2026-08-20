

export function calculateDeliveryFee(deliveryMethod, medicineSubtotal) {
  if (deliveryMethod !== 'delivery') return 0;

  const flatFee = Number(process.env.PHARMACY_DELIVERY_FEE ?? 49);
  const freeAbove = Number(process.env.PHARMACY_FREE_DELIVERY_ABOVE ?? 499);

  if (freeAbove > 0 && medicineSubtotal >= freeAbove) return 0;
  return Math.max(0, flatFee);
}

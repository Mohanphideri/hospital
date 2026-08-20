

const PICKUP_FLOW = ['pending', 'confirmed', 'preparing', 'ready-for-pickup', 'dispensed'];
const DELIVERY_FLOW = ['pending', 'confirmed', 'preparing', 'ready-for-dispatch', 'out-for-delivery', 'delivered'];

export const TERMINAL_STATUSES = new Set(['dispensed', 'delivered', 'cancelled']);

export function getAllowedNextStatuses(deliveryMethod, currentStatus) {
  const flow = deliveryMethod === 'delivery' ? DELIVERY_FLOW : PICKUP_FLOW;
  const idx = flow.indexOf(currentStatus);

  if (currentStatus === 'failed-delivery') {
    
    return ['out-for-delivery', 'cancelled'];
  }

  if (TERMINAL_STATUSES.has(currentStatus)) {
    return [];
  }

  if (idx === -1) return [];

  const next = [];
  if (idx + 1 < flow.length) next.push(flow[idx + 1]);
  
  if (idx + 1 < flow.length) next.push('cancelled');
  
  if (deliveryMethod === 'delivery' && currentStatus === 'out-for-delivery') {
    next.push('failed-delivery');
  }

  return next;
}

export function isValidTransition(deliveryMethod, currentStatus, nextStatus) {
  return getAllowedNextStatuses(deliveryMethod, currentStatus).includes(nextStatus);
}



let listeners = [];

export function subscribeToast(fn) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

export function showToast(message, type = "info") {
  if (!message) return;
  const toast = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, message, type };
  listeners.forEach((fn) => fn(toast));
}

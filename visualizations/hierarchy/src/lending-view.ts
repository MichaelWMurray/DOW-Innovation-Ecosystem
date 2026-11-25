let enabled = true;
const listeners = new Set<() => void>();

export function lendingViewEnabled() {
  return enabled;
}

export function subscribeToLendingView(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function toggleLendingView() {
  enabled = !enabled;
  for (const listener of listeners) listener();
}

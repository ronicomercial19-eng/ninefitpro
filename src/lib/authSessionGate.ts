/** Invalidate work when the session changes, before any deferred callback runs. */
export function createAuthSessionGate() {
  let generation = 0;
  let observedEvent = false;
  let disposed = false;
  return {
    observe() { observedEvent = true; },
    canApplyInitial() { return !disposed && !observedEvent; },
    next() { return ++generation; },
    isCurrent(value: number) { return !disposed && generation === value; },
    dispose() { disposed = true; generation++; },
  };
}

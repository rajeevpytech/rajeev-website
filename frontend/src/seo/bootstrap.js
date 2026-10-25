export function bootstrapData(key) {
  const b = globalThis.__RF_BOOTSTRAP__;
  if (!b) return undefined;
  if (typeof window !== "undefined" && b.path && b.path !== (window.location.pathname.replace(/\/+$/, "") || "/")) return undefined;
  return b.data?.[key];
}
export function bootstrapSettings() { return globalThis.__RF_BOOTSTRAP__?.settings; }

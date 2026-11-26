/**
 * localStore.ts
 * Small helper for the demo (localStorage) data layer.
 * Every collection is stored under `kasirnya_<name>` as a JSON array.
 */

export function readCollection<T>(name: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(`kasirnya_${name}`) || '[]');
  } catch {
    return [];
  }
}

export function writeCollection<T>(name: string, items: T[]): void {
  localStorage.setItem(`kasirnya_${name}`, JSON.stringify(items));
}

export function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}

/** Derive stock status from quantity and an optional low-stock threshold. */
export function deriveStockStatus(quantity: number, threshold = 5): string {
  if (quantity <= 0) return 'Out of Stock';
  if (quantity <= threshold) return 'Low Stock';
  return 'In Stock';
}

/** Format a Date to yyyy-mm-dd (local). */
export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

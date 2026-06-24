/**
 * The four fixed site pins, positioned to match the reference design. Pin
 * locations and labels are baked in (no lat/lng data binding); only the
 * healthy/down status is optionally driven from data, matched by label.
 */
export interface FixedSite {
  label: string;
  lng: number;
  lat: number;
}

export const FIXED_SITES: FixedSite[] = [
  { label: "DR", lng: 49.9, lat: 26.9 },
  { label: "PIF TOWER", lng: 46.0, lat: 25.7 },
  { label: "RDC", lng: 44.4, lat: 23.9 },
  { label: "WAMID", lng: 47.9, lat: 24.0 },
];

/** Normalize a label for matching data rows to a fixed pin. */
export function normalizeLabel(value: unknown): string {
  return String(value ?? "").trim().toUpperCase().replace(/\s+/g, " ");
}

/** Site callout marker model + status interpretation shared by demo and live data. */

export interface SiteMarker {
  label: string;
  lng: number;
  lat: number;
  /** Raw status text (shown in the tooltip). */
  status?: string;
  /** Resolved health: true -> green ✓, false -> red ✕. */
  healthy: boolean;
}

const DOWN_WORDS = /^(down|offline|off|error|fail(ed|ure)?|critical|red|bad|0|no|false|inactive|unhealthy)$/;
const UP_WORDS = /^(up|online|ok|okay|healthy|green|good|pass(ed)?|active|1|yes|true|operational)$/;

/**
 * Interpret a raw status value as healthy (✓) or down (✕). Booleans and 0/1
 * map directly; text is matched against common up/down vocab. Empty/unknown
 * defaults to healthy so a plain list of sites renders like the reference.
 */
export function isHealthy(raw: unknown): boolean {
  if (raw == null) return true;
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "number") return raw !== 0;
  const s = String(raw).trim().toLowerCase();
  if (s === "") return true;
  if (DOWN_WORDS.test(s)) return false;
  if (UP_WORDS.test(s)) return true;
  return true;
}

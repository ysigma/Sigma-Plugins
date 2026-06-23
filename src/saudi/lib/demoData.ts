/**
 * Sample data for the standalone preview (when the plugin is opened directly in
 * a browser instead of embedded in Sigma). With no params it reproduces the
 * reference design: plain regions + four healthy site callouts. Add
 * `?regions=1` to also preview the data-driven region coloring.
 */
import type { SiteMarker } from "./markers";

// Spread across the Riyadh / Eastern area so the four callouts don't collide
// (DR top-right near Dammam, PIF TOWER raised over north Riyadh, RDC to the
// west, WAMID to the east) — mirrors the reference design's layout.
export const DEMO_SITES: SiteMarker[] = [
  { label: "DR", lng: 50.1, lat: 26.6, status: "Healthy", healthy: true },
  { label: "PIF TOWER", lng: 46.4, lat: 25.8, status: "Healthy", healthy: true },
  { label: "RDC", lng: 44.8, lat: 24.2, status: "Healthy", healthy: true },
  { label: "WAMID", lng: 48.3, lat: 24.3, status: "Healthy", healthy: true },
];

export const DEMO_TIER_NAME = "Status (demo)";
export const DEMO_TIER_ORDER = ["Down", "Degraded", "Healthy"];

/** region key -> tier, for the optional ?regions=1 choropleth preview. */
export const DEMO_REGION_TIER: Record<string, string> = {
  riyadh: "Healthy",
  "eastern province": "Healthy",
  makkah: "Degraded",
  madinah: "Healthy",
  asir: "Degraded",
  tabuk: "Healthy",
  hail: "Down",
  "northern borders": "Healthy",
  jawf: "Degraded",
  najran: "Healthy",
  bahah: "Healthy",
  jazan: "Down",
  qassim: "Healthy",
};

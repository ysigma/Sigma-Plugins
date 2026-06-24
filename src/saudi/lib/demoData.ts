/**
 * Sample sites for the standalone preview (when the plugin is opened directly
 * in a browser instead of embedded in Sigma). Reproduces the reference design:
 * four healthy site callouts spread across the Riyadh / Eastern area.
 */
import type { SiteMarker } from "./markers";

export const DEMO_SITES: SiteMarker[] = [
  { label: "DR", lng: 49.7, lat: 26.9, status: "Healthy", healthy: true },
  { label: "PIF TOWER", lng: 45.7, lat: 25.7, status: "Healthy", healthy: true },
  { label: "RDC", lng: 44.4, lat: 23.8, status: "Healthy", healthy: true },
  { label: "WAMID", lng: 47.0, lat: 24.4, status: "Healthy", healthy: true },
];

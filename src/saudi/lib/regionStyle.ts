/**
 * Fixed styling for the Saudi regions map. The map is no longer data-driven —
 * region fills are a light silver-grey palette chosen to match the reference
 * design, and a few extra place labels (e.g. Ad Dammam) sit inside regions.
 */

/** Canonical region key -> flat cap (top) colour. */
export const REGION_FILL: Record<string, string> = {
  riyadh: "#ebedef",
  qassim: "#dfe2e5",
  hail: "#d6d9dd",
  jawf: "#e2e4e7",
  "northern borders": "#dadde0",
  tabuk: "#e0e2e5",
  madinah: "#ccd0d4",
  makkah: "#d8dbdf",
  "eastern province": "#d2d6da",
  bahah: "#d4d8dc",
  asir: "#c7cbd0",
  najran: "#ced2d6",
  jazan: "#c4c8cd",
};

/** Cap colour for any region not listed above. */
export const REGION_FILL_DEFAULT = "#d6d9dd";

/** Region border lines + region label colour. */
export const BORDER_COLOR = "#f7f9fb";
export const LABEL_COLOR = "#3a3d42";

/** Extra place labels rendered flat on the map (in addition to the 13 regions). */
export interface ExtraLabel {
  text: string;
  lng: number;
  lat: number;
  /** Font size relative to a normal region label (1 = same). */
  scale?: number;
}

export const EXTRA_LABELS: ExtraLabel[] = [
  // City inside Eastern Province, near the Gulf coast: under the DR pin and
  // above the "Eastern Province" label.
  { text: "Ad Dammam", lng: 50.15, lat: 26.15, scale: 0.74 },
];

/**
 * Editor-panel controls for the Saudi Arabia regions map plugin. Each `name`
 * becomes a key on the object returned by `useConfig()`.
 *
 * Two independent data sources:
 *   • Regions  – colors the 13 ADM1 regions by a status/tier column.
 *   • Sites    – drops labelled callout pins (lat/lng) with a healthy/down state.
 */
import { client } from "@sigmacomputing/plugin";

export function configureEditorPanel(): void {
  client.config.configureEditorPanel([
    // ---- Regions (choropleth over the 13 provinces) -----------------------
    { name: "regionSource", type: "element", label: "Regions: data source" },
    {
      name: "region",
      type: "column",
      source: "regionSource",
      allowMultiple: false,
      allowedTypes: ["text", "variant"],
      label: "Region name (e.g. Riyadh, Makkah)",
    },
    {
      name: "regionTier",
      type: "column",
      source: "regionSource",
      allowMultiple: false,
      allowedTypes: ["text", "integer", "number", "boolean", "variant"],
      label: "Color by (status / tier, optional)",
    },
    {
      name: "regionTierOrder",
      type: "text",
      placeholder: "e.g. Down, Degraded, Healthy",
      label: "Tier order / labels (first → last)",
    },
    {
      name: "regionMetric",
      type: "column",
      source: "regionSource",
      allowMultiple: false,
      allowedTypes: ["number", "integer"],
      label: "Region measure (tooltip only, optional)",
    },

    // ---- Sites (callout pins) --------------------------------------------
    { name: "siteSource", type: "element", label: "Sites: data source" },
    {
      name: "siteLabel",
      type: "column",
      source: "siteSource",
      allowMultiple: false,
      allowedTypes: ["text", "variant"],
      label: "Site label (e.g. PIF TOWER)",
    },
    {
      name: "siteLat",
      type: "column",
      source: "siteSource",
      allowMultiple: false,
      allowedTypes: ["number", "integer"],
      label: "Site latitude",
    },
    {
      name: "siteLng",
      type: "column",
      source: "siteSource",
      allowMultiple: false,
      allowedTypes: ["number", "integer"],
      label: "Site longitude",
    },
    {
      name: "siteStatus",
      type: "column",
      source: "siteSource",
      allowMultiple: false,
      allowedTypes: ["text", "boolean", "integer", "number", "variant"],
      label: "Site status (healthy → ✓ / down → ✕)",
    },

    // ---- Tier colors (mapped positionally to the tier order) --------------
    { name: "color1", type: "color", label: "Color 1 (first tier)" },
    { name: "color2", type: "color", label: "Color 2" },
    { name: "color3", type: "color", label: "Color 3" },
    { name: "color4", type: "color", label: "Color 4" },
    { name: "color5", type: "color", label: "Color 5 (last tier)" },

    // ---- Appearance -------------------------------------------------------
    { name: "landColor", type: "color", label: "Base region color" },
    { name: "backgroundColor", type: "color", label: "Background color" },
    { name: "borderColor", type: "color", label: "Region border color" },
    {
      name: "extrude",
      type: "dropdown",
      values: ["Flat", "Low", "Medium", "High"],
      defaultValue: "Medium",
      label: "3D thickness",
    },
    {
      name: "tilt",
      type: "dropdown",
      values: ["Top-down", "Low", "Medium", "High"],
      defaultValue: "Medium",
      label: "Initial tilt",
    },
    {
      name: "allowSpin",
      type: "toggle",
      defaultValue: false,
      label: "Allow left/right spin (off = tilt up/down only)",
    },
    {
      name: "showLabels",
      type: "toggle",
      defaultValue: true,
      label: "Show region labels",
    },
    {
      name: "showLegend",
      type: "toggle",
      defaultValue: false,
      label: "Show legend",
    },
  ]);
}

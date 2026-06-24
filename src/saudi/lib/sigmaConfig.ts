/**
 * Editor-panel controls for the Saudi Arabia regions map plugin. Each `name`
 * becomes a key on the object returned by `useConfig()`.
 *
 * The map regions are fixed (styled to match the reference design); the only
 * data binding is the **Sites** source that drops labelled callout pins.
 */
import { client } from "@sigmacomputing/plugin";

export function configureEditorPanel(): void {
  client.config.configureEditorPanel([
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

    // ---- Appearance -------------------------------------------------------
    { name: "backgroundColor", type: "color", label: "Background color" },
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
      defaultValue: "Low",
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
  ]);
}

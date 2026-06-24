/**
 * Editor-panel controls for the Saudi Arabia regions map plugin. Each `name`
 * becomes a key on the object returned by `useConfig()`.
 *
 * The map regions and the four site pins (DR, PIF TOWER, RDC, WAMID) are fixed
 * to match the reference design. The only optional data binding is each pin's
 * healthy/down status, matched to a pin by its label.
 */
import { client } from "@sigmacomputing/plugin";

export function configureEditorPanel(): void {
  client.config.configureEditorPanel([
    // ---- Site status (optional; positions/labels are fixed) --------------
    { name: "siteSource", type: "element", label: "Site status source (optional)" },
    {
      name: "siteLabel",
      type: "column",
      source: "siteSource",
      allowMultiple: false,
      allowedTypes: ["text", "variant"],
      label: "Site label (matches DR / PIF TOWER / RDC / WAMID)",
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
    { name: "pinColor", type: "color", label: "Pin color" },
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

/**
 * Declares the controls that appear in Sigma's editor panel for the Segmented
 * Bar Meter plugin. Each `name` becomes a key on the object returned by
 * `useConfig()`.
 */
import { client } from "@sigmacomputing/plugin";

export function configureEditorPanel(): void {
  client.config.configureEditorPanel([
    // --- Data ------------------------------------------------------------
    { name: "dataGroup", type: "group", label: "Data" },
    { name: "source", type: "element", label: "Data source" },
    {
      name: "value",
      type: "column",
      source: "source",
      allowMultiple: false,
      allowedTypes: ["number", "integer"],
      label: "Value (measure)",
    },

    // --- Scale -----------------------------------------------------------
    { name: "scaleGroup", type: "group", label: "Scale" },
    { name: "min", type: "text", placeholder: "0", label: "Scale minimum" },
    { name: "max", type: "text", placeholder: "100", label: "Scale maximum" },
    {
      name: "threshold1",
      type: "text",
      placeholder: "auto (¼ of range)",
      label: "Threshold 1  (section 1 → 2)",
    },
    {
      name: "threshold2",
      type: "text",
      placeholder: "auto (½ of range)",
      label: "Threshold 2  (section 2 → 3)",
    },
    {
      name: "threshold3",
      type: "text",
      placeholder: "auto (¾ of range)",
      label: "Threshold 3  (section 3 → 4)",
    },

    // --- Section colors --------------------------------------------------
    { name: "colorGroup", type: "group", label: "Section colors" },
    { name: "color1", type: "color", label: "Section 1 color" },
    { name: "color2", type: "color", label: "Section 2 color" },
    { name: "color3", type: "color", label: "Section 3 color" },
    { name: "color4", type: "color", label: "Section 4 color" },

    // --- Display ---------------------------------------------------------
    { name: "displayGroup", type: "group", label: "Display" },
    { name: "title", type: "text", placeholder: "(optional)", label: "Title" },
    {
      name: "showValueLabel",
      type: "toggle",
      defaultValue: true,
      label: "Show value label",
    },
    {
      name: "showScale",
      type: "toggle",
      defaultValue: true,
      label: "Show scale & threshold labels",
    },
    {
      name: "decimals",
      type: "dropdown",
      values: ["Auto", "0", "1", "2", "3"],
      defaultValue: "Auto",
      label: "Decimal places",
    },
    {
      name: "barHeight",
      type: "dropdown",
      values: ["16", "20", "24", "28", "36", "48"],
      defaultValue: "28",
      label: "Bar thickness (px)",
    },
    {
      name: "markerColor",
      type: "color",
      label: "Marker color (blank = section color)",
    },
    { name: "backgroundColor", type: "color", label: "Background color" },
    { name: "textColor", type: "color", label: "Text color" },
  ]);
}

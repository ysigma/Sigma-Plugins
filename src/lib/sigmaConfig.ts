/**
 * Declares the controls that appear in Sigma's editor panel for this plugin.
 * Each `name` becomes a key on the object returned by `useConfig()`.
 */
import { client } from "@sigmacomputing/plugin";

export function configureEditorPanel(): void {
  client.config.configureEditorPanel([
    { name: "source", type: "element", label: "Data source" },
    {
      name: "country",
      type: "column",
      source: "source",
      allowMultiple: false,
      allowedTypes: ["text", "integer", "number", "variant"],
      label: "Country (dimension)",
    },
    {
      name: "metric",
      type: "column",
      source: "source",
      allowMultiple: false,
      allowedTypes: ["number", "integer"],
      label: "Measure (color + tooltip)",
    },
    {
      name: "colorBy",
      type: "dropdown",
      values: ["Measure", "Tier column"],
      defaultValue: "Measure",
      label: "Color by",
    },
    {
      name: "tier",
      type: "column",
      source: "source",
      allowMultiple: false,
      allowedTypes: ["text", "integer", "number", "boolean", "variant"],
      label: "Tier column (when Color by = Tier column)",
    },
    {
      name: "tierOrder",
      type: "text",
      placeholder: "e.g. Poor, Fair, Good, Excellent",
      label: "Tier order / labels (low → high)",
    },
    // The legend colors — these drive both the legend and the globe (1:1).
    { name: "color1", type: "color", label: "Color 1 (low / first)" },
    { name: "color2", type: "color", label: "Color 2" },
    { name: "color3", type: "color", label: "Color 3" },
    { name: "color4", type: "color", label: "Color 4" },
    { name: "color5", type: "color", label: "Color 5 (high / last)" },
    {
      name: "bucketMethod",
      type: "dropdown",
      values: ["Quantile", "Equal interval"],
      defaultValue: "Quantile",
      label: "Bucket method (Measure mode)",
    },
    { name: "noDataColor", type: "color", label: "No-data color" },
    { name: "backgroundColor", type: "color", label: "Background color" },
    { name: "borderColor", type: "color", label: "Border color" },
    {
      name: "borderWidth",
      type: "dropdown",
      values: ["0", "1", "2", "3", "4", "6", "8"],
      defaultValue: "0",
      label: "Border width (px)",
    },
    { name: "darkMode", type: "toggle", defaultValue: false, label: "Dark mode" },
    {
      name: "showLabels",
      type: "toggle",
      defaultValue: false,
      label: "Show country labels",
    },
    {
      name: "autoRotate",
      type: "toggle",
      defaultValue: true,
      label: "Auto-rotate globe",
    },
    {
      name: "showLegend",
      type: "toggle",
      defaultValue: true,
      label: "Show legend",
    },
  ]);
}

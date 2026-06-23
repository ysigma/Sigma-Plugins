/**
 * Declares the controls that appear in Sigma's editor panel for this plugin.
 * Each `name` becomes a key on the object returned by `useConfig()`.
 */
import { client } from "@sigmacomputing/plugin";
import { PALETTE_NAMES } from "./color";

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
    {
      name: "legendStyle",
      type: "dropdown",
      values: ["Categorical", "Color scale"],
      defaultValue: "Categorical",
      label: "Legend style",
    },
    {
      name: "palette",
      type: "dropdown",
      values: [...PALETTE_NAMES],
      defaultValue: "Blues",
      label: "Color palette",
    },
    { name: "color1", type: "color", label: "Custom color 1 (low)" },
    { name: "color2", type: "color", label: "Custom color 2" },
    { name: "color3", type: "color", label: "Custom color 3" },
    { name: "color4", type: "color", label: "Custom color 4" },
    { name: "color5", type: "color", label: "Custom color 5 (high)" },
    {
      name: "buckets",
      type: "dropdown",
      values: ["3", "4", "5", "6", "7"],
      defaultValue: "5",
      label: "Number of buckets (Measure mode)",
    },
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

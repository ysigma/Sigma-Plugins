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
      label: "Color metric (measure)",
    },
    {
      name: "palette",
      type: "dropdown",
      values: [...PALETTE_NAMES],
      defaultValue: "Blues",
      label: "Color palette",
    },
    {
      name: "buckets",
      type: "dropdown",
      values: ["3", "4", "5", "6", "7"],
      defaultValue: "5",
      label: "Number of color buckets",
    },
    {
      name: "bucketMethod",
      type: "dropdown",
      values: ["Quantile", "Equal interval"],
      defaultValue: "Quantile",
      label: "Bucket method",
    },
    { name: "noDataColor", type: "color", label: "No-data color" },
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

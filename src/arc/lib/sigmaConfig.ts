/**
 * Editor-panel controls for the Global Threat-Origin Arc Map. Each `name`
 * becomes a key on the object returned by `useConfig()`.
 *
 * Only the data source and the two source-coordinate columns are required.
 * Destination coordinates are optional — when omitted, every arc flows to a
 * single configurable destination (defaults to Riyadh, Saudi Arabia).
 */
import { client } from "@sigmacomputing/plugin";

const NUMERIC = ["number", "integer"] as const;
const LABELISH = ["text", "variant", "integer", "number", "boolean"] as const;

export function configureEditorPanel(): void {
  client.config.configureEditorPanel([
    // ---- Data ----------------------------------------------------------
    { name: "source", type: "element", label: "Data source" },
    {
      name: "srcLat",
      type: "column",
      source: "source",
      allowMultiple: false,
      allowedTypes: [...NUMERIC],
      label: "Source latitude",
    },
    {
      name: "srcLon",
      type: "column",
      source: "source",
      allowMultiple: false,
      allowedTypes: [...NUMERIC],
      label: "Source longitude",
    },
    {
      name: "srcLabel",
      type: "column",
      source: "source",
      allowMultiple: false,
      allowedTypes: [...LABELISH],
      label: "Source label (country / city)",
    },
    {
      name: "dstLat",
      type: "column",
      source: "source",
      allowMultiple: false,
      allowedTypes: [...NUMERIC],
      label: "Destination latitude (optional)",
    },
    {
      name: "dstLon",
      type: "column",
      source: "source",
      allowMultiple: false,
      allowedTypes: [...NUMERIC],
      label: "Destination longitude (optional)",
    },
    {
      name: "dstLabel",
      type: "column",
      source: "source",
      allowMultiple: false,
      allowedTypes: [...LABELISH],
      label: "Destination label (optional)",
    },
    {
      name: "severity",
      type: "column",
      source: "source",
      allowMultiple: false,
      allowedTypes: [...LABELISH],
      label: "Severity (Critical → Low, optional)",
    },
    {
      name: "weight",
      type: "column",
      source: "source",
      allowMultiple: false,
      allowedTypes: [...NUMERIC],
      label: "Attack volume / count (optional)",
    },
    {
      name: "attackType",
      type: "column",
      source: "source",
      allowMultiple: false,
      allowedTypes: [...LABELISH],
      label: "Attack type (tooltip, optional)",
    },
    {
      name: "target",
      type: "column",
      source: "source",
      allowMultiple: false,
      allowedTypes: [...LABELISH],
      label: "Target asset / URL (tooltip, optional)",
    },

    // ---- Default destination (used when no dest columns) ---------------
    {
      name: "destName",
      type: "text",
      placeholder: "Saudi Arabia",
      label: "Default destination name",
    },
    {
      name: "destLatLon",
      type: "text",
      placeholder: "24.7136, 46.6753",
      label: "Default destination lat, lon",
    },

    // ---- Appearance ----------------------------------------------------
    { name: "arcColor", type: "color", label: "Arc / flow color" },
    { name: "backgroundColor", type: "color", label: "Ocean / background color" },
    { name: "landColor", type: "color", label: "Land color" },
    { name: "borderColor", type: "color", label: "Border color" },
    { name: "labelColor", type: "color", label: "Label color" },
    {
      name: "flowSpeed",
      type: "dropdown",
      values: ["Slow", "Medium", "Fast"],
      defaultValue: "Medium",
      label: "Flow speed",
    },
    {
      name: "showLabels",
      type: "toggle",
      defaultValue: true,
      label: "Show country labels",
    },
    {
      name: "showLegend",
      type: "toggle",
      defaultValue: true,
      label: "Show severity legend",
    },
    {
      name: "autoFit",
      type: "toggle",
      defaultValue: true,
      label: "Auto-fit to data",
    },
    {
      name: "framing",
      type: "dropdown",
      values: ["Whole world", "Fill width", "Fit all origins"],
      defaultValue: "Whole world",
      label: "Map framing",
    },
  ]);
}

/**
 * Declares the controls that appear in Sigma's editor panel for the Assessment
 * Dot Plot plugin. Each `name` becomes a key on the object returned by
 * `useConfig()`.
 *
 * The plugin takes two dimensions:
 *   - "platform" goes on the rows (Y axis), one row per distinct value.
 *   - "stage"    goes on the X axis; each platform's circle is drawn in the
 *                column matching its stage value. Re-pointing the stage column
 *                (or a row's stage value) moves the circle to that column.
 */
import { client } from "@sigmacomputing/plugin";
import { PALETTE_NAMES, DEFAULT_PALETTE } from "./palette";

export function configureEditorPanel(): void {
  client.config.configureEditorPanel([
    // --- Data ------------------------------------------------------------
    { name: "dataGroup", type: "group", label: "Data" },
    { name: "source", type: "element", label: "Data source" },
    {
      name: "platform",
      type: "column",
      source: "source",
      allowMultiple: false,
      allowedTypes: ["text", "integer", "number", "variant"],
      label: "Platform (dimension — one row per value)",
    },
    {
      name: "stage",
      type: "column",
      source: "source",
      allowMultiple: false,
      allowedTypes: ["text", "integer", "number", "boolean", "variant"],
      label: "Stage (dimension — the x-axis column)",
    },
    {
      name: "stageOrder",
      type: "text",
      placeholder: "e.g. Secure Design, Security Assessments, Remediation",
      label: "Stage order (left → right)",
    },

    // --- Color -----------------------------------------------------------
    { name: "colorGroup", type: "group", label: "Color" },
    {
      name: "palette",
      type: "dropdown",
      values: PALETTE_NAMES,
      defaultValue: DEFAULT_PALETTE,
      label: "Circle color (palette)",
    },
    { name: "dotColor", type: "color", label: "Circle color (custom override)" },
    { name: "backgroundColor", type: "color", label: "Background color" },

    // --- Layout ----------------------------------------------------------
    { name: "layoutGroup", type: "group", label: "Layout" },
    {
      name: "circleSize",
      type: "dropdown",
      values: ["Extra small", "Small", "Medium", "Large", "Extra large"],
      defaultValue: "Small",
      label: "Circle size",
    },
    {
      name: "circleSizePx",
      type: "text",
      placeholder: "(optional) exact px radius, e.g. 10",
      label: "Circle size override (px radius)",
    },
    {
      name: "showGrid",
      type: "toggle",
      defaultValue: true,
      label: "Show gridlines",
    },
  ]);
}

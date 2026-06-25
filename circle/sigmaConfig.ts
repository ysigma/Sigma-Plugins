/**
 * Declares the controls that appear in Sigma's editor panel for the Circle Grid
 * plugin. Each `name` becomes a key on the object returned by `useConfig()`.
 *
 * Bind a Label dimension (one ring per distinct value) and, optionally, a
 * Measure (drawn below each ring). A single Color control drives the rings,
 * their labels, and the measure values together.
 */
import { client } from "@sigmacomputing/plugin";

export function configureEditorPanel(): void {
  client.config.configureEditorPanel([
    // --- Data ------------------------------------------------------------
    { name: "dataGroup", type: "group", label: "Data" },
    { name: "source", type: "element", label: "Data source" },
    {
      name: "label",
      type: "column",
      source: "source",
      allowMultiple: false,
      allowedTypes: ["text", "integer", "number", "boolean", "variant"],
      label: "Label (dimension — one circle per value)",
    },
    {
      name: "value",
      type: "column",
      source: "source",
      allowMultiple: false,
      allowedTypes: ["number", "integer"],
      label: "Measure (shown below each circle, optional)",
    },

    // --- Color (ONE selector drives rings, labels & values) --------------
    { name: "colorGroup", type: "group", label: "Color" },
    { name: "color", type: "color", label: "Color — rings, labels & values" },
    { name: "backgroundColor", type: "color", label: "Background color" },

    // --- Layout ----------------------------------------------------------
    { name: "layoutGroup", type: "group", label: "Layout" },
    {
      name: "circleSize",
      type: "dropdown",
      values: ["Small", "Medium", "Large"],
      defaultValue: "Medium",
      label: "Circle size",
    },
    {
      name: "labelSize",
      type: "dropdown",
      values: ["Auto-fit", "Small", "Medium", "Large", "Extra large"],
      defaultValue: "Auto-fit",
      label: "Label text size",
    },
    {
      name: "columns",
      type: "dropdown",
      values: ["Auto", "1", "2", "3", "4", "5", "6"],
      defaultValue: "Auto",
      label: "Columns",
    },
    {
      name: "ringThickness",
      type: "dropdown",
      values: ["Thin", "Medium", "Thick"],
      defaultValue: "Medium",
      label: "Ring thickness",
    },

    // --- Display ---------------------------------------------------------
    { name: "displayGroup", type: "group", label: "Display" },
    {
      name: "showValue",
      type: "toggle",
      defaultValue: true,
      label: "Show measure below circle",
    },
    {
      name: "uppercase",
      type: "toggle",
      defaultValue: false,
      label: "Uppercase labels",
    },
    {
      name: "decimals",
      type: "dropdown",
      values: ["Auto", "0", "1", "2"],
      defaultValue: "Auto",
      label: "Decimal places",
    },
  ]);
}

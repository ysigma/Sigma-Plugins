/**
 * Declares the controls that appear in Sigma's editor panel for the Service
 * Status Timeline plugin. Each `name` becomes a key on the object returned by
 * `useConfig()`.
 */
import { client } from "@sigmacomputing/plugin";
import { BUCKET_LABELS, DEFAULT_BUCKET } from "./time";
import { AGGREGATION_LABELS, DEFAULT_AGGREGATION } from "./status";

export function configureEditorPanel(): void {
  client.config.configureEditorPanel([
    { name: "source", type: "element", label: "Data source" },
    {
      name: "application",
      type: "column",
      source: "source",
      allowMultiple: false,
      // The row label — typically "Name - https://service.url" or just the URL.
      allowedTypes: ["text", "link", "variant"],
      label: "Application / URL (row label)",
    },
    {
      name: "timestamp",
      type: "column",
      source: "source",
      allowMultiple: false,
      // Each reading's time, used to place it on the timeline.
      allowedTypes: ["datetime", "number", "integer", "text"],
      label: "Timestamp",
    },
    {
      name: "status",
      type: "column",
      source: "source",
      allowMultiple: false,
      // The measure whose value decides each square's color (up / down).
      allowedTypes: ["number", "integer", "boolean", "text"],
      label: "Status measure (colors the squares)",
    },

    // --- Timeline behavior ---
    {
      name: "bucketSize",
      type: "dropdown",
      values: BUCKET_LABELS,
      defaultValue: DEFAULT_BUCKET,
      label: "Time per square",
    },
    {
      name: "aggregation",
      type: "dropdown",
      values: AGGREGATION_LABELS,
      defaultValue: DEFAULT_AGGREGATION,
      label: "When a square has multiple readings",
    },
    {
      name: "downValues",
      type: "text",
      placeholder: "e.g. 0, false, down, error, 500",
      label: "Values counted as Down (optional)",
    },
    {
      name: "degradedValues",
      type: "text",
      placeholder: "e.g. degraded, warn, slow",
      label: "Values counted as Degraded (optional)",
    },

    // --- Appearance ---
    {
      name: "title",
      type: "text",
      placeholder: "e.g. Service availability",
      label: "Title (top-left, optional)",
    },
    { name: "upColor", type: "color", label: "Up color" },
    { name: "degradedColor", type: "color", label: "Degraded color" },
    { name: "downColor", type: "color", label: "Down color" },
    { name: "noDataColor", type: "color", label: "No-data / gap color" },
    { name: "backgroundColor", type: "color", label: "Background color" },
    { name: "textColor", type: "color", label: "Text color" },
    {
      name: "labelWidth",
      type: "dropdown",
      values: ["180", "220", "260", "320", "400", "480"],
      defaultValue: "320",
      label: "Label column width (px)",
    },
    {
      name: "linkifyUrls",
      type: "toggle",
      defaultValue: true,
      label: "Make URLs in labels clickable",
    },
    {
      name: "showLegend",
      type: "toggle",
      defaultValue: false,
      label: "Show legend",
    },
  ]);
}

import { client } from "@sigmacomputing/plugin";

export function configureEditorPanel(): void {
  client.config.configureEditorPanel([
    { name: "source", type: "element", label: "Data source" },
    {
      name: "primary",
      type: "column",
      source: "source",
      allowMultiple: false,
      allowedTypes: ["text", "integer", "number", "variant"],
      label: "Primary label (dimension 1)",
    },
    {
      name: "secondary",
      type: "column",
      source: "source",
      allowMultiple: false,
      allowedTypes: ["text", "integer", "number", "variant"],
      label: "Secondary label (dimension 2)",
    },
    {
      name: "measure",
      type: "column",
      source: "source",
      allowMultiple: false,
      allowedTypes: ["number", "integer"],
      label: "Measure",
    },
    {
      name: "title",
      type: "text",
      placeholder: "e.g. Top Visited Pages",
      label: "Title (top-left)",
    },
    {
      name: "subtitle",
      type: "text",
      placeholder: "e.g. unique users",
      label: "Subtitle (top-right)",
    },
    { name: "backgroundColor", type: "color", label: "Background color" },
    {
      name: "borderColor",
      type: "color",
      label: "Border + row divider color",
    },
    {
      name: "borderWidth",
      type: "dropdown",
      values: ["0", "1", "2", "3", "4"],
      defaultValue: "1",
      label: "Outer border width (px)",
    },
    {
      name: "accentColor",
      type: "color",
      label: "Accent color (title, measure value, bar)",
    },
    { name: "textColor", type: "color", label: "Primary text color" },
    {
      name: "barScaling",
      type: "dropdown",
      values: ["Relative to largest", "Share of total"],
      defaultValue: "Relative to largest",
      label: "Bar scaling",
    },
    {
      name: "numberFormat",
      type: "dropdown",
      values: ["Comma (1,234)", "Plain (1234)", "Compact (1.2K)"],
      defaultValue: "Comma (1,234)",
      label: "Number format",
    },
    {
      name: "rowLimit",
      type: "text",
      placeholder: "blank = show all",
      label: "Max rows",
    },
    {
      name: "sortOrder",
      type: "dropdown",
      values: ["Measure (desc)", "Measure (asc)", "Source order"],
      defaultValue: "Measure (desc)",
      label: "Row sort",
    },
  ]);
}

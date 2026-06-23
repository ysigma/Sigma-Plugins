/**
 * Editor-panel controls for the Apdex badge plugin. Each `name` becomes a key
 * on the object returned by `useConfig()`.
 *
 * Layout:
 *  - Data:        source element + the value (measure) and category (dimension).
 *  - Display:     label, number format, separator, size, border, corners, value color.
 *  - Default colors: accent + background used when no condition matches.
 *  - Condition 1..N: each maps a category value to an accent + background color.
 *
 * The accent color is shared by the border and the label/category text (they're
 * linked by design); only the numeric value has its own color.
 */
import { client } from "@sigmacomputing/plugin";
import type { CustomPluginConfigOptions } from "@sigmacomputing/plugin";

/** Number of condition slots exposed in the panel. */
export const NUM_CONDITIONS = 6;

/** Default category values prefilled into the first few condition slots. */
const APDEX_TIERS = ["Excellent", "Good", "Fair", "Poor", "Unacceptable"];

function conditionOptions(): CustomPluginConfigOptions[] {
  const out: CustomPluginConfigOptions[] = [];
  for (let i = 1; i <= NUM_CONDITIONS; i++) {
    const group = `cond${i}`;
    out.push({ name: group, type: "group", label: `Condition ${i}` });
    out.push({
      name: `${group}Value`,
      type: "text",
      source: group,
      placeholder: "e.g. Poor",
      defaultValue: APDEX_TIERS[i - 1] ?? "",
      label: "When category equals",
    });
    out.push({
      name: `${group}Border`,
      type: "color",
      source: group,
      label: "Border + text color",
    });
    out.push({
      name: `${group}Bg`,
      type: "color",
      source: group,
      label: "Background color",
    });
  }
  return out;
}

export function configureEditorPanel(): void {
  client.config.configureEditorPanel([
    // ---- Data ----
    { name: "source", type: "element", label: "Data source" },
    {
      name: "value",
      type: "column",
      source: "source",
      allowMultiple: false,
      allowedTypes: ["number", "integer"],
      label: "Value (measure)",
    },
    {
      name: "category",
      type: "column",
      source: "source",
      allowMultiple: false,
      allowedTypes: ["text", "integer", "number", "boolean", "variant"],
      label: "Category (dimension)",
    },

    // ---- Display ----
    { name: "display", type: "group", label: "Display" },
    {
      name: "label",
      type: "text",
      source: "display",
      placeholder: "Defaults to the value column name",
      label: "Label",
    },
    {
      name: "decimals",
      type: "dropdown",
      source: "display",
      values: ["Auto", "0", "1", "2", "3", "4"],
      defaultValue: "Auto",
      label: "Decimal places",
    },
    {
      name: "showCategory",
      type: "toggle",
      source: "display",
      defaultValue: true,
      label: "Show category",
    },
    {
      name: "separator",
      type: "text",
      source: "display",
      placeholder: "·",
      defaultValue: "·",
      label: "Category separator",
    },
    {
      name: "size",
      type: "dropdown",
      source: "display",
      values: ["Small", "Medium", "Large"],
      defaultValue: "Medium",
      label: "Size",
    },
    {
      name: "borderWidth",
      type: "dropdown",
      source: "display",
      values: ["0", "1", "2", "3", "4"],
      defaultValue: "1",
      label: "Border width (px)",
    },
    {
      name: "cornerRadius",
      type: "dropdown",
      source: "display",
      values: ["0", "4", "8", "12", "16", "20", "999"],
      defaultValue: "999",
      label: "Corner radius (px)",
    },
    {
      name: "valueColor",
      type: "color",
      source: "display",
      label: "Value (number) color",
    },

    // ---- Default colors (used when no condition matches) ----
    { name: "defaults", type: "group", label: "Default colors (no match)" },
    {
      name: "defaultBorder",
      type: "color",
      source: "defaults",
      label: "Border + text color",
    },
    {
      name: "defaultBg",
      type: "color",
      source: "defaults",
      label: "Background color",
    },

    // ---- Conditions (category value → colors) ----
    ...conditionOptions(),
  ]);
}

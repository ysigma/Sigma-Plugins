/**
 * Standalone-preview demo data, mirroring the reference wireframe (gold rings
 * on a dark canvas). Shown when the plugin is opened directly in a browser
 * (e.g. the GitHub Pages URL) rather than embedded in a Sigma workbook.
 */
export const DEMO_LABEL_NAME = "Department";
export const DEMO_VALUE_NAME = "Open Items";

export interface DemoRow {
  label: string;
  value: number;
}

export const DEMO_ROWS: DemoRow[] = [
  { label: "International Investments", value: 4 },
  { label: "MENA Investments", value: 0 },
  { label: "Local Real Estate Investments", value: 2 },
  { label: "Finance", value: 0 },
  { label: "Shared Services", value: 0 },
  { label: "Global Capital Finance", value: 0 },
  { label: "Compliance & Governance", value: 3 },
  { label: "Chief of Staff", value: 0 },
  { label: "Corporate Affairs", value: 0 },
  { label: "National Development", value: 0 },
  { label: "Internal Audit", value: 0 },
  { label: "Risk", value: 0 },
];

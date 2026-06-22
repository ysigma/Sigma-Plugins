/**
 * Sample data used only for the standalone preview (when the plugin is opened
 * directly in a browser instead of embedded in Sigma). It lets you see the
 * globe, choropleth, legend, and hover tooltips without configuring Sigma.
 */
import { resolveCountryCode } from "./countries";

export const DEMO_METRIC_NAME = "Population (millions, demo)";

// [country name, value] — names are run through the same matcher the plugin uses.
const SAMPLE: Array<[string, number]> = [
  ["United States", 331],
  ["China", 1412],
  ["India", 1380],
  ["Brazil", 213],
  ["Russia", 144],
  ["Japan", 125],
  ["Germany", 83],
  ["United Kingdom", 67],
  ["France", 65],
  ["Italy", 60],
  ["Canada", 38],
  ["Australia", 26],
  ["Spain", 47],
  ["Mexico", 129],
  ["Indonesia", 274],
  ["Nigeria", 206],
  ["Egypt", 102],
  ["South Africa", 59],
  ["Argentina", 45],
  ["Saudi Arabia", 35],
  ["Turkey", 84],
  ["Iran", 84],
  ["Thailand", 70],
  ["South Korea", 52],
  ["Colombia", 51],
  ["Kenya", 54],
  ["Poland", 38],
  ["Ukraine", 44],
  ["Vietnam", 97],
  ["Pakistan", 221],
  ["Bangladesh", 165],
  ["Ethiopia", 115],
  ["Sweden", 10],
  ["Norway", 5],
  ["Chile", 19],
  ["Peru", 33],
  ["Morocco", 37],
  ["Algeria", 44],
  ["Kazakhstan", 19],
  ["Democratic Republic of the Congo", 90],
];

export const demoValueByCcn3: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  for (const [name, value] of SAMPLE) {
    const code = resolveCountryCode(name);
    if (code) out[code] = value;
  }
  return out;
})();

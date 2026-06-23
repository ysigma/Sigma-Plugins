/// <reference types="vite/client" />

declare module "world-countries" {
  export interface WorldCountry {
    name: { common: string; official: string };
    cca2: string;
    cca3: string;
    ccn3: string;
    altSpellings: string[];
  }
  const countries: WorldCountry[];
  export default countries;
}

// The TopoJSON file is large; type it loosely so tsc doesn't try to infer a
// giant literal type for it.
declare module "world-atlas/countries-110m.json" {
  const topology: {
    type: "Topology";
    objects: Record<string, unknown>;
    [key: string]: unknown;
  };
  export default topology;
}

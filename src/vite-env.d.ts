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

// The TopoJSON files are large; type them loosely so tsc doesn't try to infer
// a giant literal type for them.
declare module "world-atlas/countries-110m.json" {
  const topology: {
    type: "Topology";
    objects: Record<string, unknown>;
    [key: string]: unknown;
  };
  export default topology;
}

declare module "world-atlas/countries-50m.json" {
  const topology: {
    type: "Topology";
    objects: Record<string, unknown>;
    [key: string]: unknown;
  };
  export default topology;
}

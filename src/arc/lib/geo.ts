/**
 * Self-contained dark vector basemap geometry.
 *
 * `world-atlas` ships Natural Earth country borders as TopoJSON. We convert the
 * 1:110m countries layer to GeoJSON once at module load and draw it ourselves
 * with d3-geo's `geoPath` (see ThreatMap), which clips correctly at the
 * antimeridian — avoiding the full-width "fill band" artifacts that a naive
 * flat-Mercator polygon renderer produces for dateline-crossing countries.
 *
 * Antarctica is dropped: it touches the south pole, where the Mercator y goes
 * to infinity, and it never carries threat data.
 */
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import topology from "world-atlas/countries-110m.json";

const fc = feature(
  topology as any,
  (topology as any).objects.countries,
) as unknown as FeatureCollection<Geometry, { name: string }>;

export const countryCollection: FeatureCollection<Geometry, { name: string }> = {
  type: "FeatureCollection",
  features: fc.features.filter((f) => String((f as { id?: unknown }).id) !== "010"),
};

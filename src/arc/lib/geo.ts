/**
 * Self-contained dark vector basemap geometry.
 *
 * `world-atlas` ships Natural Earth country borders as TopoJSON. We convert the
 * 1:50m countries layer to GeoJSON once at module load and hand it to Leaflet's
 * `L.geoJSON`, styled dark to match the reference design. Bundling the geometry
 * means the plugin makes **no external tile/network calls** at runtime, so it
 * renders reliably inside Sigma's sandboxed iframe.
 */
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import topology from "world-atlas/countries-50m.json";

const collection = feature(
  topology as any,
  (topology as any).objects.countries,
) as unknown as FeatureCollection<Geometry, { name: string }>;

/** All country polygons as a GeoJSON FeatureCollection. */
export const worldGeo = collection;

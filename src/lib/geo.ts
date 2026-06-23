/**
 * Country polygon geometry for the globe.
 *
 * `world-atlas` ships Natural Earth country borders as TopoJSON keyed by ISO
 * numeric code (the feature `id`), which matches the ccn3 codes produced by
 * `resolveCountryCode`. We convert it to GeoJSON features once at module load
 * and precompute label centroids.
 */
import { feature } from "topojson-client";
import { geoCentroid } from "d3-geo";
import type { Feature, Geometry } from "geojson";
import topology from "world-atlas/countries-110m.json";

export interface CountryFeature extends Feature<Geometry, { name: string }> {
  id: string;
}

const collection = feature(
  topology as any,
  (topology as any).objects.countries,
) as unknown as { features: CountryFeature[] };

/** All country polygons, ready to hand to react-globe.gl's `polygonsData`. */
export const countryFeatures: CountryFeature[] = collection.features;

export interface LabelPoint {
  lat: number;
  lng: number;
  text: string;
  ccn3: string;
}

/** One centroid label per country (used when "Show country labels" is on). */
export const countryLabels: LabelPoint[] = countryFeatures.map((f) => {
  const [lng, lat] = geoCentroid(f);
  return { lat, lng, text: f.properties.name, ccn3: String(f.id) };
});

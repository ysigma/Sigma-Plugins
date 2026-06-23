/**
 * Saudi Arabia region (ADM1) geometry, projected to a flat 2D plane ready to be
 * extruded into a 3D slab map.
 *
 * The polygons ship bundled (simplified geoBoundaries ADM1, ~1k points total)
 * so the plugin makes no network calls at runtime.
 *
 * We deliberately avoid d3's spherical helpers (`fitExtent`, `geoCentroid`,
 * `geoPath.area`) because they are winding-order sensitive and the source data
 * is not guaranteed to follow d3's right-hand rule — a flipped ring makes them
 * treat a region as "the whole globe except this region". Instead we project
 * each point with a plain Mercator and fit / centroid / size everything in the
 * planar domain, which is immune to winding.
 */
import { geoMercator } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";
import raw from "./saudiProvinces.json";
import { provinceKey } from "./provinces";

const fc = raw as unknown as FeatureCollection<Geometry, { name: string }>;

/** Target half-extent of the projected map (plane spans ±PLANE in its wider axis). */
export const PLANE = 110;

// A plain Mercator at unit scale; we re-scale/-translate into plane space below.
const base = geoMercator().scale(1).translate([0, 0]);

// First pass: find the planar bounding box of every projected point (Y down).
const bbox = (() => {
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  const visit = (lng: number, lat: number) => {
    const p = base([lng, lat]);
    if (!p) return;
    if (p[0] < minX) minX = p[0];
    if (p[0] > maxX) maxX = p[0];
    if (p[1] < minY) minY = p[1];
    if (p[1] > maxY) maxY = p[1];
  };
  for (const f of fc.features) {
    const g = f.geometry;
    const polys = g.type === "Polygon" ? [g.coordinates] : (g as any).coordinates;
    for (const poly of polys) for (const ring of poly) for (const [lng, lat] of ring) visit(lng, lat);
  }
  return { minX, maxX, minY, maxY };
})();

const srcCx = (bbox.minX + bbox.maxX) / 2;
const srcCy = (bbox.minY + bbox.maxY) / 2;
const fit = (2 * PLANE) / Math.max(bbox.maxX - bbox.minX, bbox.maxY - bbox.minY);

/** Project [lng, lat] to centered plane coords with north = +Y. */
export function projectLngLat(lng: number, lat: number): [number, number] | null {
  const p = base([lng, lat]);
  if (!p) return null;
  return [(p[0] - srcCx) * fit, -((p[1] - srcCy) * fit)];
}

export interface ProvinceShape {
  name: string;
  key: string;
  /** [poly][ring][pt] -> [x, y] plane coords (north = +Y). Ring 0 is the outer. */
  polygons: number[][][][];
  /** Plane-coord label anchor (centroid of the largest ring). */
  centroid: [number, number];
  /** Relative footprint area (largest region = 1), used to scale label sizes. */
  areaRatio: number;
}

function ringToPlane(ring: number[][]): number[][] {
  const out: number[][] = [];
  for (const [lng, lat] of ring) {
    const p = projectLngLat(lng, lat);
    if (p) out.push(p);
  }
  return out;
}

/** Planar shoelace centroid + |area| of a ring. */
function ringCentroidArea(ring: number[][]): { cx: number; cy: number; area: number } {
  const n = ring.length;
  let a = 0,
    cx = 0,
    cy = 0;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[(i + 1) % n];
    const cross = x0 * y1 - x1 * y0;
    a += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  a *= 0.5;
  if (Math.abs(a) < 1e-9) {
    // Degenerate: fall back to the average vertex.
    let sx = 0,
      sy = 0;
    for (const [x, y] of ring) {
      sx += x;
      sy += y;
    }
    return { cx: sx / n, cy: sy / n, area: 0 };
  }
  return { cx: cx / (6 * a), cy: cy / (6 * a), area: Math.abs(a) };
}

function buildProvince(f: FeatureCollection<Geometry, { name: string }>["features"][number]): ProvinceShape {
  const name = f.properties.name;
  const g = f.geometry;
  const polygons: number[][][][] = [];
  if (g.type === "Polygon") {
    polygons.push(g.coordinates.map(ringToPlane));
  } else if (g.type === "MultiPolygon") {
    for (const poly of g.coordinates) polygons.push(poly.map(ringToPlane));
  }
  // Label anchor + size from the largest outer ring across all polygons.
  let best = { cx: 0, cy: 0, area: -1 };
  for (const poly of polygons) {
    if (!poly.length) continue;
    const r = ringCentroidArea(poly[0]);
    if (r.area > best.area) best = r;
  }
  return {
    name,
    key: provinceKey(name) ?? name.toLowerCase(),
    polygons,
    centroid: [best.cx, best.cy],
    areaRatio: Math.max(best.area, 0),
  };
}

export const provinces: ProvinceShape[] = (() => {
  const list = fc.features.map(buildProvince);
  const maxArea = Math.max(...list.map((p) => p.areaRatio), 1);
  for (const p of list) p.areaRatio = p.areaRatio / maxArea;
  return list;
})();

/** Plane-space bounds of all regions, for camera framing. */
export const planeBounds = (() => {
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const p of provinces)
    for (const poly of p.polygons)
      for (const ring of poly)
        for (const [x, y] of ring) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
})();

/**
 * The interactive map. Leaflet handles pan / zoom (and the +/- control); two
 * stacked <canvas> layers sit on top:
 *
 *   1. a BASEMAP canvas — dark countries + labels, drawn with d3-geo's geoPath
 *      (calibrated exactly to Leaflet's Web-Mercator view). It clips at the
 *      antimeridian and is TILED horizontally (world copies left/right), so the
 *      map repeats across the viewport and never shows empty sides.
 *
 *   2. an ANIMATION canvas — arcs, flowing arrowhead comets, pulsating origins
 *      and the destination convergence pulse, also tiled to match the basemap.
 *
 * A dynamic minZoom keeps the world at least as tall as the panel, so zooming
 * out can never reveal black above/below either; tiling covers the width.
 */
import { useEffect, useRef } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { geoMercator, geoPath } from "d3-geo";
import { countryCollection } from "../lib/geo";
import { COUNTRY_LABELS } from "../lib/labels";
import { accentColor, hexToRgb, mix, rgba, type RGB } from "../lib/theme";
import type { Arc, DestPoint, OriginPoint, ThreatModel } from "../lib/model";

export interface ThreatMapColors {
  arc: string;
  background: string;
  land: string;
  border: string;
  label: string;
}

export interface ThreatMapProps {
  model: ThreatModel;
  colors: ThreatMapColors;
  flowSpeedMult: number;
  showLabels: boolean;
  autoFit: boolean;
  /** "origins" = fit so every origin is visible (default); "world" = whole
   *  world fills the width; "fill" = zoom into the origin spread to fill the
   *  width (may clip the far-N/S origins). */
  framing: "world" | "fill" | "origins";
}

/* ---------- tuning constants ---------- */
const BASE_FLOW_RATE = 0.16; // arc traversals per second at speed ×1
const PULSE_RATE = 0.5; // origin ring cycles per second
const DEST_PULSE_RATE = 0.72;
const ARC_WIDTH = 1.8; // uniform core line width for every arc
const COMET_TAIL = 0.14; // comet length as a fraction of the arc
const ARC_SAMPLES = 34;
const HOTWHITE: RGB = { r: 255, g: 240, b: 214 };

type Pt = [number, number];

interface RenderArc {
  src: Arc;
  core: RGB;
  head: RGB;
  coreW: number;
  speed: number;
}
interface RenderOrigin {
  src: OriginPoint;
  core: RGB;
  head: RGB;
  pulse: number;
}

/* ---------- pure helpers ---------- */
const frac = (x: number) => x - Math.floor(x);
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

function bez(p0: Pt, c: Pt, p2: Pt, t: number): Pt {
  const u = 1 - t;
  const a = u * u,
    b = 2 * u * t,
    d = t * t;
  return [a * p0[0] + b * c[0] + d * p2[0], a * p0[1] + b * c[1] + d * p2[1]];
}
function bezTangent(p0: Pt, c: Pt, p2: Pt, t: number): Pt {
  const u = 1 - t;
  return [
    2 * u * (c[0] - p0[0]) + 2 * t * (p2[0] - c[0]),
    2 * u * (c[1] - p0[1]) + 2 * t * (p2[1] - c[1]),
  ];
}

/** Control point: bow the arc to the left of the travel direction. */
function controlPoint(p0: Pt, p2: Pt): Pt {
  const dx = p2[0] - p0[0];
  const dy = p2[1] - p0[1];
  const dist = Math.hypot(dx, dy) || 1;
  const bulge = clamp(dist * 0.2, 14, 280);
  const nx = dy / dist;
  const ny = -dx / dist;
  return [(p0[0] + p2[0]) / 2 + nx * bulge, (p0[1] + p2[1]) / 2 + ny * bulge];
}

/** Horizontal world-copy offsets (in px) that cover the viewport — the basis
 * for the repeating map. Always includes 0 (the central copy). */
function worldOffsets(c0x: number, worldSize: number, w: number): number[] {
  if (!(worldSize > 0)) return [0];
  const nMin = Math.floor((-c0x - worldSize / 2) / worldSize);
  const nMax = Math.ceil((w - c0x + worldSize / 2) / worldSize);
  const out: number[] = [];
  for (let n = nMin; n <= nMax && out.length < 16; n++) out.push(n * worldSize);
  return out.length ? out : [0];
}

export default function ThreatMap(props: ThreatMapProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const mapRef = useRef<L.Map | null>(null);
  const baseCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const animCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 1, h: 1 });
  const rafRef = useRef(0);
  const startRef = useRef(0);
  const fitSigRef = useRef("");
  const baseSigRef = useRef("");

  // Precomputed render data + live props (read inside the rAF loop).
  const propsRef = useRef(props);
  propsRef.current = props;
  const rArcsRef = useRef<RenderArc[]>([]);
  const rOriginsRef = useRef<RenderOrigin[]>([]);
  const destColorRef = useRef<RGB>({ r: 255, g: 120, b: 40 });

  // Per-frame projected geometry (central copy) + active tile offsets, reused
  // for hover hit-testing.
  const frameRef = useRef<{
    origins: { x: number; y: number; o: OriginPoint }[];
    dests: { x: number; y: number; d: DestPoint }[];
    arcs: { pts: Pt[]; a: Arc }[];
    offsets: number[];
  }>({ origins: [], dests: [], arcs: [], offsets: [0] });

  // Glow sprites cached by colour key.
  const spriteRef = useRef<Map<string, HTMLCanvasElement>>(new Map());
  function glowSprite(c: RGB): HTMLCanvasElement {
    const key = `${c.r | 0},${c.g | 0},${c.b | 0}`;
    const cached = spriteRef.current.get(key);
    if (cached) return cached;
    const size = 64;
    const cv = document.createElement("canvas");
    cv.width = cv.height = size;
    const g = cv.getContext("2d")!;
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, rgba(c, 0.95));
    grad.addColorStop(0.28, rgba(c, 0.42));
    grad.addColorStop(1, rgba(c, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    spriteRef.current.set(key, cv);
    return cv;
  }

  /* ---- one-time: build the map, canvas overlays, loop, handlers ---- */
  useEffect(() => {
    const mount = mountRef.current!;
    const map = L.map(mount, {
      zoomControl: true,
      attributionControl: false,
      worldCopyJump: false,
      zoomAnimation: false, // keep basemap + overlay locked together
      markerZoomAnimation: false,
      zoomSnap: 0, // fractional zoom for exact framing
      minZoom: 1, // refined dynamically in resize() (world fills the height)
      maxZoom: 7,
      // Limit latitude to the poles; longitude is effectively unbounded so the
      // map can be panned freely across the repeating world copies.
      maxBounds: [
        [-85, -100000],
        [85, 100000],
      ],
      maxBoundsViscosity: 1.0,
      center: [22, 28],
      zoom: 3,
    });
    mapRef.current = map;
    map.getContainer().style.background = propsRef.current.colors.background;

    const makeCanvas = (z: number): [HTMLCanvasElement, CanvasRenderingContext2D] => {
      const cv = document.createElement("canvas");
      cv.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:${z};`;
      mount.appendChild(cv);
      return [cv, cv.getContext("2d")!];
    };
    const [, baseCtx] = makeCanvas(300);
    const [, animCtx] = makeCanvas(650);
    baseCtxRef.current = baseCtx;
    animCtxRef.current = animCtx;

    const resize = () => {
      const rect = mount.getBoundingClientRect();
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      for (const ctx of [baseCtx, animCtx]) {
        ctx.canvas.width = Math.round(w * dpr);
        ctx.canvas.height = Math.round(h * dpr);
        ctx.canvas.style.width = w + "px";
        ctx.canvas.style.height = h + "px";
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      sizeRef.current = { w, h };
      // Keep the world at least as tall as the panel so zooming out never
      // reveals black above/below (tiling handles the width).
      const minZ = Math.max(1, Math.log2(h / 256));
      if (Math.abs(map.getMinZoom() - minZ) > 0.01) map.setMinZoom(minZ);
    };
    resize();

    const ro = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
      resize();
    });
    ro.observe(mount);

    startRef.current = performance.now();
    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      drawAnimation((performance.now() - startRef.current) / 1000);
      syncBasemap();
    };
    rafRef.current = requestAnimationFrame(loop);

    // ---- hover hit-testing (tested against every visible world copy) ----
    const onMove: L.LeafletEventHandlerFn = (e) => {
      const { x, y } = (e as L.LeafletMouseEvent).containerPoint;
      const fr = frameRef.current;
      const offsets = fr.offsets.length ? fr.offsets : [0];
      let hit: { html: string } | null = null;
      let best = Infinity;
      for (const dx of offsets) {
        const lx = x - dx;
        for (const o of fr.origins) {
          const dd = Math.hypot(o.x - lx, o.y - y);
          if (dd < 14 && dd < best) {
            best = dd;
            hit = { html: o.o.tooltipHtml };
          }
        }
        for (const d of fr.dests) {
          const dd = Math.hypot(d.x - lx, d.y - y);
          if (dd < 17 && dd < best) {
            best = dd;
            hit = { html: d.d.tooltipHtml };
          }
        }
      }
      if (!hit) {
        let arcBest = 7;
        for (const dx of offsets) {
          const lx = x - dx;
          for (const a of fr.arcs) {
            for (let i = 1; i < a.pts.length; i++) {
              const dd = distToSeg(lx, y, a.pts[i - 1], a.pts[i]);
              if (dd < arcBest) {
                arcBest = dd;
                hit = { html: a.a.tooltipHtml };
              }
            }
          }
        }
      }
      const tip = tooltipRef.current!;
      if (hit) {
        tip.innerHTML = hit.html;
        tip.style.display = "block";
        const { w, h } = sizeRef.current;
        const tw = tip.offsetWidth;
        const th = tip.offsetHeight;
        const tx = x + 16 + tw > w ? x - 16 - tw : x + 16;
        const ty = clamp(y + 14, 6, Math.max(6, h - th - 6));
        tip.style.transform = `translate(${tx}px, ${ty}px)`;
        mount.style.cursor = "pointer";
      } else {
        tip.style.display = "none";
        mount.style.cursor = "";
      }
    };
    const onOut: L.LeafletEventHandlerFn = () => {
      tooltipRef.current!.style.display = "none";
      mount.style.cursor = "";
    };
    map.on("mousemove", onMove);
    map.on("mouseout", onOut);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      map.off("mousemove", onMove);
      map.off("mouseout", onOut);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- keep the container (ocean) background in sync ---- */
  useEffect(() => {
    const map = mapRef.current;
    if (map) map.getContainer().style.background = props.colors.background;
  }, [props.colors.background]);

  /* ---- precompute per-arc / per-origin render data (uniform styling) ---- */
  useEffect(() => {
    const base = hexToRgb(props.colors.arc);
    const core = base;
    const head = mix(accentColor(base, 0.42), HOTWHITE, 0.28);

    rArcsRef.current = props.model.arcs.map((a) => ({
      src: a,
      core,
      head,
      coreW: ARC_WIDTH,
      speed: 1,
    }));
    rOriginsRef.current = props.model.origins.map((o) => ({
      src: o,
      core,
      head,
      pulse: 1,
    }));
    destColorRef.current = mix(accentColor(base, 0.5), HOTWHITE, 0.18);
  }, [props.model, props.colors.arc]);

  /* ---- basemap: countries + labels via d3-geo, tiled, redrawn on view change ---- */
  function drawBasemap() {
    const ctx = baseCtxRef.current;
    const map = mapRef.current;
    if (!ctx || !map) return;
    const { w, h } = sizeRef.current;
    ctx.clearRect(0, 0, w, h);
    if (w < 2 || h < 2) return;

    const p = propsRef.current;
    const zoom = map.getZoom();
    const k = (256 * Math.pow(2, zoom)) / (2 * Math.PI);
    const c0 = map.latLngToContainerPoint([0, 0]);
    const proj = geoMercator().scale(k).translate([c0.x, c0.y]).center([0, 0]).rotate([0, 0, 0]);
    const path = geoPath(proj, ctx);
    const worldSize = 256 * Math.pow(2, zoom);
    const offsets = worldOffsets(c0.x, worldSize, w);
    const lbl = p.showLabels ? hexToRgb(p.colors.label) : null;

    for (const dx of offsets) {
      ctx.save();
      ctx.translate(dx, 0);
      ctx.beginPath();
      path(countryCollection as any);
      ctx.fillStyle = p.colors.land;
      ctx.fill();
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = p.colors.border;
      ctx.stroke();

      if (lbl) {
        ctx.font = "600 11px Inter, system-ui, -apple-system, Segoe UI, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineJoin = "round";
        for (const m of COUNTRY_LABELS) {
          if (zoom < (m.min ?? 0)) continue;
          const cp = map.latLngToContainerPoint([m.lat, m.lon]);
          const sx = cp.x + dx;
          if (sx < -30 || sx > w + 30 || cp.y < -20 || cp.y > h + 20) continue;
          ctx.lineWidth = 2.6;
          ctx.strokeStyle = "rgba(8,10,14,0.62)";
          ctx.strokeText(m.text, cp.x, cp.y);
          ctx.fillStyle = rgba(lbl, 0.74);
          ctx.fillText(m.text, cp.x, cp.y);
        }
      }
      ctx.restore();
    }
  }

  /** Redraw the basemap only when the view, size, or styling changes. */
  function syncBasemap() {
    const map = mapRef.current;
    if (!map) return;
    const { w, h } = sizeRef.current;
    const c0 = map.latLngToContainerPoint([0, 0]);
    const p = propsRef.current;
    const sig = `${map.getZoom().toFixed(3)}|${Math.round(c0.x)}|${Math.round(c0.y)}|${w}|${h}|${p.colors.land}|${p.colors.border}|${p.colors.label}|${p.showLabels ? 1 : 0}`;
    if (sig === baseSigRef.current) return;
    baseSigRef.current = sig;
    drawBasemap();
  }

  /* ---- per-frame animation: arcs, comets, pulses (tiled) ---- */
  function drawAnimation(T: number) {
    const ctx = animCtxRef.current;
    const map = mapRef.current;
    if (!ctx || !map) return;
    const { w, h } = sizeRef.current;
    ctx.clearRect(0, 0, w, h);

    const project = (lat: number, lon: number): Pt => {
      const pp = map.latLngToContainerPoint([lat, lon]);
      return [pp.x, pp.y];
    };
    const p = propsRef.current;

    // Auto-frame (once per data/framing/size change), so it never fights a
    // manual pan/zoom.
    if (p.autoFit && w > 2 && h > 2) {
      const m = p.model;
      const sig = `${m.arcs.length}:${m.origins.length}:${m.dests.length}:${m.totalRows}:${p.framing}:${Math.round(w / 12)}x${Math.round(h / 12)}`;
      if (sig !== fitSigRef.current && (m.origins.length || m.dests.length)) {
        fitSigRef.current = sig;
        let minLat = 90,
          maxLat = -90,
          minLon = 180,
          maxLon = -180;
        const acc = (lat: number, lon: number) => {
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
          if (lon < minLon) minLon = lon;
          if (lon > maxLon) maxLon = lon;
        };
        for (const o of m.origins) acc(o.lat, o.lon);
        for (const d of m.dests) acc(d.lat, d.lon);

        const cl = (x: number) => Math.max(-85, Math.min(85, x));
        const mY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (cl(lat) * Math.PI) / 360));
        const invMY = (y: number) => (2 * Math.atan(Math.exp(y)) - Math.PI / 2) * (180 / Math.PI);
        const midLat = invMY((mY(minLat) + mY(maxLat)) / 2);

        let zoom: number;
        let centerLon: number;
        if (p.framing === "world") {
          zoom = Math.log2(w / 256);
          centerLon = 0;
        } else {
          const lonPad = Math.max(3, (maxLon - minLon) * 0.02);
          const lonSpan = Math.min(359, maxLon - minLon + 2 * lonPad);
          const latFrac = Math.max(0.02, Math.abs(mY(maxLat) - mY(minLat)) / (2 * Math.PI));
          const zoomW = Math.log2((w * 360) / (lonSpan * 256));
          const zoomH = Math.log2((h * 0.99) / (latFrac * 256));
          zoom = p.framing === "fill" ? zoomW : Math.min(zoomW, zoomH);
          centerLon = (minLon + maxLon) / 2;
        }
        zoom = Math.max(map.getMinZoom(), Math.min(6.5, zoom));
        map.setView([midLat, centerLon], zoom, { animate: false });
      }
    }

    // Compute central geometry once; draw every world copy via ctx.translate.
    const worldSize = 256 * Math.pow(2, map.getZoom());
    const c0x = map.latLngToContainerPoint([0, 0]).x;
    const offsets = worldOffsets(c0x, worldSize, w);

    const fr = frameRef.current;
    fr.offsets = offsets;
    fr.origins = [];
    fr.dests = [];
    fr.arcs = [];

    const arcGeom = rArcsRef.current.map((ra) => {
      const p0 = project(ra.src.srcLat, ra.src.srcLon);
      const p2 = project(ra.src.dstLat, ra.src.dstLon);
      const cp = controlPoint(p0, p2);
      const pts: Pt[] = [];
      for (let i = 0; i <= ARC_SAMPLES; i++) pts.push(bez(p0, cp, p2, i / ARC_SAMPLES));
      fr.arcs.push({ pts, a: ra.src });
      return { ra, p0, p2, cp, pts };
    });
    const origGeom = rOriginsRef.current.map((ro) => {
      const [x, y] = project(ro.src.lat, ro.src.lon);
      fr.origins.push({ x, y, o: ro.src });
      return { ro, x, y };
    });
    const dc = destColorRef.current;
    const destGeom = p.model.dests.map((d) => {
      const [x, y] = project(d.lat, d.lon);
      fr.dests.push({ x, y, d });
      return { x, y };
    });

    const flowRate = BASE_FLOW_RATE * p.flowSpeedMult;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (const dx of offsets) {
      ctx.save();
      ctx.translate(dx, 0);
      for (const g of arcGeom) drawArc(ctx, g.ra, g.p0, g.p2, g.cp, g.pts, T, flowRate, glowSprite);
      for (const g of origGeom) drawOrigin(ctx, g.ro, g.x, g.y, T, glowSprite);
      for (const g of destGeom) drawDest(ctx, g.x, g.y, dc, T, glowSprite);
      ctx.restore();
    }
  }

  return (
    <div className="tam-map" ref={mountRef}>
      <div className="tam-tooltip" ref={tooltipRef} style={{ display: "none" }} />
    </div>
  );
}

/* ---------- scene draw helpers (called once per world copy) ---------- */
function drawArc(
  ctx: CanvasRenderingContext2D,
  ra: RenderArc,
  p0: Pt,
  p2: Pt,
  cp: Pt,
  pts: Pt[],
  T: number,
  flowRate: number,
  glow: (c: RGB) => HTMLCanvasElement,
) {
  // base line: soft glow pass + crisp core
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.lineWidth = ra.coreW * 3.2;
  ctx.strokeStyle = rgba(ra.core, 0.1);
  ctx.stroke();
  ctx.lineWidth = ra.coreW;
  ctx.strokeStyle = rgba(ra.core, 0.5);
  ctx.stroke();

  // flowing comet
  const headT = frac(T * flowRate * ra.speed + ra.src.phase);
  const fadeIn = clamp(headT / 0.08, 0, 1);
  const fadeOut = clamp((1 - headT) / 0.08, 0, 1);
  const win = Math.min(fadeIn, fadeOut);
  if (win <= 0.02) return;

  const seg = 9;
  ctx.lineWidth = ra.coreW * 1.5;
  for (let s = 0; s < seg; s++) {
    const t1 = headT - COMET_TAIL * ((seg - s) / seg);
    const t2 = headT - COMET_TAIL * ((seg - s - 1) / seg);
    if (t1 < 0) continue;
    const q1 = bez(p0, cp, p2, t1);
    const q2 = bez(p0, cp, p2, t2);
    ctx.strokeStyle = rgba(ra.head, (s / seg) * 0.95 * win);
    ctx.beginPath();
    ctx.moveTo(q1[0], q1[1]);
    ctx.lineTo(q2[0], q2[1]);
    ctx.stroke();
  }
  const [hx, hy] = bez(p0, cp, p2, headT);
  const gr = Math.min(ra.coreW * 2.2 + 4, 13);
  ctx.globalAlpha = 0.8 * win;
  ctx.drawImage(glow(ra.head), hx - gr, hy - gr, gr * 2, gr * 2);
  ctx.globalAlpha = 1;

  const [tx, ty] = bezTangent(p0, cp, p2, headT);
  const ang = Math.atan2(ty, tx);
  const sz = Math.min(ra.coreW * 1.05 + 2, 6.5);
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(sz, 0);
  ctx.lineTo(-sz * 0.72, sz * 0.72);
  ctx.lineTo(-sz * 0.72, -sz * 0.72);
  ctx.closePath();
  ctx.fillStyle = rgba(ra.head, 0.97 * win);
  ctx.fill();
  ctx.restore();
}

function drawOrigin(
  ctx: CanvasRenderingContext2D,
  ro: RenderOrigin,
  x: number,
  y: number,
  T: number,
  glow: (c: RGB) => HTMLCanvasElement,
) {
  const gr = 9 * ro.pulse;
  ctx.globalAlpha = 0.5;
  ctx.drawImage(glow(ro.core), x - gr, y - gr, gr * 2, gr * 2);
  ctx.globalAlpha = 1;
  for (let k = 0; k < 2; k++) {
    const rt = frac(T * PULSE_RATE + ro.src.phase + k * 0.5);
    const R = 3 + rt * (13 * ro.pulse);
    strokeCircle(ctx, x, y, R, rgba(ro.core, (1 - rt) * 0.45), 1.4);
  }
  fillCircle(ctx, x, y, 2.6, rgba(ro.head, 0.95));
  fillCircle(ctx, x, y, 1.2, rgba(HOTWHITE, 0.95));
}

function drawDest(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dc: RGB,
  T: number,
  glow: (c: RGB) => HTMLCanvasElement,
) {
  const breathe = 22 + Math.sin(T * 2) * 4;
  ctx.globalAlpha = 0.6;
  ctx.drawImage(glow(dc), x - breathe, y - breathe, breathe * 2, breathe * 2);
  ctx.globalAlpha = 1;
  for (let k = 0; k < 3; k++) {
    const rt = frac(T * DEST_PULSE_RATE + k / 3);
    const R = 5 + rt * 30;
    strokeCircle(ctx, x, y, R, rgba(dc, (1 - rt) * 0.5), 1.8);
  }
  fillCircle(ctx, x, y, 4.2, rgba(dc, 0.98));
  fillCircle(ctx, x, y, 2, rgba(HOTWHITE, 0.98));
}

/* ---------- canvas primitives ---------- */
function strokeCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  w: number,
) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.lineWidth = w;
  ctx.strokeStyle = color;
  ctx.stroke();
}
function fillCircle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}
function distToSeg(px: number, py: number, a: Pt, b: Pt): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - a[0], py - a[1]);
  let t = ((px - a[0]) * dx + (py - a[1]) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy));
}

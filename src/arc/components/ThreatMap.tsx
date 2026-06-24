/**
 * The interactive map. Leaflet draws the dark vector basemap and handles
 * pan / zoom (and the +/- control); a transparent <canvas> sits on top and is
 * redrawn every animation frame, reprojected from the current map view, to
 * render:
 *   - persistent orange arcs from each origin to the destination,
 *   - a bright arrowhead "comet" that flows along each arc and loops,
 *   - pulsating rings at every origin,
 *   - a stronger convergence pulse at the destination,
 *   - curated country labels.
 *
 * Severity only shifts the orange brighter/dimmer and scales width / speed /
 * pulse, so the map keeps its uniform-orange look while Critical traffic reads
 * hotter and faster.
 */
import { useEffect, useRef } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { worldGeo } from "../lib/geo";
import { COUNTRY_LABELS } from "../lib/labels";
import {
  ACCENTS,
  NEUTRAL_ACCENT,
  accentColor,
  hexToRgb,
  mix,
  rgba,
  type Accent,
  type RGB,
} from "../lib/theme";
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
  severityAccents: boolean;
  showLabels: boolean;
  autoFit: boolean;
}

/* ---------- tuning constants ---------- */
const BASE_FLOW_RATE = 0.16; // arc traversals per second at speed ×1
const PULSE_RATE = 0.5; // origin ring cycles per second
const DEST_PULSE_RATE = 0.72;
const BASE_CORE_WIDTH = 1.35; // px (before severity + volume scaling)
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

/** Control point: bow the arc to the left of the travel direction (this puts
 * the dominant west→Riyadh routes on a pleasing northward curve). */
function controlPoint(p0: Pt, p2: Pt): Pt {
  const dx = p2[0] - p0[0];
  const dy = p2[1] - p0[1];
  const dist = Math.hypot(dx, dy) || 1;
  const bulge = clamp(dist * 0.2, 14, 280);
  // left normal of (dx,dy) in screen space (y down) = (dy, -dx)/dist
  const nx = dy / dist;
  const ny = -dx / dist;
  return [(p0[0] + p2[0]) / 2 + nx * bulge, (p0[1] + p2[1]) / 2 + ny * bulge];
}

export default function ThreatMap(props: ThreatMapProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const mapRef = useRef<L.Map | null>(null);
  const geoRef = useRef<L.GeoJSON | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 1, h: 1 });
  const rafRef = useRef(0);
  const startRef = useRef(0);
  const fitSigRef = useRef("");

  // Precomputed render data + live props (read inside the rAF loop).
  const propsRef = useRef(props);
  propsRef.current = props;
  const rArcsRef = useRef<RenderArc[]>([]);
  const rOriginsRef = useRef<RenderOrigin[]>([]);
  const destColorRef = useRef<RGB>({ r: 255, g: 120, b: 40 });

  // Per-frame projected geometry, reused for hover hit-testing.
  const frameRef = useRef<{
    origins: { x: number; y: number; o: OriginPoint }[];
    dests: { x: number; y: number; d: DestPoint }[];
    arcs: { pts: Pt[]; a: Arc }[];
  }>({ origins: [], dests: [], arcs: [] });

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

  /* ---- one-time: build the map, canvas overlay, loop, handlers ---- */
  useEffect(() => {
    const mount = mountRef.current!;
    const map = L.map(mount, {
      zoomControl: true,
      attributionControl: true,
      worldCopyJump: false,
      zoomAnimation: false, // keep basemap + overlay locked together
      markerZoomAnimation: false,
      preferCanvas: true,
      minZoom: 1,
      maxZoom: 7,
      maxBounds: [
        [-85, -210],
        [85, 210],
      ],
      maxBoundsViscosity: 0.55,
      center: [22, 28],
      zoom: 2,
    });
    mapRef.current = map;

    const geo = L.geoJSON(worldGeo, {
      interactive: false,
      style: () => ({
        color: propsRef.current.colors.border,
        weight: 0.6,
        fillColor: propsRef.current.colors.land,
        fillOpacity: 1,
        opacity: 1,
      }),
    }).addTo(map);
    geoRef.current = geo;

    // Transparent overlay canvas above the basemap, below the controls.
    const canvas = document.createElement("canvas");
    canvas.className = "tam-canvas";
    canvas.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:650;";
    mount.appendChild(canvas);
    canvasRef.current = canvas;
    ctxRef.current = canvas.getContext("2d");

    const resize = () => {
      const rect = mount.getBoundingClientRect();
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      const ctx = ctxRef.current!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { w, h };
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
      draw((performance.now() - startRef.current) / 1000);
    };
    rafRef.current = requestAnimationFrame(loop);

    // ---- hover hit-testing ----
    const onMove: L.LeafletEventHandlerFn = (e) => {
      const { x, y } = (e as L.LeafletMouseEvent).containerPoint;
      const fr = frameRef.current;
      let hit: { html: string } | null = null;
      let best = Infinity;
      for (const o of fr.origins) {
        const dd = Math.hypot(o.x - x, o.y - y);
        if (dd < 14 && dd < best) {
          best = dd;
          hit = { html: o.o.tooltipHtml };
        }
      }
      for (const d of fr.dests) {
        const dd = Math.hypot(d.x - x, d.y - y);
        if (dd < 17 && dd < best) {
          best = dd;
          hit = { html: d.d.tooltipHtml };
        }
      }
      if (!hit) {
        let arcBest = 7;
        for (const a of fr.arcs) {
          const pts = a.pts;
          for (let i = 1; i < pts.length; i++) {
            const dd = distToSeg(x, y, pts[i - 1], pts[i]);
            if (dd < arcBest) {
              arcBest = dd;
              hit = { html: a.a.tooltipHtml };
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

  /* ---- restyle basemap when colours change ---- */
  useEffect(() => {
    const map = mapRef.current;
    const geo = geoRef.current;
    if (!map || !geo) return;
    map.getContainer().style.background = props.colors.background;
    geo.setStyle({
      color: props.colors.border,
      weight: 0.6,
      fillColor: props.colors.land,
      fillOpacity: 1,
      opacity: 1,
    });
  }, [props.colors.background, props.colors.land, props.colors.border]);

  /* ---- precompute per-arc / per-origin render data ---- */
  useEffect(() => {
    const base = hexToRgb(props.colors.arc);
    const accentFor = (sev: keyof typeof ACCENTS): Accent =>
      props.severityAccents ? ACCENTS[sev] : NEUTRAL_ACCENT;

    const maxArc = Math.max(1, ...props.model.arcs.map((a) => a.count));
    rArcsRef.current = props.model.arcs.map((a) => {
      const acc = accentFor(a.severity);
      const norm = Math.sqrt(clamp(a.count / maxArc, 0, 1));
      const coreW = clamp(BASE_CORE_WIDTH * acc.width * (0.7 + 1.25 * norm), 0.85, 5.5);
      return {
        src: a,
        core: accentColor(base, acc.bright),
        head: mix(accentColor(base, Math.min(acc.bright + 0.32, 1)), HOTWHITE, 0.25),
        coreW,
        speed: acc.speed,
      };
    });

    rOriginsRef.current = props.model.origins.map((o) => {
      const acc = accentFor(o.severity);
      return {
        src: o,
        core: accentColor(base, acc.bright),
        head: mix(accentColor(base, Math.min(acc.bright + 0.3, 1)), HOTWHITE, 0.3),
        pulse: acc.pulse,
      };
    });

    destColorRef.current = mix(accentColor(base, 0.5), HOTWHITE, 0.18);
  }, [props.model, props.colors.arc, props.severityAccents]);

  /* ---- the per-frame render ---- */
  function draw(T: number) {
    const ctx = ctxRef.current;
    const map = mapRef.current;
    if (!ctx || !map) return;
    const { w, h } = sizeRef.current;
    ctx.clearRect(0, 0, w, h);

    const project = (lat: number, lon: number): Pt => {
      const p = map.latLngToContainerPoint([lat, lon]);
      return [p.x, p.y];
    };
    const inView = (x: number, y: number, pad = 80) =>
      x > -pad && x < w + pad && y > -pad && y < h + pad;

    const p = propsRef.current;

    // One-shot auto-fit, run from the loop so it only fires once the canvas has
    // a real size (avoids a bad initial zoom from a 0-size iframe at mount).
    if (p.autoFit && w > 2 && h > 2) {
      const m = p.model;
      const sig = `${m.arcs.length}:${m.origins.length}:${m.dests.length}:${m.totalRows}`;
      if (sig !== fitSigRef.current && (m.origins.length || m.dests.length)) {
        fitSigRef.current = sig;
        const pts: L.LatLngExpression[] = [];
        for (const o of m.origins) pts.push([o.lat, o.lon]);
        for (const d of m.dests) pts.push([d.lat, d.lon]);
        map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 5, animate: false });
      }
    }

    const zoom = map.getZoom();

    // ---- country labels (under the arcs) ----
    if (p.showLabels) {
      ctx.font = "600 11px Inter, system-ui, -apple-system, Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      const lbl = hexToRgb(p.colors.label);
      for (const m of COUNTRY_LABELS) {
        if (zoom < (m.min ?? 0)) continue;
        const [x, y] = project(m.lat, m.lon);
        if (!inView(x, y, 30)) continue;
        ctx.lineWidth = 2.6;
        ctx.strokeStyle = "rgba(8,10,14,0.62)";
        ctx.strokeText(m.text, x, y);
        ctx.fillStyle = rgba(lbl, 0.74);
        ctx.fillText(m.text, x, y);
      }
    }

    const fr = frameRef.current;
    fr.origins = [];
    fr.dests = [];
    fr.arcs = [];

    // ---- arcs (base line + flowing comet/arrowhead) ----
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const flowRate = BASE_FLOW_RATE * p.flowSpeedMult;

    for (const ra of rArcsRef.current) {
      const a = ra.src;
      const p0 = project(a.srcLat, a.srcLon);
      const p2 = project(a.dstLat, a.dstLon);
      if (!inView(p0[0], p0[1], 200) && !inView(p2[0], p2[1], 200)) continue;
      const cp = controlPoint(p0, p2);

      // sampled curve (reused for drawing + hit-testing)
      const pts: Pt[] = [];
      for (let i = 0; i <= ARC_SAMPLES; i++) pts.push(bez(p0, cp, p2, i / ARC_SAMPLES));
      fr.arcs.push({ pts, a });

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
      const headT = frac(T * flowRate * ra.speed + a.phase);
      const fadeIn = clamp(headT / 0.08, 0, 1);
      const fadeOut = clamp((1 - headT) / 0.08, 0, 1);
      const win = Math.min(fadeIn, fadeOut);
      if (win > 0.02) {
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
        // glow + arrowhead at the head
        const [hx, hy] = bez(p0, cp, p2, headT);
        const gr = ra.coreW * 4 + 6;
        ctx.globalAlpha = 0.8 * win;
        const sp = glowSprite(ra.head);
        ctx.drawImage(sp, hx - gr, hy - gr, gr * 2, gr * 2);
        ctx.globalAlpha = 1;

        const [tx, ty] = bezTangent(p0, cp, p2, headT);
        const ang = Math.atan2(ty, tx);
        const sz = ra.coreW * 2 + 3.4;
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
    }

    // ---- origin pulses ----
    for (const ro of rOriginsRef.current) {
      const o = ro.src;
      const [x, y] = project(o.lat, o.lon);
      if (!inView(x, y, 20)) continue;
      fr.origins.push({ x, y, o });

      const gr = 9 * ro.pulse;
      ctx.globalAlpha = 0.5;
      const sp = glowSprite(ro.core);
      ctx.drawImage(sp, x - gr, y - gr, gr * 2, gr * 2);
      ctx.globalAlpha = 1;

      for (let k = 0; k < 2; k++) {
        const rt = frac(T * PULSE_RATE + o.phase + k * 0.5);
        const R = 3 + rt * (13 * ro.pulse);
        strokeCircle(ctx, x, y, R, rgba(ro.core, (1 - rt) * 0.45), 1.4);
      }
      fillCircle(ctx, x, y, 2.6, rgba(ro.head, 0.95));
      fillCircle(ctx, x, y, 1.2, rgba(HOTWHITE, 0.95));
    }

    // ---- destination convergence pulse ----
    const dc = destColorRef.current;
    for (const d of propsRef.current.model.dests) {
      const [x, y] = project(d.lat, d.lon);
      if (!inView(x, y, 30)) continue;
      fr.dests.push({ x, y, d });

      const breathe = 22 + Math.sin(T * 2) * 4;
      ctx.globalAlpha = 0.6;
      const sp = glowSprite(dc);
      ctx.drawImage(sp, x - breathe, y - breathe, breathe * 2, breathe * 2);
      ctx.globalAlpha = 1;

      for (let k = 0; k < 3; k++) {
        const rt = frac(T * DEST_PULSE_RATE + k / 3);
        const R = 5 + rt * 30;
        strokeCircle(ctx, x, y, R, rgba(dc, (1 - rt) * 0.5), 1.8);
      }
      fillCircle(ctx, x, y, 4.2, rgba(dc, 0.98));
      fillCircle(ctx, x, y, 2, rgba(HOTWHITE, 0.98));
    }
  }

  return (
    <div className="tam-map" ref={mountRef}>
      <div className="tam-tooltip" ref={tooltipRef} style={{ display: "none" }} />
    </div>
  );
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

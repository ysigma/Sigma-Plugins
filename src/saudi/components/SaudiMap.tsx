import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { provinces, projectLngLat, planeBounds, type ProvinceShape } from "../lib/geo";
import type { SiteMarker } from "../lib/markers";
import {
  REGION_FILL,
  REGION_FILL_DEFAULT,
  BORDER_COLOR,
  LABEL_COLOR,
  EXTRA_LABELS,
} from "../lib/regionStyle";

export interface SaudiMapProps {
  background: string;
  sites: SiteMarker[];
  showLabels: boolean;
  /** Slab thickness in plane units (0 = flat). */
  extrudeDepth: number;
  /** Initial tilt = polar angle from straight-down, in degrees. */
  tiltDeg: number;
  /** When false, horizontal orbit is locked (tilt up/down only). */
  allowSpin: boolean;
  siteTooltip: (s: SiteMarker) => string;
}

const DEG = Math.PI / 180;

function darken(color: any, f: number): any {
  return color.clone().multiplyScalar(f);
}

/** Render a label (1–2 lines, uppercase) to a canvas texture. */
function makeLabelCanvas(text: string, color: string): { canvas: HTMLCanvasElement; aspect: number } {
  const font = "700 72px Inter, Arial, system-ui, sans-serif";
  const measure = document.createElement("canvas").getContext("2d")!;
  measure.font = font;

  let lines = [text];
  if (text.length > 10 && text.includes(" ")) {
    const words = text.split(" ");
    let best = 1;
    let bestDiff = Infinity;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(" ");
      const b = words.slice(i).join(" ");
      const diff = Math.abs(a.length - b.length);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = i;
      }
    }
    lines = [words.slice(0, best).join(" "), words.slice(best).join(" ")];
  }

  const lineH = 86;
  const pad = 16;
  const w = Math.ceil(Math.max(...lines.map((l) => measure.measureText(l).width))) + pad * 2;
  const h = lines.length * lineH + pad;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  lines.forEach((l, i) => {
    ctx.fillText(l, w / 2, pad / 2 + lineH * (i + 0.5));
  });
  return { canvas, aspect: w / h };
}

export default function SaudiMap(props: SaudiMapProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const rendererRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const contentRef = useRef<any>(null);
  const sizeRef = useRef({ w: 1, h: 1 });

  const markerElsRef = useRef<Array<{ el: HTMLDivElement; world: any }>>([]);
  const disposablesRef = useRef<any[]>([]);
  const posedRef = useRef(false);

  const propsRef = useRef(props);
  propsRef.current = props;

  // ---- one-time setup: renderer, camera, controls, lights, loop ----------
  useEffect(() => {
    const mount = mountRef.current!;
    const W = mount.clientWidth || 1;
    const H = mount.clientHeight || 1;
    sizeRef.current = { w: W, h: H };

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      logarithmicDepthBuffer: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, H);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    (renderer as any).__maxAniso = renderer.capabilities.getMaxAnisotropy();

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(38, W / H, 1, 8000);
    cameraRef.current = camera;

    // High ambient keeps the flat caps near their true light-grey; a gentle
    // directional only really shades the vertical extruded side walls.
    scene.add(new THREE.AmbientLight(0xffffff, 0.96));
    const dir = new THREE.DirectionalLight(0xffffff, 0.38);
    dir.position.set(-180, 520, 280);
    scene.add(dir);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.09;
    controls.rotateSpeed = 0.55;
    controls.zoomSpeed = 0.7;
    controls.minPolarAngle = 6 * DEG;
    controls.maxPolarAngle = 82 * DEG;
    controlsRef.current = controls;

    const tmp = new THREE.Vector3();
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      controls.update();
      renderer.render(scene, camera);
      const { w, h } = sizeRef.current;
      for (const m of markerElsRef.current) {
        tmp.copy(m.world).project(camera);
        if (tmp.z >= 1) {
          m.el.style.display = "none";
          continue;
        }
        m.el.style.display = "";
        const x = (tmp.x * 0.5 + 0.5) * w;
        const y = (-tmp.y * 0.5 + 0.5) * h;
        // Anchor the tail tip (25px from the callout's left, at its bottom).
        m.el.style.transform = `translate(${x}px, ${y}px) translate(-25px, -100%)`;
      }
    };
    loop();

    const ro = new ResizeObserver(() => {
      const nw = mount.clientWidth || 1;
      const nh = mount.clientHeight || 1;
      sizeRef.current = { w: nw, h: nh };
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      for (const d of disposablesRef.current) d.dispose?.();
      disposablesRef.current = [];
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  // ---- orbit constraints + initial pose ----------------------------------
  useEffect(() => {
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    if (!controls || !camera) return;
    if (props.allowSpin) {
      controls.minAzimuthAngle = -38 * DEG;
      controls.maxAzimuthAngle = 38 * DEG;
    } else {
      controls.minAzimuthAngle = 0;
      controls.maxAzimuthAngle = 0;
    }

    const cx = (planeBounds.minX + planeBounds.maxX) / 2;
    const cy = (planeBounds.minY + planeBounds.maxY) / 2;
    const depth = props.extrudeDepth;
    const target = new THREE.Vector3(cx, depth * 0.5, -cy);
    controls.target.copy(target);

    const maxDim = Math.max(planeBounds.width, planeBounds.height);
    const R = maxDim * 1.95;
    controls.minDistance = maxDim * 0.7;
    controls.maxDistance = maxDim * 3.4;

    if (!posedRef.current) {
      const phi = Math.min(Math.max(props.tiltDeg, 6), 82) * DEG;
      camera.position.set(target.x, target.y + R * Math.cos(phi), target.z + R * Math.sin(phi));
      camera.updateProjectionMatrix();
      controls.update();
      posedRef.current = true;
    }
  }, [props.allowSpin, props.tiltDeg, props.extrudeDepth]);

  // ---- build / rebuild map content ---------------------------------------
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const renderer = rendererRef.current;
    const maxAniso = (renderer && (renderer as any).__maxAniso) || 1;

    if (contentRef.current) scene.remove(contentRef.current);
    for (const d of disposablesRef.current) d.dispose?.();
    disposablesRef.current = [];

    const depth = Math.max(props.extrudeDepth, 0.001);
    const mapGroup = new THREE.Group();
    mapGroup.rotation.x = -Math.PI / 2; // lay the slab flat, north -> -Z
    contentRef.current = mapGroup;

    const borderPositions: number[] = [];

    // Flat crisp caps (unlit) for exact light-grey colour; shaded sides for 3D.
    for (const prov of provinces as ProvinceShape[]) {
      const capHex = REGION_FILL[prov.key] || REGION_FILL_DEFAULT;
      const capCol = new THREE.Color(capHex);
      const sideCol = darken(capCol, 0.6);

      for (const poly of prov.polygons) {
        if (!poly.length || poly[0].length < 4) continue;
        const [outer, ...holes] = poly;
        const shape = new THREE.Shape(outer.map(([x, y]) => new THREE.Vector2(x, y)));
        for (const hole of holes) {
          if (hole.length >= 4)
            shape.holes.push(new THREE.Path(hole.map(([x, y]) => new THREE.Vector2(x, y))));
        }
        const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
        const capMat = new THREE.MeshBasicMaterial({ color: capCol });
        const sideMat = new THREE.MeshLambertMaterial({ color: sideCol });
        const mesh = new THREE.Mesh(geo, [capMat, sideMat]);
        mapGroup.add(mesh);
        disposablesRef.current.push(geo, capMat, sideMat);

        for (const ring of poly) {
          for (let i = 0; i < ring.length - 1; i++) {
            borderPositions.push(ring[i][0], ring[i][1], depth + 0.35);
            borderPositions.push(ring[i + 1][0], ring[i + 1][1], depth + 0.35);
          }
        }
      }
    }

    if (borderPositions.length) {
      const bgeo = new THREE.BufferGeometry();
      bgeo.setAttribute("position", new THREE.Float32BufferAttribute(borderPositions, 3));
      const bmat = new THREE.LineBasicMaterial({ color: new THREE.Color(BORDER_COLOR) });
      const lines = new THREE.LineSegments(bgeo, bmat);
      lines.renderOrder = 2;
      mapGroup.add(lines);
      disposablesRef.current.push(bgeo, bmat);
    }

    // Labels: region centroids + extra place labels, laid flat on the slab.
    const addLabel = (text: string, x: number, y: number, hUnits: number) => {
      const { canvas, aspect } = makeLabelCanvas(text.toUpperCase(), LABEL_COLOR);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = maxAniso;
      tex.needsUpdate = true;
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
      const plane = new THREE.PlaneGeometry(hUnits * aspect, hUnits);
      const m = new THREE.Mesh(plane, mat);
      m.position.set(x, y, depth + 0.6);
      m.renderOrder = 3;
      mapGroup.add(m);
      disposablesRef.current.push(plane, mat, tex);
    };

    if (props.showLabels) {
      for (const prov of provinces as ProvinceShape[]) {
        const hUnits = Math.min(Math.max(6 + 7 * Math.sqrt(prov.areaRatio), 5.5), 11);
        addLabel(prov.name, prov.centroid[0], prov.centroid[1], hUnits);
      }
      for (const lbl of EXTRA_LABELS) {
        const p = projectLngLat(lbl.lng, lbl.lat);
        if (p) addLabel(lbl.text, p[0], p[1], 8 * (lbl.scale ?? 1));
      }
    }

    scene.add(mapGroup);
    scene.background = new THREE.Color(props.background);

    // ---- HTML callout overlays for sites ----
    const overlay = overlayRef.current!;
    overlay.innerHTML = "";
    const els: Array<{ el: HTMLDivElement; world: any }> = [];
    for (const site of props.sites) {
      const p = projectLngLat(site.lng, site.lat);
      if (!p) continue;
      const world = new THREE.Vector3(p[0], depth + 0.5, -p[1]);

      const el = document.createElement("div");
      el.className = `sa-callout ${site.healthy ? "ok" : "down"}`;
      const box = document.createElement("div");
      box.className = "sa-callout__box";
      const icon = document.createElement("span");
      icon.className = "sa-callout__icon";
      icon.textContent = site.healthy ? "✓" : "✕";
      const label = document.createElement("span");
      label.className = "sa-callout__label";
      label.textContent = site.label;
      box.appendChild(icon);
      box.appendChild(label);
      const tail = document.createElement("div");
      tail.className = "sa-callout__tail";
      el.appendChild(box);
      el.appendChild(tail);

      box.addEventListener("mouseenter", () => {
        const tip = tooltipRef.current!;
        tip.innerHTML = propsRef.current.siteTooltip(site);
        tip.style.display = "block";
        const rect = mountRef.current!.getBoundingClientRect();
        const brect = box.getBoundingClientRect();
        tip.style.transform = `translate(${brect.left - rect.left}px, ${brect.bottom - rect.top + 8}px)`;
      });
      box.addEventListener("mouseleave", () => {
        tooltipRef.current!.style.display = "none";
      });

      overlay.appendChild(el);
      els.push({ el, world });
    }
    markerElsRef.current = els;
  }, [props.background, props.showLabels, props.extrudeDepth, props.sites]);

  return (
    <div className="sa-map" ref={mountRef}>
      <div className="sa-overlay" ref={overlayRef} />
      <div className="sa-tooltip" ref={tooltipRef} style={{ display: "none" }} />
    </div>
  );
}

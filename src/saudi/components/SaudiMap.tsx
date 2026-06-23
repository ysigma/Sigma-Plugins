import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { provinces, projectLngLat, planeBounds, type ProvinceShape } from "../lib/geo";
import type { SiteMarker } from "../lib/markers";

export interface SaudiMapProps {
  /** region key -> cap (top) color; missing keys fall back to landColor. */
  capColors: Record<string, string>;
  landColor: string;
  borderColor: string;
  background: string;
  labelColor: string;
  sites: SiteMarker[];
  showLabels: boolean;
  /** Slab thickness in plane units (0 = flat). */
  extrudeDepth: number;
  /** Initial tilt = polar angle from straight-down, in degrees. */
  tiltDeg: number;
  /** When false, horizontal orbit is locked (tilt up/down only). */
  allowSpin: boolean;
  regionTooltip: (key: string, name: string) => string | null;
  siteTooltip: (s: SiteMarker) => string;
}

const DEG = Math.PI / 180;

function darken(color: any, f: number): any {
  return color.clone().multiplyScalar(f);
}

/** Render a region label (1–2 lines, uppercase) to a canvas texture. */
function makeLabelCanvas(
  text: string,
  color: string,
): { canvas: HTMLCanvasElement; aspect: number } {
  const font = "700 72px Inter, Arial, system-ui, sans-serif";
  const measure = document.createElement("canvas").getContext("2d")!;
  measure.font = font;

  // Wrap long multi-word labels onto two balanced lines.
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

  // Long-lived three handles.
  const rendererRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const contentRef = useRef<any>(null);
  const sizeRef = useRef({ w: 1, h: 1 });

  // Per-build state used by the render loop / pointer handlers.
  const markerElsRef = useRef<Array<{ el: HTMLDivElement; world: any }>>([]);
  const pickRef = useRef<any[]>([]);
  const provinceMatsRef = useRef<Map<string, any[]>>(new Map());
  const hoverKeyRef = useRef<string | null>(null);
  const disposablesRef = useRef<any[]>([]);
  const posedRef = useRef(false);

  // Latest props for use inside the persistent loop / handlers.
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
    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(38, W / H, 1, 8000);
    cameraRef.current = camera;

    scene.add(new THREE.AmbientLight(0xffffff, 0.92));
    const dir = new THREE.DirectionalLight(0xffffff, 0.45);
    dir.position.set(-220, 480, 320);
    scene.add(dir);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.09;
    controls.rotateSpeed = 0.55;
    controls.zoomSpeed = 0.7;
    // Tilt range: near top-down -> low oblique, never reaching edge-on/under.
    controls.minPolarAngle = 6 * DEG;
    controls.maxPolarAngle = 82 * DEG;
    controlsRef.current = controls;
    (renderer as any).__maxAniso = maxAniso;

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();

    const onPointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(pickRef.current, false);
      const key: string | null = hits.length ? hits[0].object.userData.key : null;
      if (key !== hoverKeyRef.current) {
        // reset previous highlight
        if (hoverKeyRef.current) {
          for (const m of provinceMatsRef.current.get(hoverKeyRef.current) ?? [])
            m.emissive.setHex(0x000000);
        }
        hoverKeyRef.current = key;
        if (key) {
          for (const m of provinceMatsRef.current.get(key) ?? []) m.emissive.setHex(0x3a3a3a);
        }
      }
      const tip = tooltipRef.current!;
      if (key) {
        const name = hits[0].object.userData.name as string;
        const html = propsRef.current.regionTooltip(key, name);
        if (html) {
          tip.innerHTML = html;
          tip.style.display = "block";
          const ox = e.clientX - rect.left + 14;
          const oy = e.clientY - rect.top + 14;
          tip.style.transform = `translate(${ox}px, ${oy}px)`;
        } else {
          tip.style.display = "none";
        }
      } else {
        tip.style.display = "none";
      }
    };
    const onPointerLeave = () => {
      if (hoverKeyRef.current) {
        for (const m of provinceMatsRef.current.get(hoverKeyRef.current) ?? [])
          m.emissive.setHex(0x000000);
        hoverKeyRef.current = null;
      }
      tooltipRef.current!.style.display = "none";
    };
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);

    // Render loop + HTML overlay projection.
    const tmp = new THREE.Vector3();
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      controls.update();
      renderer.render(scene, camera);
      const { w, h } = sizeRef.current;
      for (const m of markerElsRef.current) {
        tmp.copy(m.world).project(camera);
        const inFront = tmp.z < 1;
        if (!inFront) {
          m.el.style.display = "none";
          continue;
        }
        m.el.style.display = "";
        const x = (tmp.x * 0.5 + 0.5) * w;
        const y = (-tmp.y * 0.5 + 0.5) * h;
        m.el.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
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
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      controls.dispose();
      for (const d of disposablesRef.current) d.dispose?.();
      disposablesRef.current = [];
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  // ---- update orbit constraints + initial pose ---------------------------
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
      camera.position.set(
        target.x,
        target.y + R * Math.cos(phi),
        target.z + R * Math.sin(phi),
      );
      camera.updateProjectionMatrix();
      controls.update();
      posedRef.current = true;
    }
  }, [props.allowSpin, props.tiltDeg, props.extrudeDepth]);

  // ---- build / rebuild map content on data or style change ---------------
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const renderer = rendererRef.current;
    const maxAniso = (renderer && (renderer as any).__maxAniso) || 1;

    // tear down previous content
    if (contentRef.current) scene.remove(contentRef.current);
    for (const d of disposablesRef.current) d.dispose?.();
    disposablesRef.current = [];
    provinceMatsRef.current = new Map();
    pickRef.current = [];

    const depth = Math.max(props.extrudeDepth, 0.001);
    const mapGroup = new THREE.Group();
    mapGroup.rotation.x = -Math.PI / 2; // lay the slab flat, north -> -Z
    contentRef.current = mapGroup;

    const borderPositions: number[] = [];

    for (const prov of provinces as ProvinceShape[]) {
      const capHex = props.capColors[prov.key] || props.landColor;
      const capCol = new THREE.Color(capHex);
      const sideCol = darken(capCol, 0.62);
      const caps: any[] = [];

      for (const poly of prov.polygons) {
        if (!poly.length || poly[0].length < 4) continue;
        const [outer, ...holes] = poly;
        const shape = new THREE.Shape(outer.map(([x, y]) => new THREE.Vector2(x, y)));
        for (const hole of holes) {
          if (hole.length >= 4)
            shape.holes.push(new THREE.Path(hole.map(([x, y]) => new THREE.Vector2(x, y))));
        }
        const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
        const capMat = new THREE.MeshLambertMaterial({ color: capCol });
        const sideMat = new THREE.MeshLambertMaterial({ color: sideCol });
        const mesh = new THREE.Mesh(geo, [capMat, sideMat]);
        mesh.userData = { key: prov.key, name: prov.name };
        mapGroup.add(mesh);
        pickRef.current.push(mesh);
        caps.push(capMat);
        disposablesRef.current.push(geo, capMat, sideMat);

        // border segments along every ring, just above the cap
        for (const ring of poly) {
          for (let i = 0; i < ring.length - 1; i++) {
            borderPositions.push(ring[i][0], ring[i][1], depth + 0.35);
            borderPositions.push(ring[i + 1][0], ring[i + 1][1], depth + 0.35);
          }
        }
      }
      provinceMatsRef.current.set(prov.key, caps);

      // region label as a flat plane laid on the slab top
      if (props.showLabels) {
        const { canvas, aspect } = makeLabelCanvas(prov.name.toUpperCase(), props.labelColor);
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = maxAniso;
        tex.needsUpdate = true;
        const labelMat = new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          depthWrite: false,
        });
        const hUnits = Math.min(Math.max(6 + 7 * Math.sqrt(prov.areaRatio), 5.5), 11);
        const plane = new THREE.PlaneGeometry(hUnits * aspect, hUnits);
        const labelMesh = new THREE.Mesh(plane, labelMat);
        labelMesh.position.set(prov.centroid[0], prov.centroid[1], depth + 0.6);
        labelMesh.renderOrder = 3;
        mapGroup.add(labelMesh);
        disposablesRef.current.push(plane, labelMat, tex);
      }
    }

    if (borderPositions.length) {
      const bgeo = new THREE.BufferGeometry();
      bgeo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(borderPositions, 3),
      );
      const bmat = new THREE.LineBasicMaterial({ color: new THREE.Color(props.borderColor) });
      const lines = new THREE.LineSegments(bgeo, bmat);
      lines.renderOrder = 2;
      mapGroup.add(lines);
      disposablesRef.current.push(bgeo, bmat);
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
      const stem = document.createElement("div");
      stem.className = "sa-callout__stem";
      const pin = document.createElement("div");
      pin.className = "sa-callout__pin";
      el.appendChild(box);
      el.appendChild(tail);
      el.appendChild(stem);
      el.appendChild(pin);

      box.addEventListener("mouseenter", () => {
        const tip = tooltipRef.current!;
        tip.innerHTML = propsRef.current.siteTooltip(site);
        tip.style.display = "block";
        const rect = mountRef.current!.getBoundingClientRect();
        const brect = box.getBoundingClientRect();
        tip.style.transform = `translate(${brect.left - rect.left}px, ${
          brect.bottom - rect.top + 8
        }px)`;
      });
      box.addEventListener("mouseleave", () => {
        tooltipRef.current!.style.display = "none";
      });

      overlay.appendChild(el);
      els.push({ el, world });
    }
    markerElsRef.current = els;
  }, [
    props.capColors,
    props.landColor,
    props.borderColor,
    props.background,
    props.labelColor,
    props.showLabels,
    props.extrudeDepth,
    props.sites,
  ]);

  return (
    <div className="sa-map" ref={mountRef}>
      <div className="sa-overlay" ref={overlayRef} />
      <div className="sa-tooltip" ref={tooltipRef} style={{ display: "none" }} />
    </div>
  );
}

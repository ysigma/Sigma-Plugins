import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Globe from "react-globe.gl";
import type { CountryFeature, LabelPoint } from "../lib/geo";

const labelLat = (d: object) => (d as LabelPoint).lat;
const labelLng = (d: object) => (d as LabelPoint).lng;
const labelText = (d: object) => (d as LabelPoint).text;

/** A tiny solid-color data-URL texture used as the globe (ocean) surface. */
function solidColorTexture(color: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 2;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 2, 2);
  }
  return canvas.toDataURL();
}

interface GlobeViewProps {
  features: CountryFeature[];
  labels: LabelPoint[];
  showLabels: boolean;
  autoRotate: boolean;
  darkMode: boolean;
  /** Canvas background color (behind the globe). */
  background: string;
  /** ccn3 -> CSS color for the polygon cap. */
  getColor: (ccn3: string) => string;
  /** ccn3 -> HTML string for the hover tooltip. */
  getTooltip: (ccn3: string, fallbackName?: string) => string;
}

export default function GlobeView({
  features,
  labels,
  showLabels,
  autoRotate,
  darkMode,
  background,
  getColor,
  getTooltip,
}: GlobeViewProps) {
  // Kept as `any`: the GlobeMethods type pulls in three's types, which we don't
  // need just to call controls()/pointOfView().
  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const posedRef = useRef(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [globeReady, setGlobeReady] = useState(false);
  const [hovered, setHovered] = useState<object | null>(null);

  // Keep the canvas sized to its container (the Sigma iframe).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const ready = size.width > 0 && size.height > 0;

  // Configure orbit controls + initial framing once the globe is initialized.
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !globeReady) return;
    const controls = globe.controls();
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.5;
    controls.enablePan = false;
    controls.minDistance = 175;
    controls.maxDistance = 600;
    if (!posedRef.current) {
      globe.pointOfView({ lat: 20, lng: 0, altitude: 2.2 }, 0);
      posedRef.current = true;
    }
  }, [globeReady, autoRotate]);

  // Ocean/globe color via a solid-color texture (no three import, no network).
  const globeImageUrl = useMemo(
    () => solidColorTexture(darkMode ? "#13243d" : "#e9eff7"),
    [darkMode],
  );

  // Stable accessors so hovering (local state) doesn't re-color every polygon.
  const capColor = useCallback(
    (f: object) => getColor(String((f as CountryFeature).id)),
    [getColor],
  );
  const sideColor = useCallback(
    () => (darkMode ? "rgba(255,255,255,0.08)" : "rgba(20,40,80,0.08)"),
    [darkMode],
  );
  const strokeColor = useCallback(() => (darkMode ? "#22344b" : "#9aa7b8"), [darkMode]);
  const polygonLabel = useCallback(
    (f: object) => {
      const feat = f as CountryFeature;
      return getTooltip(String(feat.id), feat.properties?.name);
    },
    [getTooltip],
  );
  const altitude = useCallback((f: object) => (f === hovered ? 0.07 : 0.012), [hovered]);
  const labelColor = useCallback(
    () => (darkMode ? "rgba(235,240,248,0.85)" : "rgba(40,50,65,0.85)"),
    [darkMode],
  );

  return (
    <div ref={containerRef} className="globe-container">
      {ready && (
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
          // Antialiasing + a logarithmic depth buffer stop the country border
          // lines from shimmering / z-fighting while the globe rotates.
          rendererConfig={{ antialias: true, logarithmicDepthBuffer: true }}
          onGlobeReady={() => setGlobeReady(true)}
          backgroundColor={background}
          globeImageUrl={globeImageUrl}
          showAtmosphere
          atmosphereColor={darkMode ? "#4a90d9" : "#a9c7ef"}
          atmosphereAltitude={0.18}
          polygonsData={features}
          polygonCapColor={capColor}
          polygonSideColor={sideColor}
          polygonStrokeColor={strokeColor}
          polygonAltitude={altitude}
          polygonCapCurvatureResolution={3}
          polygonLabel={polygonLabel}
          onPolygonHover={(f: object | null) => setHovered(f)}
          polygonsTransitionDuration={200}
          labelsData={showLabels ? labels : []}
          labelLat={labelLat}
          labelLng={labelLng}
          labelText={labelText}
          labelSize={0.55}
          labelDotRadius={0.12}
          labelColor={labelColor}
          labelResolution={2}
        />
      )}
    </div>
  );
}

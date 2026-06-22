import { useCallback, useEffect, useRef, useState } from "react";
import Globe from "react-globe.gl";
import type { CountryFeature, LabelPoint } from "../lib/geo";

const labelLat = (d: object) => (d as LabelPoint).lat;
const labelLng = (d: object) => (d as LabelPoint).lng;
const labelText = (d: object) => (d as LabelPoint).text;

interface GlobeViewProps {
  features: CountryFeature[];
  labels: LabelPoint[];
  showLabels: boolean;
  autoRotate: boolean;
  darkMode: boolean;
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
  getColor,
  getTooltip,
}: GlobeViewProps) {
  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const posedRef = useRef(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
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

  // Orbit controls + globe material respond to the style toggles.
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;

    const controls = globe.controls();
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.5;
    controls.enablePan = false;
    controls.minDistance = 175;
    controls.maxDistance = 600;

    const material = globe.globeMaterial();
    material.color.set(darkMode ? "#13243d" : "#e9eff7");
    if (material.emissive) material.emissive.set(darkMode ? "#0a1626" : "#000000");
    material.shininess = darkMode ? 8 : 3;
  }, [autoRotate, darkMode, ready]);

  // Frame the globe once it first has a size.
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !ready || posedRef.current) return;
    globe.pointOfView({ lat: 20, lng: 0, altitude: 2.2 }, 0);
    posedRef.current = true;
  }, [ready]);

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
          backgroundColor={darkMode ? "#0b1320" : "#ffffff"}
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

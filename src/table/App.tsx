import { useEffect, useMemo, type CSSProperties } from "react";
import {
  useConfig,
  useElementColumns,
  useElementData,
  client,
} from "@sigmacomputing/plugin";
import { formatNumber } from "./lib/format";
import EmptyState from "./components/EmptyState";
import TableRow from "./components/TableRow";
import { DEMO_ROWS, DEMO_SUBTITLE, DEMO_TITLE } from "./lib/demoData";

function firstId(value: unknown): string | undefined {
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : undefined;
  return typeof value === "string" ? value : undefined;
}

function withHash(c: string): string {
  if (!c) return c;
  return c.startsWith("#") || c.startsWith("rgb") ? c : `#${c}`;
}

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(window.location.search).has("demo")) return true;
    return window.self === window.top;
  } catch {
    return false;
  }
}

interface Row {
  primary: string;
  secondary: string;
  value: number;
}

export default function App() {
  const config = useConfig() ?? {};
  const sourceId = typeof config.source === "string" ? config.source : undefined;
  const data = useElementData(sourceId ?? "");
  const columns = useElementColumns(sourceId ?? "");

  const standalone = useMemo(detectStandalone, []);

  useEffect(() => {
    client.config.setLoadingState(false);
  }, []);

  const primaryId = firstId(config.primary);
  const secondaryId = firstId(config.secondary);
  const measureId = firstId(config.measure);

  const backgroundColor = withHash(
    (typeof config.backgroundColor === "string" && config.backgroundColor) || "#1c1c1c",
  );
  const borderColor = withHash(
    (typeof config.borderColor === "string" && config.borderColor) || "#3a3a3a",
  );
  const accentColor = withHash(
    (typeof config.accentColor === "string" && config.accentColor) || "#d4a85a",
  );
  const textColor = withHash(
    (typeof config.textColor === "string" && config.textColor) || "#ffffff",
  );
  const borderWidth =
    parseInt(typeof config.borderWidth === "string" ? config.borderWidth : "1", 10) || 0;

  const primaryColName = (primaryId && columns?.[primaryId]?.name) || "";
  const measureColName = (measureId && columns?.[measureId]?.name) || "";

  const titleText = typeof config.title === "string" ? config.title.trim() : "";
  const subtitleText = typeof config.subtitle === "string" ? config.subtitle.trim() : "";
  const displayTitle =
    titleText || (standalone ? DEMO_TITLE : primaryColName);
  const displaySubtitle =
    subtitleText || (standalone ? DEMO_SUBTITLE : measureColName);

  const numberFormat =
    typeof config.numberFormat === "string" ? config.numberFormat : "Comma (1,234)";
  const sortOrder =
    typeof config.sortOrder === "string" ? config.sortOrder : "Measure (desc)";
  const barScaling =
    typeof config.barScaling === "string" ? config.barScaling : "Relative to largest";
  const rowLimitRaw =
    typeof config.rowLimit === "string" ? config.rowLimit.trim() : "";
  const rowLimit = rowLimitRaw ? parseInt(rowLimitRaw, 10) : NaN;

  const rows: Row[] = useMemo(() => {
    if (standalone) return DEMO_ROWS;
    const primaryVals: unknown[] = (primaryId && data?.[primaryId]) || [];
    const secondaryVals: unknown[] = (secondaryId && data?.[secondaryId]) || [];
    const measureVals: unknown[] = (measureId && data?.[measureId]) || [];
    const n = Math.max(primaryVals.length, measureVals.length);
    const out: Row[] = [];
    for (let i = 0; i < n; i++) {
      const value = Number(measureVals[i]);
      if (!isFinite(value)) continue;
      out.push({
        primary: primaryVals[i] != null ? String(primaryVals[i]) : "",
        secondary: secondaryVals[i] != null ? String(secondaryVals[i]) : "",
        value,
      });
    }
    return out;
  }, [standalone, data, primaryId, secondaryId, measureId]);

  const sorted = useMemo(() => {
    const arr = rows.slice();
    if (sortOrder === "Measure (desc)") arr.sort((a, b) => b.value - a.value);
    else if (sortOrder === "Measure (asc)") arr.sort((a, b) => a.value - b.value);
    return arr;
  }, [rows, sortOrder]);

  const limited = useMemo(() => {
    if (!isFinite(rowLimit) || rowLimit <= 0) return sorted;
    return sorted.slice(0, rowLimit);
  }, [sorted, rowLimit]);

  const denominator = useMemo(() => {
    if (limited.length === 0) return 1;
    if (barScaling === "Share of total") {
      const sum = limited.reduce((s, r) => s + Math.max(0, r.value), 0);
      return sum > 0 ? sum : 1;
    }
    const max = Math.max(...limited.map((r) => Math.abs(r.value)));
    return max > 0 ? max : 1;
  }, [limited, barScaling]);

  const appStyle: CSSProperties = {
    background: backgroundColor,
    color: textColor,
    border: borderWidth > 0 ? `${borderWidth}px solid ${borderColor}` : undefined,
    ["--mbt-accent" as string]: accentColor,
    ["--mbt-border" as string]: borderColor,
    ["--mbt-text" as string]: textColor,
    ["--mbt-bg" as string]: backgroundColor,
  };

  const configured = standalone || (!!sourceId && !!primaryId && !!measureId);

  const steps = [
    { label: "Pick a Data source element", done: !!sourceId },
    { label: "Assign a Primary label (dimension 1)", done: !!primaryId },
    { label: "Assign a Measure", done: !!measureId },
  ];

  return (
    <div className="mbt-app" style={appStyle}>
      {!configured ? (
        <EmptyState steps={steps} />
      ) : (
        <>
          {(displayTitle || displaySubtitle) && (
            <div className="mbt-header">
              <div className="mbt-title">{displayTitle}</div>
              {displaySubtitle && (
                <div className="mbt-subtitle">{displaySubtitle}</div>
              )}
            </div>
          )}
          {limited.length === 0 ? (
            <div className="mbt-empty-rows">No rows to display.</div>
          ) : (
            <div className="mbt-rows">
              {limited.map((row, i) => (
                <TableRow
                  key={`${row.primary}-${i}`}
                  primary={row.primary}
                  secondary={row.secondary}
                  formatted={formatNumber(row.value, numberFormat)}
                  proportion={Math.abs(row.value) / denominator}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

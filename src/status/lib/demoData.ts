/**
 * Synthetic data shown when the plugin is opened directly (outside Sigma).
 * It mirrors the parallel-array shape Sigma delivers via `useElementData`, so
 * the demo exercises the exact same code path as live data.
 */

export const DEMO_TITLE = "Service availability";

const DEMO_APPS = [
  "BitBucket - https://bitbucket.pif.gov.sa/dashboard",
  "Board Vantage - https://bcp.pif.gov.sa",
  "ControlM - https://ctm.pif.gov.sa/ControlM",
  "CRD - https://crd.pif.gov.sa",
  "Digital Signature - https://sign.pif.gov.sa",
  "Email - https://mail.pif.gov.sa",
  "Enterprise Content Management - https://ecm.pif.gov.sa",
  "ERP - https://ierp.pif.gov.sa",
  "Governor Hub - https://integration.pif.gov.sa/mobile-dashboard/login",
  "MAAK - https://maak.pif.gov.sa/pifHrmsWeb/#/user-dashboard",
  "MAAK GATE - https://maakgate.pif.gov.sa",
  "Managers Gate - https://managers.pif.gov.sa/account/login",
  "PIF Department Portal (SharePoint) - https://intranet-new.pif.gov.sa",
  "PIF Public Website - https://www.pif.gov.sa/",
  "PowerBI - https://bi.pif.gov.sa/reports",
  "SAQR - https://saqr.pif.gov.sa/login",
  "ServiceNow (ESM) - https://esm.pif.gov.sa",
  "SMS API - https://xservices.rich.sa/RiCHClientServiceREST.svc/HealthCheck",
  "Swift - https://swift.pif.gov.sa/swp/group/access",
];

export interface DemoData {
  application: string[];
  timestamp: number[];
  status: number[];
}

const BUCKET_MS = 5 * 60_000;
const N_BUCKETS = 48; // ~4 hours of 5-minute readings

// A couple of scripted blips + a data gap so the demo shows every color the
// plugin can render. Everything else reports healthy (status = 1).
const DOWN_BLIPS: Record<number, [number, number]> = {
  7: [20, 22], // ERP outage
};
const DEGRADED_BLIPS: Record<number, [number, number]> = {
  14: [30, 33], // PowerBI degraded
};
const GAP_BUCKETS = new Set([25, 26]); // monitoring gap across all services

export function buildDemoData(): DemoData {
  const application: string[] = [];
  const timestamp: number[] = [];
  const status: number[] = [];

  const now = Date.now();
  const end = Math.floor(now / BUCKET_MS) * BUCKET_MS;
  const start = end - (N_BUCKETS - 1) * BUCKET_MS;

  for (let b = 0; b < N_BUCKETS; b++) {
    if (GAP_BUCKETS.has(b)) continue;
    const ts = start + b * BUCKET_MS;
    for (let a = 0; a < DEMO_APPS.length; a++) {
      let value = 1; // up
      const down = DOWN_BLIPS[a];
      const degraded = DEGRADED_BLIPS[a];
      if (down && b >= down[0] && b <= down[1]) value = 0;
      else if (degraded && b >= degraded[0] && b <= degraded[1]) value = 2;
      application.push(DEMO_APPS[a]);
      timestamp.push(ts);
      status.push(value);
    }
  }

  return { application, timestamp, status };
}

// Treat 2 as "degraded" in the demo (see degradedValues default handling).
export const DEMO_DEGRADED_VALUES = "2";

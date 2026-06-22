/**
 * Country matching / "auto-detect" logic.
 *
 * Sigma users can drop a dimension containing any of:
 *   - Full names ("United States", "United Kingdom", "Czech Republic")
 *   - ISO 3166-1 alpha-2 codes ("US", "GB")
 *   - ISO 3166-1 alpha-3 codes ("USA", "GBR")
 *   - ISO 3166-1 numeric codes (840, "826")
 *
 * We normalise every candidate string to a punctuation/diacritic-insensitive
 * key and resolve it to an ISO numeric code (ccn3). The globe geometry from
 * `world-atlas` is keyed by the same ccn3 code, so this is what links a data
 * row to a country polygon.
 */
import worldCountries from "world-countries";

/** Normalise a value to a comparison key: lowercase, strip accents & non-alphanumerics. */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritical marks
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ""); // "U.S.A." -> "usa", "United States" -> "unitedstates"
}

/**
 * Common informal names / abbreviations that aren't always present in the
 * `altSpellings` list. Keyed name -> ISO numeric (ccn3).
 */
const EXTRA_ALIASES: Record<string, string> = {
  usa: "840",
  us: "840",
  america: "840",
  unitedstatesofamerica: "840",
  uk: "826",
  britain: "826",
  greatbritain: "826",
  england: "826",
  russia: "643",
  southkorea: "410",
  koreasouth: "410",
  republicofkorea: "410",
  northkorea: "408",
  koreanorth: "408",
  ivorycoast: "384",
  drc: "180",
  democraticrepublicofthecongo: "180",
  congokinshasa: "180",
  republicofthecongo: "178",
  congobrazzaville: "178",
  congo: "178",
  laos: "418",
  syria: "760",
  tanzania: "834",
  bolivia: "068",
  venezuela: "862",
  vietnam: "704",
  brunei: "096",
  moldova: "498",
  northmacedonia: "807",
  macedonia: "807",
  swaziland: "748",
  eswatini: "748",
  burma: "104",
  myanmar: "104",
  capeverde: "132",
  turkey: "792",
  turkiye: "792",
  uae: "784",
  unitedarabemirates: "784",
  taiwan: "158",
  palestine: "275",
  vatican: "336",
  holysee: "336",
  micronesia: "583",
  iran: "364",
  southsudan: "728",
};

const codeByKey = new Map<string, string>();
const nameByCcn3 = new Map<string, string>();

for (const country of worldCountries) {
  if (!country.ccn3) continue;
  nameByCcn3.set(country.ccn3, country.name.common);

  const candidates = [
    country.cca2,
    country.cca3,
    country.ccn3,
    String(parseInt(country.ccn3, 10)), // numeric without leading zeros
    country.name.common,
    country.name.official,
    ...country.altSpellings,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const key = normalize(candidate);
    if (key && !codeByKey.has(key)) codeByKey.set(key, country.ccn3);
  }
}

// Layer the manual aliases on top (also register the leading-zero-stripped form).
for (const [name, ccn3] of Object.entries(EXTRA_ALIASES)) {
  codeByKey.set(normalize(name), ccn3);
  codeByKey.set(String(parseInt(ccn3, 10)), ccn3);
}

/**
 * Resolve a raw dimension value to an ISO numeric country code (ccn3),
 * or null if it can't be matched.
 */
export function resolveCountryCode(raw: unknown): string | null {
  if (raw == null) return null;
  const key = normalize(String(raw));
  if (!key) return null;
  return codeByKey.get(key) ?? null;
}

/** Canonical common name for an ISO numeric code (for tooltips/labels). */
export function countryName(ccn3: string): string | undefined {
  return nameByCcn3.get(ccn3);
}

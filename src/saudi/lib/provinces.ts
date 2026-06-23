/**
 * Resolve free-text region names from Sigma data to one of Saudi Arabia's 13
 * canonical ADM1 region keys. Accepts English names, common alternates
 * (Mecca/Makkah, Medina/Madinah, Eastern/Ash Sharqiyah, …), and tolerates the
 * "Region"/"Province"/"Al-"/diacritic noise.
 */

/** The 13 canonical region keys (normalized display names). */
export const REGION_KEYS = [
  "riyadh",
  "makkah",
  "madinah",
  "eastern province",
  "asir",
  "tabuk",
  "hail",
  "northern borders",
  "jawf",
  "najran",
  "bahah",
  "jazan",
  "qassim",
] as const;

/** Strip diacritics, punctuation, and administrative-suffix noise. */
function normalize(value: unknown): string {
  return String(value)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // accents
    .toLowerCase()
    .replace(/['`’ʻ]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\b(region|province|governorate|emirate|area|of|the)\b/g, " ")
    .replace(/^(al|ar|ash|as|el)[\s-]+/g, "") // leading article
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Alternate spellings -> canonical key. Keys here are themselves normalized.
const ALIASES: Record<string, string> = {
  riyadh: "riyadh",
  riyad: "riyadh",
  makkah: "makkah",
  mecca: "makkah",
  makkahalmukarramah: "makkah",
  madinah: "madinah",
  medina: "madinah",
  medinah: "madinah",
  almadinah: "madinah",
  "eastern province": "eastern province",
  eastern: "eastern province",
  "ash sharqiyah": "eastern province",
  sharqiyah: "eastern province",
  sharqia: "eastern province",
  asir: "asir",
  aseer: "asir",
  tabuk: "tabuk",
  hail: "hail",
  hayel: "hail",
  "northern borders": "northern borders",
  "northern border": "northern borders",
  "hudud shamaliyah": "northern borders",
  jawf: "jawf",
  jouf: "jawf",
  aljouf: "jawf",
  najran: "najran",
  bahah: "bahah",
  baha: "bahah",
  albaha: "bahah",
  jazan: "jazan",
  jizan: "jazan",
  gizan: "jazan",
  qassim: "qassim",
  qasim: "qassim",
  casim: "qassim",
};

const KEY_SET = new Set<string>(REGION_KEYS);

/** Resolve a raw region string to a canonical key, or null if unrecognized. */
export function provinceKey(value: unknown): string | null {
  if (value == null) return null;
  const n = normalize(value);
  if (!n) return null;
  if (KEY_SET.has(n)) return n;
  if (ALIASES[n]) return ALIASES[n];
  // Last resort: prefix / contains match against canonical keys.
  for (const k of REGION_KEYS) {
    if (n === k || n.startsWith(k) || k.startsWith(n)) return k;
  }
  const noSpace = n.replace(/\s+/g, "");
  if (ALIASES[noSpace]) return ALIASES[noSpace];
  return null;
}

/**
 * Color resolution for the Apdex badge.
 *
 * The badge's accent (border + label/category text) and background are driven
 * by *conditions* on the category dimension: the first rule whose value matches
 * the current category (case/space-insensitive) wins. Each rule can specify its
 * own accent and background; anything left blank falls back to a built-in Apdex
 * default (by tier name) and then to the global default colors.
 */
import { normalizeTier } from "../lib/color";

/** A single category → colors condition rule (as entered in the editor panel). */
export interface ConditionRule {
  /** Category value to match, e.g. "Poor" (raw, as typed). */
  value: string;
  /** Border + label/category text color. */
  accent?: string;
  /** Badge background color. */
  background?: string;
}

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/** Coerce a config color value to a `#rrggbb` string, or null if empty/invalid. */
export function toColor(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const s = input.trim();
  if (!s) return null;
  const withHash = s.startsWith("#") ? s : `#${s}`;
  return HEX_RE.test(withHash) ? withHash : null;
}

/**
 * Built-in accent colors for the standard Apdex tiers. Used when a matching
 * rule (or a known tier value) has no explicit color pick, so the badge is
 * sensibly colored out of the box. Keyed by normalized category value.
 */
export const APDEX_ACCENTS: Record<string, string> = {
  excellent: "#34d399", // emerald
  good: "#84cc16", // lime
  fair: "#eab308", // amber
  poor: "#f97316", // orange
  unacceptable: "#ef4444", // red
};

/** Global fallbacks (match the screenshot: green accent on dark navy, white value). */
export const DEFAULTS = {
  accent: "#94a3b8",
  background: "#0f172a",
  value: "#ffffff",
} as const;

export interface ResolvedColors {
  accent: string;
  background: string;
  /** True when a user-defined condition rule matched the category. */
  matched: boolean;
}

/**
 * Resolve the badge colors for a category value against the ordered rules.
 *
 * @param category    The current category dimension value.
 * @param rules       Ordered condition rules from the editor panel.
 * @param fallbackAccent Global default accent (border/text) if no rule applies.
 * @param fallbackBg  Global default background if no rule applies.
 */
export function resolveColors(
  category: unknown,
  rules: ConditionRule[],
  fallbackAccent: string | null,
  fallbackBg: string | null,
): ResolvedColors {
  const baseAccent = fallbackAccent ?? DEFAULTS.accent;
  const baseBg = fallbackBg ?? DEFAULTS.background;
  const key = category == null ? "" : normalizeTier(category);

  if (key) {
    for (const rule of rules) {
      if (!rule.value || normalizeTier(rule.value) !== key) continue;
      return {
        accent: toColor(rule.accent) ?? APDEX_ACCENTS[key] ?? baseAccent,
        background: toColor(rule.background) ?? baseBg,
        matched: true,
      };
    }
    // No explicit rule, but a recognized Apdex tier name → use its accent.
    if (APDEX_ACCENTS[key]) {
      return { accent: APDEX_ACCENTS[key], background: baseBg, matched: false };
    }
  }
  return { accent: baseAccent, background: baseBg, matched: false };
}

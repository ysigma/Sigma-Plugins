/**
 * Named color swatches for the dot plot. The user picks one from the editor
 * panel ("Circle color (palette)"); a custom color picker can override it.
 * Self-contained — no shared imports — so this plugin can't affect the others.
 */

export const PALETTES: Record<string, string> = {
  Gold: "#D4AF37",
  Amber: "#e0a106",
  Blue: "#4e79a7",
  Teal: "#3a9b8f",
  Green: "#59a14f",
  Red: "#e15759",
  Orange: "#f28e2b",
  Purple: "#9c6bb0",
  Pink: "#e377c2",
  Slate: "#5a6b82",
};

export const PALETTE_NAMES = Object.keys(PALETTES);

/** Default swatch — the muted gold of the reference dashboard. */
export const DEFAULT_PALETTE = "Gold";
/** Default canvas — near-black, matching the reference. */
export const DEFAULT_BG = "#0B0B0B";

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/** Resolve the dot color: a valid custom override wins, else the named swatch. */
export function resolveDotColor(
  paletteName: string | undefined,
  customColor: string | undefined,
): string {
  if (customColor && HEX_RE.test(customColor)) return customColor;
  return PALETTES[paletteName ?? DEFAULT_PALETTE] ?? PALETTES[DEFAULT_PALETTE];
}

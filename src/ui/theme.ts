/** E-ink palette: pure black and white, one grey for rules. Sizes are dp. */
export const INK = '#000';
export const PAPER = '#fff';
export const RULE = '#777';

export const PANEL_WIDTH = 480;
/** Keeps the panel clear of the firmware's left toolbar. */
export const PANEL_LEFT = 70;
export const PANEL_MARGIN_Y = 40;

export const STRIP_HEIGHT = 64;
export const STRIP_MARGIN_X = 24;
export const STRIP_TOP = 16;

export const CELL_GAP = 8;

export const CHIP = {
  /** Same size as the strip: the two-row split spends the panel's extra width on a third group per row, not on bigger chips. */
  panel: { w: 32, h: 24 },
  strip: { w: 32, h: 24 },
} as const;
export type ChipSize = keyof typeof CHIP;

/**
 * Which chips dim and what a press sets. Pure, so the panel and the strip
 * share one rule set and Jest and the icon script can import it without React.
 */
import type { Style } from '../render/style';

type Group = keyof Style;

/** A group that means nothing for the style: tone without a fill, weight and ink without an outline. */
export function groupDisabled(group: Group, style: Style): boolean {
  if (group === 'tone') {
    return style.fill === 'none';
  }
  if (group === 'weight' || group === 'ink') {
    return style.line === 'none';
  }
  return false;
}

/** Line none needs a fill to be drawn as: never on an open shape, never with fill none. */
export function valueDisabled(group: Group, value: string, style: Style, open: boolean): boolean {
  return group === 'line' && value === 'none' && (open || style.fill === 'none');
}

/** The style after pressing `value`; fill none while line is none brings the outline back, so something is drawn. */
export function choose(style: Style, group: Group, value: string): Style {
  const next = { ...style, [group]: value } as Style;
  return group === 'fill' && value === 'none' && next.line === 'none' ? { ...next, line: 'solid' } : next;
}

/** The style a picked shape is drawn with: an open shape cannot go without its line. */
export function forShape(style: Style, closed: boolean): Style {
  return !closed && style.line === 'none' ? { ...style, line: 'solid' } : style;
}

import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { STYLE_VALUES, type Style } from '../render/style';
import type { GlyphKey } from './icons';
import { Chip, chipWidth } from './StyleBar';
import { choose, groupDisabled, valueDisabled } from './styleRules';
import { INK, PAPER } from './theme';

type Group = keyof Style;

type Props = {
  style: Style;
  onStyle(s: Style): void;
  /** The shape has no fill (arrows): line none is not offered. */
  open: boolean;
  openGroup: Group | null;
  onOpenGroup(g: Group | null): void;
  /** The strip's outer right and bottom edges in this row's coordinates, once laid out. */
  edges?: { right: number; bottom: number };
};

/** The panel's rows read left to right, top to bottom: the line group's chips, then the fill group's. Display only; the wire order is STYLE_KEYS. */
const ORDER: Group[] = ['weight', 'line', 'ink', 'fill', 'tone', 'look'];

const VALUE_GAP = 3;
const VALUE_PAD = 4;
/** Clearance between the strip's border and the value row: under it, and from its right edge. */
const HANG = 4;
const RIGHT_MARGIN = 8;

/** Known up front rather than measured, so the row appears once in its final place: a second layout pass is a second e-ink refresh. */
const valueRowWidth = (n: number) => n * chipWidth('strip') + (n - 1) * VALUE_GAP + 2 * VALUE_PAD + 2;

export default function StyleSummary({ style, onStyle, open, openGroup, onOpenGroup, edges }: Props) {
  // Chip left edges in this row, from onLayout; the value row is a sibling, so they need no offset.
  const [x, setX] = useState<Partial<Record<Group, number>>>({});

  // Clamped, not right-aligned: the row stays under its chip unless it would pass the strip's right edge.
  const place = (g: Group) => {
    const at = x[g] ?? 0;
    if (!edges) {
      return { left: at };
    }
    return { left: Math.max(0, Math.min(at, edges.right - RIGHT_MARGIN - valueRowWidth(STYLE_VALUES[g].length))), top: edges.bottom + HANG, marginTop: 0 };
  };

  return (
    <View style={styles.row}>
      {ORDER.map(g => {
        const disabled = groupDisabled(g, style);
        return (
          <View
            key={g}
            testID={`summary-${g}`}
            onLayout={e => {
              // Read now, not in the updater: the host's React pools synthetic events, so `nativeEvent` is null once the handler returns (GH-56).
              const left = e.nativeEvent.layout.x;
              setX(v => ({ ...v, [g]: left }));
            }}>
            {/* Never `on`: a framed summary chip would read as a chosen value. */}
            <Chip
              glyph={`${g}-${style[g]}` as GlyphKey}
              on={false}
              disabled={disabled}
              size="strip"
              testID={`chip-${g}`}
              accessibilityLabel={`${g} ${style[g]}, change`}
              onPress={() => onOpenGroup(openGroup === g ? null : g)}
            />
            <View pointerEvents="none" style={[styles.mark, disabled && styles.off]} />
          </View>
        );
      })}
      {openGroup && (
        <View testID="value-row" style={[styles.values, place(openGroup)]}>
          {STYLE_VALUES[openGroup].map(v => {
            const on = style[openGroup] === v;
            return (
              <Chip
                key={v}
                glyph={`${openGroup}-${v}` as GlyphKey}
                on={on}
                disabled={valueDisabled(openGroup, v, style, open)}
                size="strip"
                testID={`chip-${openGroup}-${v}`}
                accessibilityLabel={`${openGroup} ${v}`}
                onPress={() => {
                  if (!on) {
                    onStyle(choose(style, openGroup, v));
                  }
                  onOpenGroup(null);
                }}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Android clips absolute children outside the parent unless every ancestor up to the strip is visible.
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, overflow: 'visible' },
  off: { opacity: 0.3 },
  // A 4 dp ink triangle in the chip's bottom-right corner, inside the frame: this chip opens.
  mark: { position: 'absolute', right: 2, bottom: 2, width: 0, height: 0, borderLeftWidth: 4, borderBottomWidth: 4, borderLeftColor: 'transparent', borderBottomColor: INK },
  // Paper with an ink hairline: a grey fill would ghost under partial refresh. The top is a fallback until the strip's edges are measured.
  values: {
    position: 'absolute',
    top: '100%',
    marginTop: 10,
    flexDirection: 'row',
    gap: VALUE_GAP,
    padding: VALUE_PAD,
    backgroundColor: PAPER,
    borderWidth: 1,
    borderColor: INK,
    borderRadius: 4,
  },
});

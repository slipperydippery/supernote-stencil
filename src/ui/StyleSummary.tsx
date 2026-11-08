import React from 'react';
import { StyleSheet, View } from 'react-native';
import { STYLE_VALUES, type Style } from '../render/style';
import type { GlyphKey } from './icons';
import { Chip, chipWidth } from './StyleBar';
import { choose, groupDisabled, valueDisabled } from './styleRules';
import { CHIP, INK, PAPER } from './theme';

type Group = keyof Style;

type Props = {
  style: Style;
  onStyle(s: Style): void;
  /** The shape has no fill (arrows): line none is not offered. */
  open: boolean;
  openGroup: Group | null;
  onOpenGroup(g: Group | null): void;
};

/** The panel's rows read left to right, top to bottom: the line group's chips, then the fill group's. Display only; the wire order is STYLE_KEYS. */
const ORDER: Group[] = ['weight', 'line', 'ink', 'fill', 'tone', 'look'];

const CHIP_GAP = 10;
/** A row of strip chips: the glyph plus 2 dp padding and 1 dp border a side. */
export const ROW_HEIGHT = CHIP.strip.h + 6;

/** Where a summary chip starts in its row. From the constants, not a measurement: the value row appears once, in its place (a second layout pass is a second e-ink refresh). */
const chipLeft = (g: Group) => ORDER.indexOf(g) * (chipWidth('strip') + CHIP_GAP);

/**
 * Six chips, one per style group, each the glyph of the group's current value.
 * An open group's values sit in a second row under the chips, inside the
 * strip: a row hanging outside it opened and closed unreliably on the device (GH-58).
 */
export default function StyleSummary({ style, onStyle, open, openGroup, onOpenGroup }: Props) {
  return (
    <View style={styles.column}>
      <View style={styles.row}>
        {ORDER.map(g => {
          const disabled = groupDisabled(g, style);
          return (
            <View key={g} testID={`summary-${g}`}>
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
      </View>
      {openGroup && (
        <View style={styles.valueLine}>
          {/* Grows to put the row under its chip and gives way when the row would pass the right edge: a clamp without a measurement. */}
          <View style={{ flex: 1, maxWidth: chipLeft(openGroup) }} />
          <View testID="value-row" style={styles.values}>
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
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  column: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: CHIP_GAP },
  valueLine: { flexDirection: 'row' },
  off: { opacity: 0.3 },
  // A 4 dp ink triangle in the chip's bottom-right corner, inside the frame: this chip opens.
  mark: { position: 'absolute', right: 2, bottom: 2, width: 0, height: 0, borderLeftWidth: 4, borderBottomWidth: 4, borderLeftColor: 'transparent', borderBottomColor: INK },
  // Paper with an ink hairline: a grey fill would ghost under partial refresh.
  values: { flexDirection: 'row', gap: 3, padding: 4, backgroundColor: PAPER, borderWidth: 1, borderColor: INK, borderRadius: 4 },
});

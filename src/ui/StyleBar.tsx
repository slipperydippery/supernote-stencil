import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { STYLE_VALUES as GROUPS, type Style } from '../render/style';
import { GLYPHS, type GlyphKey } from './icons';
import { choose, groupDisabled, valueDisabled } from './styleRules';
import { CHIP, INK, PAPER, RULE, type ChipSize } from './theme';

/** `open`: the shape being styled has no fill, so line none is not offered. */
type Props = { style: Style; onStyle(s: Style): void; size: ChipSize; open: boolean };

type Group = keyof Style;
const ALL_GROUPS = Object.keys(GROUPS) as Group[];
/** At panel width the chips need two rows: look joins weight and line while fill keeps tone, the group it governs. Ink is not in the panel yet (GH-51). */
const PANEL_ROWS: Group[][] = [['weight', 'line', 'look'], ['fill', 'tone']];

export default function StyleBar({ style, onStyle, size, open }: Props) {
  const chip = CHIP[size];

  const renderGroup = (group: Group) => {
    const groupOff = groupDisabled(group, style);
    return (
      <View key={group} testID={`group-${group}`} style={[styles.group, groupOff && styles.off]}>
        {GROUPS[group].map(value => {
          const on = style[group] === value;
          const valueOff = valueDisabled(group, value, style, open);
          const disabled = groupOff || valueOff;
          const key = `${group}-${value}` as GlyphKey;
          return (
            <Pressable
              key={key}
              testID={`chip-${key}`}
              accessibilityRole="button"
              accessibilityLabel={`${group} ${value}`}
              accessibilityState={{ selected: on, ...(disabled ? { disabled } : {}) }}
              disabled={disabled}
              onPress={() => !on && onStyle(choose(style, group, value))}
              style={[styles.chip, on && styles.chipOn, valueOff && styles.off]}>
              <Image source={GLYPHS[key]} style={{ width: chip.w, height: chip.h }} resizeMode="contain" />
            </Pressable>
          );
        })}
      </View>
    );
  };

  if (size === 'panel') {
    return (
      <View style={styles.rows}>
        {PANEL_ROWS.map((row, i) => (
          <View key={i} testID={`stylebar-row-${i}`} style={styles.panelBar}>
            {row.map(renderGroup)}
          </View>
        ))}
      </View>
    );
  }
  return (
    <View testID="stylebar-row-0" style={styles.bar}>
      {ALL_GROUPS.map(renderGroup)}
    </View>
  );
}

const styles = StyleSheet.create({
  rows: { gap: 6 },
  bar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 10, rowGap: 6 },
  // One row per PANEL_ROWS entry, centered as one cluster with a wider gap.
  panelBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', columnGap: 24 },
  group: { flexDirection: 'row', gap: 3 },
  off: { opacity: 0.3 },
  chip: { padding: 2, borderWidth: 1, borderColor: RULE, borderRadius: 3, backgroundColor: PAPER },
  chipOn: { borderWidth: 2, borderColor: INK, padding: 1 },
});

import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { STYLE_VALUES as GROUPS, type Style } from '../render/style';
import { GLYPHS, type GlyphKey } from './icons';
import { CHIP, INK, PAPER, RULE, type ChipSize } from './theme';

type Props = { style: Style; onStyle(s: Style): void; size: ChipSize };

type Group = keyof Style;
const ALL_GROUPS = Object.keys(GROUPS) as Group[];
/** At panel width, all four groups on one flex-wrap row leave a lopsided 10+2 split (weight+line+fill fit, look wraps alone). Two explicit, evenly balanced rows instead. */
const PANEL_ROWS: Group[][] = [ALL_GROUPS.slice(0, 2), ALL_GROUPS.slice(2)];

export default function StyleBar({ style, onStyle, size }: Props) {
  const chip = CHIP[size];

  const renderGroup = (group: Group) => (
    <View key={group} style={styles.group}>
      {GROUPS[group].map(value => {
        const on = style[group] === value;
        const key = `${group}-${value}` as GlyphKey;
        return (
          <Pressable
            key={key}
            testID={`chip-${key}`}
            accessibilityRole="button"
            accessibilityLabel={`${group} ${value}`}
            accessibilityState={{ selected: on }}
            onPress={() => !on && onStyle({ ...style, [group]: value })}
            style={[styles.chip, on && styles.chipOn]}>
            <Image source={GLYPHS[key]} style={{ width: chip.w, height: chip.h }} resizeMode="contain" />
          </Pressable>
        );
      })}
    </View>
  );

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
  // Two groups only, so no wrap needed; centered as one cluster with a wider gap, instead of hugging the left edge.
  panelBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', columnGap: 24 },
  group: { flexDirection: 'row', gap: 3 },
  chip: { padding: 2, borderWidth: 1, borderColor: RULE, borderRadius: 3, backgroundColor: PAPER },
  chipOn: { borderWidth: 2, borderColor: INK, padding: 1 },
});

import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { STYLE_VALUES as GROUPS, type Style } from '../render/style';
import { GLYPHS, type GlyphKey } from './icons';
import { CHIP, INK, PAPER, RULE, type ChipSize } from './theme';

type Props = { style: Style; onStyle(s: Style): void; size: ChipSize };

export default function StyleBar({ style, onStyle, size }: Props) {
  const chip = CHIP[size];
  return (
    <View style={styles.bar}>
      {(Object.keys(GROUPS) as (keyof Style)[]).map(group => (
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
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 10, rowGap: 6 },
  group: { flexDirection: 'row', gap: 3 },
  chip: { padding: 2, borderWidth: 1, borderColor: RULE, borderRadius: 3, backgroundColor: PAPER },
  chipOn: { borderWidth: 2, borderColor: INK, padding: 1 },
});

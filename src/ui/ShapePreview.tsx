import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { Pt } from '../shapes';
import { INK } from './theme';

const LINE = 2;

/** Polylines (dp) drawn as rotated hairline views: the plugin has no SVG at runtime. */
export default function ShapePreview({ outlines }: { outlines: Pt[][] }) {
  const segments: { a: Pt; b: Pt }[] = [];
  for (const pl of outlines) {
    for (let i = 1; i < pl.length; i++) {
      segments.push({ a: pl[i - 1], b: pl[i] });
    }
  }
  return (
    <View testID="rubber-band" pointerEvents="none" style={StyleSheet.absoluteFill}>
      {segments.map(({ a, b }, i) => {
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        return (
          <View
            key={i}
            style={[
              styles.segment,
              {
                left: (a.x + b.x) / 2 - len / 2,
                top: (a.y + b.y) / 2 - LINE / 2,
                width: len + LINE,
                transform: [{ rotate: `${Math.atan2(b.y - a.y, b.x - a.x)}rad` }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  segment: { position: 'absolute', height: LINE, backgroundColor: INK },
});

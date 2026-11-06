import React, { useRef, useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent } from 'react-native';
import type { Box } from '../shapes';
import { toPagePx } from './placement';
import { INK } from './theme';

/** Pen travel (dp) below which a touch is a tap. */
export const DRAG_THRESHOLD_DP = 8;

export type PlaceKind = 'tap' | 'drag';

type Props = {
  enabled: boolean;
  /** dp → page px, PixelRatio.get(). */
  scale: number;
  /** Page px. A tap is a zero box at pen-down; a drag runs from pen-down (left, top) to pen-up (right, bottom), not normalised. */
  onPlace(box: Box, kind: PlaceKind): void;
};

type Dp = { x: number; y: number };

const at = (e: GestureResponderEvent): Dp => ({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY });
const far = (a: Dp, b: Dp) => Math.hypot(b.x - a.x, b.y - a.y) >= DRAG_THRESHOLD_DP;

export default function PlacementLayer({ enabled, scale, onPlace }: Props) {
  const down = useRef<Dp | null>(null);
  const [band, setBand] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  const release = (e: GestureResponderEvent) => {
    const d = down.current;
    down.current = null;
    setBand(null);
    if (!d) {
      return;
    }
    const up = at(e);
    const a = toPagePx(d, scale);
    if (!far(d, up)) {
      onPlace({ left: a.x, top: a.y, right: a.x, bottom: a.y }, 'tap');
      return;
    }
    const b = toPagePx(up, scale);
    onPlace({ left: a.x, top: a.y, right: b.x, bottom: b.y }, 'drag');
  };

  return (
    <View
      testID="placement-layer"
      style={StyleSheet.absoluteFill}
      pointerEvents={enabled ? 'auto' : 'none'}
      onStartShouldSetResponder={() => enabled}
      onResponderGrant={e => {
        down.current = at(e);
        setBand(null);
      }}
      onResponderMove={e => {
        const d = down.current;
        const p = at(e);
        if (d && far(d, p)) {
          setBand({ left: Math.min(d.x, p.x), top: Math.min(d.y, p.y), width: Math.abs(p.x - d.x), height: Math.abs(p.y - d.y) });
        }
      }}
      onResponderRelease={release}
      onResponderTerminate={() => {
        down.current = null;
        setBand(null);
      }}>
      {/* Solid: a dashed border vanishes under e-ink partial refresh. */}
      {band && <View testID="rubber-band" pointerEvents="none" style={[styles.band, band]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  band: { position: 'absolute', borderWidth: 2, borderColor: INK, borderStyle: 'solid' },
});

import React, { useRef, useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent } from 'react-native';
import type { Box, Pt, ShapeDef } from '../shapes';
import { fitBox, toPagePx } from './placement';
import ShapePreview from './ShapePreview';

/** Pen travel (dp) below which a touch is a tap. */
export const DRAG_THRESHOLD_DP = 8;

export type PlaceKind = 'tap' | 'drag';

type Props = {
  enabled: boolean;
  /** Armed shape; a drag previews its outline in the box it will be rendered into. */
  shape: ShapeDef | null;
  /** dp → page px, PixelRatio.get(). */
  scale: number;
  /** Page px. A tap is a zero box at pen-down; a drag runs from pen-down (left, top) to pen-up (right, bottom), not normalised. */
  onPlace(box: Box, kind: PlaceKind): void;
  /** Set while the strip has a value row open: the layer still takes the touch, so nothing lands under the menu, but only reports it. */
  onDismiss?(): void;
};

type Dp = { x: number; y: number };

const at = (e: GestureResponderEvent): Dp => ({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY });
const far = (a: Dp, b: Dp) => Math.hypot(b.x - a.x, b.y - a.y) >= DRAG_THRESHOLD_DP;

export default function PlacementLayer({ enabled, shape, scale, onPlace, onDismiss }: Props) {
  const down = useRef<Dp | null>(null);
  const [band, setBand] = useState<Pt[][] | null>(null);

  const preview = (d: Dp, p: Dp): Pt[][] | null => {
    if (!shape) {
      return null;
    }
    const a = toPagePx(d, scale);
    const b = toPagePx(p, scale);
    const toDp = (q: Pt) => ({ x: q.x / scale, y: q.y / scale });
    return shape.outline(fitBox(shape, { left: a.x, top: a.y, right: b.x, bottom: b.y })).map(pl => pl.map(toDp));
  };

  const release = (e: GestureResponderEvent) => {
    const d = down.current;
    down.current = null;
    setBand(null);
    if (!d) {
      return;
    }
    if (onDismiss) {
      onDismiss();
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
        if (d && !onDismiss) {
          setBand(far(d, p) ? preview(d, p) : null);
        }
      }}
      onResponderRelease={release}
      onResponderTerminate={() => {
        down.current = null;
        setBand(null);
      }}>
      {/* Solid lines: dashes vanish under e-ink partial refresh. */}
      {band && <ShapePreview outlines={band} />}
    </View>
  );
}

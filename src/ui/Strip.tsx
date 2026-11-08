import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type LayoutRectangle } from 'react-native';
import type { Style } from '../render/style';
import type { ShapeDef } from '../shapes';
import { BIN, ICONS, PIN } from './icons';
import StyleSummary from './StyleSummary';
import { INK, PAPER, RULE, STRIP_HEIGHT, STRIP_MARGIN_X, STRIP_TOP } from './theme';

export type StripProps = {
  shape: ShapeDef;
  style: Style;
  onStyle(s: Style): void;
  onExpand(): void;
  onClose(): void;
  action?: { label: string; onPress(): void };
  /** RedrawFlow's delete: removes the lassoed Stencil shape and nothing else. */
  onRemove?(): void;
  /** Only PlaceFlow passes this: whether opening Stencil from the sidebar should arm the strip again. RedrawFlow's reuse of Strip has no opinion on it. */
  armOnOpen?: { value: boolean; onToggle(): void };
  /** The group whose values hang under the strip; owned by the flow, because PlaceFlow's placement layer has to know. */
  openGroup: keyof Style | null;
  onOpenGroup(group: keyof Style | null): void;
};

export default function Strip({ shape, style, onStyle, onExpand, onClose, action, onRemove, armOnOpen, openGroup, onOpenGroup }: StripProps) {
  const [strip, setStrip] = useState<LayoutRectangle | null>(null);
  const [bar, setBar] = useState<LayoutRectangle | null>(null);
  // The summary row sits at the bar's origin, so the bar's offset in the strip converts strip edges to row coordinates.
  const edges = strip && bar ? { right: strip.width - bar.x, bottom: strip.height - bar.y } : undefined;
  return (
    <View style={styles.strip} onLayout={e => setStrip(e.nativeEvent.layout)}>
      {/* The shape and its pin are one tile, so "pinned" reads as a property of the shape. A fixed width keeps the chips still when the pinned frame thickens. */}
      <View testID="strip-tile" style={[styles.tile, armOnOpen ? styles.tileWithTab : styles.tileAlone, armOnOpen?.value && styles.tilePinned]}>
        <Pressable testID="strip-preview" accessibilityRole="button" accessibilityLabel={`${shape.label}, choose another shape`} onPress={onExpand} style={styles.preview}>
          <Image testID={`strip-icon-${shape.id}`} source={ICONS[shape.id]} style={styles.previewIcon} resizeMode="contain" />
        </Pressable>
        {armOnOpen && (
          <Pressable
            testID="strip-arm-on-open"
            accessibilityRole="checkbox"
            accessibilityLabel="Keep this shape ready next time"
            accessibilityState={{ checked: armOnOpen.value }}
            onPress={armOnOpen.onToggle}
            style={[styles.tab, armOnOpen.value && styles.tabOn]}>
            <Image source={armOnOpen.value ? PIN.on : PIN.off} style={[styles.markIcon, !armOnOpen.value && styles.tabIconOff]} resizeMode="contain" />
          </Pressable>
        )}
      </View>
      <View style={styles.bar} onLayout={e => setBar(e.nativeEvent.layout)}>
        <StyleSummary style={style} onStyle={onStyle} open={!shape.closed} openGroup={openGroup} onOpenGroup={onOpenGroup} edges={edges} />
      </View>
      {onRemove && (
        <Pressable testID="strip-remove" accessibilityRole="button" accessibilityLabel="Delete this shape" onPress={onRemove} style={styles.mark}>
          <Image source={BIN} style={styles.markIcon} resizeMode="contain" />
        </Pressable>
      )}
      {action && (
        <Pressable testID="strip-action" accessibilityRole="button" accessibilityLabel={action.label} onPress={action.onPress} style={[styles.mark, styles.markOn]}>
          <Text style={[styles.markText, styles.markTextOn]}>{action.label}</Text>
        </Pressable>
      )}
      <Pressable testID="strip-close" accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.mark}>
        <Text style={styles.markText}>×</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    position: 'absolute',
    top: STRIP_TOP,
    left: STRIP_MARGIN_X,
    right: STRIP_MARGIN_X,
    // The value row hangs outside the strip: an open row does not grow it.
    minHeight: STRIP_HEIGHT,
    overflow: 'visible',
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    backgroundColor: PAPER,
    borderWidth: 1,
    borderColor: INK,
    borderRadius: 6,
  },
  tile: { height: 50, flexDirection: 'row', borderWidth: 1, borderColor: RULE, borderRadius: 4, overflow: 'hidden' },
  tileAlone: { width: 64 },
  // 64 preview + 1 divider + 34 tab + 2 border.
  tileWithTab: { width: 101 },
  // Same frame as a chosen chip: 2 px of ink. The border grows inward, so the strip beside it does not move.
  tilePinned: { borderWidth: 2, borderColor: INK },
  preview: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  previewIcon: { width: 44, height: 44 },
  tab: { width: 34, borderLeftWidth: 1, borderLeftColor: RULE, alignItems: 'center', justifyContent: 'center', backgroundColor: PAPER },
  tabOn: { backgroundColor: INK, borderLeftColor: INK },
  tabIconOff: { opacity: 0.55 },
  bar: { flex: 1, overflow: 'visible' },
  mark: { minWidth: 40, height: 40, paddingHorizontal: 6, borderWidth: 1, borderColor: INK, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  markOn: { backgroundColor: INK },
  markIcon: { width: 24, height: 24 },
  markText: { fontSize: 22, color: INK },
  markTextOn: { color: PAPER },
});

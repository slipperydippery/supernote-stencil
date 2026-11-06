import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Style } from '../render/style';
import { FAMILIES, shapesIn, type Family, type ShapeDef, type ShapeId } from '../shapes';
import { ICONS } from './icons';
import StyleBar from './StyleBar';
import { CELL_GAP, INK, PANEL_LEFT, PANEL_MARGIN_Y, PANEL_WIDTH, PAPER, RULE } from './theme';

const TAB_LABEL: Record<Family, string> = { basic: 'Basic', flow: 'Flow', arrow: 'Arrows' };

export type PanelProps = {
  tab: Family;
  onTab(f: Family): void;
  style: Style;
  onStyle(s: Style): void;
  selected: ShapeId | null;
  onPick(def: ShapeDef): void;
  onClose(): void;
  title?: string;
};

export default function Panel({ tab, onTab, style, onStyle, selected, onPick, onClose, title }: PanelProps) {
  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>{title ?? 'Stencil'}</Text>
        <Pressable testID="panel-close" accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.close}>
          <Text style={styles.closeText}>×</Text>
        </Pressable>
      </View>
      <View style={styles.tabs}>
        {FAMILIES.map(f => (
          <Pressable
            key={f}
            testID={`tab-${f}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: f === tab }}
            onPress={() => f !== tab && onTab(f)}
            style={[styles.tab, f === tab && styles.tabOn]}>
            <Text style={[styles.tabText, f === tab && styles.tabTextOn]}>{TAB_LABEL[f]}</Text>
          </Pressable>
        ))}
      </View>
      <StyleBar style={style} onStyle={onStyle} size="panel" />
      <View style={styles.grid}>
        {shapesIn(tab).map(def => (
          <Pressable
            key={def.id}
            testID={`cell-${def.id}`}
            accessibilityRole="button"
            accessibilityLabel={def.label}
            accessibilityState={{ selected: def.id === selected }}
            onPress={() => onPick(def)}
            style={[styles.cell, def.id === selected && styles.cellOn]}>
            <Image source={ICONS[def.id]} style={styles.cellIcon} resizeMode="contain" />
            <Text style={styles.cellText}>{def.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: PANEL_LEFT,
    top: PANEL_MARGIN_Y,
    width: PANEL_WIDTH,
    backgroundColor: PAPER,
    borderWidth: 1,
    borderColor: INK,
    borderRadius: 8,
    padding: 14,
    gap: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 22, fontWeight: '600', color: INK },
  close: { width: 36, height: 36, borderWidth: 1, borderColor: INK, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 22, color: INK },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderColor: INK },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderBottomWidth: 3, borderColor: 'transparent' },
  tabOn: { borderColor: INK },
  tabText: { fontSize: 16, color: RULE },
  tabTextOn: { color: INK, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: CELL_GAP },
  cell: {
    width: (PANEL_WIDTH - 2 * 14 - 2 - CELL_GAP) / 2,
    alignItems: 'center',
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: RULE,
    borderRadius: 6,
    gap: 4,
  },
  cellOn: { borderWidth: 3, borderColor: INK, paddingVertical: 6 },
  cellIcon: { width: 72, height: 72 },
  cellText: { fontSize: 14, color: INK },
});

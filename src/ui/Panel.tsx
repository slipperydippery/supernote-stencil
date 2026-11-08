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
  families?: Family[];
  /** Shows a settings button in the header when given. */
  onSettings?(): void;
  /** Shows an undo button in the header when given: PlaceFlow passes it while the last placed shape can be taken back. */
  onUndo?(): void;
};

export default function Panel({ tab, onTab, style, onStyle, selected, onPick, onClose, title, families, onSettings, onUndo }: PanelProps) {
  const visibleFamilies = families ?? FAMILIES;
  // A caller-supplied tab outside its own families list (a stale remembered tab
  // restricted by a narrower `families`) would otherwise render a grid for a
  // family with no visible tab button; fall back to the first visible one.
  const activeTab = visibleFamilies.includes(tab) ? tab : visibleFamilies[0];
  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>{title ?? 'Stencil'}</Text>
        <View style={styles.headerButtons}>
          {onUndo && (
            <Pressable testID="panel-undo" accessibilityRole="button" accessibilityLabel="Undo last placement" onPress={onUndo} style={styles.textButton}>
              <Text style={styles.textButtonText}>Undo last</Text>
            </Pressable>
          )}
          {onSettings && (
            <Pressable testID="panel-settings" accessibilityRole="button" accessibilityLabel="Settings" onPress={onSettings} style={styles.textButton}>
              <Text style={styles.textButtonText}>Settings</Text>
            </Pressable>
          )}
          <Pressable testID="panel-close" accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.close}>
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.tabs}>
        {visibleFamilies.map(f => (
          <Pressable
            key={f}
            testID={`tab-${f}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: f === activeTab }}
            onPress={() => f !== activeTab && onTab(f)}
            style={[styles.tab, f === activeTab && styles.tabOn]}>
            <Text style={[styles.tabText, f === activeTab && styles.tabTextOn]}>{TAB_LABEL[f]}</Text>
          </Pressable>
        ))}
      </View>
      <StyleBar style={style} onStyle={onStyle} open={activeTab === 'arrow'} />
      <View style={styles.grid}>
        {shapesIn(activeTab).map(def => (
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
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  textButton: { height: 36, paddingHorizontal: 12, borderWidth: 1, borderColor: INK, borderRadius: 4, justifyContent: 'center' },
  textButtonText: { fontSize: 16, color: INK },
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

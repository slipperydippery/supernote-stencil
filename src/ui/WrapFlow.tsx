import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { closeView, currentPage, DEFAULT_SETTINGS, insertPlan, loadSettings, saveSettings, selectRect, type PageCtx, type Settings } from '../device';
import { renderShape } from '../render/plan';
import { gapField, type Recipe } from '../render/recipe';
import type { Style } from '../render/style';
import type { Box, Family, ShapeDef } from '../shapes';
import Message from './Message';
import Panel from './Panel';
import { union, wrapBox } from './wrap';

type Mode = 'loading' | 'panel' | 'busy' | 'error';

/** Arrows are directional and need a drag to set length; wrap has no drag, so they are not offered. */
const WRAP_FAMILIES: Family[] = ['basic', 'flow'];

export default function WrapFlow({ selection }: { selection: Box }) {
  const [ctx, setCtx] = useState<PageCtx | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [mode, setMode] = useState<Mode>('loading');
  const [error, setError] = useState('');
  const latest = useRef(settings);
  // Saves run one at a time and must finish before the insert that follows them.
  const saving = useRef<Promise<void>>(Promise.resolve());
  const busy = useRef(false);

  const fail = (e: any) => {
    setError(String(e?.message ?? e));
    setMode('error');
  };

  useEffect(() => {
    (async () => {
      const [c, s] = await Promise.all([currentPage(), loadSettings()]);
      setCtx(c);
      latest.current = s;
      setSettings(s);
      setMode('panel');
    })().catch(fail);
  }, []);

  const persist = (s: Settings) => {
    latest.current = s;
    setSettings(s);
    saving.current = saving.current.then(() => saveSettings(s)).catch(() => {});
  };

  const setStyle = (style: Style) => persist({ ...latest.current, style });
  const setTab = (tab: Family) => persist({ ...latest.current, tab });

  const pick = async (def: ShapeDef) => {
    if (!ctx || busy.current) {
      return;
    }
    busy.current = true;
    setMode('busy');
    try {
      const { style, gaps, wrapPadding } = latest.current;
      const gap = gaps[style.tone];
      const box = wrapBox(def, selection, wrapPadding * ctx.unit);
      const seed = Math.floor(Math.random() * 1_000_000);
      const recipe: Recipe = { v: 1, shape: def.id, style, seed, ...gapField(style, gap) };
      await saving.current;
      // The hand look's bow and overshoot can push a stroke's actual extent past
      // the nominal box; insertPlan's returned bounds reflect that, box does not.
      const bounds = await insertPlan(ctx, renderShape(def, box, style, seed, gap), recipe);
      // Closes the view and lassoes shape and content together; JS stops once the view is closed.
      await selectRect(union(bounds, selection));
      persist({ ...latest.current, lastShape: def.id });
    } catch (e) {
      busy.current = false;
      fail(e);
    }
  };

  const close = () => {
    saving.current.then(closeView, closeView).catch(fail);
  };

  const tab = WRAP_FAMILIES.includes(settings.tab) ? settings.tab : WRAP_FAMILIES[0];

  return (
    <View style={styles.root}>
      {mode === 'panel' && (
        <Panel
          title="Wrap selection"
          families={WRAP_FAMILIES}
          tab={tab}
          onTab={setTab}
          style={settings.style}
          onStyle={setStyle}
          selected={null}
          onPick={pick}
          onClose={close}
        />
      )}
      {mode === 'error' && <Message text={`Stencil: ${error}`} onClose={close} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
});

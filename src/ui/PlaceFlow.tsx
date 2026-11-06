import React, { useEffect, useRef, useState } from 'react';
import { PixelRatio, StyleSheet, View } from 'react-native';
import { closeView, currentPage, DEFAULT_SETTINGS, insertPlan, loadSettings, saveSettings, selectRect, type PageCtx, type Settings } from '../device';
import { renderShape } from '../render/plan';
import type { Recipe } from '../render/recipe';
import type { Style } from '../render/style';
import { SHAPES, type Box, type Family, type ShapeDef } from '../shapes';
import Message from './Message';
import Panel from './Panel';
import { defaultBoxAt, fitBox, flipFor } from './placement';
import PlacementLayer, { type PlaceKind } from './PlacementLayer';
import Strip from './Strip';

type Mode = 'loading' | 'panel' | 'strip' | 'busy' | 'error';

export default function PlaceFlow() {
  const [ctx, setCtx] = useState<PageCtx | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [shape, setShape] = useState<ShapeDef | null>(null);
  const [mode, setMode] = useState<Mode>('loading');
  const [error, setError] = useState('');
  const latest = useRef(settings);
  // Saves run one at a time (each rewrites the settings dirs) and must finish before the view closes.
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
      const remembered = s.lastShape ? SHAPES[s.lastShape] : null;
      setShape(remembered);
      setMode(remembered && s.armOnOpen ? 'strip' : 'panel');
    })().catch(fail);
  }, []);

  const persist = (s: Settings) => {
    latest.current = s;
    setSettings(s);
    // saveSettings swallows its errors; the catch keeps one rejection from wedging every later save.
    saving.current = saving.current.then(() => saveSettings(s)).catch(() => {});
  };

  const pick = (def: ShapeDef) => {
    setShape(def);
    setMode('strip');
    persist({ ...latest.current, lastShape: def.id });
  };
  const setStyle = (style: Style) => persist({ ...latest.current, style });
  const setTab = (tab: Family) => persist({ ...latest.current, tab });
  const toggleArmOnOpen = () => persist({ ...latest.current, armOnOpen: !latest.current.armOnOpen });

  const place = async (box: Box, kind: PlaceKind) => {
    if (!ctx || !shape || busy.current) {
      return;
    }
    busy.current = true;
    setMode('busy');
    try {
      const style = latest.current.style;
      const target = kind === 'tap' ? defaultBoxAt(shape, box, ctx) : fitBox(shape, box);
      const seed = Math.floor(Math.random() * 1_000_000);
      const flip = kind === 'drag' ? flipFor(shape, box) : undefined;
      const recipe: Recipe = { v: 1, shape: shape.id, style, seed, ...(flip ? { flip } : {}) };
      const plan = renderShape(shape, target, style, seed);
      await saving.current;
      const bounds = await insertPlan(ctx, plan, recipe);
      // Closes the view and lassoes; JS stops once the view is closed, so nothing follows this.
      await selectRect(bounds, plan.strokes.length + plan.geometries.length);
    } catch (e) {
      busy.current = false;
      fail(e);
    }
  };

  const close = () => {
    saving.current.then(closeView, closeView).catch(fail);
  };

  return (
    <View style={styles.root}>
      <PlacementLayer enabled={mode === 'strip'} shape={shape} scale={PixelRatio.get()} onPlace={place} />
      {mode === 'panel' && (
        <Panel
          tab={settings.tab}
          onTab={setTab}
          style={settings.style}
          onStyle={setStyle}
          selected={shape?.id ?? null}
          onPick={pick}
          onClose={close}
        />
      )}
      {mode === 'strip' && shape && (
        <Strip
          shape={shape}
          style={settings.style}
          onStyle={setStyle}
          onExpand={() => setMode('panel')}
          onClose={close}
          armOnOpen={{ value: settings.armOnOpen, onToggle: toggleArmOnOpen }}
        />
      )}
      {mode === 'error' && <Message text={`Stencil: ${error}`} onClose={close} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
});

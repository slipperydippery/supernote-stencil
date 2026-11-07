import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { closeView, currentPage, DEFAULT_SETTINGS, loadSettings, replaceLasso, selectRect, type PageCtx } from '../device';
import { renderShape } from '../render/plan';
import { gapField, redrawGap, type Recipe } from '../render/recipe';
import { hatchGap, TONES, WEIGHT_WIDTH, type Style, type Tone } from '../render/style';
import { SHAPES, type Box } from '../shapes';
import Message from './Message';
import { applyFlip, redrawBox } from './redraw';
import Strip from './Strip';

type Mode = 'loading' | 'strip' | 'busy' | 'error';

type Selection = { rect: Box; liveRect: Box; recipe: Recipe; count: number; recipes: number };

const noop = () => {};

export default function RedrawFlow({ selection }: { selection: Selection }) {
  const def = SHAPES[selection.recipe.shape];
  const mixed = selection.recipes !== selection.count;
  const [ctx, setCtx] = useState<PageCtx | null>(null);
  const [style, setStyle] = useState<Style>(selection.recipe.style);
  const [coverage, setCoverage] = useState<Record<Tone, number>>(DEFAULT_SETTINGS.coverage);
  const [mode, setMode] = useState<Mode>('loading');
  const [error, setError] = useState('');
  const busy = useRef(false);

  const fail = (e: any) => {
    setError(String(e?.message ?? e));
    setMode('error');
  };

  useEffect(() => {
    if (mixed) {
      return;
    }
    Promise.all([currentPage(), loadSettings()])
      .then(([c, s]) => {
        setCtx(c);
        setCoverage(s.coverage);
        setMode('strip');
      })
      .catch(fail);
  }, []);

  const close = () => closeView().catch(fail);

  const apply = async () => {
    if (!ctx || busy.current) {
      return;
    }
    busy.current = true;
    setMode('busy');
    try {
      const box = redrawBox(selection.liveRect, WEIGHT_WIDTH[style.weight]);
      const gaps = Object.fromEntries(TONES.map(t => [t, hatchGap(coverage[t])])) as Record<Tone, number>;
      const gap = redrawGap(selection.recipe, style, gaps);
      const { gap: _old, ...kept } = selection.recipe;
      const recipe: Recipe = { ...kept, style, ...gapField(style, gap) }; // seed is kept
      const plan = renderShape(def, applyFlip(box, recipe.flip), style, recipe.seed, gap);
      const bounds = await replaceLasso(ctx, plan, recipe);
      await selectRect(bounds, plan.strokes.length + plan.geometries.length);
    } catch (e) {
      busy.current = false;
      fail(e);
    }
  };

  if (mixed) {
    return (
      <View style={styles.root}>
        <Message text="Select only the Stencil shape to redraw" onClose={close} />
      </View>
    );
  }
  if (mode === 'error') {
    return (
      <View style={styles.root}>
        <Message text={`Stencil: ${error}`} onClose={close} />
      </View>
    );
  }
  return (
    <View style={styles.root}>
      {mode === 'strip' && (
        <Strip shape={def} style={style} onStyle={setStyle} onExpand={noop} onClose={close} action={{ label: '✓', onPress: apply }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
});

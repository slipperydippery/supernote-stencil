import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { closeView, currentPage, DEFAULT_SETTINGS, deleteElements, deleteLasso, deleteWhole, forgetPlacement, loadSettings, replaceElements, replaceLasso, replaceWhole, selectRect, type LassoSelection, type PageCtx } from '../device';
import { renderShape } from '../render/plan';
import { gapField, redrawGap, type Recipe } from '../render/recipe';
import { hatchGap, TONES, WEIGHT_WIDTH, type Style, type Tone } from '../render/style';
import { SHAPES } from '../shapes';
import Message from './Message';
import { applyFlip, moved, redrawBox } from './redraw';
import Strip from './Strip';

type Mode = 'loading' | 'strip' | 'busy' | 'error';

type Selection = LassoSelection & { recipe: Recipe };

const noop = () => {};

/**
 * The shape's own elements are replaced apart from the selection only while nothing is pending:
 * whether lasso points are read before or after a native move or stretch is unmeasured.
 */
function refuse(sel: Selection): string | null {
  if (sel.shapes > 1) {
    return `${sel.shapes} Stencil shapes selected: select one to redraw`;
  }
  if (sel.own) {
    return moved(sel.rect, sel.liveRect) ? 'To move or stretch, lasso the whole Stencil shape on its own' : null;
  }
  if (sel.recipes !== sel.count) {
    return 'Select only the Stencil shape to redraw';
  }
  return null;
}

export default function RedrawFlow({ selection }: { selection: Selection }) {
  const def = SHAPES[selection.recipe.shape];
  const refusal = refuse(selection);
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
    if (refusal) {
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
      const { own } = selection;
      const box = own ? own.box : redrawBox(selection.liveRect, WEIGHT_WIDTH[style.weight]);
      const gaps = Object.fromEntries(TONES.map(t => [t, hatchGap(coverage[t])])) as Record<Tone, number>;
      const gap = redrawGap(selection.recipe, style, gaps);
      const { gap: _old, ...kept } = selection.recipe;
      const recipe: Recipe = { ...kept, style, ...gapField(style, gap) }; // seed is kept
      const plan = renderShape(def, applyFlip(box, recipe.flip), style, recipe.seed, gap);
      // A redrawn shape is no longer the last placement; the panel's undo would not find it as recorded.
      await forgetPlacement(recipe.seed);
      const bounds = own?.tag
        ? await replaceWhole(ctx, own.tag, own.nums.length, own.box, plan, recipe)
        : own
          ? await replaceElements(ctx, own.nums, plan, recipe)
          : await replaceLasso(ctx, plan, recipe);
      await selectRect(bounds, plan.strokes.length + plan.geometries.length);
    } catch (e) {
      busy.current = false;
      fail(e);
    }
  };

  /** Same cases as apply, without the insert: the shape's elements go and anything else selected stays. */
  const remove = async () => {
    if (!ctx || busy.current) {
      return;
    }
    busy.current = true;
    setMode('busy');
    try {
      const { own } = selection;
      // The record is forgotten before the view closes: the device's own calls still run then, but nothing else should wait on them.
      await forgetPlacement(selection.recipe.seed);
      if (own?.tag) {
        await deleteWhole(ctx, own.tag, own.nums.length, own.box);
      } else {
        await (own ? deleteElements(ctx, own.nums) : deleteLasso());
        await closeView();
      }
    } catch (e) {
      busy.current = false;
      fail(e);
    }
  };

  if (refusal) {
    return (
      <View style={styles.root}>
        <Message text={refusal} onClose={close} />
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
        <Strip shape={def} style={style} onStyle={setStyle} onExpand={noop} onClose={close} onRemove={remove} action={{ label: '✓', onPress: apply }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
});

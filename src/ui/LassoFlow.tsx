import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { closeView, readLasso } from '../device';
import type { Recipe } from '../render/recipe';
import type { Box } from '../shapes';
import Message from './Message';
import RedrawFlow from './RedrawFlow';
import WrapFlow from './WrapFlow';

type Selection = { rect: Box; liveRect: Box; recipe: Recipe | null; count: number; recipes: number };

/** Reads the lasso once on mount, before any UI; reading again after the user interacts risks stale data. */
export default function LassoFlow() {
  const [sel, setSel] = useState<Selection | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    readLasso()
      .then(setSel)
      .catch((e: any) => setError(String(e?.message ?? e)));
  }, []);

  const close = () => closeView();

  if (error) {
    return (
      <View style={styles.root}>
        <Message text={`Stencil: ${error}`} onClose={close} />
      </View>
    );
  }
  if (!sel) {
    return <View style={styles.root} />;
  }
  if (sel.recipe) {
    return (
      <View style={styles.root}>
        <RedrawFlow selection={{ rect: sel.rect, liveRect: sel.liveRect, recipe: sel.recipe, count: sel.count, recipes: sel.recipes }} />
      </View>
    );
  }
  if (sel.count === 0) {
    return (
      <View style={styles.root}>
        <Message text="Stencil: nothing selected" onClose={close} />
      </View>
    );
  }
  return (
    <View style={styles.root}>
      <WrapFlow selection={sel.rect} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
});

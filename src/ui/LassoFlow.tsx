import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { closeView, readLasso } from '../device';
import Message from './Message';

/** Placeholder for the lasso-toolbar button; PR 4 (wrap) and PR 5 (redraw) replace the body. */
export default function LassoFlow() {
  const [text, setText] = useState('Stencil: reading the selection…');

  useEffect(() => {
    readLasso()
      .then(({ count }) => setText(`Stencil: not available yet (${count} elements selected)`))
      .catch((e: any) => setText(`Stencil: ${e?.message ?? e}`));
  }, []);

  return (
    <View style={styles.root}>
      <Message text={text} onClose={() => closeView()} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
});

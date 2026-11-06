/**
 * Transparent full-screen layer: the note page stays visible through it, and
 * the panel or strip are its only opaque parts.
 *
 * @format
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LASSO_BUTTON_ID } from './src/buttons';
import { session } from './src/session';
import LassoFlow from './src/ui/LassoFlow';
import PlaceFlow from './src/ui/PlaceFlow';

export default function App() {
  const [seq, setSeq] = useState(session.current());
  useEffect(() => session.subscribe(() => setSeq(session.current())), []);

  // Keyed on the press count: the host may keep App mounted between presses, and every press starts a fresh flow.
  return (
    <View style={styles.root}>
      {session.button() === LASSO_BUTTON_ID ? <LassoFlow key={seq} /> : <PlaceFlow key={seq} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
});

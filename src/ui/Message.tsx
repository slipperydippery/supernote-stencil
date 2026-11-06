import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { INK, PANEL_LEFT, PANEL_MARGIN_Y, PANEL_WIDTH, PAPER } from './theme';

export default function Message({ text, onClose }: { text: string; onClose(): void }) {
  return (
    <View style={styles.box}>
      <Text style={styles.text}>{text}</Text>
      <Pressable testID="message-close" accessibilityRole="button" onPress={onClose} style={styles.button}>
        <Text style={styles.text}>Close</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
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
  text: { fontSize: 16, color: INK },
  button: { alignSelf: 'flex-end', borderWidth: 1, borderColor: INK, borderRadius: 4, paddingVertical: 6, paddingHorizontal: 14 },
});

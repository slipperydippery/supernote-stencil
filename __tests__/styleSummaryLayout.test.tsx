import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import { DEFAULT_STYLE } from '../src/render/style';
import StyleSummary from '../src/ui/StyleSummary';

const node = (r: ReactTestRenderer, testID: string) => r.root.findAll(n => n.props.testID === testID && typeof n.type !== 'string')[0];

describe('StyleSummary layout events', () => {
  it('reads the chip position before the host recycles the event (GH-56)', () => {
    let r!: ReactTestRenderer;
    const props = { style: DEFAULT_STYLE, onStyle: () => {}, open: false, onOpenGroup: () => {}, edges: { right: 700, bottom: 60 } };
    act(() => {
      r = create(<StyleSummary {...props} openGroup={null} />);
    });
    // Pooled synthetic events: valid during the handler, emptied right after it returns. Two layouts land in one
    // batch, as on the device; React computes the first state update eagerly and defers the second to the render,
    // which is where a lazy read of the event would find it emptied.
    const first: any = { nativeEvent: { layout: { x: 0, y: 0, width: 38, height: 30 } } };
    const second: any = { nativeEvent: { layout: { x: 40, y: 0, width: 38, height: 30 } } };
    act(() => {
      node(r, 'summary-weight').props.onLayout(first);
      node(r, 'summary-ink').props.onLayout(second);
      first.nativeEvent = null;
      second.nativeEvent = null;
    });
    act(() => {
      r.update(<StyleSummary {...props} openGroup="ink" />);
    });
    expect(StyleSheet.flatten(node(r, 'value-row').props.style).left).toBe(40);
  });
});

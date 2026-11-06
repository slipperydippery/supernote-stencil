import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { DEFAULT_STYLE } from '../src/render/style';
import StyleBar from '../src/ui/StyleBar';

function render(el: React.ReactElement): ReactTestRenderer {
  let r!: ReactTestRenderer;
  act(() => {
    r = create(el);
  });
  return r;
}

// RN components resolve to several wrapper layers that all carry the same literal testID
// (Pressable → forwardRef → host View → host string), so count distinct testID values, not nodes.
const rowNode = (r: ReactTestRenderer, testID: string) => r.root.findAll(n => n.props.testID === testID && typeof n.type !== 'string')[0];
const chipIdsIn = (node: ReturnType<typeof rowNode>) =>
  node ? [...new Set(node.findAll(n => typeof n.props.testID === 'string' && n.props.testID.startsWith('chip-') && typeof n.type !== 'string').map(n => n.props.testID))] : [];

describe('StyleBar', () => {
  it('splits the panel size into two balanced rows of six, not a 10/2 flex-wrap', () => {
    const r = render(<StyleBar style={DEFAULT_STYLE} onStyle={() => {}} size="panel" />);
    expect(rowNode(r, 'stylebar-row-0')).toBeDefined();
    expect(rowNode(r, 'stylebar-row-1')).toBeDefined();
    expect(chipIdsIn(rowNode(r, 'stylebar-row-0'))).toHaveLength(6);
    expect(chipIdsIn(rowNode(r, 'stylebar-row-1'))).toHaveLength(6);
  });

  it('keeps the strip size on one row of twelve', () => {
    const r = render(<StyleBar style={DEFAULT_STYLE} onStyle={() => {}} size="strip" />);
    expect(rowNode(r, 'stylebar-row-1')).toBeUndefined();
    expect(chipIdsIn(rowNode(r, 'stylebar-row-0'))).toHaveLength(12);
  });

  it('still reports a style change regardless of row', () => {
    const onStyle = jest.fn();
    const r = render(<StyleBar style={DEFAULT_STYLE} onStyle={onStyle} size="panel" />);
    act(() => r.root.findAllByProps({ testID: 'chip-look-hand' })[0].props.onPress());
    expect(onStyle).toHaveBeenCalledWith({ ...DEFAULT_STYLE, look: 'hand' });
  });
});

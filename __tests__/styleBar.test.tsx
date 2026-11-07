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
  it('splits the panel size into two balanced rows, 8 and 7, with tone beside fill', () => {
    const r = render(<StyleBar style={DEFAULT_STYLE} onStyle={() => {}} size="panel" />);
    expect(rowNode(r, 'stylebar-row-0')).toBeDefined();
    expect(rowNode(r, 'stylebar-row-1')).toBeDefined();
    expect(chipIdsIn(rowNode(r, 'stylebar-row-0'))).toHaveLength(8);
    expect(chipIdsIn(rowNode(r, 'stylebar-row-1'))).toEqual([
      'chip-fill-none', 'chip-fill-solid', 'chip-fill-hatch', 'chip-fill-cross',
      'chip-tone-light', 'chip-tone-dark', 'chip-tone-black',
    ]);
  });

  it('keeps the strip size on one row of fifteen', () => {
    const r = render(<StyleBar style={DEFAULT_STYLE} onStyle={() => {}} size="strip" />);
    expect(rowNode(r, 'stylebar-row-1')).toBeUndefined();
    expect(chipIdsIn(rowNode(r, 'stylebar-row-0'))).toHaveLength(15);
  });

  it('disables the tone chips while fill is none and enables them with a fill', () => {
    const onStyle = jest.fn();
    const chip = (r: ReactTestRenderer) => r.root.findAllByProps({ testID: 'chip-tone-light' })[0].props;
    const none = render(<StyleBar style={DEFAULT_STYLE} onStyle={onStyle} size="panel" />);
    expect(chip(none).disabled).toBe(true);
    expect(chip(none).accessibilityState).toEqual({ selected: false, disabled: true });
    const hatched = render(<StyleBar style={{ ...DEFAULT_STYLE, fill: 'hatch' }} onStyle={onStyle} size="panel" />);
    expect(chip(hatched).disabled).toBe(false);
    expect(chip(hatched).accessibilityState).toEqual({ selected: false });
    act(() => chip(hatched).onPress());
    expect(onStyle).toHaveBeenCalledWith({ ...DEFAULT_STYLE, fill: 'hatch', tone: 'light' });
  });

  it('still reports a style change regardless of row', () => {
    const onStyle = jest.fn();
    const r = render(<StyleBar style={DEFAULT_STYLE} onStyle={onStyle} size="panel" />);
    act(() => r.root.findAllByProps({ testID: 'chip-look-hand' })[0].props.onPress());
    expect(onStyle).toHaveBeenCalledWith({ ...DEFAULT_STYLE, look: 'hand' });
  });
});

import React from 'react';
import { StyleSheet } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { DEFAULT_STYLE, type Style } from '../src/render/style';
import StyleBar, { Chip } from '../src/ui/StyleBar';
import { pressableNode } from '../test/helpers';

function render(el: React.ReactElement): ReactTestRenderer {
  let r!: ReactTestRenderer;
  act(() => {
    r = create(el);
  });
  return r;
}

// RN components resolve to several wrapper layers that all carry the same literal testID
// (Chip → Pressable → forwardRef → host View → host string), so count distinct testID values, not nodes.
const rowNode = (r: ReactTestRenderer, testID: string) => r.root.findAll(n => n.props.testID === testID && typeof n.type !== 'string')[0];
const chipIdsIn = (node: ReturnType<typeof rowNode>) =>
  node ? [...new Set(node.findAll(n => typeof n.props.testID === 'string' && n.props.testID.startsWith('chip-') && typeof n.type !== 'string').map(n => n.props.testID))] : [];

describe('StyleBar', () => {
  it('splits the panel size into a line row and a fill row', () => {
    const r = render(<StyleBar style={DEFAULT_STYLE} onStyle={() => {}} size="panel" open={false} />);
    expect(rowNode(r, 'stylebar-row-0')).toBeDefined();
    expect(rowNode(r, 'stylebar-row-1')).toBeDefined();
    expect(chipIdsIn(rowNode(r, 'stylebar-row-0'))).toEqual([
      'chip-line-solid', 'chip-line-dashed', 'chip-line-dotted', 'chip-line-none',
      'chip-weight-thin', 'chip-weight-normal', 'chip-weight-thick',
      'chip-ink-light', 'chip-ink-dark', 'chip-ink-black',
    ]);
    expect(chipIdsIn(rowNode(r, 'stylebar-row-1'))).toEqual([
      'chip-fill-none', 'chip-fill-solid', 'chip-fill-hatch', 'chip-fill-cross',
      'chip-tone-light', 'chip-tone-dark', 'chip-tone-black',
      'chip-look-clean', 'chip-look-hand',
    ]);
  });

  it('keeps the strip size on one wrapping row of all nineteen', () => {
    const r = render(<StyleBar style={DEFAULT_STYLE} onStyle={() => {}} size="strip" open={false} />);
    expect(rowNode(r, 'stylebar-row-1')).toBeUndefined();
    expect(chipIdsIn(rowNode(r, 'stylebar-row-0'))).toHaveLength(19);
  });

  it('disables the tone chips while fill is none and enables them with a fill', () => {
    const onStyle = jest.fn();
    const chip = (r: ReactTestRenderer) => pressableNode(r, 'chip-tone-light').props;
    const none = render(<StyleBar style={DEFAULT_STYLE} onStyle={onStyle} size="panel" open={false} />);
    expect(chip(none).disabled).toBe(true);
    expect(chip(none).accessibilityState).toEqual({ selected: false, disabled: true });
    const hatched = render(<StyleBar style={{ ...DEFAULT_STYLE, fill: 'hatch' }} onStyle={onStyle} size="panel" open={false} />);
    expect(chip(hatched).disabled).toBe(false);
    expect(chip(hatched).accessibilityState).toEqual({ selected: false });
    act(() => chip(hatched).onPress());
    expect(onStyle).toHaveBeenCalledWith({ ...DEFAULT_STYLE, fill: 'hatch', tone: 'light' });
  });

  it('still reports a style change regardless of row', () => {
    const onStyle = jest.fn();
    const r = render(<StyleBar style={DEFAULT_STYLE} onStyle={onStyle} size="panel" open={false} />);
    act(() => r.root.findAllByProps({ testID: 'chip-look-hand' })[0].props.onPress());
    expect(onStyle).toHaveBeenCalledWith({ ...DEFAULT_STYLE, look: 'hand' });
  });

  const props = (r: ReactTestRenderer, id: string) => pressableNode(r, `chip-${id}`).props;
  const filled: Style = { ...DEFAULT_STYLE, fill: 'solid' };

  it('disables the weight and ink chips while line is none, each dimmed once (not compounded with its group)', () => {
    const r = render(<StyleBar style={{ ...filled, line: 'none' }} onStyle={() => {}} size="strip" open={false} />);
    for (const id of ['weight-thin', 'weight-thick', 'ink-light', 'ink-dark']) {
      expect(props(r, id).disabled).toBe(true);
      expect(StyleSheet.flatten(props(r, id).style).opacity).toBe(0.3);
    }
    expect(props(r, 'line-solid').disabled).toBe(false);
    for (const group of ['group-weight', 'group-ink']) {
      expect(StyleSheet.flatten(rowNode(r, group).props.style).opacity).toBeUndefined();
    }
    const solid = render(<StyleBar style={filled} onStyle={() => {}} size="strip" open={false} />);
    expect(props(solid, 'weight-thin').disabled).toBe(false);
    expect(props(solid, 'ink-light').disabled).toBe(false);
    expect(StyleSheet.flatten(props(solid, 'weight-thin').style).opacity).toBeUndefined();
  });

  it.each([
    ['an open shape', filled, true, true],
    ['fill none', DEFAULT_STYLE, false, true],
    ['a filled closed shape', filled, false, false],
  ])('the line-none chip with %s is disabled: %s', (_, style, open, disabled) => {
    const r = render(<StyleBar style={style} onStyle={() => {}} size="strip" open={open} />);
    expect(props(r, 'line-none').disabled).toBe(disabled);
  });

  it('brings the outline back when fill none is pressed while line is none', () => {
    const onStyle = jest.fn();
    const r = render(<StyleBar style={{ ...filled, line: 'none' }} onStyle={onStyle} size="strip" open={false} />);
    act(() => props(r, 'fill-none').onPress());
    expect(onStyle).toHaveBeenCalledWith({ ...filled, fill: 'none', line: 'solid' });
  });
});

describe('Chip', () => {
  const chipProps = { glyph: 'look-clean' as const, size: 'strip' as const, testID: 'chip-look-clean', accessibilityLabel: 'look clean' };
  const chip = (r: ReactTestRenderer) => pressableNode(r, 'chip-look-clean').props;

  it('frames the chip in ink when on', () => {
    const r = render(<Chip {...chipProps} on />);
    expect(StyleSheet.flatten(chip(r).style)).toMatchObject({ borderWidth: 2, borderColor: '#000', padding: 1 });
  });

  it('reports accessibilityState.disabled and ignores presses', () => {
    const onPress = jest.fn();
    const r = render(<Chip {...chipProps} on={false} disabled onPress={onPress} />);
    expect(chip(r).disabled).toBe(true);
    expect(chip(r).accessibilityState).toEqual({ selected: false, disabled: true });
  });
});

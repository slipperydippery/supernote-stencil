import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { DEFAULT_STYLE, type Style } from '../src/render/style';
import { SHAPES } from '../src/shapes';
import { GLYPHS, type GlyphKey } from '../src/ui/icons';
import Strip from '../src/ui/Strip';
import StyleSummary from '../src/ui/StyleSummary';
import { pressableNode } from '../test/helpers';

function render(el: React.ReactElement): ReactTestRenderer {
  let r!: ReactTestRenderer;
  act(() => {
    r = create(el);
  });
  return r;
}

const noop = () => {};
const filled: Style = { ...DEFAULT_STYLE, fill: 'solid' };
const ids = (r: ReactTestRenderer, re: RegExp) =>
  [...new Set(r.root.findAll(n => typeof n.props.testID === 'string' && re.test(n.props.testID) && typeof n.type !== 'string').map(n => n.props.testID))];
const props = (r: ReactTestRenderer, id: string) => pressableNode(r, id).props;
const valueRow = (r: ReactTestRenderer) => r.root.findAll(n => n.props.testID === 'value-row' && typeof n.type !== 'string')[0];

type Over = Partial<React.ComponentProps<typeof StyleSummary>>;
const summary = (over: Over = {}) => render(<StyleSummary style={DEFAULT_STYLE} onStyle={noop} open={false} openGroup={null} onOpenGroup={noop} {...over} />);

describe('StyleSummary', () => {
  it('shows one chip per group, line group first, each with the glyph of its current value and no values', () => {
    const style: Style = { weight: 'thick', line: 'dashed', fill: 'hatch', tone: 'dark', ink: 'light', look: 'hand' };
    const r = summary({ style });
    expect(ids(r, /^chip-/)).toEqual(['chip-weight', 'chip-line', 'chip-ink', 'chip-fill', 'chip-tone', 'chip-look']);
    expect(valueRow(r)).toBeUndefined();
    for (const g of Object.keys(style) as (keyof Style)[]) {
      const chip = pressableNode(r, `chip-${g}`);
      expect(chip.findByType(Image).props.source).toBe(GLYPHS[`${g}-${style[g]}` as GlyphKey]);
      expect(chip.props.accessibilityState.selected).toBe(false);
    }
  });

  it('opens a group, frames its current value, and applies a chosen one closing the row', () => {
    const onOpenGroup = jest.fn();
    const onStyle = jest.fn();
    const shut = summary({ onOpenGroup });
    act(() => props(shut, 'chip-line').onPress());
    expect(onOpenGroup).toHaveBeenCalledWith('line');

    onOpenGroup.mockClear();
    const r = summary({ style: filled, openGroup: 'line', onOpenGroup, onStyle });
    expect(ids(r, /^chip-line-/)).toEqual(['chip-line-solid', 'chip-line-dashed', 'chip-line-dotted', 'chip-line-none']);
    expect(props(r, 'chip-line-solid').accessibilityState.selected).toBe(true);
    expect(props(r, 'chip-line-dashed').accessibilityState.selected).toBe(false);
    act(() => props(r, 'chip-line-dashed').onPress());
    expect(onStyle).toHaveBeenCalledWith({ ...filled, line: 'dashed' });
    expect(onOpenGroup).toHaveBeenCalledWith(null);
  });

  it('closes the row without a change when its chip is pressed again', () => {
    const onOpenGroup = jest.fn();
    const onStyle = jest.fn();
    const r = summary({ openGroup: 'line', onOpenGroup, onStyle });
    act(() => props(r, 'chip-line').onPress());
    expect(onOpenGroup).toHaveBeenCalledWith(null);
    expect(onStyle).not.toHaveBeenCalled();
  });

  it('closes the row without a change when the current value is pressed', () => {
    const onOpenGroup = jest.fn();
    const onStyle = jest.fn();
    const r = summary({ openGroup: 'line', onOpenGroup, onStyle });
    act(() => props(r, 'chip-line-solid').onPress());
    expect(onOpenGroup).toHaveBeenCalledWith(null);
    expect(onStyle).not.toHaveBeenCalled();
  });

  it('dims a group that means nothing for the style once, and does not open it', () => {
    const r = summary({ style: DEFAULT_STYLE });
    expect(DEFAULT_STYLE.fill).toBe('none');
    expect(props(r, 'chip-tone').disabled).toBe(true);
    expect(StyleSheet.flatten(props(r, 'chip-tone').style).opacity).toBe(0.3);
    expect(StyleSheet.flatten(r.root.findAll(n => n.props.testID === 'summary-tone' && typeof n.type !== 'string')[0].props.style)?.opacity).toBeUndefined();

    const bare = summary({ style: { ...filled, line: 'none' } });
    expect(props(bare, 'chip-weight').disabled).toBe(true);
    expect(props(bare, 'chip-ink').disabled).toBe(true);
    expect(props(bare, 'chip-line').disabled).toBe(false);
    expect(props(bare, 'chip-tone').disabled).toBe(false);
  });

  it.each([
    ['an arrow', true, filled, true],
    ['a rectangle with fill solid', false, filled, false],
    ['a rectangle with fill none', true, DEFAULT_STYLE, false],
  ])('in the line row of %s, line none is disabled: %s', (_, disabled, style, open) => {
    expect(props(summary({ style, open, openGroup: 'line' }), 'chip-line-none').disabled).toBe(disabled);
  });

  it('chooses through the panel rule: fill none while line is none brings the line back', () => {
    const onStyle = jest.fn();
    const r = summary({ style: { ...filled, line: 'none' }, openGroup: 'fill', onStyle });
    act(() => props(r, 'chip-fill-none').onPress());
    expect(onStyle).toHaveBeenCalledWith({ ...filled, fill: 'none', line: 'solid' });
  });

  describe('value row placement', () => {
    // The row follows a flexible spacer capped at its chip's left edge: 38 dp chips with a 10 dp gap.
    const spacer = (r: ReactTestRenderer) => StyleSheet.flatten((valueRow(r).parent!.children[0] as ReactTestInstance).props.style);

    it('sits under its chip, in flow rather than hanging outside', () => {
      const r = summary({ openGroup: 'ink' });
      expect(spacer(r)).toMatchObject({ flex: 1, maxWidth: 2 * 48 });
      expect(StyleSheet.flatten(valueRow(r).props.style).position).toBeUndefined();
    });

    it('gives way at the right edge: the spacer is capped, not fixed', () => {
      const r = summary({ openGroup: 'look' });
      expect(spacer(r)).toMatchObject({ flex: 1, maxWidth: 5 * 48 });
      expect(spacer(r).width).toBeUndefined();
    });
  });
});

describe('Strip with the summary', () => {
  it('renders the six chips and the bin, check and close marks for redraw', () => {
    const r = render(
      <Strip shape={SHAPES.rectangle} style={DEFAULT_STYLE} onStyle={noop} onExpand={noop} onClose={noop} onRemove={noop} action={{ label: '✓', onPress: noop }} openGroup={null} onOpenGroup={noop} />,
    );
    expect(ids(r, /^chip-/)).toEqual(['chip-weight', 'chip-line', 'chip-ink', 'chip-fill', 'chip-tone', 'chip-look']);
    expect(ids(r, /^strip-(remove|action|close)$/)).toEqual(['strip-remove', 'strip-action', 'strip-close']);
  });

  it('forwards the open group and offers line none only for a closed shape', () => {
    const arrow = render(<Strip shape={SHAPES.arrow} style={filled} onStyle={noop} onExpand={noop} onClose={noop} openGroup="line" onOpenGroup={noop} />);
    expect(props(arrow, 'chip-line-none').disabled).toBe(true);
    const box = render(<Strip shape={SHAPES.rectangle} style={filled} onStyle={noop} onExpand={noop} onClose={noop} openGroup="line" onOpenGroup={noop} />);
    expect(props(box, 'chip-line-none').disabled).toBe(false);
  });

  it('keeps the value row inside the strip: nothing under the strip is absolutely positioned or measured', () => {
    const r = render(<Strip shape={SHAPES.rectangle} style={DEFAULT_STYLE} onStyle={noop} onExpand={noop} onClose={noop} openGroup="look" onOpenGroup={noop} />);
    const hosts: ReactTestInstance[] = [];
    for (let n = valueRow(r).parent; n; n = n.parent) {
      if (typeof n.type === 'string') {
        hosts.push(n);
      }
    }
    // The outermost host is the strip, which is absolute within the flow's root by design.
    for (const n of hosts.slice(0, -1)) {
      expect(StyleSheet.flatten(n.props.style)?.position).not.toBe('absolute');
    }
    expect(r.root.findAll(n => typeof n.props.onLayout === 'function')).toHaveLength(0);
  });
});

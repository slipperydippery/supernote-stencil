import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { DEFAULT_STYLE } from '../src/render/style';
import { SHAPES } from '../src/shapes';
import Panel from '../src/ui/Panel';
import Strip from '../src/ui/Strip';

const noop = () => {};

function render(el: React.ReactElement): ReactTestRenderer {
  let r!: ReactTestRenderer;
  act(() => {
    r = create(el);
  });
  return r;
}

const cells = (r: ReactTestRenderer) => r.root.findAll(n => typeof n.props.testID === 'string' && n.props.testID.startsWith('cell-') && typeof n.type !== 'string');
const uniq = (r: ReactTestRenderer) => [...new Set(cells(r).map(n => n.props.testID))];

describe('Panel', () => {
  it('shows one cell per shape of the tab', () => {
    const props = { onTab: noop, style: DEFAULT_STYLE, onStyle: noop, selected: null, onPick: noop, onClose: noop };
    expect(uniq(render(<Panel tab="basic" {...props} />))).toHaveLength(8);
    expect(uniq(render(<Panel tab="flow" {...props} />))).toHaveLength(8);
    expect(uniq(render(<Panel tab="arrow" {...props} />))).toEqual(['cell-arrow', 'cell-arrowDown', 'cell-doubleArrow', 'cell-elbowArrow', 'cell-curvedArrow', 'cell-curvedArrowDown']);
  });

  it('reports tab, style and pick', () => {
    const onTab = jest.fn();
    const onStyle = jest.fn();
    const onPick = jest.fn();
    const r = render(<Panel tab="basic" onTab={onTab} style={DEFAULT_STYLE} onStyle={onStyle} selected="square" onPick={onPick} onClose={noop} title="Wrap" />);
    act(() => r.root.findByProps({ testID: 'tab-arrow' }).props.onPress());
    act(() => r.root.findByProps({ testID: 'chip-fill-hatch' }).props.onPress());
    act(() => r.root.findByProps({ testID: 'cell-circle' }).props.onPress());
    expect(onTab).toHaveBeenCalledWith('arrow');
    expect(onStyle).toHaveBeenCalledWith({ ...DEFAULT_STYLE, fill: 'hatch' });
    expect(onPick).toHaveBeenCalledWith(SHAPES.circle);
    expect(r.root.findByProps({ testID: 'cell-square' }).props.accessibilityState).toEqual({ selected: true });
    expect(JSON.stringify(r.toJSON())).toContain('Wrap');
  });
});

describe('Strip', () => {
  it('expands from the preview and renders an optional action', () => {
    const onExpand = jest.fn();
    const onPress = jest.fn();
    const r = render(<Strip shape={SHAPES.decision} style={DEFAULT_STYLE} onStyle={noop} onExpand={onExpand} onClose={noop} action={{ label: '✓', onPress }} />);
    act(() => r.root.findByProps({ testID: 'strip-preview' }).props.onPress());
    act(() => r.root.findByProps({ testID: 'strip-action' }).props.onPress());
    expect(onExpand).toHaveBeenCalled();
    expect(onPress).toHaveBeenCalled();
  });

  it('omits the arm-on-open control when no prop is passed (RedrawFlow)', () => {
    const r = render(<Strip shape={SHAPES.decision} style={DEFAULT_STYLE} onStyle={noop} onExpand={noop} onClose={noop} />);
    expect(r.root.findAllByProps({ testID: 'strip-arm-on-open' })).toHaveLength(0);
  });

  it('reports the arm-on-open toggle and reflects its checked state', () => {
    const onToggle = jest.fn();
    const r = render(
      <Strip shape={SHAPES.decision} style={DEFAULT_STYLE} onStyle={noop} onExpand={noop} onClose={noop} armOnOpen={{ value: true, onToggle }} />,
    );
    const toggle = r.root.findByProps({ testID: 'strip-arm-on-open' });
    expect(toggle.props.accessibilityState).toEqual({ checked: true });
    act(() => toggle.props.onPress());
    expect(onToggle).toHaveBeenCalled();
  });
});

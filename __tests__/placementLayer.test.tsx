import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { SHAPES } from '../src/shapes';
import PlacementLayer from '../src/ui/PlacementLayer';

const ev = (x: number, y: number) => ({ nativeEvent: { pageX: x, pageY: y } });

function render(props: Partial<React.ComponentProps<typeof PlacementLayer>>): ReactTestRenderer {
  let r!: ReactTestRenderer;
  act(() => {
    r = create(<PlacementLayer enabled shape={SHAPES.rectangle} scale={2} onPlace={jest.fn()} {...props} />);
  });
  return r;
}

const layer = (r: ReactTestRenderer) => r.root.findAll(n => n.props.testID === 'placement-layer' && typeof n.props.onResponderGrant === 'function')[0];
const band = (r: ReactTestRenderer) => r.root.findAllByProps({ testID: 'rubber-band' }).length > 0;

function touch(r: ReactTestRenderer, from: [number, number], to: [number, number]) {
  act(() => {
    layer(r).props.onResponderGrant(ev(...from));
    layer(r).props.onResponderMove(ev(...to));
  });
  const during = band(r);
  act(() => {
    layer(r).props.onResponderRelease(ev(...to));
  });
  return during;
}

describe('PlacementLayer with onDismiss', () => {
  it('takes a tap, dismisses and places nothing', () => {
    const onPlace = jest.fn();
    const onDismiss = jest.fn();
    const r = render({ onPlace, onDismiss });
    expect(layer(r).props.onStartShouldSetResponder()).toBe(true);
    touch(r, [100, 100], [100, 100]);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onPlace).not.toHaveBeenCalled();
  });

  it('shows no band for a drag and dismisses once on release', () => {
    const onPlace = jest.fn();
    const onDismiss = jest.fn();
    const r = render({ onPlace, onDismiss });
    expect(touch(r, [100, 100], [300, 200])).toBe(false);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onPlace).not.toHaveBeenCalled();
  });

  it('places as before without it', () => {
    const onPlace = jest.fn();
    const r = render({ onPlace });
    expect(touch(r, [100, 100], [300, 200])).toBe(true);
    expect(onPlace).toHaveBeenCalledWith({ left: 200, top: 200, right: 600, bottom: 400 }, 'drag');
  });
});

import type { ImageSourcePropType } from 'react-native';
import type { Style } from '../render/style';
import type { ShapeId } from '../shapes';

// Metro resolves only literal require paths, so both maps are written out.

export const ICONS: Record<ShapeId, ImageSourcePropType> = {
  rectangle: require('../../assets/shapes/rectangle.png'),
  rounded: require('../../assets/shapes/rounded.png'),
  square: require('../../assets/shapes/square.png'),
  circle: require('../../assets/shapes/circle.png'),
  ellipse: require('../../assets/shapes/ellipse.png'),
  triangle: require('../../assets/shapes/triangle.png'),
  diamond: require('../../assets/shapes/diamond.png'),
  hexagon: require('../../assets/shapes/hexagon.png'),
  process: require('../../assets/shapes/process.png'),
  decision: require('../../assets/shapes/decision.png'),
  terminator: require('../../assets/shapes/terminator.png'),
  data: require('../../assets/shapes/data.png'),
  document: require('../../assets/shapes/document.png'),
  manualInput: require('../../assets/shapes/manualInput.png'),
  storedData: require('../../assets/shapes/storedData.png'),
  offPage: require('../../assets/shapes/offPage.png'),
  arrow: require('../../assets/shapes/arrow.png'),
  arrowDown: require('../../assets/shapes/arrowDown.png'),
  doubleArrow: require('../../assets/shapes/doubleArrow.png'),
  elbowArrow: require('../../assets/shapes/elbowArrow.png'),
  curvedArrow: require('../../assets/shapes/curvedArrow.png'),
  curvedArrowDown: require('../../assets/shapes/curvedArrowDown.png'),
};

export type GlyphKey = { [K in keyof Style]: `${K}-${Style[K]}` }[keyof Style];

export const GLYPHS: Record<GlyphKey, ImageSourcePropType> = {
  'weight-thin': require('../../assets/glyphs/weight-thin.png'),
  'weight-normal': require('../../assets/glyphs/weight-normal.png'),
  'weight-thick': require('../../assets/glyphs/weight-thick.png'),
  'line-solid': require('../../assets/glyphs/line-solid.png'),
  'line-dashed': require('../../assets/glyphs/line-dashed.png'),
  'line-dotted': require('../../assets/glyphs/line-dotted.png'),
  'fill-none': require('../../assets/glyphs/fill-none.png'),
  'fill-hatch': require('../../assets/glyphs/fill-hatch.png'),
  'fill-light': require('../../assets/glyphs/fill-light.png'),
  'fill-dark': require('../../assets/glyphs/fill-dark.png'),
  'look-clean': require('../../assets/glyphs/look-clean.png'),
  'look-hand': require('../../assets/glyphs/look-hand.png'),
};

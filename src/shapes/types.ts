export type Family = 'basic' | 'flow' | 'arrow';
export type ShapeId =
  | 'rectangle' | 'rounded' | 'square' | 'circle' | 'ellipse' | 'triangle' | 'diamond' | 'hexagon'
  | 'process' | 'decision' | 'terminator' | 'data' | 'document' | 'manualInput' | 'storedData' | 'offPage'
  | 'arrow' | 'arrowDown' | 'doubleArrow' | 'elbowArrow' | 'curvedArrow' | 'curvedArrowDown';
export type Pt = { x: number; y: number };
export type Box = { left: number; top: number; right: number; bottom: number };
export type ShapeDef = {
  id: ShapeId; family: Family; label: string; closed: boolean;
  /** Default insert size in Manta page px (1920 wide); callers multiply by ctx.unit. */
  defaultSize: { w: number; h: number };
  /** true for square and circle: a dragged box is reduced to its shorter side, centred. */
  keepAspect: boolean;
  /** Polylines in page px filling `box`. For closed shapes the first polyline is the fill boundary and ends on its first point. */
  outline(box: Box): Pt[][];
};

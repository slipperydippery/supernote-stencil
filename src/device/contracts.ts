/**
 * Local copies of the PR 1 contracts (stencil-v1 README, "Cross-PR contracts":
 * style and recipe, shapes, plan). PR 1 runs in parallel, so the device layer
 * codes against these until PR 3 switches the imports to `src/render` and
 * `src/shapes` and deletes this file.
 */

export type Weight = 'thin' | 'normal' | 'thick';
export type Line = 'solid' | 'dashed' | 'dotted';
export type Fill = 'none' | 'hatch' | 'light' | 'dark';
export type Look = 'clean' | 'hand';
export type Style = { weight: Weight; line: Line; fill: Fill; look: Look };

export type Family = 'basic' | 'flow' | 'arrow';
export type ShapeId =
  | 'rectangle' | 'rounded' | 'square' | 'circle' | 'ellipse' | 'triangle' | 'diamond' | 'hexagon'
  | 'process' | 'decision' | 'terminator' | 'data' | 'document' | 'manualInput' | 'storedData' | 'offPage'
  | 'line' | 'arrow' | 'doubleArrow' | 'elbowArrow' | 'curvedArrow' | 'arrowDown';

export type Pt = { x: number; y: number };
export type Box = { left: number; top: number; right: number; bottom: number };

export type Recipe = { v: 1; shape: ShapeId; style: Style; seed: number };

export type StrokeSpec = { points: Pt[]; pressures: number[]; penType: 10 | 16; penColor: 0 | 157 | 201 | 254; thickness: number };
export type GeoSpec = {
  type: 'GEO_polygon' | 'GEO_ellipse' | 'straightLine'; points: Pt[];
  ellipseCenterPoint: Pt | null; ellipseMajorAxisRadius: number; ellipseMinorAxisRadius: number; ellipseAngle: number;
  penType: 10; penColor: 0 | 157 | 201 | 254; penWidth: number;
};
export type Plan = { strokes: StrokeSpec[]; geometries: GeoSpec[]; bounds: Box };

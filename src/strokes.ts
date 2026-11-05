// Spike shim; PR 3 deletes it.
export {
  PEN,
  INK,
  sampleLine,
  constant,
  ramp,
  bounds,
  insertStrokes,
  lasso,
  currentPage,
  type PageCtx,
  type StrokeSpec,
} from './device/spikeCompat';

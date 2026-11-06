# Stencil — Supernote plugin

Diagram shapes for Supernote notes, inserted as stretchable vector strokes with an optional hand-drawn look. Design review: https://claude.ai/artifact/DMhjxZZxt8c6xKaThKt88d

Tap **Stencil** in the sidebar. A panel opens on the left: pick a family tab, set weight, line, fill and look with the glyph chips, tap a shape. The panel collapses into a strip along the top. Tap the page to place the shape at its default size under the pen, or drag to render it into the swept box. The plugin closes with the new shape lassoed. Shape, style and tab are remembered, so the next open goes straight to the strip; tap the preview in the strip to choose another shape.

## Build and install

```sh
npm ci
./buildPlugin.sh
```

Copy `build/outputs/stencil.snplg` to the `MyStyle` folder on the device, then **Settings → Apps → Plugins → Add Plugin**. The plugin asks for file read and write permission on first use; choose *Always allow*.

No Android SDK is needed: the plugin is pure JS, so the build only runs Metro.

## Development

The design, decisions table and reference renderer live in `docs/design-review.html`. `npm run typecheck && npm test && ./buildPlugin.sh` is the gate before every push; `npm run icons` regenerates the PNG icons under `assets/`.

The table below records what the spike plugin measured on a Manta. The product code depends on these findings.

## Results

Device run of 2026-11-05 on a Manta, firmware current at that date. Observed on the device by Maarten and cross-checked by rendering `Stencil Spike.note` with supernotelib.

| Check | Result | Notes |
|-------|--------|-------|
| 1 plain rect | pass | Points and pressures are enough. No contours, angles, flags or recognition points needed. |
| 1b metadata | renders, breaks lasso | Identical box, but it can only be lassoed by circling almost the whole page. The fake contour or recognition data is what the lasso hit-tests. Never write metadata. |
| 2 pressure, pen 16 | pass | Width follows pressure. 800 is clearly thinner than 2000; 2000 and 3600 look alike, so the curve saturates somewhere below 3600. The ramp row thickens smoothly over its length. |
| 2 pressure, pen 10 | constant | Ignores pressure. Good for the clean look: predictable width. |
| 2 pressure, pen 11 | constant | Marker texture, ignores pressure. |
| 2 pressure, pen 15 | hairline | Calligraphy width depends on stroke direction; horizontal lines come out as hairlines. Not usable for shapes. |
| 3 hand-drawn | pass | Bow and swing read as intended. Corner overshoots are visible as small crosses. Pen 16 box shows the width profile, pen 10 box does not. |
| 4 flagDraw gap | fail | Flag is ignored; the stroke renders solid. |
| 4 pressure-0 gap | fail | Pressure 0 renders as a hairline, not a gap. Dashes must be separate strokes. |
| 5 lasso after insert | fail (round 2) | `lassoElements` then `closePluginView` left nothing selected. Round 3 tries the reverse order. Geometry has `showLassoAfterInsert`, which sn-shapes relies on. |
| stretch | fail | The native lasso handle scales strokes proportionally only. sn-shapes' README confirms the same for geometry and ships its own eight-handle resize overlay driven by `modifyLassoGeometry`. |
| undo | none for strokes | Nothing to undo after a stroke insert. Per supernote-snap's measurements, `insertGeometry` and lasso operations keep the undo history; page-element writes clear it. |
| thickness unit | measured | Same unit as `Geometry.penWidth`. Rows at pen width × 0.5, 1, 2, 4 scaled as expected; the fixed values 1, 2, 4, 8 drew hairlines, because they are tiny in that unit. Palette's table: 0.1 mm = 200, 0.5 mm = 600, 1.0 mm = 1200, 2.0 mm = 2400. |
| 2b pressure sweep | measured | Rendered width on pen 16: 400 → 2 px, 800 → 4, 1200 → 5, 1600 → 6, flat to 3200, 3600 → 7. The hand-drawn swing now maps into 400 to 1600. |
| 7 geometry box + ellipse | pass (round 3) | Box came in selected via `showLassoAfterInsert`; the ellipse did not because its flag was false. Both **stretch non-proportionally with the native lasso**, and undo removes them one by one. Geometry is therefore the carrier for the clean look. |
| 3 hand-drawn, round 3 | measured | Pen 16 box rendered 5 px against 7 px for the pen 10 box at the same thickness: pen 16 only goes thinner than the element thickness. Round 4 sets the pen 16 thickness to the profile's peak and maps pressure through the measured curve, so the average darkness should match. |
| 6 thickness ladder, round 3 | pass | Both sets progress, pen width multiples and the fixed 200/600/1200/2400. Unit confirmed. Page 3 of `Stencil Spike 3.note` was still empty in the file copied over USB, so page-element inserts reach the file only when the note is saved or left. |
| 5 lasso after insert, round 3 | not run | The button sat below the fold of the dialog. Round 4 puts it first in a scrollable list. |
| 3 hand-drawn, round 4 | pass | Pen 16 box at peak thickness with curve-mapped pressure reads as dark as the pen 10 box, with visible width variation. |
| 5 lasso after insert, round 4 | pass | Close the plugin view first, then `lassoElements`. |
| 5 lasso after insert, round 7 | pass, no timer | JS timers do not fire while the plugin view is closed: with a 300 ms sleep between `closePluginView` and `lassoElements`, the lasso only ran when the plugin was opened again. Awaiting the close and calling `lassoElements` straight away selects the insert (close resolved in 3 ms, lasso in 230 ms). |
| 7g geometry via page elements, round 7 | pass | A `GEO_polygon` and a `GEO_ellipse` inserted through `insertPageElements` both render, stretch non-proportionally with the native lasso, and show the "Stencil redraw" toolbar button. Clean shapes stay geometry and carry a recipe. |
| redraw while selected, round 7 | stale box | After a native stretch, `getLassoRect` still returns the pre-stretch box until the selection is dropped and made again; Palette reports the same and reads the new box from `generateLassoPreview`. Redraw (PR 5) has to take the box from there. |
| stretch, round 5 | degrades | Native lasso scaling multiplies stroke width with the shape (stroke box lines roughly doubled at 2×). A hand-drawn polygon geometry stretched non-proportionally pulls its bows and corner tails out of proportion. Same finding as sn-shapes ADR-PEN-PLACEMENT. Shapes must be sized at insert time. |
| lasso rect, PR 3 device run | integers only | `lassoElements` validates its rect against the SDK's `RectSchema` (`integer: true`) and returns `success: false` for fractional coordinates. Placement boxes are fractional, so `selectRect` rounds outwards. |
| listFiles, PR 3 device run | objects, not strings | `FileUtils.listFiles` returns `[{ type, path }]` on a Manta although the SDK types it as `string[]`. `makeDir`, `exists` and `deleteDir` in the plugin dir all return `true`. |

Design consequence (decided 2026-11-05): tap or drag to place with a transparent full-screen layer, wrap a selection, and a lasso-toolbar "redraw" that regenerates a Stencil shape at the lasso box from a recipe stored in `Element.userData`. Centred insert is dropped.

Consequences for the build: clean look on pen 10, hand-drawn look on pen 16, dashes and hatch as separate strokes, no stroke metadata, inserts through `insertPageElements` (no save and reload), widths in the internal unit with a fractional part.

## Prior art

Four open-source plugins cover neighbouring ground; their READMEs record device measurements the SDK docs lack.

- [j-raghavan/sn-shapes](https://github.com/j-raghavan/sn-shapes), the "Shapes" plugin: geometry shapes incl. flowchart and arrows, pen-tap or drag placement, free-resize overlay from the lasso toolbar. Every shape is one `GEO_polygon`; arrows are closed polygons.
- [CharlesCheval/supernote-palette](https://github.com/CharlesCheval/supernote-palette): restyles a lasso selection with width, colour, dashes, hatch and solid fill. Width table, fill-as-lines algorithm, and the note that `reloadFile` can drop recent strokes.
- [CharlesCheval/supernote-snap](https://github.com/CharlesCheval/supernote-snap): hold-to-snap shapes; solid arrow heads as a zigzag polyline; pen type 16 is the ink pen; lasso paths arrive as pen type 4.
- [guibor/supernote-shape-snap](https://github.com/guibor/supernote-shape-snap): lasso-to-geometry snapping.

## Layout

- `index.js` registers the sidebar button and bumps `src/session.ts` on every press; `App.tsx` routes the press to a flow.
- `src/ui/` holds the flows (`PlaceFlow`, the placeholder `LassoFlow`), the panel, strip, style bar and placement layer.
- `src/shapes/` and `src/render/` are pure: shape outlines, style, recipe, and the clean and hand-drawn renderers. They never import the SDK.
- `src/device/` is the only code that talks to `sn-plugin-lib`: page context, inserting a plan tagged with its recipe, reading and replacing a lasso selection, selecting a rect, settings.

# Stencil — Supernote plugin

Diagram shapes for Supernote notes, inserted as stretchable vector strokes with an optional hand-drawn look. Design review: https://claude.ai/artifact/DMhjxZZxt8c6xKaThKt88d

This is the **spike build**. It has no palette yet. A sidebar button opens a screen with one button per on-device check that the design depends on. Run them on a scratch note, look at the page, and record the answers below. The palette gets built on top of what passes.

## Build and install

```sh
npm ci
./buildPlugin.sh
```

Copy `build/outputs/stencil.snplg` to the `MyStyle` folder on the device, then **Settings → Apps → Plugins → Add Plugin**. The plugin asks for file read and write permission on first use; choose *Always allow*.

No Android SDK is needed: the plugin is pure JS, so the build only runs Metro.

## The checks

Open a scratch note, open the sidebar, tap **Stencil spike**. The log line at the top reports the page size and the current pen. Each button inserts into the current page and logs what it drew and what to look for.

| # | Button | Question it answers | Pass looks like |
|---|--------|---------------------|-----------------|
| 1 | Plain rect | Do strokes with only points and pressures render and lasso? | Crisp 480 × 240 box at page centre. |
| 1b | Plain rect + full metadata | Fallback if 1 fails: are contours, angles, flags or recognition points required? | Same box. If 1 fails and 1b passes, the renderer must fake those fields. |
| 2 | Pressure ladder | Which pen type turns pressure into width, and smoothly? | In some group the three rows differ in width and the fourth row thickens left to right. Groups top to bottom: pen 16, 10, 11, 15. |
| 3 | Hand-drawn rect | Does the locked look (bow 2, swing 0.4, overshoot 3) read as intended on e-ink? | Upper box (pen 16) shows gentle bows, thin-thick sides and small corner overshoots. Lower box (pen 10) is the same geometry at constant width for comparison. |
| 4 | Dash gaps | Can one stroke contain a gap? | Row 1 (`flagDraw` false) or row 2 (pressure 0) shows a gap in the middle third. Row 3 is separate dash strokes for reference. |
| 5 | Lasso last insert and close | Can the plugin leave its insert selected? | Plugin closes and the last insert sits inside a lasso box. |

Two more checks need no button:

- **Stretch**: lasso the plain rect and try to resize it non-proportionally. If that works, Stencil never needs a transform action.
- **Undo**: after any insert, use the native undo. Note whether it removes the whole insert or one stroke at a time.

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
| stretch, round 5 | degrades | Native lasso scaling multiplies stroke width with the shape (stroke box lines roughly doubled at 2×). A hand-drawn polygon geometry stretched non-proportionally pulls its bows and corner tails out of proportion. Same finding as sn-shapes ADR-PEN-PLACEMENT. Shapes must be sized at insert time. |

Design consequence (decided 2026-11-05): tap or drag to place with a transparent full-screen layer, wrap a selection, and a lasso-toolbar "redraw" that regenerates a Stencil shape at the lasso box from a recipe stored in `Element.userData`. Centred insert is dropped.

Consequences for the build: clean look on pen 10, hand-drawn look on pen 16, dashes and hatch as separate strokes, no stroke metadata, inserts through `insertPageElements` (no save and reload), widths in the internal unit with a fractional part.

## Prior art

Four open-source plugins cover neighbouring ground; their READMEs record device measurements the SDK docs lack.

- [j-raghavan/sn-shapes](https://github.com/j-raghavan/sn-shapes), the "Shapes" plugin: geometry shapes incl. flowchart and arrows, pen-tap or drag placement, free-resize overlay from the lasso toolbar. Every shape is one `GEO_polygon`; arrows are closed polygons.
- [CharlesCheval/supernote-palette](https://github.com/CharlesCheval/supernote-palette): restyles a lasso selection with width, colour, dashes, hatch and solid fill. Width table, fill-as-lines algorithm, and the note that `reloadFile` can drop recent strokes.
- [CharlesCheval/supernote-snap](https://github.com/CharlesCheval/supernote-snap): hold-to-snap shapes; solid arrow heads as a zigzag polyline; pen type 16 is the ink pen; lasso paths arrive as pen type 4.
- [guibor/supernote-shape-snap](https://github.com/guibor/supernote-shape-snap): lasso-to-geometry snapping.

## Layout

- `index.js` registers the sidebar button and bumps `session` on press.
- `App.tsx` is the spike screen.
- `src/device/` is the only module that talks to `sn-plugin-lib`: page context, inserting a plan as page elements tagged with a recipe, reading and replacing a lasso selection, selecting a rect, settings.
- `src/strokes.ts` and `src/sdk.ts` are shims that keep the spike compiling against `src/device/`.
- `src/handdrawn.ts` is the hand-drawn renderer from the design prototype, with the locked constants.
- `src/spikes.ts` holds the individual checks.

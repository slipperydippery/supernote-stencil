# Changelog

## Unreleased

- Fill tone: fill is none, solid, hatch or cross, and a new tone group (light, dark, black) sets the grey of a solid fill and the spacing of hatch lines. Spacing is a constant per tone instead of a share of the box height, so one style reads the same on every size. Saved styles and recipes from 1.0.0 are upgraded on read; an old hatch redraws at black, the spacing closest to what it had (GH-20).

- Settings: a Settings button in the shape panel opens a screen with hatch spacing per tone (2–30 % ink coverage, default 4 / 11 / 21 %) and wrap padding (0–8 mm, default 2 mm). A hatched shape keeps the spacing it was placed with on redraw until its tone changes (GH-22).

## 1.0.0 — 2026-11-06

- Shapes and renderers: shape definitions, style and recipe, clean and hand-drawn renderers, fills and dashes, the pressure mapping, and the committed PNG icons (GH-2).
- Device layer: page context, inserting a plan as tagged page elements, reading and replacing a lasso selection, selecting a rect, settings persistence (GH-3).
- Palette and placement: sidebar button, panel and strip, tap or drag to place a shape on the page (GH-4).
- Lasso entry and wrap: lasso-toolbar button, wrap a handwritten selection in a shape (GH-5).
- Redraw: the redraw branch of the lasso button, regenerating a placed shape into its lasso box (GH-6).
- Release polish: user-facing README, final icon, version 1.0.0, deferred-work list (GH-7).

/**
 * Stencil spike screen.
 *
 * The root is a transparent full-screen layer. A white panel on the left
 * holds the check buttons and the log. In placement mode the transparent
 * remainder catches pen touches: a tap inserts a hand-drawn box under the
 * pen, a drag sizes one to the swept box, with a solid rubber band.
 *
 * Opened from the lasso toolbar it runs the redraw check instead.
 *
 * @format
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GestureResponderEvent, PixelRatio, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PluginCommAPI, PluginManager, type Rect } from 'sn-plugin-lib';
import { ensurePermission } from './src/sdk';
import { session } from './src/session';
import {
  dashGap,
  geometryPageElements,
  geometryShapes,
  handDrawnBoxAt,
  handDrawnGeometry,
  handDrawnRect,
  plainRect,
  pressureLadder,
  pressureSweep,
  redrawLasso,
  thicknessLadder,
  type SpikeResult,
} from './src/spikes';
import { currentPage, type PageCtx } from './src/strokes';
import { selectRect } from './src/device';

const REDRAW_BUTTON_ID = 400;
const DRAG_THRESHOLD_DP = 8;

type Spike = { label: string; run: (ctx: PageCtx) => Promise<SpikeResult> };

const SPIKES: Spike[] = [
  { label: '1. Plain rect (points + pressure only)', run: ctx => plainRect(ctx, false) },
  { label: '1b. Plain rect (metadata ignored since GH-3)', run: ctx => plainRect(ctx, true) },
  { label: '2. Pressure ladder (4 pen types)', run: pressureLadder },
  { label: '2b. Pressure sweep (pen 16, 400 to 3600)', run: pressureSweep },
  { label: '3. Hand-drawn rect (tagged with recipe)', run: handDrawnRect },
  { label: '4. Dash gaps in one stroke', run: dashGap },
  { label: '6. Thickness ladder (internal units)', run: thicknessLadder },
  { label: '7. Geometry box + ellipse (stretch check)', run: geometryShapes },
  { label: '7g. Geometry via page elements', run: geometryPageElements },
  { label: '8. Hand-drawn box as one geometry', run: handDrawnGeometry },
];

function Button({ label, onPress, primary, disabled }: { label: string; onPress: () => void; primary?: boolean; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.btn, primary && styles.btnPrimary, disabled && styles.btnDisabled]}>
      <Text style={[styles.btnText, primary && styles.btnTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

type Band = { left: number; top: number; width: number; height: number } | null;

export default function App() {
  const [seq, setSeq] = useState(session.current());
  const [ctx, setCtx] = useState<PageCtx | null>(null);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [last, setLast] = useState<Rect | null>(null);
  const [placing, setPlacing] = useState(false);
  const [band, setBand] = useState<Band>(null);
  const downRef = useRef<{ x: number; y: number } | null>(null);
  const scale = PixelRatio.get();

  useEffect(() => session.subscribe(() => setSeq(session.current())), []);

  const append = useCallback((line: string) => setLog(l => [line, ...l].slice(0, 12)), []);

  useEffect(() => {
    let cancelled = false;
    setLog([]);
    setLast(null);
    setCtx(null);
    setPlacing(false);
    (async () => {
      try {
        await ensurePermission('plugin.permission.FILE:READ', 'Stencil reads the open note');
        await ensurePermission('plugin.permission.FILE:WRITE', 'Stencil inserts shapes into the open note');
        const c = await currentPage();
        if (cancelled) {
          return;
        }
        setCtx(c);
        const pen = c.penInfo ? `pen type ${c.penInfo.type}, width ${c.penInfo.width}, color ${c.penInfo.color}` : 'pen info unavailable';
        append(`Page ${c.page} of ${c.notePath.split('/').pop()} · ${c.width} × ${c.height} px · ${pen} · PixelRatio ${scale}`);
        if (session.button() === REDRAW_BUTTON_ID) {
          setBusy(true);
          try {
            const res = await redrawLasso(c);
            setLast(res.rect);
            append(res.log);
          } catch (e: any) {
            append(`Redraw failed: ${e?.message ?? e}`);
          } finally {
            setBusy(false);
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          append(`Setup failed: ${e?.message ?? e}`);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [seq, append, scale]);

  const run = useCallback(
    async (spike: Spike) => {
      if (!ctx || busy) {
        return;
      }
      setBusy(true);
      const t0 = Date.now();
      try {
        const res = await spike.run(ctx);
        setLast(res.rect);
        append(`${res.log}\n(${Date.now() - t0} ms)`);
      } catch (e: any) {
        append(`${spike.label} failed: ${e?.message ?? e}`);
      } finally {
        setBusy(false);
      }
    },
    [ctx, busy, append],
  );

  const lassoLast = useCallback(async () => {
    if (!last) {
      return;
    }
    try {
      await selectRect(last);
    } catch (e: any) {
      append(`Lasso failed: ${e?.message ?? e}`);
    }
  }, [last, append]);

  const lassoStretch = useCallback(async () => {
    if (!last) {
      return;
    }
    try {
      await selectRect(last);
      const w = last.right - last.left;
      const res = (await PluginCommAPI.resizeLassoRect({
        left: last.left - 6,
        top: last.top - 6,
        right: last.left + w * 1.5 + 6,
        bottom: last.bottom + 6,
      })) as any;
      if (!res?.success) {
        throw new Error(res?.error?.message ?? 'resizeLassoRect failed');
      }
    } catch (e: any) {
      append(`Stretch failed: ${e?.message ?? e}`);
    }
  }, [last, append]);

  // --- placement by pen ---------------------------------------------------
  const onGrant = useCallback((e: GestureResponderEvent) => {
    downRef.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
    setBand(null);
  }, []);
  const onMove = useCallback((e: GestureResponderEvent) => {
    const d = downRef.current;
    if (!d) {
      return;
    }
    const x = e.nativeEvent.pageX,
      y = e.nativeEvent.pageY;
    if (Math.hypot(x - d.x, y - d.y) < DRAG_THRESHOLD_DP) {
      return;
    }
    setBand({ left: Math.min(d.x, x), top: Math.min(d.y, y), width: Math.abs(x - d.x), height: Math.abs(y - d.y) });
  }, []);
  const onRelease = useCallback(
    async (e: GestureResponderEvent) => {
      const d = downRef.current;
      downRef.current = null;
      setBand(null);
      if (!d || !ctx || busy) {
        return;
      }
      const up = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
      const isTap = Math.hypot(up.x - d.x, up.y - d.y) < DRAG_THRESHOLD_DP;
      const a = { x: d.x * scale, y: d.y * scale };
      const b = { x: up.x * scale, y: up.y * scale };
      let rect: Rect;
      if (isTap) {
        const w = 480 * ctx.unit,
          h = 240 * ctx.unit;
        rect = { left: b.x - w / 2, top: b.y - h / 2, right: b.x + w / 2, bottom: b.y + h / 2 };
      } else {
        rect = {
          left: Math.min(a.x, b.x),
          top: Math.min(a.y, b.y),
          right: Math.max(a.x, b.x),
          bottom: Math.max(a.y, b.y),
        };
        if (rect.right - rect.left < 40 || rect.bottom - rect.top < 40) {
          append('Drag too small, ignored.');
          return;
        }
      }
      setBusy(true);
      try {
        const r = await handDrawnBoxAt(ctx, rect, Math.floor(Math.random() * 1000));
        setLast(r);
        append(
          `${isTap ? 'Tap' : 'Drag'} at dp ${Math.round(d.x)},${Math.round(d.y)} → page px ${Math.round(a.x)},${Math.round(a.y)}; box ${Math.round(rect.left)},${Math.round(rect.top)} to ${Math.round(rect.right)},${Math.round(rect.bottom)}.\n` +
            'Look for: did the box land where the pen was? Is it the size you swept?',
        );
      } catch (err: any) {
        append(`Placement failed: ${err?.message ?? err}`);
      } finally {
        setBusy(false);
      }
    },
    [ctx, busy, scale, append],
  );

  const close = useCallback(() => {
    PluginManager.closePluginView();
  }, []);

  return (
    <View style={styles.root}>
      <View
        style={styles.catch}
        onStartShouldSetResponder={() => placing}
        onResponderGrant={onGrant}
        onResponderMove={onMove}
        onResponderRelease={onRelease}
        onResponderTerminate={() => {
          downRef.current = null;
          setBand(null);
        }}
        pointerEvents={placing ? 'auto' : 'none'}>
        {band && <View pointerEvents="none" style={[styles.band, { left: band.left, top: band.top, width: band.width, height: band.height }]} />}
      </View>
      <View style={styles.panel}>
        <Text style={styles.title}>Stencil spike</Text>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollInner}>
          <Button
            label={placing ? 'P. Placement ON: tap or drag on the page →' : 'P. Place by pen (tap or drag)'}
            onPress={() => setPlacing(p => !p)}
            disabled={!ctx || busy}
            primary={placing}
          />
          <Button label="5. Close, then lasso last insert" onPress={lassoLast} disabled={!last || busy} primary />
          <Button label="9. Close, lasso last insert, stretch 1.5× wide via API" onPress={lassoStretch} disabled={!last || busy} primary />
          {SPIKES.map(s => (
            <Button key={s.label} label={s.label} onPress={() => run(s)} disabled={!ctx || busy} />
          ))}
          <View style={styles.log}>
            {log.map((line, i) => (
              <Text key={i} style={[styles.logLine, i === 0 && styles.logLatest]}>
                {line}
              </Text>
            ))}
            {log.length === 0 && <Text style={styles.logLine}>Preparing…</Text>}
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <Button label="Close" onPress={close} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent', flexDirection: 'row' },
  catch: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
  band: { position: 'absolute', borderWidth: 2, borderColor: '#000', borderStyle: 'solid' },
  panel: {
    width: 420,
    marginLeft: 70,
    marginTop: 40,
    marginBottom: 40,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 8,
    padding: 14,
  },
  title: { fontSize: 22, fontWeight: '600', color: '#000', marginBottom: 8 },
  scroll: { flex: 1 },
  scrollInner: { gap: 8, paddingBottom: 8 },
  btn: { borderWidth: 2, borderColor: '#000', borderRadius: 6, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#fff' },
  btnPrimary: { backgroundColor: '#000' },
  btnDisabled: { opacity: 0.35 },
  btnText: { fontSize: 15, color: '#000' },
  btnTextPrimary: { color: '#fff' },
  log: { marginTop: 8, borderWidth: 1, borderColor: '#777', borderRadius: 6, padding: 10, gap: 8 },
  logLine: { fontSize: 12, color: '#444', fontFamily: 'monospace' },
  logLatest: { color: '#000' },
  footer: { marginTop: 8, alignItems: 'flex-end' },
});

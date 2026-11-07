import React from 'react';
import { PixelRatio, Pressable, StyleSheet, Text, View } from 'react-native';
import { coverage, GAP_STEPS, HATCH_SHARE, TONE_GAP, TONES, WEIGHT_WIDTH, widthPx, type Tone } from '../render/style';
import { INK, PANEL_LEFT, PANEL_MARGIN_Y, PANEL_WIDTH, PAPER, RULE } from './theme';
import { PADDING_STEPS, WRAP_PADDING } from './wrap';

export type SettingsPanelProps = {
  gaps: Record<Tone, number>;
  wrapPadding: number;
  onChange(change: { gaps?: Record<Tone, number>; wrapPadding?: number }): void;
  onBack(): void;
  onClose(): void;
};

const TONE_LABEL: Record<Tone, string> = { light: 'Light', dark: 'Dark', black: 'Black' };
const SWATCH = { w: 96, h: 36 };

/** Manta px to mm at 300 ppi. */
const mm = (px: number) => Math.round((px * 25.4) / 300);

/**
 * Hatch lines at page scale, drawn level: diagonal views scribble under
 * partial refresh (see ShapePreview), and the spacing is what is being judged.
 */
function Swatch({ gap }: { gap: number }) {
  const ratio = PixelRatio.get();
  const line = Math.max(1, widthPx(HATCH_SHARE * WEIGHT_WIDTH.normal) / ratio);
  const step = gap / ratio;
  const ys: number[] = [];
  for (let y = step / 2; y < SWATCH.h; y += step) {
    ys.push(y);
  }
  return (
    <View style={styles.swatch}>
      {ys.map(y => (
        <View key={y} style={[styles.swatchLine, { top: y - line / 2, height: line }]} />
      ))}
    </View>
  );
}

function Stepper<T extends number>({ id, steps, value, label, onStep }: { id: string; steps: readonly T[]; value: T; label: string; onStep(v: T): void }) {
  const i = Math.max(0, steps.indexOf(value));
  const button = (to: number, text: string, side: string) => {
    const off = to < 0 || to >= steps.length;
    return (
      <Pressable
        testID={`${id}-${side}`}
        accessibilityRole="button"
        accessibilityState={off ? { disabled: true } : {}}
        disabled={off}
        onPress={() => onStep(steps[to])}
        style={[styles.step, off && styles.stepOff]}>
        <Text style={styles.stepText}>{text}</Text>
      </Pressable>
    );
  };
  return (
    <View style={styles.stepper}>
      {button(i - 1, '−', 'less')}
      <Text testID={`${id}-value`} style={styles.value}>
        {label}
      </Text>
      {button(i + 1, '+', 'more')}
    </View>
  );
}

export default function SettingsPanel({ gaps, wrapPadding, onChange, onBack, onClose }: SettingsPanelProps) {
  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Pressable testID="settings-back" accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={styles.button}>
          <Text style={styles.buttonText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <Pressable testID="settings-close" accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.close}>
          <Text style={styles.closeText}>×</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>Hatch spacing</Text>
      {TONES.map(tone => (
        <View key={tone} style={styles.row}>
          <Text style={styles.label}>{TONE_LABEL[tone]}</Text>
          <Swatch gap={gaps[tone]} />
          <Stepper
            id={`gap-${tone}`}
            steps={GAP_STEPS}
            value={gaps[tone] as (typeof GAP_STEPS)[number]}
            label={`${coverage(gaps[tone])} %`}
            onStep={g => onChange({ gaps: { ...gaps, [tone]: g } })}
          />
        </View>
      ))}

      <Text style={styles.section}>Wrap padding</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Margin</Text>
        <Stepper
          id="wrap-padding"
          steps={PADDING_STEPS}
          value={wrapPadding as (typeof PADDING_STEPS)[number]}
          label={`${mm(wrapPadding)} mm`}
          onStep={p => onChange({ wrapPadding: p })}
        />
      </View>

      <Pressable
        testID="settings-reset"
        accessibilityRole="button"
        onPress={() => onChange({ gaps: { ...TONE_GAP }, wrapPadding: WRAP_PADDING })}
        style={[styles.button, styles.reset]}>
        <Text style={styles.buttonText}>Reset to defaults</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: PANEL_LEFT,
    top: PANEL_MARGIN_Y,
    width: PANEL_WIDTH,
    backgroundColor: PAPER,
    borderWidth: 1,
    borderColor: INK,
    borderRadius: 8,
    padding: 14,
    gap: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 22, fontWeight: '600', color: INK },
  close: { width: 36, height: 36, borderWidth: 1, borderColor: INK, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 22, color: INK },
  button: { height: 36, paddingHorizontal: 12, borderWidth: 1, borderColor: INK, borderRadius: 4, justifyContent: 'center' },
  buttonText: { fontSize: 16, color: INK },
  section: { fontSize: 16, fontWeight: '600', color: INK, borderBottomWidth: 1, borderColor: RULE, paddingBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { width: 64, fontSize: 16, color: INK },
  swatch: { width: SWATCH.w, height: SWATCH.h, borderWidth: 1, borderColor: RULE, overflow: 'hidden' },
  swatchLine: { position: 'absolute', left: 0, right: 0, backgroundColor: INK },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 'auto' },
  step: { width: 40, height: 36, borderWidth: 1, borderColor: INK, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  stepOff: { opacity: 0.3 },
  stepText: { fontSize: 20, color: INK },
  value: { width: 56, textAlign: 'center', fontSize: 16, color: INK },
  reset: { alignSelf: 'flex-end' },
});

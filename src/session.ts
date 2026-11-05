// PluginHost may keep App mounted between button presses, so App cannot rely
// on mounting to know a new session started. index.js bumps this counter on
// every press and App resets when it changes.
let seq = 0;
let lastButton = 0;
const subscribers = new Set<() => void>();

export const session = {
  current: () => seq,
  button: () => lastButton,
  bump(buttonId = 0) {
    lastButton = buttonId;
    seq++;
    subscribers.forEach(f => f());
  },
  subscribe(f: () => void) {
    subscribers.add(f);
    return () => {
      subscribers.delete(f);
    };
  },
};

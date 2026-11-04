/**
 * Light haptic tick on devices that support the Vibration API (Android browsers).
 * iOS Safari has no web haptics, so this is a silent no-op there.
 */
export function tick(pattern: number | number[] = 8): void {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
  } catch {
    /* unsupported */
  }
}

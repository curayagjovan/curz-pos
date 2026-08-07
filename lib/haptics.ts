const canVibrate = () =>
  typeof navigator !== "undefined" && typeof navigator.vibrate === "function";

// A light tick for frequent, low-stakes actions (add to cart) — noticeable
// without feeling buzzy when it fires many times in a row (hold-to-add).
export function hapticTick() {
  if (canVibrate()) {
    navigator.vibrate(8);
  }
}

// A short pulse pattern for a completed, higher-stakes action (checkout) —
// distinct from hapticTick so it doesn't blend into it in a rapid sequence.
export function hapticSuccess() {
  if (canVibrate()) {
    navigator.vibrate([20, 40, 20]);
  }
}

import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'

export type SplashGate<T extends string> = {
  // Marks one named gate ready. Safe to call more than once for the same gate (a no-op after the
  // first) and safe to call for every gate in any order — the splash only ever hides once every
  // gate this instance was created with has been marked, and only ever hides once. For a gate that
  // only resolves via a one-shot callback (a library's own `onReady` prop, a promise `.then`) —
  // call this directly there. For a gate that's already a plain boolean (state from a hook like
  // `useFonts`, or your own derived condition), useReady below is that same call written once.
  markReady: (gate: T) => void
  // Marks `gate` ready once `ready` becomes true — bound to this gate instance, so there's nothing
  // to pass but the two things that actually vary at the call site.
  useReady: (gate: T, ready: boolean) => void
  // Gate names still outstanding, in no particular order — for a debug log or a "why is this still
  // up" check during development, not something app code should need to branch on.
  pendingGates: () => T[]
}

// One named condition per thing your first screen actually depends on (a loaded theme, a loaded
// font, a hydrated preference, a resolved auth check, ...) instead of hand-rolling a fresh ad hoc
// module-scope gate per project. Call this once, up front, with every gate the app needs — then
// call `markReady`/`useReady` for each one from wherever it actually resolves. The splash stays up
// (you're still responsible for `SplashScreen.preventAutoHideAsync()` yourself, before this runs)
// until every named gate has reported in, then it hides itself exactly once — so nothing your
// app's first screen shows can ever be caught mid-load, wrong-then-corrected, a beat behind the
// rest.
export function createSplashGate<T extends string>(gates: readonly T[]): SplashGate<T> {
  const pending = new Set<T>(gates)
  let hidden = false

  const tryHide = () => {
    if (hidden || pending.size > 0) return
    hidden = true
    void SplashScreen.hideAsync()
  }

  const markReady = (gate: T) => {
    pending.delete(gate)
    tryHide()
  }

  const useReady = (gate: T, ready: boolean) => {
    // markReady isn't in this dep array — it's this closure's own stable reference (one per
    // createSplashGate call), not a per-render value, so there's nothing to gain by re-running
    // this effect if it somehow changed identity.
    useEffect(() => {
      if (ready) markReady(gate)
    }, [ready, gate])
  }

  const pendingGates = () => Array.from(pending)

  // Nothing to wait for (called with an empty list, or every gate was already satisfied some
  // other way) — hide right away instead of leaving the splash up forever with nothing left that
  // could ever call markReady again.
  tryHide()

  return { markReady, useReady, pendingGates }
}

import { useEffect } from 'react'

// The `useEffect(() => { if (!ready) return; markReady('x') }, [ready])` boilerplate that shows up
// at every call site otherwise — for a gate whose readiness is already a plain boolean (state from
// a hook like `useFonts`, or your own derived condition), this is that effect written once. For a
// gate that only ever resolves via a one-shot callback (a library's own `onReady` prop, a promise
// `.then`), call `markReady` directly there instead — there's no boolean to hand this.
export function useMarkReadyWhen<T extends string>(markReady: (gate: T) => void, gate: T, ready: boolean): void {
  useEffect(() => {
    if (ready) markReady(gate)
  }, [ready, markReady, gate])
}

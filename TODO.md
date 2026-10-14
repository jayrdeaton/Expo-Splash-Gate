# TODO

## Dev-mode warning for a gate that never resolves

Right now a gate that never gets marked ready (a typo'd gate name at one call site, a promise that
never settles, a condition that's wrong) just holds the splash screen up forever, silently.
`pendingGates()` exists for a manual "why is this still up" check, but nothing surfaces the problem
proactively - you only find out by noticing the splash never goes away.

Idea: in `createGate`, start a dev-only timer (guarded by `__DEV__`, so it's a no-op in production)
that fires a few seconds after creation and, if the splash still hasn't hidden, `console.warn`s with
`pendingGates()`'s contents. Needs:

- A way to clear the timer once `tryHide()` actually hides the splash, so it never fires on the happy path.
- A sane default delay (long enough that normal loading never trips it, short enough to still be useful
  in practice) - probably configurable via an optional second argument to `createGate`, defaulting to
  something reasonable, since "sane" will vary by app.
- No behavior change and no timer at all outside dev - this is a debugging aid, not a runtime feature.

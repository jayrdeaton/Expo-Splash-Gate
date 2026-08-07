# @rific/splash-gate

Name every async condition your Expo app's first screen actually depends on — a loaded theme, a loaded icon font, a hydrated saved preference, an auth check — and hold the splash screen up until all of them report ready. One shared, tested utility instead of a fresh ad hoc module-scope gate copy-pasted into every project.

## Why

`SplashScreen.preventAutoHideAsync()` only holds the splash up — it's on you to call `hideAsync()` at the right moment. Call it too early (e.g. the instant your theme loads) and anything else your first screen depends on but forgot to wait for — an icon font, a hydrated preference — pops in visibly a moment after the splash lifts. `createSplashGate` makes every condition explicit up front, so nothing can be forgotten silently.

## Installation

```sh
npm install @rific/splash-gate
```

## Usage

```ts
// splashGate.ts — created once, at module scope, listing every condition this app's first
// screen actually depends on
import { createSplashGate } from '@rific/splash-gate'

export const { markReady, useReady, pendingGates } = createSplashGate(['theme', 'fonts', 'keyboardLayout'])
```

```tsx
// Theme.tsx
import * as SplashScreen from 'expo-splash-screen'
import { useFonts } from 'expo-font'
import { markReady, useReady } from './splashGate'

SplashScreen.preventAutoHideAsync()

export const Theme = ({ children }) => {
  const [fontsLoaded] = useFonts({ ... })
  useReady('fonts', fontsLoaded)

  const onThemeReady = () => markReady('theme') // a one-shot callback, not a boolean — call directly

  return <Provider onReady={onThemeReady}>{children}</Provider>
}
```

```ts
// KeyboardLayoutProvider.tsx
import { useReady } from './splashGate'

const [loaded, setLoaded] = useState(false)
useEffect(() => {
  void AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
    if (stored) setLayoutState(stored)
    setLoaded(true) // mark loaded whether or not a saved value was actually found
  })
}, [])
useReady('keyboardLayout', loaded)
```

The splash screen hides exactly once, the moment `theme`, `fonts`, and `keyboardLayout` have all reported ready — in whatever order they actually resolve.

## API

### `createSplashGate(gates)`

Takes an array of gate names (typically `as const` for literal-type safety) and returns:

- `markReady(gate)` — marks one gate ready. Safe to call more than once for the same gate, and safe in any order. Hides the splash screen exactly once, once every gate is ready. For a gate that only resolves via a one-shot callback (a library's own `onReady` prop, a promise `.then`) — call this directly there.
- `useReady(gate, ready)` — for a gate whose readiness is already a plain boolean (state from a hook like `useFonts`, or your own derived condition), marks it ready once `ready` becomes `true`. Bound to this gate instance — there's nothing to pass but the two things that actually vary at each call site.
- `pendingGates()` — the gate names still outstanding, for a debug log during development.

Call this once, at module scope — not inside a component body, or you'll get a fresh gate (and a fresh splash-hide race) on every render.

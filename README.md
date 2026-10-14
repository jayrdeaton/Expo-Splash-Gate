# @rific/splash-gate

Name every async condition your Expo app's first screen actually depends on (a loaded theme, a loaded icon font, a hydrated saved preference, an auth check) and hold the splash screen up until all of them report ready. One shared, tested utility instead of a fresh ad hoc module-scope gate copy-pasted into every project.

## Why

`SplashScreen.preventAutoHideAsync()` only holds the splash up. It's on you to call `hideAsync()` at the right moment. Call it too early (e.g. the instant your theme loads) and anything else your first screen depends on but forgot to wait for, an icon font, a hydrated preference, pops in visibly a moment after the splash lifts. `createGate` makes every condition explicit up front, so nothing can be forgotten silently.

## Installation

```sh
npm install @rific/splash-gate
```

## Usage

```ts
// splashGate.ts, created once, at module scope, listing every condition this app's first
// screen actually depends on
import { createGate } from '@rific/splash-gate'

export const { markReady, useReady, pendingGates, Gate } = createGate(['theme', 'fonts', 'keyboardLayout'])
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

  const onThemeReady = () => markReady('theme') // a one-shot callback, not a boolean, call directly

  return <Provider onReady={onThemeReady}>{children}</Provider>
}
```

```ts
// KeyboardLayoutProvider.tsx
import { useReady } from './splashGate'

const [layout, setLayout] = useState<string | null>(null)
const [loaded, setLoaded] = useState(false)
useEffect(() => {
  void AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
    if (stored) setLayout(stored)
    setLoaded(true) // mark loaded whether or not a saved value was actually found
  })
}, [])
useReady('keyboardLayout', loaded)
```

The splash screen hides exactly once, the moment `theme`, `fonts`, and `keyboardLayout` have all reported ready, in whatever order they actually resolve.

## Guarding against a child that renders before its data does

`useReady` only defers when the splash screen *hides* - it says nothing about when your own children first *render*. That's fine for a plain condition like `fontsLoaded`, but it's a trap for a component that mounts a third-party provider whose internal state locks in on first render (a `useState(() => ...)` lazy initializer wrapping a loaded prop, which is how most context providers are written). Render that provider immediately with a placeholder default and patch the real prop in once it loads, and the provider never notices the patch - it already locked onto the placeholder, permanently, even though the gate reports in correctly and the splash hides at the right moment. From the outside this looks exactly like the setting silently failing to persist.

`Gate` closes that gap: it registers the gate exactly like `useReady` does, and in the same step withholds `children` until `ready` is `true`, so a gate can't be reported without also blocking whatever depends on it from mounting too early.

```tsx
// KeyboardLayoutProvider.tsx
import { Gate } from './splashGate' // from createGate(['theme', 'fonts', 'keyboardLayout'])

const [layout, setLayout] = useState<string | null>(null) // null = not loaded yet
useEffect(() => {
  void AsyncStorage.getItem(STORAGE_KEY).then((stored) => setLayout(stored ?? 'qwerty'))
}, [])

// ThirdPartyLayoutProvider's own `layout` state is a lazy useState(() => initialLayout) - it only
// reads `initialLayout` on its very first mount, so it must not mount until the real value exists.
return (
  <Gate gate='keyboardLayout' ready={layout !== null}>
    <ThirdPartyLayoutProvider initialLayout={layout}>{children}</ThirdPartyLayoutProvider>
  </Gate>
)
```

## API

### `createGate(gates)`

Takes an array of gate names (typically `as const` for literal-type safety) and returns:

- `markReady(gate)`: marks one gate ready. Safe to call more than once for the same gate, and safe in any order. Hides the splash screen exactly once, once every gate is ready. For a gate that only resolves via a one-shot callback (a library's own `onReady` prop, a promise `.then`), call this directly there.
- `useReady(gate, ready)`: for a gate whose readiness is already a plain boolean (state from a hook like `useFonts`, or your own derived condition), marks it ready once `ready` becomes `true`. Bound to this gate instance, so there's nothing to pass but the two things that actually vary at each call site.
- `Gate`: a component, bound to this gate instance. `useReady(gate, ready)` plus render-gating in one step - see above. Renders `children` once `ready` is `true`, otherwise `fallback` (default `null`).
- `pendingGates()`: the gate names still outstanding, for a debug log during development.

Call this once, at module scope, not inside a component body, or you'll get a fresh gate (and a fresh splash-hide race) on every render.

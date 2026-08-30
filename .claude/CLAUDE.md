# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

# @rific/splash-gate

Name every async condition an Expo app's first screen depends on (theme, fonts, saved preferences, auth, ...) and hold the splash screen up until all of them report ready, instead of hand-rolling a fresh ad hoc gate per project.

Part of the `@rific` package ecosystem. Published at https://www.npmjs.com/package/@rific/splash-gate.

## Commands

```bash
npm run build        # tsup, outputs CJS + ESM + types to dist/
npm run build:watch  # tsup --watch
npm run lint         # ESLint
npm run fix          # ESLint --fix
npm test             # Jest (16 tests)
npm run test:watch   # Jest in watch mode
npm run typecheck    # TypeScript type check (tsc --noEmit)
npm run verify       # lint + test + typecheck + build, in that order
```

Always run `npm run lint` before finishing any task.

## Release

Tag-based, using npm trusted publishing (OIDC, no token required):

```bash
npm run release:patch   # npm version patch && npm run release (or release:minor / release:major)
```

`release` itself is just `git push --follow-tags`. `preversion` runs `npm run verify` first (lint + test + typecheck + build). The `publish.yml` workflow fires on `v*` tags and delegates to the shared reusable workflow (`infinitetoken/Workflows/.github/workflows/npm-publish.yml@v1`) with `id-token: write` permission for OIDC trusted publishing.

## Architecture

```
src/
  index.ts                    - public exports: GateProps, SplashGate (types), createGate
  splashGate.ts                - createGate(): gate lifecycle (pending Set, tryHide, markReady, useReady, pendingGates, Gate component)
  __mocks__/
    expo-splash-screen.ts      - manual jest mock of hideAsync/preventAutoHideAsync/setOptions, wired via jest.config.cjs's moduleNameMapper (not jest's automatic __mocks__ convention)
  __tests__/
    splashGate.test.ts         - createGate lifecycle tests (11)
    Gate.test.tsx               - Gate component tests (5)
```

That's the whole library: one ~85-line source file plus a two-line re-export barrel. No config/constants files, no other internal modules.

`createGate<T>(gates)` seeds a `Set<T>` of pending gate names. `markReady`/`useReady` delete from that set and call `tryHide`, which hides the splash screen exactly once, the moment the set is empty (including immediately, at call time, if `gates` was empty to begin with). `Gate` both registers a gate via `useReady` and withholds `children` until `ready` is true, in one call — see the doc comment on `SplashGate.Gate` in `splashGate.ts` for why `useReady` alone isn't enough to prevent a child's first-render state from locking in stale.

## Public API

From `src/index.ts`:

- `createGate<T extends string>(gates: readonly T[]): SplashGate<T>` — call once, up front, with every gate name the app needs
- `SplashGate<T>` (type) — the return shape: `markReady(gate)`, `useReady(gate, ready)`, `pendingGates(): T[]`, `Gate` (component)
- `GateProps<T>` (type) — props for the `Gate` component: `gate`, `ready`, `fallback?`, `children`

## Peer Dependencies

- `expo-splash-screen` >=57.0.0 — required
- `react` >=19.0.0 — required

Both are hard `peerDependencies`, no `peerDependenciesMeta` — nothing in this package degrades gracefully without them.

## Testing

- Framework: Jest (`@infinitetoken/jest-config/react-native`), jsdom environment
- Mock: `src/__mocks__/expo-splash-screen.ts`, wired via `jest.config.cjs`'s `moduleNameMapper` since `expo-splash-screen` is a peer dependency, not something jest's automatic `__mocks__`-sibling-directory convention would pick up on its own
- 16 tests across 2 suites (`splashGate.test.ts`, `Gate.test.tsx`)
- 100% statement/branch/function/line coverage on `splashGate.ts` (the only file coverage is collected on — `src/index.ts` is excluded by the shared jest-config's default `collectCoverageFrom`)
- No `coverageThreshold` override — real coverage clears the fleet default (70/70/70/70) by a wide margin

## Code Style

Enforced by ESLint + Prettier — run `npm run lint` before finishing any task. `eslint.config.cjs` is a bare `module.exports = require('@infinitetoken/eslint-config/react-native')` — no local rule overrides.

**Prettier config** (`@infinitetoken/eslint-config/prettier`):
- Single quotes, JSX single quotes
- No semicolons
- No trailing commas
- Print width: 1000 (effectively disabled)

**ESLint rules** (from the shared `react-native` preset, warnings unless noted):
- `simple-import-sort` — imports and exports must be sorted
- `react-native/no-inline-styles` — no inline style objects
- `react-native/no-unused-styles` — no unused StyleSheet entries
- `no-console` — no console statements
- `@typescript-eslint/no-unused-vars` — `^_`-prefixed vars/args/caught-errors are ignored
- `@typescript-eslint/no-explicit-any` — off inside `__tests__`/`__mocks__`
- `react-hooks/rules-of-hooks` — error, not a warning
- `react-hooks/exhaustive-deps`, `react-hooks/refs`, `react-hooks/immutability`, `react-hooks/preserve-manual-memoization`, `react-hooks/set-state-in-effect`
- `package-json/order-properties`, `package-json/sort-collections` — on `package.json` itself

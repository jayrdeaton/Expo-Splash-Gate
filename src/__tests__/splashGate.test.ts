import * as SplashScreen from 'expo-splash-screen'

import { createSplashGate } from '../splashGate'

const hideAsync = SplashScreen.hideAsync as jest.Mock

describe('createSplashGate', () => {
  beforeEach(() => {
    hideAsync.mockClear()
  })

  it('does not hide the splash screen until every named gate has reported ready', () => {
    const gate = createSplashGate(['theme', 'fonts'])

    gate.markReady('theme')
    expect(hideAsync).not.toHaveBeenCalled()

    gate.markReady('fonts')
    expect(hideAsync).toHaveBeenCalledTimes(1)
  })

  it('hides regardless of the order gates report in', () => {
    const gate = createSplashGate(['a', 'b', 'c'])

    gate.markReady('c')
    gate.markReady('a')
    expect(hideAsync).not.toHaveBeenCalled()

    gate.markReady('b')
    expect(hideAsync).toHaveBeenCalledTimes(1)
  })

  it('only hides once, even if a gate reports ready again afterward', () => {
    const gate = createSplashGate(['theme'])

    gate.markReady('theme')
    gate.markReady('theme')
    gate.markReady('theme')

    expect(hideAsync).toHaveBeenCalledTimes(1)
  })

  it('marking an already-satisfied gate again before the others land is a no-op, not an early hide', () => {
    const gate = createSplashGate(['theme', 'fonts'])

    gate.markReady('theme')
    gate.markReady('theme')
    expect(hideAsync).not.toHaveBeenCalled()

    gate.markReady('fonts')
    expect(hideAsync).toHaveBeenCalledTimes(1)
  })

  it('reports the still-outstanding gates from pendingGates, empty once satisfied', () => {
    const gate = createSplashGate(['theme', 'fonts'])
    expect(gate.pendingGates().sort()).toEqual(['fonts', 'theme'])

    gate.markReady('theme')
    expect(gate.pendingGates()).toEqual(['fonts'])

    gate.markReady('fonts')
    expect(gate.pendingGates()).toEqual([])
  })

  it('hides immediately when created with no gates at all', () => {
    createSplashGate([])
    expect(hideAsync).toHaveBeenCalledTimes(1)
  })

  it('ignores a gate name it was never created with, rather than throwing', () => {
    const gate = createSplashGate(['theme'])

    // @ts-expect-error deliberately calling with a name outside the declared gate set, since a
    // plain-JS caller (no type checking) could do this by typo
    expect(() => gate.markReady('nonexistent')).not.toThrow()
    expect(hideAsync).not.toHaveBeenCalled()

    gate.markReady('theme')
    expect(hideAsync).toHaveBeenCalledTimes(1)
  })
})

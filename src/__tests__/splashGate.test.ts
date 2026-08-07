import { renderHook } from '@testing-library/react'
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

describe('useReady', () => {
  beforeEach(() => {
    hideAsync.mockClear()
  })

  it('does not mark the gate ready while the condition is false', () => {
    const gate = createSplashGate(['theme', 'fonts'])
    renderHook(() => gate.useReady('fonts', false))

    expect(gate.pendingGates()).toContain('fonts')
    expect(hideAsync).not.toHaveBeenCalled()
  })

  it('marks the gate ready once the condition becomes true, hiding once every gate is in', () => {
    const gate = createSplashGate(['theme', 'fonts'])
    const { rerender } = renderHook(({ ready }) => gate.useReady('fonts', ready), { initialProps: { ready: false } })
    gate.markReady('theme')

    expect(hideAsync).not.toHaveBeenCalled()

    rerender({ ready: true })
    expect(gate.pendingGates()).toEqual([])
    expect(hideAsync).toHaveBeenCalledTimes(1)
  })

  it('marks the gate ready immediately if the condition starts out true', () => {
    const gate = createSplashGate(['theme'])
    renderHook(() => gate.useReady('theme', true))

    expect(hideAsync).toHaveBeenCalledTimes(1)
  })

  it('does not call markReady again on an unrelated re-render once already satisfied', () => {
    const gate = createSplashGate(['theme'])
    const { rerender } = renderHook(({ ready }) => gate.useReady('theme', ready), { initialProps: { ready: true } })

    expect(hideAsync).toHaveBeenCalledTimes(1)

    rerender({ ready: true })
    expect(hideAsync).toHaveBeenCalledTimes(1)
  })
})

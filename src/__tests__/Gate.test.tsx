import { render, screen } from '@testing-library/react'
import * as SplashScreen from 'expo-splash-screen'

import { createGate } from '../splashGate'

const hideAsync = SplashScreen.hideAsync as jest.Mock

describe('Gate', () => {
  beforeEach(() => {
    hideAsync.mockClear()
  })

  it('renders the fallback (null by default) instead of children while not ready', () => {
    const gate = createGate(['theme', 'fonts'])
    render(
      <gate.Gate gate='theme' ready={false}>
        <span>theme content</span>
      </gate.Gate>
    )

    expect(screen.queryByText('theme content')).toBeNull()
  })

  it('renders children once ready is true, and registers the gate the same way useReady does', () => {
    const gate = createGate(['theme', 'fonts'])
    const { rerender } = render(
      <gate.Gate gate='theme' ready={false}>
        <span>theme content</span>
      </gate.Gate>
    )
    gate.markReady('fonts')
    expect(hideAsync).not.toHaveBeenCalled()

    rerender(
      <gate.Gate gate='theme' ready={true}>
        <span>theme content</span>
      </gate.Gate>
    )

    expect(screen.getByText('theme content')).not.toBeNull()
    expect(gate.pendingGates()).toEqual([])
    expect(hideAsync).toHaveBeenCalledTimes(1)
  })

  it('renders children immediately and registers the gate if ready starts out true', () => {
    const gate = createGate(['theme'])
    render(
      <gate.Gate gate='theme' ready={true}>
        <span>theme content</span>
      </gate.Gate>
    )

    expect(screen.getByText('theme content')).not.toBeNull()
    expect(gate.pendingGates()).toEqual([])
    expect(hideAsync).toHaveBeenCalledTimes(1)
  })

  it('renders a custom fallback while not ready, in place of children', () => {
    const gate = createGate(['theme'])
    render(
      <gate.Gate gate='theme' ready={false} fallback={<span>loading theme</span>}>
        <span>theme content</span>
      </gate.Gate>
    )

    expect(screen.getByText('loading theme')).not.toBeNull()
    expect(screen.queryByText('theme content')).toBeNull()
  })

  it('mounts children only once ready - a child whose state locks in on first render never sees a stale mount', () => {
    // Stands in for a third-party provider whose internal state is a lazy useState(() => ...)
    // initializer that only reads its prop on first mount - exactly the hazard Gate exists to
    // close (see splashGate.ts's own comment on Gate). If Gate rendered children immediately and
    // merely swapped the prop in later, this component would freeze on whatever `value` was at its
    // first render, same as the bug this primitive fixes.
    let mountCount = 0
    const LocksInOnMount = ({ value }: { value: string }) => {
      mountCount += 1
      return <span>{value}</span>
    }

    const gate = createGate(['data'])
    const { rerender } = render(
      <gate.Gate gate='data' ready={false}>
        <LocksInOnMount value='stale' />
      </gate.Gate>
    )
    expect(mountCount).toBe(0)

    rerender(
      <gate.Gate gate='data' ready={true}>
        <LocksInOnMount value='correct' />
      </gate.Gate>
    )

    expect(mountCount).toBe(1)
    expect(screen.getByText('correct')).not.toBeNull()
  })
})

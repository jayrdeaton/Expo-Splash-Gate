import { renderHook } from '@testing-library/react'

import { useMarkReadyWhen } from '../useMarkReadyWhen'

describe('useMarkReadyWhen', () => {
  it('does not mark the gate ready while the condition is false', () => {
    const markReady = jest.fn()
    renderHook(() => useMarkReadyWhen(markReady, 'fonts', false))

    expect(markReady).not.toHaveBeenCalled()
  })

  it('marks the gate ready once the condition becomes true', () => {
    const markReady = jest.fn()
    const { rerender } = renderHook(({ ready }) => useMarkReadyWhen(markReady, 'fonts', ready), { initialProps: { ready: false } })

    expect(markReady).not.toHaveBeenCalled()

    rerender({ ready: true })
    expect(markReady).toHaveBeenCalledWith('fonts')
    expect(markReady).toHaveBeenCalledTimes(1)
  })

  it('marks the gate ready immediately if the condition starts out true', () => {
    const markReady = jest.fn()
    renderHook(() => useMarkReadyWhen(markReady, 'theme', true))

    expect(markReady).toHaveBeenCalledWith('theme')
  })

  it('does not call markReady again on an unrelated re-render once already satisfied', () => {
    const markReady = jest.fn()
    const { rerender } = renderHook(({ ready }) => useMarkReadyWhen(markReady, 'fonts', ready), { initialProps: { ready: true } })

    expect(markReady).toHaveBeenCalledTimes(1)

    rerender({ ready: true })
    expect(markReady).toHaveBeenCalledTimes(1)
  })
})

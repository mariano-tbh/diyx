import { describe, expect, test, vi } from 'vitest'
import { Signal } from 'signal-polyfill'
import { scheduleEffect } from './scheduler'

describe('scheduleEffect (shared scheduler)', () => {
  test('calls onPending in a microtask when the computed becomes stale', async () => {
    const state = new Signal.State(0)
    const computed = new Signal.Computed(() => state.get())
    const cb = vi.fn()

    const unregister = scheduleEffect(computed, cb)
    computed.get() // seed the graph

    state.set(1)
    expect(cb).not.toHaveBeenCalled() // not synchronous

    await Promise.resolve()
    expect(cb).toHaveBeenCalledTimes(1)

    unregister()
  })

  test('unregister prevents the callback from firing', async () => {
    const state = new Signal.State(0)
    const computed = new Signal.Computed(() => state.get())
    const cb = vi.fn()

    const unregister = scheduleEffect(computed, cb)
    computed.get()

    unregister()

    state.set(1)
    await Promise.resolve()
    expect(cb).not.toHaveBeenCalled()
  })

  test('multiple computeds share the same microtask flush', async () => {
    const state = new Signal.State(0)
    const compA = new Signal.Computed(() => state.get() * 2)
    const compB = new Signal.Computed(() => state.get() + 10)

    const cbA = vi.fn()
    const cbB = vi.fn()
    const unregA = scheduleEffect(compA, cbA)
    const unregB = scheduleEffect(compB, cbB)
    compA.get()
    compB.get()

    state.set(5)
    await Promise.resolve()

    expect(cbA).toHaveBeenCalledTimes(1)
    expect(cbB).toHaveBeenCalledTimes(1)

    unregA()
    unregB()
  })

  test('callback that was unregistered mid-flight (between notify and flush) does not fire', async () => {
    const state = new Signal.State(0)
    const computed = new Signal.Computed(() => state.get())
    const cb = vi.fn()

    const unregister = scheduleEffect(computed, cb)
    computed.get()

    state.set(1) // marks as pending, queues microtask
    unregister()  // remove before microtask runs

    await Promise.resolve()
    expect(cb).not.toHaveBeenCalled()
  })
})

import { describe, expect, test, vi } from 'vitest'
import { StatefulSignal } from './stateful-signal'
import { Watcher } from './watcher'

describe('Watcher', () => {
  test('runs the effect immediately and re-runs on signal change', async () => {
    const signal = new StatefulSignal(0)
    const cb = vi.fn()
    const effectFn = () => { cb('Effect ran with value:', signal.value) }

    const watcher = new Watcher()
    const dispose = watcher.watch(effectFn)

    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb).toHaveBeenCalledWith('Effect ran with value:', 0)

    signal.value = 1
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(cb).toHaveBeenCalledTimes(2)
    expect(cb).toHaveBeenCalledWith('Effect ran with value:', 1)

    dispose()

    signal.value = 2
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(cb).toHaveBeenCalledTimes(2)
  })

  test('dispose() aborts the AbortController from the last run (#3)', () => {
    const signal = new StatefulSignal(0)
    let lastAbortSignal: AbortSignal | null = null

    const watcher = new Watcher()
    const dispose = watcher.watch(({ abortSignal }) => {
      lastAbortSignal = abortSignal
      signal.value // track dependency
    })

    expect(lastAbortSignal).not.toBeNull()
    expect(lastAbortSignal!.aborted).toBe(false)

    dispose()

    expect(lastAbortSignal!.aborted).toBe(true)
  })

  test('destroy() tears down all registered effects (#1 / Watcher.destroy)', async () => {
    const signal = new StatefulSignal(0)
    const cb = vi.fn()

    const watcher = new Watcher()
    watcher.watch(() => { cb(signal.value) })

    cb.mockClear()
    watcher.destroy()

    signal.value = 99
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(cb).not.toHaveBeenCalled()
  })

  test('destroy() aborts the last AbortController of each effect', () => {
    let lastSignal: AbortSignal | null = null
    const watcher = new Watcher()
    watcher.watch(({ abortSignal }) => { lastSignal = abortSignal })

    expect(lastSignal!.aborted).toBe(false)
    watcher.destroy()
    expect(lastSignal!.aborted).toBe(true)
  })

  test('manually disposed effects are not double-disposed on destroy()', () => {
    const signal = new StatefulSignal(0)
    const cb = vi.fn()

    const watcher = new Watcher()
    const dispose = watcher.watch(() => { cb(signal.value) })

    dispose() // manual disposal
    cb.mockClear()

    // destroy() should not throw or call the effect again
    expect(() => watcher.destroy()).not.toThrow()

    signal.value = 1
    expect(cb).not.toHaveBeenCalled()
  })
})

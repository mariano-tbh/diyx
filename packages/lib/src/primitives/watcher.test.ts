import { expect, test, vi } from 'vitest'
import { StatefulSignal } from './stateful-signal'
import { Watcher } from './watcher'

test('watcher runs the effect immediately and on signal change', async () => {
  const signal = new StatefulSignal(0)

  const cb = vi.fn()
  const effectFn = (() => {
    cb('Effect ran with value:', signal.value)
  })

  const watcher = new Watcher()
  const dispose = watcher.watch(effectFn)

  // Initial run
  expect(cb).toHaveBeenCalledTimes(1)
  expect(cb).toHaveBeenCalledWith('Effect ran with value:', 0)

  // Change the signal value
  signal.value = 1

  // Wait for the microtask queue to flush
  await new Promise((resolve) => setTimeout(resolve, 0))

  expect(cb).toHaveBeenCalledTimes(2)
  expect(cb).toHaveBeenCalledWith('Effect ran with value:', 1)

  // Clean up
  dispose()

  // Change the signal value again
  signal.value = 2

  // Wait for the microtask queue to flush
  await new Promise((resolve) => setTimeout(resolve, 0))

  // The effect should not run again after disposal
  expect(cb).toHaveBeenCalledTimes(2)
})

import { describe, expect, test, vi, afterEach } from 'vitest'
import { onCleanup, runCleanup, markManagedRemoval, observeRemovals } from './cleanup'

describe('cleanup', () => {
  afterEach(() => {
    // Remove any nodes added to the body during tests
    document.body.innerHTML = ''
  })

  test('onCleanup + runCleanup fires registered functions', () => {
    const el = document.createElement('div')
    const fn = vi.fn()
    onCleanup(el, fn)
    runCleanup(el)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  test('runCleanup is idempotent — second call is a no-op', () => {
    const el = document.createElement('div')
    const fn = vi.fn()
    onCleanup(el, fn)
    runCleanup(el)
    runCleanup(el)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  test('runCleanup recurses into child nodes', () => {
    const parent = document.createElement('div')
    const child = document.createElement('span')
    parent.appendChild(child)

    const parentFn = vi.fn()
    const childFn = vi.fn()
    onCleanup(parent, parentFn)
    onCleanup(child, childFn)

    runCleanup(parent)

    expect(parentFn).toHaveBeenCalledTimes(1)
    expect(childFn).toHaveBeenCalledTimes(1)
  })

  describe('markManagedRemoval (#6 — no double-cleanup)', () => {
    test('observer does not fire cleanup for a node already cleaned by the framework', async () => {
      const container = document.createElement('div')
      document.body.appendChild(container)
      const stop = observeRemovals(container)

      const el = document.createElement('div')
      container.appendChild(el)
      const fn = vi.fn()
      onCleanup(el, fn)

      // Framework path: mark → cleanup → remove
      markManagedRemoval(el)
      runCleanup(el)
      container.removeChild(el)

      // Wait for the MutationObserver microtask
      await new Promise(r => setTimeout(r, 0))

      expect(fn).toHaveBeenCalledTimes(1) // must be exactly once
      stop()
    })

    test('observer fires cleanup for nodes removed externally (not marked)', async () => {
      const container = document.createElement('div')
      document.body.appendChild(container)
      const stop = observeRemovals(container)

      const el = document.createElement('div')
      container.appendChild(el)
      const fn = vi.fn()
      onCleanup(el, fn)

      // External removal — no markManagedRemoval call
      container.removeChild(el)

      await new Promise(r => setTimeout(r, 0))

      expect(fn).toHaveBeenCalledTimes(1)
      stop()
    })
  })
})

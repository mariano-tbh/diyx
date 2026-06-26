import { describe, expect, test, vi } from 'vitest'
import { Destroyable } from './destroyable'

// Destroyable has a protected constructor; test it via Destroyable.from() and
// a thin subclass.
class TestDestroyable extends Destroyable {
  constructor() { super() }
}

describe('Destroyable', () => {
  test('onDestroy callback is called when destroy() is invoked', () => {
    const d = new TestDestroyable()
    const cb = vi.fn()
    d.onDestroy(cb)
    d.destroy()
    expect(cb).toHaveBeenCalledTimes(1)
  })

  test('multiple onDestroy callbacks are all called', () => {
    const d = new TestDestroyable()
    const cb1 = vi.fn()
    const cb2 = vi.fn()
    d.onDestroy(cb1)
    d.onDestroy(cb2)
    d.destroy()
    expect(cb1).toHaveBeenCalledTimes(1)
    expect(cb2).toHaveBeenCalledTimes(1)
  })

  test('destroy() is idempotent — callbacks fire only once even if called twice', () => {
    const d = new TestDestroyable()
    const cb = vi.fn()
    d.onDestroy(cb)
    d.destroy()
    d.destroy()
    expect(cb).toHaveBeenCalledTimes(1)
  })

  test('isDestroyed is false before destroy() and true after', () => {
    const d = new TestDestroyable()
    expect(d.isDestroyed).toBe(false)
    d.destroy()
    expect(d.isDestroyed).toBe(true)
  })

  test('onDestroy called after already-destroyed runs the callback immediately', () => {
    const d = new TestDestroyable()
    d.destroy()
    const cb = vi.fn()
    d.onDestroy(cb)
    expect(cb).toHaveBeenCalledTimes(1)
  })

  test('Destroyable.from() creates an instance that fires the callback on destroy', () => {
    const cb = vi.fn()
    const d = Destroyable.from(cb)
    expect(cb).not.toHaveBeenCalled()
    d.destroy()
    expect(cb).toHaveBeenCalledTimes(1)
  })
})

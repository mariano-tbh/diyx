import { StatefulSignal, type StatefulSignalOptions } from './stateful-signal'

export type TwoWaySignalOptions<T> = {
  events?: string | string[]
} & StatefulSignalOptions<T>

export type Accessors<T> = {
  get: () => T
  set: (value: T) => void
}

export class BoundSignal<T> extends StatefulSignal<T> {
  readonly #events: string[]

  constructor(initialValue: T, options: TwoWaySignalOptions<T> = {}) {
    super(initialValue, options)
    const { events = 'change' } = options
    this.#events = Array.isArray(events) ? events : [events]
  }

  bind(target: EventTarget, accessors: Accessors<T>): () => void {
    const removeListeners: Array<() => void> = []
    let active = true

    for (const event of this.#events) {
      const callback = () => {
        if (!active) return
        const value = accessors.get()
        if (typeof value !== typeof this.value) {
          throw new TypeError(`Type mismatch: expected ${typeof this.value}, got ${typeof value}`)
        }
        this.value = value
      }
      target.addEventListener(event, callback)
      removeListeners.push(() => target.removeEventListener(event, callback))
    }

    // Signal → DOM subscription. Must be included in cleanup so that
    // removing an element stops the signal from updating a detached node.
    const unsub = this.subscribe((value) => {
      if (active) accessors.set(value)
    })
    accessors.set(this.value)

    const cleanup = () => {
      if (!active) return
      active = false
      for (const remove of removeListeners) remove()
      unsub()
    }

    // Also clean up when the signal itself is destroyed, not only when the
    // caller explicitly invokes the returned function.
    this.onDestroy(cleanup)

    return cleanup
  }
}

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
    const callbacks: Set<() => void> = new Set()

    for (const event of this.#events) {
      const callback = () => {
        const value = accessors.get()
        if (typeof value !== typeof this.value) {
          throw new TypeError(`Type mismatch: expected ${typeof this.value}, got ${typeof value}`)
        }
        this.value = value
      }

      target.addEventListener(event, callback)
      callbacks.add(() => {
        target.removeEventListener(event, callback)
      })
    }

    this.subscribe((value) => {
      accessors.set(value)
    })
    accessors.set(this.value)

    return () => {
      for (const cb of callbacks) cb()
      callbacks.clear()
    }
  }
}

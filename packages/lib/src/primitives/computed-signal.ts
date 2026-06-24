import { Signal } from "signal-polyfill";
import { Subject, type SubjectOptions } from "./subject";

export type ComputedSignalOptions<T> = {
  hot?: boolean
} & SubjectOptions<T>

export class ComputedSignal<T> extends Subject<T> {
  readonly #value: Signal.Computed<T>

  constructor(fn: () => T, options: ComputedSignalOptions<T> = {}) {
    super(options)
    this.#value = new Signal.Computed(fn, { equals: options.equals })

    let scheduled = false
    const watcher = new Signal.subtle.Watcher(() => {
      if (!scheduled) {
        scheduled = true
        queueMicrotask(() => {
          scheduled = false
          const pending = watcher.getPending()
          if (pending.length === 0) return
          for (const s of pending) {
            this.publish(s.get())
          }
          watcher.watch()
        })
      }
    })

    watcher.watch(this.#value)
    const _ = this.#value.get()
    this.onDestroy(() => {
      watcher.unwatch(this.#value)
    })
  }

  get value(): T {
    return this.#value.get()
  }
}
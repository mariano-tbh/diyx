import { Signal } from 'signal-polyfill'
import { Subject, type SubjectOptions } from './subject'
import { scheduleEffect } from './scheduler'

export type ComputedSignalOptions<T> = {
  hot?: boolean
} & SubjectOptions<T>

export class ComputedSignal<T> extends Subject<T> {
  readonly #value: Signal.Computed<T>

  constructor(fn: () => T, options: ComputedSignalOptions<T> = {}) {
    super(options)
    this.#value = new Signal.Computed(fn, { equals: options.equals })

    const unschedule = scheduleEffect(this.#value, () => {
      if (!this.isDestroyed) this.publish(this.#value.get())
    })

    this.#value.get() // initial evaluation to seed the computation graph
    this.onDestroy(unschedule)
  }

  get value(): T {
    return this.#value.get()
  }
}

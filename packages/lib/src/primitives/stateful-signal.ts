import { Signal } from 'signal-polyfill'
import { Subject, type SubjectOptions } from './subject'

export type StatefulSignalOptions<T> = {
  hot?: boolean
} & SubjectOptions<T>

export class StatefulSignal<T> extends Subject<T> {
  readonly #value: Signal.State<T>
  readonly #options: StatefulSignalOptions<T>

  constructor(initialValue: T, options: StatefulSignalOptions<T> = {}) {
    super(options)
    this.#value = new Signal.State(initialValue, { equals: options.equals })
    this.#options = options
    if (options.hot) {
      this.value = this.#value.get()
    }
  }

  get value(): T {
    return this.#value.get()
  }

  set value(newValue: T) {
    this.#value.set(newValue)
    this.publish(newValue)
  }

  with(value: T, options: StatefulSignalOptions<T> = {}): StatefulSignal<T> {
    return new StatefulSignal(value, { ...this.#options, ...options })
  }
}

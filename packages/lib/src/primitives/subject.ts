import { Destroyable } from "./destroyable"

export type Subscription<T> = (value: T) => void
export type Unsubscribe = () => void

export type SubjectOptions<T> = {
  hot?: boolean
  equals?: (a: T, b: T) => boolean
}

export class Subject<T = unknown> extends Destroyable {
  readonly #subs: Set<Subscription<T>> = new Set()
  readonly #equals: (a: T, b: T) => boolean
  readonly #hot: boolean

  #lastValue?: T

  constructor(options: SubjectOptions<T> = {}) {
    super()
    this.#equals = options.equals ?? Object.is
    this.#hot = options.hot ?? false
  }

  get lastValue(): T | undefined {
    return this.#lastValue
  }

  publish(value: T): void {
    if (typeof this.#lastValue !== 'undefined' && this.#equals(this.#lastValue, value)) {
      return
    }

    this.#lastValue = value

    for (const sub of this.#subs) {
      sub(value)
    }
  }

  subscribe(sub: Subscription<T>, options: { hot?: boolean } = {}): Unsubscribe {
    this.#subs.add(sub)
    if ((options.hot ?? this.#hot) && typeof this.#lastValue !== 'undefined') {
      sub(this.#lastValue)
    }
    return () => this.#subs.delete(sub)
  }

  destroy(): void {
    super.destroy()
    this.#subs.clear()
  }
}
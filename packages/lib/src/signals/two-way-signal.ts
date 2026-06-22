import { Signal } from 'signal-polyfill'

export class TwoWaySignal<T> extends Signal.State<T> {
  readonly #events: string[]

  constructor(initialValue: T, events: string[]) {
    super(initialValue)
    this.#events = events
  }

  public get events() {
    return this.#events
  }
}

export function isTwoWaySignal(value: unknown): value is TwoWaySignal<unknown> {
  return value instanceof TwoWaySignal
}

export function twoWaySignal<T>(
  initialValue: T,
  config?: { event?: string | string[] },
): TwoWaySignal<T> {
  const raw = config?.event ?? 'change'
  const events = Array.isArray(raw) ? raw : [raw]
  return new TwoWaySignal(initialValue, events)
}

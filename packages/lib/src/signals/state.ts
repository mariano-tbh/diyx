import { Signal } from 'signal-polyfill'

export { Signal }

export type AnySignal<T = unknown> = Signal.State<T> | Signal.Computed<T>
export type MaybeSignal<T> = T | AnySignal<T>

export function state<T>(initialValue: T): Signal.State<T> {
  return new Signal.State(initialValue)
}

export function computed<T>(fn: () => T): Signal.Computed<T> {
  return new Signal.Computed(fn)
}

export function isSignal(value: unknown): value is AnySignal {
  return value instanceof Signal.State || value instanceof Signal.Computed
}

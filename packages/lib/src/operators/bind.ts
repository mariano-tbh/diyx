import { BoundSignal, type TwoWaySignalOptions } from "../primitives/bound-signal"
import { $$_internals_currentComponentFrame } from "../runtime"

export function bind<T>(initialValue: T, options: TwoWaySignalOptions<T> = {}): BoundSignal<T> {
  const twoWaySignal = new BoundSignal(initialValue, options)
  $$_internals_currentComponentFrame?.state.add(twoWaySignal)
  return twoWaySignal
}
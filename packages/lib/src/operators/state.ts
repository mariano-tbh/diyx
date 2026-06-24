import { StatefulSignal, type StatefulSignalOptions } from "../primitives";
import { $$_internals_currentComponentFrame } from "../runtime";

export function state<T>(initialValue: T, options: StatefulSignalOptions<T> = {}): StatefulSignal<T> {
  const signal = new StatefulSignal(initialValue, options);
  $$_internals_currentComponentFrame?.state.add(signal);
  return signal;
}
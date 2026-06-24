import { ComputedSignal, type ComputedSignalOptions } from "../primitives/computed-signal";
import { $$_internals_currentComponentFrame } from "../runtime";

export function computed<T>(fn: () => T, options?: ComputedSignalOptions<T>): ComputedSignal<T> {
  const signal = new ComputedSignal(fn, options);
  $$_internals_currentComponentFrame?.state.add(signal);
  return signal;
}
import { Watcher } from "../primitives/watcher";
import { $$_internals_currentComponentFrame } from "../runtime";

export function watch(fn: ({ abortSignal }: { abortSignal: AbortSignal }) => void): Watcher {
  const watcher = new Watcher()
  $$_internals_currentComponentFrame?.state.add(watcher)
  watcher.watch(fn)
  return watcher
}
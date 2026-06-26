import { Signal } from 'signal-polyfill'

type PendingCallback = () => void

// One Signal.subtle.Watcher is shared across all ComputedSignal and Watcher
// instances. Per-instance watchers were wasteful — each adds internal bookkeeping
// to the polyfill and queues its own microtask.
const callbacks = new WeakMap<object, PendingCallback>()
let scheduled = false

const sharedWatcher = new Signal.subtle.Watcher(() => {
  if (!scheduled) {
    scheduled = true
    queueMicrotask(flush)
  }
})

function flush(): void {
  scheduled = false
  const pending = sharedWatcher.getPending()
  for (const s of pending) {
    callbacks.get(s)?.()
  }
  // Re-arm for the next change cycle. Signals that were unwatched between
  // notification and this flush are already absent from the watcher's set.
  sharedWatcher.watch()
}

/**
 * Register `computed` with the shared watcher so that `onPending` is called
 * in a microtask whenever the computed becomes stale.
 *
 * Returns an unregister function. Calling it removes the computed from the
 * watcher immediately, so the callback will not fire even if the microtask is
 * already queued.
 */
export function scheduleEffect<T>(
  computed: Signal.Computed<T>,
  onPending: PendingCallback,
): () => void {
  callbacks.set(computed, onPending)
  sharedWatcher.watch(computed)
  return () => {
    sharedWatcher.unwatch(computed)
    callbacks.delete(computed)
  }
}

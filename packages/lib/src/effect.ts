import { Signal } from 'signal-polyfill'

// A single shared watcher drives all reactive effects.
// When any watched Computed becomes stale, we schedule a microtask flush.
let scheduled = false

const watcher = new Signal.subtle.Watcher(() => {
  if (!scheduled) {
    scheduled = true
    queueMicrotask(flush)
  }
})

function flush(): void {
  scheduled = false
  const pending = watcher.getPending()
  if (pending.length === 0) return
  // Re-arm the watcher (no args = reset dirty flag only, do NOT re-register
  // signals — they are already in the watcher's producerNode from the initial
  // `watcher.watch(c)` call in `effect()`. Re-registering via spread would
  // grow producerNode unboundedly since nextProducerIndex is never reset).
  watcher.watch()
  for (const s of pending) s.get()
}

/**
 * Creates a reactive side-effect that re-runs whenever any signal it reads
 * changes. Runs once immediately. Returns a dispose function.
 *
 * NOTE: signal reads after an `await` inside an async generator will NOT be
 * tracked — always read signals in the synchronous segment before any await.
 */
export function effect(fn: () => void): () => void {
  // Signal.Computed used as an effect (side-effecting compute) — the standard
  // pattern with the TC39 proposal polyfill until Signal.effect is standardised.
  const c = new Signal.Computed(fn)
  watcher.watch(c)
  c.get() // initial run
  return () => watcher.unwatch(c) as void
}

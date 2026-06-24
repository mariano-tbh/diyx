import { Signal } from "signal-polyfill";
import { Subject } from "./subject";

export type Watchable = ({ abortSignal }: {
  abortSignal: AbortSignal;
}) => void;

export class Watcher extends Subject<unknown> {
  // A single shared watcher drives all reactive effects.
  // When any watched Computed becomes stale, we schedule a microtask flush.
  #scheduled = false

  readonly #watcher = new Signal.subtle.Watcher(() => {
    if (!this.#scheduled) {
      this.#scheduled = true
      queueMicrotask(() => {
        this.#scheduled = false
        const pending = this.#watcher.getPending()
        if (pending.length === 0) return
        for (const s of pending) s.get()
        this.#watcher.watch()
      })
    }
  })

  /**
   * Creates a reactive side-effect that re-runs whenever any signal it reads
   * changes. Runs once immediately. Returns a dispose function.
   *
   * NOTE: signal reads after an `await` inside an async generator will NOT be
   * tracked — always read signals in the synchronous segment before any await.
   */
  watch(fn: Watchable): () => void {
    // Signal.Computed used as an effect (side-effecting compute) — the standard
    // pattern with the TC39 proposal polyfill until Signal.effect is standardised.
    let abortController: AbortController | null = null
    const computed = new Signal.Computed(() => {
      abortController?.abort()
      abortController = new AbortController()
      fn({ abortSignal: abortController.signal })
      this.publish(undefined)
    })
    this.#watcher.watch(computed)
    computed.get() // initial run
    return () => { this.#watcher.unwatch(computed) }
  }
}

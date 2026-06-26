import { Signal } from 'signal-polyfill'
import { Subject } from './subject'
import { scheduleEffect } from './scheduler'

export type Watchable = ({ abortSignal }: { abortSignal: AbortSignal }) => void

export class Watcher extends Subject<unknown> {
  // Tracks every dispose returned by watch() so destroy() can tear them all down.
  readonly #disposes = new Set<() => void>()

  /**
   * Creates a reactive side-effect that re-runs whenever any signal it reads
   * changes. Runs once immediately. Returns a dispose function.
   *
   * NOTE: signal reads after an `await` inside an async generator will NOT be
   * tracked — always read signals in the synchronous segment before any await.
   */
  watch(fn: Watchable): () => void {
    let abortController: AbortController | null = null

    // Signal.Computed used as an effect — the standard TC39 polyfill pattern
    // until Signal.effect is standardised.
    const computed = new Signal.Computed(() => {
      abortController?.abort()
      abortController = new AbortController()
      fn({ abortSignal: abortController.signal })
      this.publish(undefined)
    })

    const unschedule = scheduleEffect(computed, () => computed.get())
    computed.get() // initial run

    const dispose = () => {
      unschedule()
      abortController?.abort() // abort the final run's cleanup signal
      this.#disposes.delete(dispose)
    }
    this.#disposes.add(dispose)
    return dispose
  }

  override destroy(): void {
    // Clean up all live effects before tearing down subscribers.
    for (const dispose of this.#disposes) dispose()
    this.#disposes.clear()
    super.destroy()
  }
}

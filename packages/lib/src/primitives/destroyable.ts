export type OnDestroy = () => void

export class Destroyable {
  #isDestroyed = false
  readonly #callbacks: Set<OnDestroy> = new Set()

  protected constructor() {}

  static from(callback: () => void): Destroyable {
    const d = new Destroyable()
    d.onDestroy(callback)
    return d
  }

  get isDestroyed(): boolean {
    return this.#isDestroyed
  }

  destroy(): void {
    if (this.#isDestroyed) return
    this.#isDestroyed = true
    for (const cb of this.#callbacks) cb()
    this.#callbacks.clear()
  }

  onDestroy(callback: () => void): void {
    if (this.#isDestroyed) {
      callback()
    } else {
      this.#callbacks.add(callback)
    }
  }
}

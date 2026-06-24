export class Destroyable extends EventTarget {
  #isDestroyed = false

  protected constructor() {
    super()
  }

  static from(callback: () => void): Destroyable {
    const destroyable = new Destroyable()
    destroyable.onDestroy(callback)
    return destroyable
  }

  get isDestroyed(): boolean {
    return this.#isDestroyed
  }

  destroy(): void {
    this.#isDestroyed = true
    this.dispatchEvent(new Event("destroy"))
  }

  onDestroy(callback: () => void): void {
    if (this.#isDestroyed) {
      callback()
    } else {
      this.addEventListener("destroy", callback, { once: true })
    }
  }
}
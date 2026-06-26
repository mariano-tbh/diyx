import { describe, expect, test, vi } from "vitest";
import { ComputedSignal } from "./computed-signal";
import { StatefulSignal } from "./stateful-signal";

describe(ComputedSignal.name, () => {
  test("should compute a value based on other signals and notify subscribers on value updates", () => {
    const signalA = new StatefulSignal(1);
    const signalB = new ComputedSignal(() => 2);
    const computedSignal = new ComputedSignal(() => signalA.value + signalB.value);
    expect(computedSignal.value).toBe(3)
  })

  test("should compute a value based on other signals and notify subscribers on value updates", async () => {
    const signalA = new StatefulSignal(1);
    const signalB = new ComputedSignal(() => 2);
    const computedSignal = new ComputedSignal(() => signalA.value + signalB.value);

    const subscriber = vi.fn()
    computedSignal.subscribe(subscriber)

    signalA.value = 5;

    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(subscriber).toHaveBeenCalledWith(7);
  })

  test('does not publish after being destroyed (#5)', async () => {
    const source = new StatefulSignal(0)
    const computed = new ComputedSignal(() => source.value * 2)

    const subscriber = vi.fn()
    computed.subscribe(subscriber)
    subscriber.mockClear()

    computed.destroy()

    source.value = 5
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(subscriber).not.toHaveBeenCalled()
  })

  test('stops tracking after being destroyed — scheduler callback is removed', async () => {
    const source = new StatefulSignal(0)
    const computed = new ComputedSignal(() => source.value)
    const subscriber = vi.fn()
    computed.subscribe(subscriber)
    subscriber.mockClear()

    computed.destroy()

    // Multiple signal changes should produce zero callbacks
    source.value = 1
    source.value = 2
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(subscriber).not.toHaveBeenCalled()
  })
})
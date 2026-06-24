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
})
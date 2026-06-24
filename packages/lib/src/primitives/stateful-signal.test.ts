import { describe, expect, test, vi } from "vitest";
import { StatefulSignal } from "./stateful-signal";

describe(StatefulSignal.name, () => {
  test("should store a value and notify subscribes on value updates", () => {
    const signal = new StatefulSignal(42);

    const cb = vi.fn()

    signal.subscribe((value) => {
      cb(value);
    });

    signal.value = 100;

    expect(cb).toHaveBeenCalledWith(100);
  });

  test("should store a value and notify subscribes on value updates", () => {
    const signal = new StatefulSignal(42, { hot: true });

    const cb = vi.fn()

    signal.subscribe((value) => {
      cb(value);
    });

    expect(cb).toHaveBeenCalledWith(42);
  });
});

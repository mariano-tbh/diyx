import { describe, expect, test } from "vitest";
import { BoundSignal } from "./bound-signal";

describe(BoundSignal.name, () => {
  class TestTarget extends EventTarget {
    value: string = "";
  }

  test("should bind to a DOM element and update the signal value on event", () => {
    const target = new TestTarget();
    const signal = new BoundSignal<string>("initial", { events: "input" });

    signal.bind(target, {
      get: () => target.value,
      set: (value) => {
        target.value = value;
      },
    });

    expect(target.value).toBe("initial");

    target.value = "changed";
    target.dispatchEvent(new Event("input"));
    expect(signal.value).toBe("changed");

    signal.destroy();

    target.value = "another change";
    target.dispatchEvent(new Event("input"));
    expect(signal.value).toBe("changed"); // Should not change after destroy
  })

  test("supports multiple events", () => {
    const target = new TestTarget();
    const signal = new BoundSignal<string>("initial", { events: ["input", "change"] });

    signal.bind(target, {
      get: () => target.value,
      set: (value) => {
        target.value = value;
      },
    });

    expect(target.value).toBe("initial");

    target.value = "changed";
    target.dispatchEvent(new Event("input"));
    expect(signal.value).toBe("changed");

    target.value = "another change";
    target.dispatchEvent(new Event("change"));
    expect(signal.value).toBe("another change");
  })
})
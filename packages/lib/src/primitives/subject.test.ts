import { describe, test, vi, expect } from "vitest";
import { Subject } from "./subject";

describe(Subject.name, () => {
  test("should notify subscribers when a value is published", () => {
    const subject = new Subject<number>();
    const cb = vi.fn()
    subject.subscribe(cb)
    subject.publish(42)
    expect(cb).toHaveBeenCalledWith(42)
  })

  test("should notify immediately when hot is true and there is a previous value", () => {
    const subject = new Subject<number>({ hot: true });
    subject.publish(42) // initialize #lastValue
    const cb = vi.fn()
    subject.subscribe(cb)
    expect(cb).toHaveBeenCalledWith(42)
  })

  test("should not notify when the value is the same as the previous value according to the equals function", () => {
    const subject = new Subject<{ foo: string }>({
      equals(a, b) {
        return a.foo === b.foo
      },
    });
    const cb = vi.fn()
    subject.subscribe(cb)

    subject.publish({ foo: 'bar' })
    expect(cb).toHaveBeenCalledWith({ foo: 'bar' })
    subject.publish({ foo: 'bar' }) // same value according to equals
    expect(cb).toHaveBeenCalledTimes(1) // should not be called again
    subject.publish({ foo: 'baz' }) // different value
    expect(cb).toHaveBeenCalledWith({ foo: 'baz' })
  })
})
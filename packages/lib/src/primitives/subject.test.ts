import { describe, test, vi, expect } from "vitest";
import { Subject } from "./subject";

// ---------------------------------------------------------------------------
// Mid-notification safety (#7 — publish snapshots the subscriber set)
// ---------------------------------------------------------------------------

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

  test('subscriber that removes a later subscriber mid-notification still delivers to that subscriber for the current event', () => {
    const subject = new Subject<number>()
    const calls: string[] = []

    let unsub3: () => void

    subject.subscribe(() => {
      calls.push('sub1')
      unsub3() // remove sub3 before it has been visited
    })
    subject.subscribe(() => calls.push('sub2'))
    unsub3 = subject.subscribe(() => calls.push('sub3'))

    subject.publish(1)

    // All three should receive this event because publish snapshots the set.
    expect(calls).toEqual(['sub1', 'sub2', 'sub3'])

    // After the publish, sub3 must be gone.
    subject.publish(2)
    expect(calls).toEqual(['sub1', 'sub2', 'sub3', 'sub1', 'sub2'])
  })

  test('subscriber that adds a new subscription mid-notification does not deliver to the new subscriber for the current event', () => {
    const subject = new Subject<number>()
    const calls: string[] = []

    subject.subscribe(() => {
      calls.push('sub1')
      subject.subscribe(() => calls.push('added-during-notify'))
    })
    subject.subscribe(() => calls.push('sub2'))

    subject.publish(1)
    expect(calls).toEqual(['sub1', 'sub2']) // newly added sub must NOT fire this round

    subject.publish(2)
    expect(calls).toEqual(['sub1', 'sub2', 'sub1', 'sub2', 'added-during-notify'])
  })
})
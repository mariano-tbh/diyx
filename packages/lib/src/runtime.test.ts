import { afterEach, describe, expect, test, vi } from 'vitest'
import { h, mount, Fragment, $$_internals_currentComponentFrame } from './runtime'
import { state } from './operators/state'
import { compute } from './operators/compute'
import { watch } from './operators/watch'

afterEach(() => {
  document.body.innerHTML = ''
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function container(): HTMLDivElement {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

function tick(): Promise<void> {
  return new Promise(r => setTimeout(r, 0))
}

// ---------------------------------------------------------------------------
// Component frame lifecycle (#1, #4)
// ---------------------------------------------------------------------------

describe('component frame lifecycle', () => {
  test('$$_internals_currentComponentFrame is null between renders', () => {
    // Before any render, the frame must be null.
    expect($$_internals_currentComponentFrame).toBeNull()

    const root = container()
    const App = () => {
      // During init: frame is set
      expect($$_internals_currentComponentFrame).not.toBeNull()
      return document.createElement('div')
    }

    mount(root, h(App, null) as unknown as Node)

    // After mount, frame must be restored to null.
    expect($$_internals_currentComponentFrame).toBeNull()
  })

  test('sibling components get independent frames', () => {
    const frames: (typeof $$_internals_currentComponentFrame)[] = []

    const A = () => { frames.push($$_internals_currentComponentFrame); return document.createElement('span') }
    const B = () => { frames.push($$_internals_currentComponentFrame); return document.createElement('span') }

    const root = container()
    // Render both as children of a fragment
    const Parent = () => function* () {
      yield h(A, null) as unknown as Node
      yield h(B, null) as unknown as Node
    }
    mount(root, h(Parent, null) as unknown as Node)

    expect(frames).toHaveLength(2)
    expect(frames[0]).not.toBe(frames[1])
    expect(frames[0]).not.toBeNull()
    expect(frames[1]).not.toBeNull()
  })

  test('signals created via state() are destroyed when the component unmounts (#1)', async () => {
    let sig: ReturnType<typeof state<number>> | null = null

    const App = () => {
      sig = state(0)
      return document.createElement('div')
    }

    const root = container()
    const unmount = mount(root, h(App, null) as unknown as Node)

    expect(sig).not.toBeNull()
    expect(sig!.isDestroyed).toBe(false)

    unmount()

    expect(sig!.isDestroyed).toBe(true)
  })

  test('effects created via watch() stop running after unmount (#1)', async () => {
    const effectCb = vi.fn()
    let sig: ReturnType<typeof state<number>> | null = null

    const App = () => {
      sig = state(0)
      watch(() => { effectCb(sig!.value) })
      return document.createElement('div')
    }

    const root = container()
    const unmount = mount(root, h(App, null) as unknown as Node)

    await tick()
    const callsBefore = effectCb.mock.calls.length

    unmount()

    sig!.value = 99
    await tick()

    // No new calls after unmount
    expect(effectCb.mock.calls.length).toBe(callsBefore)
  })

  test('computed signals stop updating after unmount (#1)', async () => {
    let sig: ReturnType<typeof state<number>> | null = null
    let comp: ReturnType<typeof compute<number>> | null = null
    const subscriber = vi.fn()

    const App = () => {
      sig = state(1)
      comp = compute(() => sig!.value * 10)
      comp.subscribe(subscriber)
      return document.createElement('div')
    }

    const root = container()
    const unmount = mount(root, h(App, null) as unknown as Node)

    await tick()
    subscriber.mockClear()

    unmount()

    sig!.value = 5
    await tick()

    expect(subscriber).not.toHaveBeenCalled()
  })

  test('nested component frames are independent and both cleaned up on unmount', async () => {
    let childSig: ReturnType<typeof state<number>> | null = null
    let parentSig: ReturnType<typeof state<number>> | null = null

    const Child = () => {
      childSig = state(0)
      return document.createElement('span')
    }

    const Parent = () => {
      parentSig = state(0)
      return function* () {
        yield h(Child, null) as unknown as Node
      }
    }

    const root = container()
    const unmount = mount(root, h(Parent, null) as unknown as Node)

    expect(parentSig!.isDestroyed).toBe(false)
    expect(childSig!.isDestroyed).toBe(false)

    unmount()

    expect(parentSig!.isDestroyed).toBe(true)
    expect(childSig!.isDestroyed).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Reactive DOM binding survives signal updates
// ---------------------------------------------------------------------------

describe('reactive text node', () => {
  test('updates text content when signal changes', async () => {
    const root = container()
    let sig: ReturnType<typeof state<string>> | null = null

    const App = () => {
      // hot: true publishes the initial value so the text node is seeded
      // synchronously when the subscriber is added in appendTo.
      sig = state('hello', { hot: true })
      return function* () {
        const el = h('p', null, sig!) as HTMLParagraphElement
        yield el
      }
    }

    mount(root, h(App, null) as unknown as Node)

    await tick()
    const p = root.querySelector('p')!
    expect(p.textContent).toBe('hello')

    sig!.value = 'world'
    await tick()
    expect(p.textContent).toBe('world')
  })
})

// ---------------------------------------------------------------------------
// mount() return value unmounts correctly
// ---------------------------------------------------------------------------

describe('mount()', () => {
  test('returned function removes all DOM children', () => {
    const root = container()
    const App = () => document.createElement('section')
    const unmount = mount(root, h(App, null) as unknown as Node)

    expect(root.children.length).toBeGreaterThan(0)
    unmount()
    expect(root.children.length).toBe(0)
  })
})

import { type Destroyable, Subject, BoundSignal } from './primitives/index.ts'
import { onCleanup, runCleanup, observeRemovals } from './cleanup.ts'
import { Watcher } from './primitives/watcher.ts'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Cleanup = (() => void) | void

/** A component that runs asynchronously, streaming UI states via yield. */
export type AsyncUI = (opts: { signal: AbortSignal }) => AsyncGenerator<Node, Cleanup>

/** A component that renders synchronously. Multiple yields = multiple sibling nodes. */
export type SyncUI = () => Generator<Node, Cleanup>

/**
 * The value a component function may return:
 *   - Node       → direct JSX element, rendered as-is
 *   - SyncUI     → sync generator factory
 *   - AsyncUI    → async generator factory (data fetching, streaming states)
 */
export type UI = Node | SyncUI | AsyncUI

type _Primitive = string | number | boolean | null | undefined | Node

/**
 * Every value that is valid as a JSX child `{...}`.
 * Async generator children receive `{ signal }` from the runtime automatically.
 */
export type UiNode =
  | Node
  | string
  | number
  | boolean
  | null
  | undefined
  | SyncUI
  | AsyncUI
  | { get(): unknown }
  | (() => _Primitive)
  | UiNode[]

export type ComponentFn<P extends Record<string, unknown> = Record<string, unknown>> =
  (props: P) => UI

export interface ComponentDescriptor {
  readonly __diyx_descriptor: true
  readonly type: ComponentFn
  readonly props: Record<string, unknown>
}

export function isDescriptor(v: unknown): v is ComponentDescriptor {
  return v != null && typeof v === 'object' && '__diyx_descriptor' in v
}

/**
 * Marks an async generator function as a streaming UI child.
 * The sole purpose is to give TypeScript an unambiguous contextual type for
 * `{ signal }` — without this, the parameter falls back to `any` because the
 * `UiNode` union contains multiple callable members.
 *
 * @example
 * <>{stream(async function* ({ signal }) { yield <p>…</p> })}</>
 */
export function stream(fn: AsyncUI): AsyncUI { return fn }

function isGeneratorFn(fn: unknown): fn is SyncUI {
  return typeof fn === 'function' && fn.constructor.name === 'GeneratorFunction'
}

function isAsyncGeneratorFn(fn: unknown): fn is AsyncUI {
  return typeof fn === 'function' && fn.constructor.name === 'AsyncGeneratorFunction'
}

// ---------------------------------------------------------------------------
// Fragment
// ---------------------------------------------------------------------------

export const Fragment = Symbol('Fragment')

/**
 * Type helper for generator-returning components.
 * Erases the SyncUI / AsyncUI return type to Node at the TypeScript level so
 * the function is accepted as a JSX element. The cast is safe because `h`
 * handles all UI shapes at runtime.
 *
 * @example
 * const Counter = component(({ initialCount = 0 }) => {
 *   const count = state(initialCount)
 *   return function* () { yield <p>{count}</p> }
 * })
 */
// ---------------------------------------------------------------------------
// Mount — a pair of comment anchors that bound a component's DOM output.
// ---------------------------------------------------------------------------

interface Mount {
  start: Comment
  end: Comment
  controller: AbortController
}

function makeMount(name: string): Mount {
  return {
    start: document.createComment(`<${name}>`),
    end: document.createComment(`</${name}>`),
    controller: new AbortController(),
  }
}

/** Remove all DOM nodes between the anchor comments, running their cleanups. */
function clearMount(mount: Mount): void {
  let node = mount.start.nextSibling
  while (node && node !== mount.end) {
    const next = node.nextSibling
    runCleanup(node)
    node.parentNode?.removeChild(node)
    node = next
  }
}

function insertIntoMount(mount: Mount, node: Node): void {
  mount.end.parentNode?.insertBefore(node, mount.end)
}

// ---------------------------------------------------------------------------
// Render loop
// ---------------------------------------------------------------------------

function runUI(mount: Mount, ui: UI): void {
  if (ui instanceof Node) {
    clearMount(mount)
    insertIntoMount(mount, ui)
    return
  }

  // Call the factory with signal (sync generators ignore the extra argument).
  const gen = (ui as (opts: { signal: AbortSignal }) => unknown)(
    { signal: mount.controller.signal }
  )

  if (gen != null && typeof gen === 'object' && Symbol.asyncIterator in gen) {
    runAsync(mount, gen as AsyncGenerator<Node, Cleanup>)
  } else {
    runSync(mount, gen as Generator<Node, Cleanup>)
  }
}

function runSync(mount: Mount, gen: Generator<Node, Cleanup>): void {
  clearMount(mount)
  let result = gen.next()
  while (!result.done) {
    const node = isDescriptor(result.value as unknown) ? render(result.value as unknown as ComponentDescriptor) : result.value
    insertIntoMount(mount, node)
    result = gen.next()
  }
  if (typeof result.value === 'function') {
    onCleanup(mount.start, result.value as () => void)
  }
}

async function runAsync(mount: Mount, gen: AsyncGenerator<Node, Cleanup>): Promise<void> {
  const { signal } = mount.controller
  try {
    let result = await gen.next()
    while (!result.done) {
      if (signal.aborted) return
      clearMount(mount)
      const node = isDescriptor(result.value as unknown) ? render(result.value as unknown as ComponentDescriptor) : result.value
      insertIntoMount(mount, node)
      result = await gen.next()
    }
    if (!signal.aborted && typeof result.value === 'function') {
      onCleanup(mount.start, result.value as () => void)
    }
  } catch (e) {
    if (signal.aborted) return
    throw e
  }
}

// ---------------------------------------------------------------------------
// render / mount
// ---------------------------------------------------------------------------

export function render(desc: ComponentDescriptor | Node): Node {
  if (!isDescriptor(desc)) {
    return desc as Node
  }
  const m = makeMount(desc.type.name || 'anon')
  const frag = document.createDocumentFragment()
  frag.appendChild(m.start)
  frag.appendChild(m.end)
  const ui = desc.type(desc.props)
  runUI(m, ui)
  onCleanup(m.start, () => m.controller.abort())
  return frag
}

/** Top-level entry point. Replaces root.appendChild(<App />). */
export function mount(container: Element, child: Node): void {
  observeRemovals(container)
  container.appendChild(
    isDescriptor(child as unknown) ? render(child as unknown as ComponentDescriptor) : child
  )
}

/**
 * Internals, do not use.
 */
export let $$_internals_currentComponentFrame: {
  id: string
  state: Set<Destroyable>
  destroy: (() => void) | null
  parent: typeof $$_internals_currentComponentFrame | null
  isDestroyed: boolean
} | null = null

// ---------------------------------------------------------------------------
// h — JSX factory
// ---------------------------------------------------------------------------

type MaybeSignal<T> = T | Subject<T>
type RawChild = MaybeSignal<unknown> | Node | SyncUI | AsyncUI | (() => unknown) | RawChild[] | null | undefined | boolean

export function h(
  tag: string | symbol | ComponentFn,
  props: Record<string, unknown> | null,
  ...rawChildren: RawChild[]
): Node {
  const p = props ?? {}
  const children = rawChildren.flat(Infinity) as RawChild[]

  // --- Fragment ---
  if (tag === Fragment) {
    const frag = document.createDocumentFragment()
    for (const child of children) appendTo(frag, child)
    return frag
  }

  // --- Component function — return a lazy descriptor; mounted by mountDescriptor() ---
  if (typeof tag === 'function') {
    const allProps: Record<string, unknown> = {
      ...p,
      children: children.length === 1 ? children[0] : children,
    }
    return {
      __diyx_descriptor: true as const, type: (function (props) {
        $$_internals_currentComponentFrame = {
          id: crypto.randomUUID(),
          state: new Set<Destroyable>(),
          destroy() {
            this.state.forEach((s) => s.destroy())
            this.isDestroyed = true
          },
          parent: $$_internals_currentComponentFrame,
          isDestroyed: false,
        }
        return tag(props)
      }) as ComponentFn, props: allProps
    } as unknown as Node
  }

  // --- HTML element ---
  const el = document.createElement(tag as string)

  for (const [key, value] of Object.entries(p)) {
    if (key === 'children') continue
    applyProp(el, key, value)
  }

  for (const child of children) appendTo(el, child)

  return el
}

// ---------------------------------------------------------------------------
// Prop binding
// ---------------------------------------------------------------------------

function applyProp(el: Element, key: string, value: unknown): void {
  // Event handler
  if (key.startsWith('on') && key.length > 2 && typeof value === 'function') {
    const event = key.slice(2).toLowerCase()
    el.addEventListener(event, value as EventListener)
    onCleanup(el, () => el.removeEventListener(event, value as EventListener))
    return
  }

  // Two-way signal — must come before isSignal since TwoWaySignal extends Signal.State
  if ((value) instanceof BoundSignal) {
    bindBoundSignalToProperty(el, key, value)
    return
  }

  // Reactive signal attribute
  if ((value) instanceof Subject) {
    bindSignalAttribute(el, key, value)
    return
  }

  // Reactive function expression attribute: class={() => theme + '-btn'}
  if (isParamlessFunction(value)) {
    const stop = new Watcher().watch(() => {
      setAttr(el, key, value())
    })
    onCleanup(el, stop)
    return
  }

  // Static attribute
  setAttr(el, key, value)
}

function bindSignalAttribute(el: Element, key: string, signal: Subject<unknown>): void {
  // Use an Attr node as the WeakMap key so its cleanup entry is distinct from
  // the element's own cleanups and can be individually disposed.
  const attrNode = document.createAttribute(key)
  const unsub = signal.subscribe((val) => {
    if (val === false || val == null) {
      if (el.hasAttribute(key)) el.removeAttributeNode(attrNode)
    } else {
      attrNode.value = val === true ? '' : String(val)
      if (!el.hasAttribute(key)) el.setAttributeNode(attrNode)
    }
  }, { hot: true })
  onCleanup(attrNode, unsub)
  // Also register on the element so removal of the element disposes the effect.
  onCleanup(el, unsub)
}

function bindBoundSignalToProperty(el: Element, key: string, signal: BoundSignal<unknown>): void {
  const unbind = signal.bind(el, {
    get: () => Reflect.get(el, key),
    set: (value) => Reflect.set(el, key, value),
  })
  onCleanup(el, unbind)
}

function setAttr(el: Element, key: string, value: unknown): void {
  if (value === false || value == null) {
    el.removeAttribute(key)
  } else {
    el.setAttribute(key, value === true ? '' : String(value))
  }
}

// ---------------------------------------------------------------------------
// Child appending
// ---------------------------------------------------------------------------

function appendTo(parent: Node, child: RawChild): void {
  if (child == null || child === false || child === true) return

  if (isDescriptor(child)) {
    parent.appendChild(render(child))
    return
  }

  if (child instanceof Node) {
    parent.appendChild(child)
    return
  }

  // Signal child — fine-grained text node update
  if ((child) instanceof Subject) {
    const text = document.createTextNode('')
    const stop = child.subscribe((val) => { text.data = String(val) }, { hot: true })
    onCleanup(text, stop)
    parent.appendChild(text)
    return
  }

  // Generator function child — gets its own mount and abort signal
  if (isGeneratorFn(child) || isAsyncGeneratorFn(child)) {
    const m = makeMount((child as SyncUI | AsyncUI).name || 'anon')
    const frag = document.createDocumentFragment()
    frag.appendChild(m.start)
    frag.appendChild(m.end)
    parent.appendChild(frag)
    runUI(m, child as SyncUI | AsyncUI)
    onCleanup(m.start, () => m.controller.abort())
    return
  }

  // Function expression child: {() => `Hello ${name.get()}`}
  if (isParamlessFunction(child)) {
    const text = document.createTextNode('')
    const stop = new Watcher().watch(() => { text.data = String(child()) })
    onCleanup(text, stop)
    parent.appendChild(text)
    return
  }

  if (Array.isArray(child)) {
    for (const c of child) appendTo(parent, c)
    return
  }

  parent.appendChild(document.createTextNode(String(child)))
}


function isParamlessFunction(fn: unknown): fn is () => unknown {
  return typeof fn === 'function' && fn.length === 0
}

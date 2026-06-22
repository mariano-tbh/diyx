import { isSignal, isTwoWaySignal, type TwoWaySignal, type AnySignal, type MaybeSignal } from './signals/index.ts'
import { effect } from './effect.ts'
import { onCleanup, runCleanup, observeRemovals } from './cleanup.ts'

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

// ---------------------------------------------------------------------------
// h — JSX factory
// ---------------------------------------------------------------------------

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
    return { __diyx_descriptor: true as const, type: tag as ComponentFn, props: allProps } as unknown as Node
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
  if (isTwoWaySignal(value)) {
    bindTwoWay(el, key, value)
    return
  }

  // Reactive signal attribute
  if (isSignal(value)) {
    bindSignalAttr(el, key, value)
    return
  }

  // Reactive function expression attribute: class={() => theme + '-btn'}
  if (typeof value === 'function') {
    const stop = effect(() => setAttr(el, key, (value as () => unknown)()))
    onCleanup(el, stop)
    return
  }

  // Static attribute
  setAttr(el, key, value)
}

function bindSignalAttr(el: Element, key: string, signal: AnySignal<unknown>): void {
  // Use an Attr node as the WeakMap key so its cleanup entry is distinct from
  // the element's own cleanups and can be individually disposed.
  const attrNode = document.createAttribute(key)
  const stop = effect(() => {
    const val = signal.get()
    if (val === false || val == null) {
      if (el.hasAttribute(key)) el.removeAttributeNode(attrNode)
    } else {
      attrNode.value = val === true ? '' : String(val)
      if (!el.hasAttribute(key)) el.setAttributeNode(attrNode)
    }
  })
  onCleanup(attrNode, stop)
  // Also register on the element so removal of the element disposes the effect.
  onCleanup(el, stop)
}

function bindTwoWay(el: Element, key: string, signal: TwoWaySignal<unknown>): void {
  // Signal → DOM: update the DOM property whenever the signal changes.
  // Equality guard prevents cursor-position resets on focused inputs.
  // Reflect.get/set traverse the prototype chain, which is required for DOM
  // properties like `value` and `checked` that live on the element prototype.
  const stop = effect(() => {
    const val = signal.get()
    if (Reflect.get(el, key) !== val) Reflect.set(el, key, val)
  })
  onCleanup(el, stop)

  // DOM → Signal: sync back on each configured event.
  const handler = () => signal.set(Reflect.get(el, key))
  for (const event of signal.events) {
    el.addEventListener(event, handler)
    onCleanup(el, () => el.removeEventListener(event, handler))
  }
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
  if (isSignal(child)) {
    const text = document.createTextNode(String((child as AnySignal<unknown>).get()))
    const stop = effect(() => { text.data = String((child as AnySignal<unknown>).get()) })
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
  if (typeof child === 'function') {
    const text = document.createTextNode('')
    const stop = effect(() => { text.data = String((child as () => unknown)()) })
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

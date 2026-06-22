// Injected by esbuild at build time (jsxInject); declared here so TypeScript
// doesn't require an explicit import in every JSX file.

// Mirrors UiNode from runtime.ts — duplicated here because .d.ts globals can't import.
// _Primitive is the return type of reactive expressions; it excludes Generator/AsyncGenerator
// so TypeScript can unambiguously match generator function children to SyncUI / AsyncUI.
type _Primitive = string | number | boolean | null | undefined | Node
type UiNode =
  | Node
  | string | number | boolean | null | undefined
  | (() => Generator<Node, (() => void) | void>)
  | ((opts: { signal: AbortSignal }) => AsyncGenerator<Node, (() => void) | void>)
  | { get(): unknown }
  | (() => _Primitive)
  | UiNode[]

declare function h(
  tag: string | symbol | ((props: Record<string, unknown>) => Node),
  props: Record<string, unknown> | null,
  ...children: UiNode[]
): Node
declare function Fragment(props: { children?: UiNode | UiNode[] }): Node

// JSX namespace consumed by TypeScript when jsxFactory is set to "h".
// In a non-module .d.ts, declarations are global — no `declare global` needed.
declare namespace JSX {
  // JSX.Element is a real DOM Node in this framework.
  type Element = Node

  // Tells TypeScript which prop name holds children.
  interface ElementChildrenAttribute {
    children: {}
  }

  // MaybeSig<T>: accept a raw value or any signal-like object that has .get()
  type MaybeSig<T> = T | { get(): T }

  interface HTMLAttributes {
    class?: MaybeSig<string>
    id?: MaybeSig<string>
    style?: MaybeSig<string>
    title?: MaybeSig<string>
    hidden?: MaybeSig<boolean>
    tabindex?: MaybeSig<number | string>
    // Catch-all for any other attribute or event handler.
    [key: string]: unknown
  }

  // Intrinsic HTML elements — permissive for the POC.
  interface IntrinsicElements {
    div: HTMLAttributes
    span: HTMLAttributes
    p: HTMLAttributes
    h1: HTMLAttributes
    h2: HTMLAttributes
    h3: HTMLAttributes
    button: HTMLAttributes & { disabled?: MaybeSig<boolean>; onClick?: (e: MouseEvent) => void }
    input: HTMLAttributes & { type?: string; value?: MaybeSig<string>; placeholder?: string; onInput?: (e: Event) => void }
    ul: HTMLAttributes
    ol: HTMLAttributes
    li: HTMLAttributes
    a: HTMLAttributes & { href?: MaybeSig<string>; target?: string }
    hr: HTMLAttributes
    strong: HTMLAttributes
    em: HTMLAttributes
    [tag: string]: Record<string, unknown>
  }
}

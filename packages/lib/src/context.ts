import { withContext, type ContextMap, type Token } from './di.ts'
import { render, isDescriptor } from './runtime.ts'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type InferTokens<T extends readonly Token<unknown>[]> = {
  [K in keyof T]: T[K] extends Token<infer U> ? U : never
}

type FactoryArgs<Deps extends readonly Token<unknown>[]> =
  [...InferTokens<Deps>, AbortSignal | undefined]

type TokenDescriptor<T, Deps extends readonly Token<unknown>[] = readonly []> =
  | { value: T }
  | { inject?: Deps; factory: (...args: FactoryArgs<Deps>) => T | Promise<T> }

type AnyDescriptor = TokenDescriptor<unknown, readonly Token<unknown>[]>
type Entry = { token: Token<unknown>; descriptor: AnyDescriptor }

// ---------------------------------------------------------------------------
// TokenBinder — intermediate builder returned by .for()
// ---------------------------------------------------------------------------

class TokenBinder<T> {
  readonly #token: Token<T>
  readonly #push: (entry: Entry) => void
  readonly #builder: ContextBuilder

  constructor(token: Token<T>, push: (entry: Entry) => void, builder: ContextBuilder) {
    this.#token = token
    this.#push = push
    this.#builder = builder
  }

  use<const Deps extends readonly Token<unknown>[] = readonly []>(
    descriptor: TokenDescriptor<T, Deps>,
  ): ContextBuilder {
    this.#push({ token: this.#token as Token<unknown>, descriptor: descriptor as AnyDescriptor })
    return this.#builder
  }
}

// ---------------------------------------------------------------------------
// ContextBuilder
// ---------------------------------------------------------------------------

export type ConfigurableContextBuilder = Omit<ContextBuilder, 'build'>

class ContextBuilder {
  readonly #entries: Entry[] = []

  for<T>(token: Token<T>): TokenBinder<T> {
    return new TokenBinder(token, entry => this.#entries.push(entry), this)
  }

  async build(opts?: { abortSignal?: AbortSignal }): Promise<ContextProvider> {
    const { abortSignal } = opts ?? {}
    const entries = this.#entries

    // Validate: all inject tokens must be registered in this context
    const registered = new Set(entries.map(e => e.token.key))
    for (const { token, descriptor } of entries) {
      if ('inject' in descriptor && descriptor.inject) {
        for (const dep of descriptor.inject) {
          if (!registered.has(dep.key)) {
            throw new Error(
              `defineContext: "${token.description}" depends on "${dep.description}", which is not registered`
            )
          }
        }
      }
    }

    // Topological sort with cycle detection
    const sorted = topoSort(entries)

    // Resolve in dependency order, awaiting async factories
    const resolved = new Map<symbol, unknown>()
    for (const { token, descriptor } of sorted) {
      if ('value' in descriptor) {
        resolved.set(token.key, descriptor.value)
      } else {
        const deps = (descriptor.inject ?? []) as readonly Token<unknown>[]
        const args = [...deps.map(dep => resolved.get(dep.key)), abortSignal]
        const value = await (descriptor.factory as (...a: unknown[]) => unknown)(...args)
        resolved.set(token.key, value)
      }
    }

    const map: ContextMap = resolved

    const provide = ({ children }: { children?: unknown }): Node => {
      const items = children == null
        ? []
        : Array.isArray(children) ? children as unknown[] : [children]

      const nodes = withContext(map, () =>
        items.map(child => isDescriptor(child) ? render(child) : child as Node)
      )

      const frag = document.createDocumentFragment()
      for (const node of nodes) frag.appendChild(node)
      return frag
    }

    return { provide }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function topoSort(entries: Entry[]): Entry[] {
  const byKey = new Map(entries.map(e => [e.token.key, e]))
  const visited = new Set<symbol>()
  const visiting = new Set<symbol>()
  const result: Entry[] = []

  function visit(key: symbol): void {
    if (visited.has(key)) return
    if (visiting.has(key)) {
      throw new Error(
        `defineContext: circular dependency detected involving "${byKey.get(key)!.token.description}"`
      )
    }
    visiting.add(key)
    const entry = byKey.get(key)!
    if ('inject' in entry.descriptor && entry.descriptor.inject) {
      for (const dep of entry.descriptor.inject) visit(dep.key)
    }
    visiting.delete(key)
    visited.add(key)
    result.push(entry)
  }

  for (const entry of entries) visit(entry.token.key)
  return result
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type ContextProvider = {
  provide: (props: Record<string, unknown>) => Node
}

export type BuiltContext = {
  build(opts?: { abortSignal?: AbortSignal }): Promise<ContextProvider>
}

export function defineContext(
  setup: (builder: ConfigurableContextBuilder) => ContextBuilder
): BuiltContext {
  const builder = new ContextBuilder()
  setup(builder)
  return { build: opts => builder.build(opts) }
}

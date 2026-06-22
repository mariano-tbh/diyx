// Runtime symbol used purely for TypeScript's structural type branding.
// Declaring it as a real const (not `declare const`) so computed property
// keys in object literals work at runtime.
const brand = Symbol('brand')

export interface Token<T> {
  readonly [brand]: T
  readonly key: symbol
  readonly description: string
}

export type InferToken<T extends Token<unknown>> = T extends Token<infer U> ? U : never

export function defineToken<T>(description: string): Token<T> {
  return { [brand]: undefined as unknown as T, key: Symbol(description), description }
}

// ---------------------------------------------------------------------------
// Context stack
// ---------------------------------------------------------------------------

export type ContextMap = ReadonlyMap<symbol, unknown>
const stack: ContextMap[] = []

/**
 * Retrieve a dependency from the nearest enclosing context.
 * Must be called synchronously during component initialisation (before the
 * generator is returned). Throws if the token is not provided.
 */
export function inject<T>(token: Token<T>): T {
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i].has(token.key)) return stack[i].get(token.key) as T
  }
  throw new Error(`inject: "${token.description}" not found in any context`)
}

/**
 * Run `fn` with `ctx` active on the context stack.
 * All synchronous `inject()` calls inside `fn` (including inside child
 * component initialisers triggered by JSX evaluation) will resolve from `ctx`.
 */
export function withContext<T>(ctx: ContextMap, fn: () => T): T {
  stack.push(ctx)
  try { return fn() }
  finally { stack.pop() }
}

/**
 * Snapshot the currently active context stack into a single flat map.
 * Inner (later) entries take precedence over outer ones, matching inject()'s
 * search order. Call this synchronously during component initialisation to
 * capture the context for later re-use (e.g. when remounting a component
 * from an event handler, outside the original withContext call).
 */
export function captureContext(): ContextMap {
  const merged = new Map<symbol, unknown>()
  for (const ctx of stack) {
    for (const [key, val] of ctx) merged.set(key, val)
  }
  return merged
}

import { withContext, type ContextMap, type Token } from './di.ts'
import { render, isDescriptor } from './runtime.ts'

export type ConfigurableContextBuilder = Omit<ContextBuilder, "build">

class ContextBuilder {
  readonly #entries: [symbol, unknown][] = []

  use<T>(token: Token<T>, impl: T): this {
    this.#entries.push([token.key, impl])
    return this
  }

  build(): ContextMap {
    return new Map(this.#entries)
  }

  asConfigurable(): ConfigurableContextBuilder {
    return this
  }
}

export type ContextProvider = {
  provide: (props: Record<string, unknown>) => Node
}

export function defineContext(
  setup: (builder: ConfigurableContextBuilder) => ContextBuilder
): ContextProvider {
  const map = setup(new ContextBuilder()).build()

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

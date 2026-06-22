// Per-node cleanup registry. Used for both framework-managed removals
// (synchronous) and externally-triggered removals (via MutationObserver).
const registry = new WeakMap<Node, Set<() => void>>()

export function onCleanup(node: Node, fn: () => void): void {
  let fns = registry.get(node)
  if (!fns) registry.set(node, fns = new Set())
  fns.add(fn)
}

/**
 * Runs all cleanup functions registered for `node` and all its descendants,
 * then removes them from the registry.
 * Called synchronously by the framework before removing a node from the DOM,
 * and also by the MutationObserver for external removals.
 */
export function runCleanup(node: Node): void {
  registry.get(node)?.forEach(fn => fn())
  registry.delete(node)
  for (const child of node.childNodes) runCleanup(child)
}

/**
 * Attach a MutationObserver to `root` that cleans up subscriptions for nodes
 * removed by external code (outside the framework's render loop).
 * Call once at app startup.
 */
export function observeRemovals(root: Element): void {
  new MutationObserver(mutations => {
    for (const m of mutations) {
      for (const node of m.removedNodes) runCleanup(node)
    }
  }).observe(root, { childList: true, subtree: true })
}

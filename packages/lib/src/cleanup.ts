// Per-node cleanup registry. Used for both framework-managed removals
// (synchronous) and externally-triggered removals (via MutationObserver).
const registry = new WeakMap<Node, Set<() => void>>()

// Nodes the framework has already cleaned up synchronously before removing
// from the DOM. The MutationObserver skips these to prevent double-cleanup.
const managedRemovals = new WeakSet<Node>()

export function onCleanup(node: Node, fn: () => void): void {
  let fns = registry.get(node)
  if (!fns) registry.set(node, fns = new Set())
  fns.add(fn)
}

/**
 * Mark `node` as a framework-managed removal so the MutationObserver will not
 * fire cleanup for it a second time. Call this immediately before runCleanup()
 * + removeChild() in the render loop.
 */
export function markManagedRemoval(node: Node): void {
  managedRemovals.add(node)
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
export function observeRemovals(root: Element): () => void {
  const observer = new MutationObserver(mutations => {
    for (const m of mutations) {
      for (const node of m.removedNodes) {
        // Skip nodes the framework already cleaned up before removing them.
        if (!managedRemovals.has(node)) runCleanup(node)
      }
    }
  })
  observer.observe(root, { childList: true, subtree: true })
  return () => {
    observer.disconnect()
  }
}

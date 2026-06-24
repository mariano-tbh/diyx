import { state, isDescriptor, render, captureContext, withContext } from "@diyx/lib";

type ShowcaseProps = {
  title: string;
  description: string;
  code: string;
  children: unknown;
};

export function Showcase({ title, description, code, children }: ShowcaseProps) {
  const isMounted = state(true);
  // Capture the DI context stack synchronously while we're still inside it,
  // so doMount() can replay it from an event handler (outside withContext).
  const ctx = captureContext();
  const preview = document.createElement("div");
  preview.className = "min-h-16";

  mountChild(ctx, preview, children);

  function doMount() {
    mountChild(ctx, preview, children);
    isMounted.value = true;
  }

  function doUnmount() {
    while (preview.firstChild) preview.removeChild(preview.firstChild);
    isMounted.value = false;
  }

  function doRerender() {
    doUnmount();
    // setTimeout (macrotask) lets the MutationObserver microtask run cleanup first
    setTimeout(doMount, 0);
  }

  return (
    <section class="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
      <div class="px-6 py-5 border-b border-slate-800">
        <h2 class="text-lg font-semibold text-white">{title}</h2>
        <p class="mt-1 text-sm text-slate-400">{description}</p>
      </div>

      <div class="px-6 py-5 bg-slate-950/50">{preview}</div>

      <div class="flex items-center gap-2 px-6 py-3 border-t border-slate-800">
        <button
          class="rounded-md px-3 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-100 transition-colors"
          onClick={() => (isMounted.value ? doUnmount() : doMount())}
        >
          {() => (isMounted.value ? "Unmount" : "Remount")}
        </button>
        <button
          class="rounded-md px-3 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-100 transition-colors"
          onClick={doRerender}
        >
          Rerender
        </button>
      </div>

      <details class="border-t border-slate-800 group">
        <summary class="px-6 py-3 text-xs text-slate-500 cursor-pointer select-none hover:text-slate-300 transition-colors list-none flex items-center gap-1.5">
          <span class="font-mono">{"</>"}</span>
          View source
        </summary>
        <pre class="overflow-x-auto px-6 py-4 text-xs leading-relaxed text-slate-300 bg-slate-950 border-t border-slate-800"><code>{code}</code></pre>
      </details>
    </section>
  );
};

function mountChild(ctx: ReturnType<typeof captureContext>, parent: Element, child: unknown): void {
  if (isDescriptor(child)) {
    parent.appendChild(withContext(ctx, () => render(child)));
  } else if (child instanceof Node) {
    parent.appendChild(child);
  }
}

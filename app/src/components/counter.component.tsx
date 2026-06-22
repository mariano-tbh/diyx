import { computed, state } from "@diyx/lib";

export function Counter({ initialCount = 0 }: { initialCount?: number }) {
  const count = state(initialCount);
  const doubled = computed(() => count.get() * 2);

  return (
    <>
      {function* () {
        const interval = setInterval(() => {
          count.set(count.get() + 1);
        }, 1000);

        yield (
          <div class="flex items-center gap-6">
            <div class="flex gap-4">
              <span class="rounded-lg bg-slate-800 px-4 py-2 text-sm font-mono">
                count: {count}
              </span>
              <span class="rounded-lg bg-slate-800 px-4 py-2 text-sm font-mono">
                doubled: {doubled}
              </span>
            </div>
            <button
              class="rounded-md px-3 py-1.5 text-xs font-medium border border-slate-700 hover:bg-slate-800 text-slate-300 transition-colors"
              onClick={() => count.set(0)}
            >
              Reset
            </button>
          </div>
        );

        return () => clearInterval(interval);
      }}
    </>
  );
};

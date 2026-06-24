import { bound, stream } from "@diyx/lib";

export function FeedbackDialog() {
  return (
    <>
      {stream(async function* ({ signal }) {
        const {
          promise: submitted,
          resolve: submit,
          reject,
        } = Promise.withResolvers<void>();
        signal.addEventListener("abort", () => reject(signal.reason), {
          once: true,
        });

        const feedback = bound("", { events: "input" });

        yield (
          <div class="flex flex-col gap-3 max-w-xs">
            <p class="text-sm text-slate-300">How are you enjoying diyx?</p>
            <input
              class="rounded-md bg-slate-800 border border-slate-700 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              type="text"
              value={feedback}
              placeholder="Share your thoughts…"
            />
            <button
              class="self-start rounded-md px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
              onClick={() => submit()}
            >
              Submit
            </button>
          </div>
        );

        await submitted;

        yield (
          <div class="inline-flex items-center gap-2 rounded-lg bg-emerald-600/20 border border-emerald-600/30 px-4 py-2.5 text-sm text-emerald-400">
            Thank you for your time :)
          </div>
        );
      })}
    </>
  );
}

import { computed, bound } from "@diyx/lib";

export function TwoWayForm() {
  const username = bound("");
  const bio = bound("", { events: "input" });
  const email = bound("", { events: ["change", "blur"] });
  const agreed = bound(false);

  const summary = computed(() =>
    agreed.value
      ? `${username.value} <${email.value}> agreed to the terms.`
      : "Not agreed yet.",
  );

  function reset() {
    username.value = "";
    bio.value = "";
    email.value = "";
    agreed.value = false;
  }

  const inputClass =
    "w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500";
  const labelClass = "block text-xs text-slate-500 mb-1";

  return (
    <form
      class="flex flex-col gap-4 max-w-sm"
      onSubmit={(e: SubmitEvent) => e.preventDefault()}
    >
      <div>
        <label class={labelClass}>
          Username — updates on change (blur / Enter)
        </label>
        <input
          class={inputClass}
          type="text"
          value={username}
          placeholder="your name"
        />
      </div>

      <div>
        <label class={labelClass}>Bio — updates on every keystroke</label>
        <input
          class={inputClass}
          type="text"
          value={bio}
          placeholder="tell us about yourself"
        />
        <p class="mt-1 text-xs text-slate-500">
          Live: <span class="text-slate-300">{bio}</span>
        </p>
      </div>

      <div>
        <label class={labelClass}>Email — change + blur</label>
        <input
          class={inputClass}
          type="email"
          value={email}
          placeholder="you@example.com"
        />
      </div>

      <label class="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
        <input type="checkbox" checked={agreed} class="accent-indigo-500" />I
        agree to the terms
      </label>

      <p class="text-xs text-slate-400 italic">{summary}</p>

      <button
        class="self-start rounded-md px-3 py-1.5 text-xs font-medium border border-slate-700 hover:bg-slate-800 text-slate-300 transition-colors"
        onClick={reset}
      >
        Reset all
      </button>
    </form>
  );
}

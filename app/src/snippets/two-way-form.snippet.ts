export const twoWayFormCode = `\
export function TwoWayForm() {
  const username = twoWaySignal("");
  const bio      = twoWaySignal("", { event: "input" });
  const email    = twoWaySignal("", { event: ["change", "blur"] });
  const agreed   = twoWaySignal(false);

  const summary = computed(() =>
    agreed.get()
      ? \`\${username.get()} <\${email.get()}> agreed to the terms.\`
      : "Not agreed yet.",
  );

  return (
    <form>
      <input type="text"     value={username} placeholder="your name" />
      <input type="text"     value={bio}      placeholder="tell us about yourself" />
      <span>Live: {bio}</span>
      <input type="email"    value={email}    placeholder="you@example.com" />
      <input type="checkbox" checked={agreed} />
      <strong>{summary}</strong>
      <button onClick={reset}>Reset all</button>
    </form>
  );
}`;

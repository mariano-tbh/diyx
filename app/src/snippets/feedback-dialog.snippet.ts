export const feedbackCode = `\
export function FeedbackDialog() {
  return (
    <>
      {stream(async function* ({ signal }) {
        const { promise: submitted, resolve: submit, reject } =
          Promise.withResolvers<void>();
        signal.addEventListener("abort", () => reject(signal.reason), { once: true });

        const feedback = twoWaySignal("", { event: "input" });

        yield (
          <div>
            <p>How are you enjoying diyx?</p>
            <input type="text" value={feedback} placeholder="Share your thoughts…" />
            <button onClick={() => submit()}>Submit</button>
          </div>
        );

        await submitted;

        yield <div>Thank you for your time :)</div>;
      })}
    </>
  );
}`;

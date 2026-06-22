export const counterCode = `\
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
          <div>
            <p>Count: {count}</p>
            <p>Doubled: {doubled}</p>
            <button onClick={() => count.set(0)}>Reset</button>
          </div>
        );

        return () => clearInterval(interval);
      }}
    </>
  );
}`;

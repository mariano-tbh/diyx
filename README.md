# diyx

**Dependency Injection Yourself**, like *DIY* and well X because JSX, get it? (sorry 😅)

An experimental TypeScript UI framework built on three primitives: **generators**, **fine-grained signals**, and **dependency injection**.

No virtual DOM. No compiler. No decorators. Components are plain functions.

---

## Core concepts

### Components are plain functions

A component is a function that returns one of three shapes:

```tsx
// 1. Direct JSX — no lifecycle needed
function Badge({ label }: { label: string }) {
  return <span>{label}</span>
}

// 2. Sync generator — setup/teardown + fine-grained reactive updates
function Counter({ initialCount = 0 }: { initialCount?: number }) {
  const count = state(initialCount)
  const doubled = computed(() => count.get() * 2)

  return (
    <>
      {function* () {
        const interval = setInterval(() => count.set(count.get() + 1), 1000)

        yield (
          <div>
            <p>Count: {count}</p>       // only this text node updates on change
            <p>Doubled: {doubled}</p>
            <button onClick={() => count.set(0)}>Reset</button>
          </div>
        )

        return () => clearInterval(interval)  // cleanup on unmount
      }}
    </>
  )
}

// 3. Async generator — streams UI states sequentially
function UserProfile({ userId }: { userId: string }) {
  const api = inject(ApiToken)

  return (
    <>
      {stream(async function* ({ signal }) {
        yield <p>Loading…</p>

        try {
          const user = await api.getUser(userId, signal)
          yield <UserCard name={user.name} email={user.email} />
        } catch (err) {
          if (signal.aborted) return
          yield <p>Error: {(err as Error).message}</p>
        }
      })}
    </>
  )
}
```

Each `yield` replaces the previous DOM output. Signal-bound expressions inside yielded JSX update **fine-grainedly** — only the subscribed text node or attribute changes, not the component output as a whole.

---

### Signals

Built on the [TC39 Signals proposal](https://github.com/tc39/proposal-signals) polyfill. When the proposal ships natively, the polyfill is swapped out.

```ts
const count  = state(0)                         // Signal.State<number>
const double = computed(() => count.get() * 2)  // Signal.Computed<number>

count.set(1)   // write
count.get()    // read (tracked inside effect / computed)
```

Pass a signal **by reference** to JSX to subscribe to fine-grained DOM patches:

```tsx
<p>Count: {count}</p>        // ✅ reactive — only the text node re-renders
<p>Count: {count.get()}</p>  // ❌ plain number — snapshot, no subscription
```

#### Two-way signals

`twoWaySignal()` binds a signal bidirectionally to a form element. Configure which DOM events trigger a sync-back:

```ts
const username = twoWaySignal("")                           // default: "change"
const bio      = twoWaySignal("", { event: "input" })       // every keystroke
const email    = twoWaySignal("", { event: ["change", "blur"] })
const agreed   = twoWaySignal(false)                        // checkbox

// Use directly as a JSX prop:
<input type="text"     value={username} />
<input type="checkbox" checked={agreed} />
```

---

### Dependency injection

Tokens are typed symbols. Contexts are provided at mount time and resolved from the nearest enclosing provider — no constructors, no decorators.

```ts
// Define a typed token
const ApiToken = defineToken<ApiService>("ApiService")

// Provide at the app root
const appContext = defineContext((b) => b.use(ApiToken, new FetchApiService()))

mount(root, <appContext.provide><App /></appContext.provide>)

// Consume inside any component (synchronously, before the generator is returned)
function MyComponent() {
  const api = inject(ApiToken)  // throws if not provided
  // …
}
```

`inject()` must be called **synchronously** during component initialisation, before any generator `yield` or `await`. An ESLint plugin (in progress) will catch misuse statically.

#### Capturing context for deferred mounts

If you need to re-mount a component from outside its original render call (e.g. from an event handler), capture the context first:

```ts
const ctx = captureContext()   // snapshot the DI stack synchronously

button.addEventListener("click", () => {
  withContext(ctx, () => doSomethingInsideCapturedContext())
})

function doSomethingInsideCapturedContext() {
  const api = inject(ApiToken)  // works because we're inside the captured context
  // …
}
```

---

## Project structure

```
diyx/
  packages/
    lib/              @diyx/lib — the framework
      src/
        signals/
          state.ts          state(), computed(), isSignal()
          two-way-signal.ts twoWaySignal(), isTwoWaySignal()
        effect.ts       Reactive effect scheduler (Signal.subtle.Watcher)
        cleanup.ts      WeakMap cleanup registry + MutationObserver fallback
        di.ts           defineToken(), inject(), withContext(), captureContext()
        context.ts      defineContext() — scoped DI provider
        runtime.ts      h(), Fragment, stream(), mount(), mountDescriptor()
        types.d.ts      JSX namespace, MaybeSig<T>, global h/Fragment
        index.ts        Public exports
    eslint-plugin/      ESLint rules (in progress)
  app/                  Showcase demo app (Vite + Tailwind v4)
    src/
      components/       Demo components (Counter, UserProfile, TwoWayForm, …)
      snippets/         Source code strings displayed in the showcase
      tokens/           DI token definitions
      services/         DI implementations
```

---

## What works

| Feature | Status |
|---|---|
| `state()` / `computed()` — TC39 Signals polyfill wrappers | ✅ |
| `effect()` scheduler (global `Signal.subtle.Watcher`) | ✅ |
| `h()` JSX factory — HTML elements, fragments, components | ✅ |
| Fine-grained reactive text nodes | ✅ |
| Fine-grained reactive attributes (`MaybeSig<T>`) | ✅ |
| Reactive function-expression children `{() => expr}` | ✅ |
| Sync generator components with cleanup | ✅ |
| Async generator components (streaming loading → content → error) | ✅ |
| Direct JSX components | ✅ |
| `twoWaySignal()` with configurable sync events | ✅ |
| `stream()` type helper for async generator children | ✅ |
| `inject()` / `withContext()` DI | ✅ |
| `defineContext()` scoped provider | ✅ |
| `captureContext()` for deferred remounts | ✅ |
| `WeakMap` cleanup registry + `MutationObserver` fallback | ✅ |
| Generator cleanup via `return () => void` | ✅ |
| Showcase app with unmount/remount/rerender per component | ✅ |
| Dev server via Vite | ✅ |

---

## Known design decisions and trade-offs

- **Signals before `await`** — signal reads after an `await` inside an async generator are not tracked. Read all reactive values in the synchronous segment before the first `await`.
- **Full re-mount on prop change** — when a parent passes new props, the component is torn down and re-initialised from scratch. Fine-grained signal updates happen without re-mounting.
- **`inject()` is synchronous** — it reads from a call-stack-based context. It must be called before any `yield` or `await`. Use `captureContext()` + `withContext()` to carry the context into deferred callbacks.
- **No compile step** — reactivity is detected at runtime via `instanceof Signal.State / Signal.Computed`. An ESLint plugin handles misuse warnings instead of a Babel/Vite transform.

---

## Running locally

```bash
npm install          # install all workspaces
npm run dev          # start the Vite dev server → http://localhost:5173
npm run typecheck    # type-check all packages
```

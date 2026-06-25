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
  const doubled = compute(() => count.value * 2)

  return (
    <>
      {function* () {
        const interval = setInterval(() => { count.value += 1 }, 1000)

        yield (
          <div>
            <p>Count: {count}</p>       // only this text node updates on change
            <p>Doubled: {doubled}</p>
            <button onClick={() => (count.value = 0)}>Reset</button>
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
const count  = state(0)                         // StatefulSignal<number>
const double = compute(() => count.value * 2)   // ComputedSignal<number>

count.value = 1   // write
count.value       // read (tracked inside compute / watch)
```

Pass a signal **by reference** to JSX to subscribe to fine-grained DOM patches:

```tsx
<p>Count: {count}</p>        // ✅ reactive — only the text node re-renders
<p>Count: {count.value}</p>  // ❌ plain number — snapshot, no subscription
```

Signals also implement `Subject<T>`, so you can subscribe imperatively:

```ts
const unsub = count.subscribe((value) => console.log(value))
// unsub() to stop listening
```

#### Reactive side-effects

`watch()` runs a function immediately and re-runs it whenever any signal it reads changes:

```ts
watch(({ abortSignal }) => {
  console.log('count is now', count.value)
  // abortSignal fires before the next re-run, for teardown
})
```

#### Bound signals

`bind()` binds a signal bidirectionally to a form element. Configure which DOM events trigger a sync-back:

```ts
const username = bind("")                              // default: "change"
const bio      = bind("", { events: "input" })        // every keystroke
const email    = bind("", { events: ["change", "blur"] })
const agreed   = bind(false)                          // checkbox

// Use directly as a JSX prop:
<input type="text"     value={username} />
<input type="checkbox" checked={agreed} />
```

---

### Dependency injection

Tokens are typed symbols. Contexts are provided at mount time and resolved from the nearest enclosing provider — no constructors, no decorators.

#### Defining and consuming tokens

```ts
// Define a typed token
const ApiToken = defineToken<ApiService>("ApiService")

// Consume inside any component (synchronously, before the generator is returned)
function MyComponent() {
  const api = inject(ApiToken)  // throws if not provided
  // …
}
```

`inject()` must be called **synchronously** during component initialisation, before any generator `yield` or `await`. An ESLint plugin (in progress) will catch misuse statically.

#### Providing a context

`defineContext()` returns a builder. Call `build()` to resolve all dependencies and get a `provide` JSX component:

```ts
const appContext = defineContext(b =>
  b.for(ApiToken).use({ value: new FetchApiService() })
)

const ctx = await appContext.build()
mount(root, <ctx.provide><App /></ctx.provide>)
```

`build()` is async to support factory dependencies that need to do async work (fetching remote config, loading i18n dictionaries, etc.).

#### Factory dependencies

Use `inject` + `factory` when one token depends on another. Dependencies are resolved in the right order regardless of registration order, and cycles are caught at `build()` time:

```ts
const Logger  = defineToken<Logger>("Logger")
const UserService = defineToken<UserService>("UserService")

const appContext = defineContext(b =>
  b.for(Logger).use({ value: pino() })
   .for(UserService).use({
     inject: [Logger],
     factory: (logger, signal) => ({
       async getUser(id: string) {
         const user = await fetch(`/users/${id}`, { signal }).then(r => r.json())
         logger.log('user fetched', id)
         return user
       }
     })
   })
)
```

The `signal` parameter (last in every factory) is the `AbortSignal` passed to `build({ signal })`.

#### Async context loading

For contexts that need async setup (remote config, i18n), use `stream()` to show a loading state while `build()` resolves:

```tsx
function App() {
  return (
    <>{stream(async function* ({ signal }) {
      yield <Spinner text="Loading…" />
      const ctx = await appContext.build({ signal })
      yield <ctx.provide><RestOfApp /></ctx.provide>
    })}</>
  )
}
```

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
        primitives/
          destroyable.ts      Destroyable — base class with destroy/onDestroy lifecycle
          subject.ts          Subject<T> — observable pub/sub
          stateful-signal.ts  StatefulSignal<T> — writable signal + Subject
          computed-signal.ts  ComputedSignal<T> — derived signal + Subject
          bound-signal.ts     BoundSignal<T> — two-way form binding
          watcher.ts          Watcher — reactive side-effect runner
        operators/
          state.ts            state() — component-scoped StatefulSignal factory
          compute.ts          compute() — component-scoped ComputedSignal factory
          bind.ts             bind() — component-scoped BoundSignal factory
          watch.ts            watch() — component-scoped Watcher factory
        cleanup.ts      WeakMap cleanup registry + MutationObserver fallback
        di.ts           defineToken(), inject(), withContext(), captureContext()
        context.ts      defineContext() — scoped DI provider with dep graph + async build()
        runtime.ts      h(), Fragment, stream(), mount()
        types.d.ts      JSX namespace, global h/Fragment
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
| `Destroyable` / `Subject<T>` — observable lifecycle base | ✅ |
| `StatefulSignal<T>` / `ComputedSignal<T>` — TC39 Signals + Subject | ✅ |
| `BoundSignal<T>` — two-way form binding with configurable events | ✅ |
| `Watcher` — reactive side-effect runner | ✅ |
| `state()` / `compute()` / `bind()` / `watch()` — component-scoped signal operators | ✅ |
| Auto-cleanup of component signals on unmount | ✅ |
| `h()` JSX factory — HTML elements, fragments, components | ✅ |
| Fine-grained reactive text nodes | ✅ |
| Fine-grained reactive attributes | ✅ |
| Reactive function-expression children `{() => expr}` | ✅ |
| Sync generator components with cleanup | ✅ |
| Async generator components (streaming loading → content → error) | ✅ |
| Direct JSX components | ✅ |
| `stream()` type helper for async generator children | ✅ |
| `inject()` / `withContext()` DI | ✅ |
| `defineContext()` scoped provider with topo-sorted dep graph, cycle detection, async factories | ✅ |
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
- **No compile step** — reactivity is detected at runtime via `instanceof Subject`. An ESLint plugin handles misuse warnings instead of a Babel/Vite transform.

---

## Running locally

```bash
npm install          # install all workspaces
npm run dev          # start the Vite dev server → http://localhost:5173
npm run typecheck    # type-check all packages
npm test             # run unit tests (vitest)
```

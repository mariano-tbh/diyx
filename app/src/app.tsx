import { Counter } from "./components/counter.component";
import { UserProfile } from "./components/user-profile.component";
import { UserSwitcher } from "./components/user-switcher.component";
import { TwoWayForm } from "./components/two-way-form.component";
import { FeedbackDialog } from "./components/feedback-dialog.component";
import { Showcase } from "./components/showcase.component";
import { counterCode } from "./snippets/counter.snippet";
import { userProfileCode } from "./snippets/user-profile.snippet";
import { userSwitcherCode } from "./snippets/user-switcher.snippet";
import { twoWayFormCode } from "./snippets/two-way-form.snippet";
import { feedbackCode } from "./snippets/feedback-dialog.snippet";

function UserProfiles() {
  return (
    <div class="flex flex-col gap-3">
      <UserProfile userId={"1"} />
      <UserProfile userId={"2"} />
      <UserProfile userId={"3"} />
    </div>
  );
}

export function App() {
  return (
    <div class="max-w-3xl mx-auto px-6 py-16 space-y-8">
      <header class="mb-12">
        <h1 class="text-4xl font-bold tracking-tight text-white">diyx</h1>
        <p class="mt-3 text-slate-400 text-lg leading-relaxed">
          A minimal reactive UI runtime built on the TC39 Signals proposal.
          Components are plain functions returning generators — no virtual DOM,
          no compiler, no magic.
        </p>
      </header>

      <Showcase
        title="Sync generator + signals"
        description="A sync generator yields once. Signal reads inside JSX create fine-grained reactive text nodes — only the changed node updates, never the whole component."
        code={counterCode}
      >
        <Counter initialCount={0} />
      </Showcase>

      <Showcase
        title="Async generator + DI + streaming states"
        description="An async generator streams loading → content/error states. The UserService is injected via a typed DI token — no globals, no React context."
        code={userProfileCode}
      >
        <UserProfiles />
      </Showcase>

      <Showcase
        title="Two-way signals"
        description="twoWaySignal() binds a signal bidirectionally to an input. Configure which DOM events trigger the sync — 'change', 'input', or an array of both."
        code={twoWayFormCode}
      >
        <TwoWayForm />
      </Showcase>

      <Showcase
        title="Async stream — promise-driven state machine"
        description="An async generator suspends on an awaited Promise, then resumes when the user acts. The abort signal wires cancellation automatically."
        code={feedbackCode}
      >
        <FeedbackDialog />
      </Showcase>

      <Showcase
        title="captureContext — DI across deferred mounts"
        description="inject() only works during synchronous component init. captureContext() snapshots the DI stack so withContext() can replay it later — here, on every user switch."
        code={userSwitcherCode}
      >
        <UserSwitcher />
      </Showcase>
    </div>
  );
}

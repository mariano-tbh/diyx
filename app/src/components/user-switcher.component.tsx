import { captureContext, withContext, render, inject } from "@diyx/lib";
import { UsersService } from "../tokens/users-service.token";
import { UserCard } from "./user-card.component";

const USER_IDS = ["1", "2", "3"];

export function UserSwitcher() {
  // Capture the DI context synchronously — inject() inside UserProfile
  // needs it, even when we remount from a button click handler.
  const ctx = captureContext();
  const slot = document.createElement("div");
  let index = 0;

  async function show(userId: string) {
    while (slot.firstChild) slot.removeChild(slot.firstChild);

    slot.appendChild(
      await withContext(ctx, async () => {
        const service = inject(UsersService);
        const user = await service.getUser(userId);
        const node = <UserCard user={user} />;
        return render(node);
      }),
    );
  }

  show(USER_IDS[index]);

  return (
    <div class="flex flex-col gap-4">
      {slot}
      <div class="flex items-center gap-2">
        <button
          class="rounded-md px-3 py-1.5 text-xs font-medium border border-slate-700 hover:bg-slate-800 text-slate-300 transition-colors"
          onClick={() => {
            index = (index - 1 + USER_IDS.length) % USER_IDS.length;
            show(USER_IDS[index]);
          }}
        >
          ← Prev
        </button>
        <button
          class="rounded-md px-3 py-1.5 text-xs font-medium border border-slate-700 hover:bg-slate-800 text-slate-300 transition-colors"
          onClick={() => {
            index = (index + 1) % USER_IDS.length;
            show(USER_IDS[index]);
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

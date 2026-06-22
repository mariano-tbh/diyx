import { inject, stream } from "@diyx/lib";
import { UsersService } from "../tokens/users-service.token";
import { UserCard } from "./user-card.component";

export function UserProfile({ userId }: { userId: string }) {
  const userService = inject(UsersService);

  return (
    <>
      {stream(async function* ({ signal }) {
        yield (
          <div class="flex items-center gap-2 text-sm text-slate-500 animate-pulse">
            <span class="h-8 w-8 rounded-full bg-slate-800 inline-block" />
            Loading user "{userId}"…
          </div>
        );

        try {
          const user = await userService.getUser(userId, signal);
          yield <UserCard user={user} />;
        } catch (err) {
          if (signal.aborted) return;
          yield (
            <p class="text-sm text-red-400">Error: {(err as Error).message}</p>
          );
        }
      })}
    </>
  );
}

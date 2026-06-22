import { inject, stream } from "@diyx/lib";
import { UsersService } from "../tokens/users-service.token";

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
          yield <UserCard name={user.name} email={user.email} />;
        } catch (err) {
          if (signal.aborted) return;
          yield (
            <p class="text-sm text-red-400">Error: {(err as Error).message}</p>
          );
        }
      })}
    </>
  );
};

function UserCard({ name, email }: { name: string; email: string }) {
  return (
    <div class="flex items-center gap-3">
      <span class="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white uppercase">
        {name[0]}
      </span>
      <span class="text-sm">
        <strong class="text-slate-100 font-medium">{name}</strong>
        <span class="text-slate-500 ml-2">{email}</span>
      </span>
    </div>
  );
}

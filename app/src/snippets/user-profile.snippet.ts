export const userProfileCode = `\
export function UserProfile({ userId }: { userId: string }) {
  const userService = inject(UserService);

  return (
    <>
      {stream(async function* ({ signal }) {
        yield <p>Loading user "{userId}"…</p>;

        try {
          const user = await userService.getUser(userId, signal);
          yield <UserCard name={user.name} email={user.email} />;
        } catch (err) {
          if (signal.aborted) return;
          yield <p>Error: {(err as Error).message}</p>;
        }
      })}
    </>
  );
}`;

export function UserCard({ user }: { user: { name: string; email: string } }) {
  const { name, email } = user;
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

export const userSwitcherCode = `\
export function UserSwitcher() {
  // Capture the DI context synchronously — inject() inside UserProfile
  // needs it, even when we remount from a button click handler.
  const ctx = captureContext();
  const slot = document.createElement("div");
  let index = 0;

  function show(userId: string) {
    while (slot.firstChild) slot.removeChild(slot.firstChild);
    const node = <UserProfile userId={userId} /> as unknown;
    if (isDescriptor(node)) {
      slot.appendChild(withContext(ctx, () => mountDescriptor(node)));
    }
  }

  show(USER_IDS[index]);

  return (
    <div>
      {slot}
      <button onClick={() => {
        index = (index - 1 + USER_IDS.length) % USER_IDS.length;
        show(USER_IDS[index]);
      }}>
        ← Prev
      </button>
      <button onClick={() => {
        index = (index + 1) % USER_IDS.length;
        show(USER_IDS[index]);
      }}>
        Next →
      </button>
    </div>
  );
}`;

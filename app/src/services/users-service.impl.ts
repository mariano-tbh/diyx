import type { UsersService } from "../tokens/users-service.token";

export const usersServiceImpl: UsersService = {
  async getUser(id, signal) {
    await new Promise<void>((res, rej) => {
      const t = setTimeout(res, 1000 + Math.random() * 4000);
      signal.addEventListener("abort", () => {
        clearTimeout(t);
        rej(signal.reason);
      });
    });
    return { name: `User #${id}`, email: `user${id}@example.com` };
  },
};
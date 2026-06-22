import { defineToken } from "@diyx/lib";

export type UsersService = {
  getUser(
    id: string,
    signal: AbortSignal,
  ): Promise<{ name: string; email: string }>;
}

export const UsersService = defineToken<UsersService>("UsersService");

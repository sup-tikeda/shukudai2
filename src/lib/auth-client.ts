import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";

// baseURL を指定しない場合、ブラウザは同一オリジンの /api/auth を参照する。
export const authClient = createAuthClient({
  plugins: [usernameClient()],
});

export const { signIn, signOut, useSession } = authClient;

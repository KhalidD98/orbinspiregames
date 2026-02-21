import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        const profile: Record<string, string> = {
          email: params.email as string,
        };
        if (params.name) {
          profile.name = params.name as string;
        }
        return profile as any;
      },
    }),
  ],
});

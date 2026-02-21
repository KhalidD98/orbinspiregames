import { getAuthUserId } from "@convex-dev/auth/server";

export async function requireAuth(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("User not found");
  }
  return { userId, user };
}

export function requireRole(user: any, allowedRoles: string[]) {
  if (!user.role || !allowedRoles.includes(user.role)) {
    throw new Error(
      `Access denied. Required role: ${allowedRoles.join(" or ")}`,
    );
  }
}

export async function requireOwner(ctx: any) {
  const { userId, user } = await requireAuth(ctx);
  if (user.role !== "owner") {
    throw new Error("Unauthorized: owner role required");
  }
  return { userId, user };
}

import {
  query,
  mutation,
  action,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v, ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Scrypt } from "lucia";

async function requireAuth(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("User not found");
  }
  return user;
}

async function requireOwner(ctx: any) {
  const user = await requireAuth(ctx);
  if (user.role !== "owner") {
    throw new Error("Unauthorized: owner role required");
  }
  return user;
}

export const current = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    return await ctx.db.get(userId);
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    if (!user || user.role !== "owner") return [];
    return await ctx.db.query("users").collect();
  },
});

export const updateProfile = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    await ctx.db.patch(user._id, { name: args.name });
  },
});

export const setRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("manager"), v.literal("employee")),
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const target = await ctx.db.get(args.userId);
    if (!target) {
      throw new Error("User not found");
    }
    await ctx.db.patch(args.userId, { role: args.role });
  },
});

export const remove = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const owner = await requireOwner(ctx);
    if (owner._id === args.userId) {
      throw new Error("Cannot delete your own account");
    }
    const target = await ctx.db.get(args.userId);
    if (!target) {
      throw new Error("User not found");
    }
    await ctx.db.delete(args.userId);
  },
});

export const setMustChangePassword = mutation({
  args: {
    userId: v.id("users"),
    mustChangePassword: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const target = await ctx.db.get(args.userId);
    if (!target) {
      throw new Error("User not found");
    }
    await ctx.db.patch(args.userId, { mustChangePassword: args.mustChangePassword });
  },
});

export const clearMustChangePassword = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);
    await ctx.db.patch(user._id, { mustChangePassword: false });
  },
});

// --- Password change ---

export const currentInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});

export const getPasswordAccount = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q: any) =>
        q.eq("provider", "password").eq("providerAccountId", args.email),
      )
      .unique();
  },
});

export const updatePasswordHash = internalMutation({
  args: { accountId: v.id("authAccounts"), hash: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.accountId, { secret: args.hash });
  },
});

export const clearMustChangePasswordInternal = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (user?.mustChangePassword) {
      await ctx.db.patch(args.userId, { mustChangePassword: false });
    }
  },
});

export const changePassword = action({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.newPassword.length < 8) {
      throw new ConvexError("Password must be at least 8 characters");
    }

    const user = await ctx.runQuery(internal.users.currentInternal);
    if (!user || !user.email) {
      throw new ConvexError("Not authenticated");
    }

    const account = await ctx.runQuery(internal.users.getPasswordAccount, {
      email: user.email,
    });
    if (!account || !account.secret) {
      throw new ConvexError("No password account found");
    }

    const scrypt = new Scrypt();
    const isValid = await scrypt.verify(account.secret, args.currentPassword);
    if (!isValid) {
      throw new ConvexError("Current password is incorrect");
    }

    const newHash = await scrypt.hash(args.newPassword);
    await ctx.runMutation(internal.users.updatePasswordHash, {
      accountId: account._id,
      hash: newHash,
    });

    if (user.mustChangePassword) {
      await ctx.runMutation(internal.users.clearMustChangePasswordInternal, {
        userId: user._id,
      });
    }
  },
});

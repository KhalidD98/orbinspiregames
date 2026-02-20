import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

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
    await requireOwner(ctx);
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

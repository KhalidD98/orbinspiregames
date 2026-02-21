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

function requireRole(user: any, allowedRoles: string[]) {
  if (!user.role || !allowedRoles.includes(user.role)) {
    throw new Error("Insufficient permissions");
  }
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("storeHours")
      .withIndex("by_sort_order")
      .collect();
  },
});

export const create = mutation({
  args: {
    days: v.string(),
    hours: v.string(),
    sortOrder: v.float64(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    requireRole(user, ["manager", "owner"]);

    return await ctx.db.insert("storeHours", {
      days: args.days,
      hours: args.hours,
      sortOrder: args.sortOrder,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("storeHours"),
    days: v.optional(v.string()),
    hours: v.optional(v.string()),
    sortOrder: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    requireRole(user, ["manager", "owner"]);

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Store hours entry not found");
    }

    const updates: Record<string, any> = {};
    if (args.days !== undefined) updates.days = args.days;
    if (args.hours !== undefined) updates.hours = args.hours;
    if (args.sortOrder !== undefined) updates.sortOrder = args.sortOrder;

    await ctx.db.patch(args.id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("storeHours") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    requireRole(user, ["manager", "owner"]);

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Store hours entry not found");
    }

    await ctx.db.delete(args.id);
  },
});

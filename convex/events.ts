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
      .query("events")
      .withIndex("by_start_date")
      .collect();
  },
});

export const listUpcoming = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("events")
      .withIndex("by_start_date", (q) => q.gte("startDate", Date.now()))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("events") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    startDate: v.float64(),
    endDate: v.float64(),
    gameType: v.string(),
    format: v.optional(v.string()),
    entryFee: v.optional(v.float64()),
    maxPlayers: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    requireRole(user, ["manager", "owner"]);

    return await ctx.db.insert("events", {
      title: args.title,
      description: args.description,
      startDate: args.startDate,
      endDate: args.endDate,
      gameType: args.gameType,
      format: args.format,
      entryFee: args.entryFee,
      maxPlayers: args.maxPlayers,
      createdBy: user._id,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("events"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    startDate: v.optional(v.float64()),
    endDate: v.optional(v.float64()),
    gameType: v.optional(v.string()),
    format: v.optional(v.string()),
    entryFee: v.optional(v.float64()),
    maxPlayers: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    requireRole(user, ["manager", "owner"]);

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Event not found");
    }

    const updates: Record<string, any> = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.startDate !== undefined) updates.startDate = args.startDate;
    if (args.endDate !== undefined) updates.endDate = args.endDate;
    if (args.gameType !== undefined) updates.gameType = args.gameType;
    if (args.format !== undefined) updates.format = args.format;
    if (args.entryFee !== undefined) updates.entryFee = args.entryFee;
    if (args.maxPlayers !== undefined) updates.maxPlayers = args.maxPlayers;

    await ctx.db.patch(args.id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("events") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    requireRole(user, ["manager", "owner"]);

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Event not found");
    }

    await ctx.db.delete(args.id);
  },
});

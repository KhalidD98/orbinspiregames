import { query, mutation, internalMutation, action } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireRole } from "./lib/auth";
import { internal } from "./_generated/api";

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("creditTypes")
      .withIndex("by_sort_order")
      .order("asc")
      .collect();
  },
});

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const all = await ctx.db
      .query("creditTypes")
      .withIndex("by_sort_order")
      .order("asc")
      .collect();
    return all.filter((t) => t.isActive);
  },
});

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

export const create = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireAuth(ctx);
    requireRole(user, ["manager", "owner"]);

    const slug = generateSlug(args.name);

    const existing = await ctx.db
      .query("creditTypes")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (existing) {
      throw new Error(`A credit type with slug "${slug}" already exists.`);
    }

    const all = await ctx.db
      .query("creditTypes")
      .withIndex("by_sort_order")
      .order("desc")
      .first();
    const sortOrder = all ? all.sortOrder + 1 : 1;

    return await ctx.db.insert("creditTypes", {
      name: args.name,
      slug,
      isActive: true,
      sortOrder,
      createdBy: userId,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("creditTypes"),
    name: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    sortOrder: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);
    requireRole(user, ["manager", "owner"]);

    const { id, ...fields } = args;
    const patch: Record<string, unknown> = {};
    if (fields.name !== undefined) patch.name = fields.name;
    if (fields.isActive !== undefined) patch.isActive = fields.isActive;
    if (fields.sortOrder !== undefined) patch.sortOrder = fields.sortOrder;

    await ctx.db.patch(id, patch);
    return id;
  },
});

export const remove = mutation({
  args: {
    id: v.id("creditTypes"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);
    requireRole(user, ["manager", "owner"]);

    const usage = await ctx.db
      .query("transactions")
      .withIndex("by_typeId", (q) => q.eq("typeId", args.id))
      .first();
    if (usage) {
      throw new Error(
        "Cannot delete this credit type because it is used by existing transactions.",
      );
    }

    await ctx.db.delete(args.id);
    return args.id;
  },
});

export const usageMap = query({
  args: {},
  handler: async (ctx): Promise<Record<string, boolean>> => {
    await requireAuth(ctx);

    const allTypes = await ctx.db.query("creditTypes").collect();
    const result: Record<string, boolean> = {};

    for (const creditType of allTypes) {
      const usage = await ctx.db
        .query("transactions")
        .withIndex("by_typeId", (q) => q.eq("typeId", creditType._id))
        .first();
      result[creditType._id] = usage !== null;
    }

    return result;
  },
});

const DEFAULT_TYPES = [
  { name: "Buy-in", slug: "buy_in", sortOrder: 1 },
  { name: "Purchase", slug: "purchase", sortOrder: 2 },
  { name: "Adjustment", slug: "adjustment", sortOrder: 3 },
  { name: "Correction", slug: "correction", sortOrder: 4 },
  { name: "Migration", slug: "migration", sortOrder: 5 },
];

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId, user } = await requireAuth(ctx);
    if (user.role !== "owner") {
      throw new Error("Unauthorized: owner role required");
    }

    for (const defaults of DEFAULT_TYPES) {
      const existing = await ctx.db
        .query("creditTypes")
        .withIndex("by_slug", (q) => q.eq("slug", defaults.slug))
        .first();
      if (!existing) {
        await ctx.db.insert("creditTypes", {
          name: defaults.name,
          slug: defaults.slug,
          isActive: true,
          sortOrder: defaults.sortOrder,
          createdBy: userId,
          createdAt: Date.now(),
        });
      }
    }
  },
});

export const migrateBatch = internalMutation({
  args: {},
  handler: async (_ctx) => {
    // Phase 2: migration complete — all transactions have typeId
    return 0;
  },
});

export const migrateTransactions = action({
  args: {},
  handler: async (ctx) => {
    let totalMigrated = 0;
    while (true) {
      const count: number = await ctx.runMutation(internal.creditTypes.migrateBatch, {});
      totalMigrated += count;
      if (count === 0) break;
    }
    return { totalMigrated };
  },
});

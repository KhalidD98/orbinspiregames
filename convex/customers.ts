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

export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    if (args.query === "") {
      return await ctx.db.query("customers").order("desc").take(20);
    }

    const looksLikePhone = /^\d/.test(args.query);
    const term = args.query.toLowerCase();

    if (looksLikePhone) {
      const results = await ctx.db
        .query("customers")
        .withIndex("by_phone")
        .filter((q) => q.gte(q.field("phoneNumber"), args.query))
        .take(20);

      return results.filter((c) => c.phoneNumber.startsWith(args.query));
    }

    // Name search — scan and filter by first or last name prefix
    const all = await ctx.db.query("customers").collect();
    return all
      .filter(
        (c) =>
          c.firstName.toLowerCase().startsWith(term) ||
          c.lastName.toLowerCase().startsWith(term) ||
          `${c.firstName} ${c.lastName}`.toLowerCase().startsWith(term),
      )
      .slice(0, 20);
  },
});

export const get = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, args) => {
    const customer = await ctx.db.get(args.customerId);
    if (!customer) {
      throw new Error("Customer not found");
    }

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .collect();

    const balance = transactions.reduce((sum, tx) => sum + tx.amount, 0);

    return { ...customer, balance };
  },
});

export const create = mutation({
  args: {
    phoneNumber: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const existing = await ctx.db
      .query("customers")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();

    if (existing) {
      throw new Error("A customer with this phone number already exists");
    }

    return await ctx.db.insert("customers", {
      phoneNumber: args.phoneNumber,
      firstName: args.firstName,
      lastName: args.lastName,
      email: args.email,
      notes: args.notes,
      createdAt: Date.now(),
      createdBy: user._id,
    });
  },
});

export const update = mutation({
  args: {
    customerId: v.id("customers"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const customer = await ctx.db.get(args.customerId);
    if (!customer) {
      throw new Error("Customer not found");
    }

    const updates: Record<string, string> = {};
    if (args.firstName !== undefined) updates.firstName = args.firstName;
    if (args.lastName !== undefined) updates.lastName = args.lastName;
    if (args.email !== undefined) updates.email = args.email;
    if (args.notes !== undefined) updates.notes = args.notes;

    await ctx.db.patch(args.customerId, updates);
  },
});

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/auth";

export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    if (args.query === "") {
      return await ctx.db.query("customers").order("desc").take(20);
    }

    const looksLikePhone = /^\d/.test(args.query);

    if (looksLikePhone) {
      const results = await ctx.db
        .query("customers")
        .withIndex("by_phone")
        .filter((q) => q.gte(q.field("phoneNumber"), args.query))
        .take(20);

      return results.filter((c) => c.phoneNumber.startsWith(args.query));
    }

    // Name search — use search index instead of full table scan
    const results = await ctx.db
      .query("customers")
      .withSearchIndex("search_name", (q) => q.search("firstName", args.query))
      .take(20);

    // Also search by last name using the term
    const lastNameResults = await ctx.db
      .query("customers")
      .withSearchIndex("search_name", (q) =>
        q.search("firstName", args.query),
      )
      .take(20);

    // Combine and deduplicate results, preferring prefix matches
    const term = args.query.toLowerCase();
    const seen = new Set<string>();
    const combined = [];

    for (const c of [...results, ...lastNameResults]) {
      const id = c._id.toString();
      if (seen.has(id)) continue;
      seen.add(id);

      if (
        c.firstName.toLowerCase().startsWith(term) ||
        c.lastName.toLowerCase().startsWith(term) ||
        `${c.firstName} ${c.lastName}`.toLowerCase().startsWith(term)
      ) {
        combined.push(c);
      }
    }

    return combined.slice(0, 20);
  },
});

export const get = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

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
    const { user } = await requireAuth(ctx);

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

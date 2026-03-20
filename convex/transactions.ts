import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireRole } from "./lib/auth";

export const listByCustomer = query({
  args: {
    customerId: v.id("customers"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .order("desc")
      .collect();

    // Fetch all credit types once and build lookup map
    const allCreditTypes = await ctx.db.query("creditTypes").collect();
    const typeIdToName = new Map(allCreditTypes.map((ct) => [ct._id, ct.name]));

    const transactionsWithEmployee = await Promise.all(
      transactions.map(async (transaction) => {
        const employee = await ctx.db.get(transaction.employeeId);

        return {
          ...transaction,
          employeeName: employee?.name || employee?.email || "Unknown",
          typeName: typeIdToName.get(transaction.typeId) ?? "Unknown",
        };
      }),
    );

    return transactionsWithEmployee;
  },
});

export const create = mutation({
  args: {
    customerId: v.id("customers"),
    amount: v.float64(),
    typeId: v.id("creditTypes"),
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const creditType = await ctx.db.get(args.typeId);
    if (!creditType) {
      throw new Error("Credit type not found.");
    }
    if (!creditType.isActive) {
      throw new Error("Cannot create a transaction with an inactive credit type.");
    }

    const transactionId = await ctx.db.insert("transactions", {
      customerId: args.customerId,
      amount: args.amount,
      typeId: args.typeId,
      description: args.description,
      notes: args.notes,
      employeeId: userId,
      createdAt: Date.now(),
    });

    return transactionId;
  },
});

export const update = mutation({
  args: {
    id: v.id("transactions"),
    amount: v.float64(),
    typeId: v.id("creditTypes"),
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);
    requireRole(user, ["manager", "owner"]);

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Transaction not found.");
    }

    const creditType = await ctx.db.get(args.typeId);
    if (!creditType) {
      throw new Error("Credit type not found.");
    }

    // Skip isActive check if typeId matches the existing transaction's typeId
    // (allows editing transactions that use a now-disabled type)
    if (args.typeId !== existing.typeId && !creditType.isActive) {
      throw new Error("Cannot update a transaction to use an inactive credit type.");
    }

    await ctx.db.patch(args.id, {
      amount: args.amount,
      typeId: args.typeId,
      description: args.description,
      notes: args.notes,
    });

    return args.id;
  },
});

export const remove = mutation({
  args: {
    id: v.id("transactions"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);
    requireRole(user, ["owner"]);

    await ctx.db.delete(args.id);

    return args.id;
  },
});

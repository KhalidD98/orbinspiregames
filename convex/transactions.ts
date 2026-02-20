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
  return { userId, user };
}

function requireRole(user: any, allowedRoles: string[]) {
  if (!user.role || !allowedRoles.includes(user.role)) {
    throw new Error(
      `Access denied. Required role: ${allowedRoles.join(" or ")}`,
    );
  }
}

export const listByCustomer = query({
  args: {
    customerId: v.id("customers"),
  },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .order("desc")
      .collect();

    const transactionsWithEmployee = await Promise.all(
      transactions.map(async (transaction) => {
        const employee = await ctx.db.get(transaction.employeeId);
        return {
          ...transaction,
          employeeName: employee?.name ?? "Unknown",
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
    type: v.union(
      v.literal("buy_in"),
      v.literal("purchase"),
      v.literal("adjustment"),
      v.literal("correction"),
      v.literal("migration"),
    ),
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const transactionId = await ctx.db.insert("transactions", {
      customerId: args.customerId,
      amount: args.amount,
      type: args.type,
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
    type: v.union(
      v.literal("buy_in"),
      v.literal("purchase"),
      v.literal("adjustment"),
      v.literal("correction"),
      v.literal("migration"),
    ),
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);
    requireRole(user, ["manager", "owner"]);

    const { id, ...fields } = args;
    await ctx.db.patch(id, {
      amount: fields.amount,
      type: fields.type,
      description: fields.description,
      notes: fields.notes,
    });

    return id;
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

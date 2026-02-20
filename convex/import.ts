import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const importCSVData = mutation({
  args: {
    rows: v.array(
      v.object({
        phoneNumber: v.string(),
        firstName: v.string(),
        lastName: v.string(),
        email: v.optional(v.string()),
        balance: v.float64(),
        description: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    if (user.role !== "owner") throw new Error("Only owners can import data");

    const results = {
      customersCreated: 0,
      customersMatched: 0,
      transactionsCreated: 0,
      errors: [] as string[],
    };

    for (const row of args.rows) {
      try {
        // Look for existing customer by phone
        const existing = await ctx.db
          .query("customers")
          .withIndex("by_phone", (q) => q.eq("phoneNumber", row.phoneNumber))
          .first();

        let customerId;
        if (existing) {
          customerId = existing._id;
          results.customersMatched++;
        } else {
          customerId = await ctx.db.insert("customers", {
            phoneNumber: row.phoneNumber,
            firstName: row.firstName,
            lastName: row.lastName,
            email: row.email,
            createdAt: Date.now(),
            createdBy: userId,
          });
          results.customersCreated++;
        }

        // Create migration transaction if balance is non-zero
        if (row.balance !== 0) {
          await ctx.db.insert("transactions", {
            customerId,
            amount: row.balance,
            type: "migration",
            description:
              row.description || "Imported from Google Sheets",
            employeeId: userId,
            createdAt: Date.now(),
          });
          results.transactionsCreated++;
        }
      } catch (e) {
        results.errors.push(
          `Row ${row.phoneNumber}: ${e instanceof Error ? e.message : "Unknown error"}`,
        );
      }
    }

    return results;
  },
});

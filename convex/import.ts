import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireOwner } from "./lib/auth";

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
    const { userId } = await requireOwner(ctx);

    const migrationType = await ctx.db
      .query("creditTypes")
      .withIndex("by_slug", (q) => q.eq("slug", "migration"))
      .first();
    if (!migrationType) {
      throw new Error("Migration credit type not found. Please seed credit types first.");
    }

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
            typeId: migrationType._id,
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

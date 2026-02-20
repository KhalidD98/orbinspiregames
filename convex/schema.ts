import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.float64()),
    image: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
    // Custom fields
    role: v.optional(v.union(v.literal("owner"), v.literal("manager"), v.literal("employee"))),
    mustChangePassword: v.optional(v.boolean()),
  }).index("email", ["email"]),

  customers: defineTable({
    phoneNumber: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.float64(),
    createdBy: v.id("users"),
  })
    .index("by_phone", ["phoneNumber"])
    .searchIndex("search_phone", { searchField: "phoneNumber" })
    .searchIndex("search_name", { searchField: "firstName" }),

  transactions: defineTable({
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
    employeeId: v.id("users"),
    createdAt: v.float64(),
  }).index("by_customer", ["customerId"]),

  events: defineTable({
    title: v.string(),
    description: v.string(),
    startDate: v.float64(),
    endDate: v.float64(),
    gameType: v.string(),
    format: v.optional(v.string()),
    entryFee: v.optional(v.float64()),
    maxPlayers: v.optional(v.float64()),
    createdBy: v.id("users"),
    createdAt: v.float64(),
  }).index("by_start_date", ["startDate"]),
});

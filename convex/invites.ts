import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireAuth, requireOwner } from "./lib/auth";

export const create = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("owner"), v.literal("manager"), v.literal("employee")),
  },
  handler: async (ctx, args) => {
    const { user: owner } = await requireOwner(ctx);

    const existing = await ctx.db
      .query("invites")
      .withIndex("by_email", (q: any) => q.eq("email", args.email))
      .filter((q: any) => q.eq(q.field("claimed"), false))
      .first();

    if (existing) {
      throw new Error("An unclaimed invite already exists for this email");
    }

    await ctx.db.insert("invites", {
      email: args.email,
      name: args.name,
      role: args.role,
      createdBy: owner._id,
      createdAt: Date.now(),
      claimed: false,
    });
  },
});

export const listPending = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    if (!user || user.role !== "owner") return [];
    return await ctx.db
      .query("invites")
      .filter((q: any) => q.eq(q.field("claimed"), false))
      .order("desc")
      .collect();
  },
});

export const remove = mutation({
  args: {
    inviteId: v.id("invites"),
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const invite = await ctx.db.get(args.inviteId);
    if (!invite) {
      throw new Error("Invite not found");
    }
    if (invite.claimed) {
      throw new Error("Cannot remove a claimed invite");
    }
    await ctx.db.delete(args.inviteId);
  },
});

export const claimPendingInvite = mutation({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireAuth(ctx);
    if (!user.email) {
      return;
    }

    const invite = await ctx.db
      .query("invites")
      .withIndex("by_email", (q: any) => q.eq("email", user.email))
      .filter((q: any) => q.eq(q.field("claimed"), false))
      .first();

    if (!invite) {
      return;
    }

    await ctx.db.patch(user._id, { role: invite.role });
    await ctx.db.patch(invite._id, { claimed: true });
  },
});

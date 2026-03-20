# Configurable Credit Types Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded transaction type strings with a configurable `creditTypes` table, add a Settings page for managing types, and update all transaction UI/backend to use type IDs.

**Architecture:** New `creditTypes` Convex table with CRUD functions. Two-phase schema migration: Phase 1 adds both old `type` (optional) and new `typeId` (optional) fields, runs migration, then Phase 2 makes `typeId` required and removes `type`. Settings page at `/admin/settings` for type management. Transaction forms/display updated to use dynamic types.

**Tech Stack:** Convex (backend/DB), React 19, TanStack Router, shadcn/ui (Radix), Tailwind CSS 4, Sonner (toasts), Lucide icons

**Spec:** `docs/superpowers/specs/2026-03-20-configurable-credit-types-design.md`

---

## File Structure

**New files:**
- `convex/creditTypes.ts` — CRUD queries/mutations for credit types
- `src/routes/admin/settings.tsx` — Settings page with credit type management

**Modified files:**
- `convex/schema.ts` — Add `creditTypes` table, update `transactions` table (phased)
- `convex/transactions.ts` — Change `type` string to `typeId` reference, optimize queries
- `convex/import.ts` — Look up migration type by slug instead of hardcoding string
- `src/components/admin/AdminLayout.tsx` — Add Settings nav item for manager+
- `src/routes/admin/credit/$customerId.tsx` — Dynamic type dropdowns, remove hardcoded types

---

## Chunk 1: Backend Foundation

### Task 1: Add `creditTypes` table to schema (Phase 1)

**Files:**
- Modify: `convex/schema.ts:5-75`

- [ ] **Step 1: Add creditTypes table and update transactions table**

In `convex/schema.ts`, add the `creditTypes` table definition after the `customers` table, and update the `transactions` table to accept both old and new fields:

```typescript
// Add after the customers table (after line 30):

creditTypes: defineTable({
  name: v.string(),
  slug: v.string(),
  isActive: v.boolean(),
  sortOrder: v.float64(),
  createdBy: v.id("users"),
  createdAt: v.float64(),
})
  .index("by_slug", ["slug"])
  .index("by_sort_order", ["sortOrder"]),

// Replace the transactions table definition (lines 32-46) with:

transactions: defineTable({
  customerId: v.id("customers"),
  amount: v.float64(),
  // Phase 1: both fields optional during migration
  type: v.optional(v.union(
    v.literal("buy_in"),
    v.literal("purchase"),
    v.literal("adjustment"),
    v.literal("correction"),
    v.literal("migration"),
  )),
  typeId: v.optional(v.id("creditTypes")),
  description: v.optional(v.string()),
  notes: v.optional(v.string()),
  employeeId: v.id("users"),
  createdAt: v.float64(),
})
  .index("by_customer", ["customerId"])
  .index("by_typeId", ["typeId"]),
```

- [ ] **Step 2: Verify the schema deploys**

Run: `npx convex dev --once`
Expected: "Convex functions ready!" with no schema errors

- [ ] **Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat: add creditTypes table and Phase 1 transaction schema"
```

---

### Task 2: Create `convex/creditTypes.ts` — queries and mutations

**Files:**
- Create: `convex/creditTypes.ts`

- [ ] **Step 1: Create the creditTypes module with all functions**

Create `convex/creditTypes.ts`:

```typescript
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
      .collect();
  },
});

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const allTypes = await ctx.db
      .query("creditTypes")
      .withIndex("by_sort_order")
      .collect();
    return allTypes.filter((t) => t.isActive);
  },
});

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export const create = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const { user, userId } = await requireAuth(ctx);
    requireRole(user, ["manager", "owner"]);

    const name = args.name.trim();
    if (!name) {
      throw new Error("Name is required");
    }

    const slug = generateSlug(name);
    if (!slug) {
      throw new Error("Name must contain at least one alphanumeric character");
    }

    // Check for duplicate slug
    const existing = await ctx.db
      .query("creditTypes")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (existing) {
      throw new Error(`A type with this name already exists ("${existing.name}")`);
    }

    // Get next sort order
    const allTypes = await ctx.db
      .query("creditTypes")
      .withIndex("by_sort_order")
      .collect();
    const maxSort = allTypes.length > 0
      ? Math.max(...allTypes.map((t) => t.sortOrder))
      : 0;

    return await ctx.db.insert("creditTypes", {
      name,
      slug,
      isActive: true,
      sortOrder: maxSort + 1,
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

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Credit type not found");
    }

    const updates: Record<string, any> = {};
    if (args.name !== undefined) {
      const name = args.name.trim();
      if (!name) throw new Error("Name is required");
      updates.name = name;
    }
    if (args.isActive !== undefined) updates.isActive = args.isActive;
    if (args.sortOrder !== undefined) updates.sortOrder = args.sortOrder;

    await ctx.db.patch(args.id, updates);
  },
});

export const remove = mutation({
  args: {
    id: v.id("creditTypes"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);
    requireRole(user, ["manager", "owner"]);

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Credit type not found");
    }

    // Check if any transactions use this type — use index, only need first
    const usedByTransaction = await ctx.db
      .query("transactions")
      .withIndex("by_typeId", (q) => q.eq("typeId", args.id))
      .first();

    if (usedByTransaction) {
      throw new Error(
        "Cannot delete this type — transactions exist. Disable it instead."
      );
    }

    await ctx.db.delete(args.id);
  },
});

// Check which types are in use (for client-side delete button state)
export const usageMap = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const types = await ctx.db
      .query("creditTypes")
      .withIndex("by_sort_order")
      .collect();
    const result: Record<string, boolean> = {};
    for (const type of types) {
      const used = await ctx.db
        .query("transactions")
        .withIndex("by_typeId", (q) => q.eq("typeId", type._id))
        .first();
      result[type._id] = !!used;
    }
    return result;
  },
});

// Seed default types (idempotent)
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const { user, userId } = await requireAuth(ctx);
    requireRole(user, ["owner"]);

    const defaults = [
      { name: "Buy-in", slug: "buy_in", sortOrder: 1 },
      { name: "Purchase", slug: "purchase", sortOrder: 2 },
      { name: "Adjustment", slug: "adjustment", sortOrder: 3 },
      { name: "Correction", slug: "correction", sortOrder: 4 },
      { name: "Migration", slug: "migration", sortOrder: 5 },
    ];

    const created: string[] = [];
    for (const def of defaults) {
      const existing = await ctx.db
        .query("creditTypes")
        .withIndex("by_slug", (q) => q.eq("slug", def.slug))
        .first();
      if (!existing) {
        await ctx.db.insert("creditTypes", {
          ...def,
          isActive: true,
          createdBy: userId,
          createdAt: Date.now(),
        });
        created.push(def.name);
      }
    }
    return { created };
  },
});

// Internal mutation to migrate a batch of transactions
export const migrateBatch = internalMutation({
  args: {
    limit: v.float64(),
  },
  handler: async (ctx, args) => {
    // Build slug -> ID map
    const types = await ctx.db
      .query("creditTypes")
      .withIndex("by_sort_order")
      .collect();
    const slugToId = new Map(types.map((t) => [t.slug, t._id]));

    // Find transactions that still have old `type` but no `typeId`
    const unmigrated = await ctx.db
      .query("transactions")
      .filter((q) => q.eq(q.field("typeId"), undefined))
      .take(args.limit);

    let migrated = 0;
    for (const tx of unmigrated) {
      const typeId = slugToId.get((tx as any).type);
      if (typeId) {
        await ctx.db.patch(tx._id, { typeId, type: undefined } as any);
        migrated++;
      }
    }
    return { migrated, remaining: unmigrated.length === args.limit };
  },
});

// Action to run batched migration
export const migrateTransactions = action({
  args: {},
  handler: async (ctx) => {
    let totalMigrated = 0;
    let hasMore = true;
    while (hasMore) {
      const result = await ctx.runMutation(internal.creditTypes.migrateBatch, {
        limit: 100,
      });
      totalMigrated += result.migrated;
      hasMore = result.remaining;
    }
    return { totalMigrated };
  },
});
```

- [ ] **Step 2: Verify it deploys**

Run: `npx convex dev --once`
Expected: "Convex functions ready!" with no errors

- [ ] **Step 3: Commit**

```bash
git add convex/creditTypes.ts
git commit -m "feat: add creditTypes CRUD, seed, and migration functions"
```

---

### Task 3: Update `convex/transactions.ts` to use `typeId`

**Files:**
- Modify: `convex/transactions.ts:1-105`

- [ ] **Step 1: Rewrite transactions.ts to use typeId with optimized queries**

Replace the entire contents of `convex/transactions.ts`:

```typescript
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

    // Batch lookup: fetch all credit types once, build ID->name and slug->ID maps
    const allTypes = await ctx.db.query("creditTypes").collect();
    const typeIdToName = new Map(allTypes.map((t) => [t._id, t.name]));
    const slugToId = new Map(allTypes.map((t) => [t.slug, t._id]));

    const enriched = await Promise.all(
      transactions.map(async (transaction) => {
        const employee = await ctx.db.get(transaction.employeeId);
        // Resolve typeId for unmigrated transactions (Phase 1 compatibility)
        const resolvedTypeId = transaction.typeId
          ?? slugToId.get((transaction as any).type)
          ?? null;
        return {
          ...transaction,
          typeId: resolvedTypeId,
          typeName: resolvedTypeId
            ? typeIdToName.get(resolvedTypeId) ?? "Unknown"
            : (transaction as any).type ?? "Unknown",
          employeeName: employee?.name || employee?.email || "Unknown",
        };
      }),
    );

    return enriched;
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

    // Validate type exists and is active
    const creditType = await ctx.db.get(args.typeId);
    if (!creditType) {
      throw new Error("Credit type not found");
    }
    if (!creditType.isActive) {
      throw new Error("This credit type is disabled");
    }

    return await ctx.db.insert("transactions", {
      customerId: args.customerId,
      amount: args.amount,
      typeId: args.typeId,
      description: args.description,
      notes: args.notes,
      employeeId: userId,
      createdAt: Date.now(),
    });
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
      throw new Error("Transaction not found");
    }

    // Validate type exists. Skip isActive check if type hasn't changed.
    const creditType = await ctx.db.get(args.typeId);
    if (!creditType) {
      throw new Error("Credit type not found");
    }
    if (!creditType.isActive && args.typeId !== existing.typeId) {
      throw new Error("This credit type is disabled");
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
```

- [ ] **Step 2: Verify it deploys**

Run: `npx convex dev --once`
Expected: "Convex functions ready!"

- [ ] **Step 3: Commit**

```bash
git add convex/transactions.ts
git commit -m "feat: update transactions to use typeId with optimized batch lookups"
```

---

### Task 4: Update `convex/import.ts` to use typeId

**Files:**
- Modify: `convex/import.ts:52-62`

- [ ] **Step 1: Look up migration type by slug and use its ID**

In `convex/import.ts`, update the handler to look up the migration type at the start of the function and use its ID. Replace the handler function body (lines 19-72):

```typescript
  handler: async (ctx, args) => {
    const { userId } = await requireOwner(ctx);

    // Look up migration type by slug
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
```

- [ ] **Step 2: Verify it deploys**

Run: `npx convex dev --once`
Expected: "Convex functions ready!"

- [ ] **Step 3: Commit**

```bash
git add convex/import.ts
git commit -m "feat: update CSV import to use creditTypes typeId lookup"
```

---

## Chunk 2: Frontend — Settings Page and Navigation

### Task 5: Add Settings nav item to sidebar

**Files:**
- Modify: `src/components/admin/AdminLayout.tsx:1-35`

- [ ] **Step 1: Add Settings import and nav item**

In `src/components/admin/AdminLayout.tsx`:

1. Add `Settings` to the lucide-react import (line 5-18):
```typescript
import {
  CreditCard,
  Calendar,
  Users,
  LayoutDashboard,
  LogOut,
  User,
  Menu,
  X,
  Upload,
  PanelLeftClose,
  PanelLeftOpen,
  Clock,
  Settings,
} from "lucide-react";
```

2. Add Settings to the `managerNavItems` array (lines 28-30):
```typescript
const managerNavItems = [
  { to: "/admin/hours", label: "Store Hours", icon: Clock },
  { to: "/admin/settings", label: "Settings", icon: Settings },
] as const;
```

- [ ] **Step 2: Verify the app compiles**

Check the running dev server for no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/AdminLayout.tsx
git commit -m "feat: add Settings nav item to sidebar for manager+"
```

---

### Task 6: Create Settings page with Credit Types management

**Files:**
- Create: `src/routes/admin/settings.tsx`

- [ ] **Step 1: Create the Settings page**

Create `src/routes/admin/settings.tsx`:

```typescript
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronUp,
  ChevronDown,
  Pencil,
  Trash2,
  Plus,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const user = useQuery(api.users.current);
  const creditTypes = useQuery(api.creditTypes.list);
  const typeUsage = useQuery(api.creditTypes.usageMap);
  const createType = useMutation(api.creditTypes.create);
  const updateType = useMutation(api.creditTypes.update);
  const removeType = useMutation(api.creditTypes.remove);
  const seedTypes = useMutation(api.creditTypes.seed);
  const migrateTransactions = useAction(api.creditTypes.migrateTransactions);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);
  const [typeName, setTypeName] = useState("");
  const [saving, setSaving] = useState(false);
  const [seeded, setSeeded] = useState(false);

  const isManagerOrOwner =
    user?.role === "manager" || user?.role === "owner";
  const isOwner = user?.role === "owner";

  // Auto-seed on first load if no types exist
  useEffect(() => {
    if (creditTypes !== undefined && creditTypes.length === 0 && isOwner && !seeded) {
      setSeeded(true);
      seedTypes({})
        .then(() => migrateTransactions({}))
        .then((result) => {
          if (result.totalMigrated > 0) {
            toast.success(`Seeded default types and migrated ${result.totalMigrated} transactions`);
          } else {
            toast.success("Seeded default credit types");
          }
        })
        .catch((err) => {
          toast.error(err instanceof Error ? err.message : "Failed to seed types");
        });
    }
  }, [creditTypes, isOwner, seeded, seedTypes, migrateTransactions]);

  if (user !== undefined && !isManagerOrOwner) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            Access Denied. You must be a manager or owner to access settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (creditTypes === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  const handleAddType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeName.trim()) return;
    setSaving(true);
    try {
      await createType({ name: typeName.trim() });
      toast.success("Credit type added");
      setAddDialogOpen(false);
      setTypeName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add type");
    } finally {
      setSaving(false);
    }
  };

  const handleEditType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingType || !typeName.trim()) return;
    setSaving(true);
    try {
      await updateType({ id: editingType._id, name: typeName.trim() });
      toast.success("Credit type updated");
      setEditDialogOpen(false);
      setEditingType(null);
      setTypeName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update type");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (type: any) => {
    try {
      await updateType({ id: type._id, isActive: !type.isActive });
      toast.success(type.isActive ? "Type disabled" : "Type enabled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update type");
    }
  };

  const handleDelete = async (type: any) => {
    try {
      await removeType({ id: type._id });
      toast.success("Credit type deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete type");
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= creditTypes.length) return;

    const current = creditTypes[index];
    const swapWith = creditTypes[swapIndex];

    try {
      await Promise.all([
        updateType({ id: current._id, sortOrder: swapWith.sortOrder }),
        updateType({ id: swapWith._id, sortOrder: current.sortOrder }),
      ]);
    } catch {
      toast.error("Failed to reorder");
    }
  };

  const openEditDialog = (type: any) => {
    setEditingType(type);
    setTypeName(type.name);
    setEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage store configuration
        </p>
      </div>

      {/* Credit Types Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Credit Types</CardTitle>
            <Button
              size="sm"
              onClick={() => {
                setTypeName("");
                setAddDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Type
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {creditTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {isOwner
                ? "Initializing default credit types..."
                : "No credit types configured. Please ask an owner to visit this page to initialize defaults."}
            </p>
          ) : (
            <div className="space-y-2">
              {creditTypes.map((type: any, index: number) => (
                <div
                  key={type._id}
                  className="flex items-center gap-3 rounded-md border p-3"
                >
                  {/* Reorder arrows */}
                  <div className="flex flex-col">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMove(index, "up")}
                      className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={index === creditTypes.length - 1}
                      onClick={() => handleMove(index, "down")}
                      className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Name + status */}
                  <div className="flex-1">
                    <span className="font-medium">{type.name}</span>
                    <Badge
                      variant={type.isActive ? "default" : "secondary"}
                      className="ml-2"
                    >
                      {type.isActive ? "Active" : "Disabled"}
                    </Badge>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(type)}
                      title="Rename"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActive(type)}
                      title={type.isActive ? "Disable" : "Enable"}
                    >
                      {type.isActive ? (
                        <ToggleRight className="h-4 w-4" />
                      ) : (
                        <ToggleLeft className="h-4 w-4" />
                      )}
                    </Button>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(type)}
                              disabled={typeUsage?.[type._id] === true}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {typeUsage?.[type._id]
                            ? "Cannot delete — transactions exist. Disable instead."
                            : "Delete type"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Type Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Credit Type</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddType} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type-name">Name *</Label>
              <Input
                id="type-name"
                value={typeName}
                onChange={(e) => setTypeName(e.target.value)}
                placeholder="e.g. Tournament Prize"
                required
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Adding..." : "Add Type"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Type Dialog */}
      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setEditingType(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Credit Type</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditType} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-type-name">Name *</Label>
              <Input
                id="edit-type-name"
                value={typeName}
                onChange={(e) => setTypeName(e.target.value)}
                placeholder="Type name"
                required
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditDialogOpen(false);
                  setEditingType(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Verify the page renders**

Open `http://localhost:5175/admin/settings` in the browser. Verify:
- Settings page loads
- If logged in as owner, types auto-seed
- Types list shows with reorder, edit, toggle, delete controls

- [ ] **Step 3: Commit**

```bash
git add src/routes/admin/settings.tsx
git commit -m "feat: add Settings page with credit types management"
```

---

## Chunk 3: Frontend — Update Transaction Forms

### Task 7: Update customer detail page to use dynamic types

**Files:**
- Modify: `src/routes/admin/credit/$customerId.tsx:1-618`

- [ ] **Step 1: Update imports and remove hardcoded types**

At the top of `$customerId.tsx`:

1. Add `useEffect` to the React import (line 4): change `import { useState } from "react"` to `import { useState, useEffect } from "react"`.
2. `useQuery` is already imported from convex/react — no change needed.
3. Remove lines 44-57 (the `TransactionType` type alias and `TRANSACTION_TYPE_LABELS` constant).

- [ ] **Step 2: Update component to use dynamic types**

In the `CustomerDetailPage` function:

1. Add the credit types queries after the existing queries (after line 84):
```typescript
const activeTypes = useQuery(api.creditTypes.listActive);
const allTypes = useQuery(api.creditTypes.list);
```

2. Replace the type state (line 98) — change from string to ID:
```typescript
const [typeId, setTypeId] = useState("");
```

3. Replace the edit type state (line 108):
```typescript
const [editTypeId, setEditTypeId] = useState("");
```

4. Update `resetForm` (lines 116-121):
```typescript
const resetForm = () => {
  setAmount("");
  setTypeId(activeTypes?.[0]?._id ?? "");
  setDescription("");
  setNotes("");
};
```

5. Update `handleAddCredit` (line 135) — change `type` to `typeId`:
```typescript
await createTransaction({
  customerId: customerId as any,
  amount: parsedAmount,
  typeId: typeId as any,
  description: description || undefined,
  notes: notes || undefined,
});
```

6. Update `handleUseCredit` (lines 160-166) similarly:
```typescript
await createTransaction({
  customerId: customerId as any,
  amount: -parsedAmount,
  typeId: typeId as any,
  description: description || undefined,
  notes: notes || undefined,
});
```

7. Update `openEditDialog` (line 182) — set typeId:
```typescript
setEditTypeId(tx.typeId);
```

8. Update `handleEditTransaction` (lines 201-206):
```typescript
await updateTransaction({
  id: editingTransaction._id,
  amount: finalAmount,
  typeId: editTypeId as any,
  description: editDescription || undefined,
  notes: editNotes || undefined,
});
```

9. Update loading check (line 234) to include types:
```typescript
if (customer === undefined || transactions === undefined || activeTypes === undefined || allTypes === undefined) {
```

- [ ] **Step 3: Replace the `transactionFormFields` function**

Replace lines 256-321 with a new version that takes `isEdit` boolean and renders dynamic type options:

```typescript
const transactionFormFields = (
  isEdit: boolean,
  currentAmount: string,
  setCurrentAmount: (v: string) => void,
  currentTypeId: string,
  setCurrentTypeId: (v: string) => void,
  currentDescription: string,
  setCurrentDescription: (v: string) => void,
  currentNotes: string,
  setCurrentNotes: (v: string) => void,
) => {
  // For edit dialogs, show all types (including disabled ones for current selection)
  // For new transactions, show only active types
  const typeOptions = isEdit ? allTypes ?? [] : activeTypes ?? [];

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={isEdit ? "edit-amount" : "amount"}>Amount *</Label>
        <Input
          id={isEdit ? "edit-amount" : "amount"}
          type="number"
          step="0.01"
          min="0.01"
          value={currentAmount}
          onChange={(e) => setCurrentAmount(e.target.value)}
          placeholder="0.00"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={isEdit ? "edit-type" : "type"}>Type</Label>
        <Select
          value={currentTypeId}
          onValueChange={(v) => setCurrentTypeId(v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {typeOptions.map((t: any) => (
              <SelectItem
                key={t._id}
                value={t._id}
                disabled={isEdit && !t.isActive && t._id !== currentTypeId}
              >
                {t.name}{!t.isActive ? " (Disabled)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={isEdit ? "edit-description" : "description"}>
          Description
        </Label>
        <Textarea
          id={isEdit ? "edit-description" : "description"}
          value={currentDescription}
          onChange={(e) => setCurrentDescription(e.target.value)}
          placeholder="Optional description"
          rows={2}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={isEdit ? "edit-notes" : "notes"}>Notes</Label>
        <Textarea
          id={isEdit ? "edit-notes" : "notes"}
          value={currentNotes}
          onChange={(e) => setCurrentNotes(e.target.value)}
          placeholder="Optional notes"
          rows={2}
        />
      </div>
    </>
  );
};
```

- [ ] **Step 4: Update form field calls to pass typeId state**

Update the three places `transactionFormFields` is called:

Add Credit dialog (around line 378):
```typescript
{transactionFormFields(
  false,
  amount,
  setAmount,
  typeId,
  setTypeId,
  description,
  setDescription,
  notes,
  setNotes,
)}
```

Use Credit dialog (around line 424):
```typescript
{transactionFormFields(
  false,
  amount,
  setAmount,
  typeId,
  setTypeId,
  description,
  setDescription,
  notes,
  setNotes,
)}
```

Edit Transaction dialog (around line 474):
```typescript
{transactionFormFields(
  true,
  editAmount,
  setEditAmount,
  editTypeId,
  setEditTypeId,
  editDescription,
  setEditDescription,
  editNotes,
  setEditNotes,
)}
```

- [ ] **Step 5: Update transaction history display**

Replace the type badge in the table (around line 544-549):

```typescript
<Badge variant="secondary">
  {tx.typeName ?? "Unknown"}
</Badge>
```

- [ ] **Step 6: Set default typeId when activeTypes loads**

Add an effect after the state declarations to set the default type once active types are loaded:

```typescript
useEffect(() => {
  if (activeTypes && activeTypes.length > 0 && !typeId) {
    setTypeId(activeTypes[0]._id);
  }
}, [activeTypes, typeId]);
```

- [ ] **Step 7: Verify in browser**

Open a customer detail page. Verify:
- Add Credit dialog shows dynamic types from the database
- Use Credit dialog shows dynamic types
- Edit dialog shows all types (including disabled with suffix)
- Transaction history shows type names from database
- Creating/editing transactions works

- [ ] **Step 8: Commit**

```bash
git add src/routes/admin/credit/\$customerId.tsx
git commit -m "feat: update credit forms to use dynamic types from creditTypes table"
```

---

### Task 8: Final verification and cleanup commit

**Files:** All modified files

- [ ] **Step 1: Full app verification**

Test the following flows in the browser:
1. Navigate to `/admin/settings` — types should be listed
2. Add a new type — appears in list
3. Rename a type — name updates
4. Disable a type — badge changes, type disappears from Add/Use Credit dropdowns
5. Re-enable a type — reappears in dropdowns
6. Delete an unused type — removed from list
7. Try to delete a used type — error toast appears
8. Reorder types — order persists
9. Navigate to a customer — Add Credit / Use Credit show dynamic types
10. Create a transaction — saves with typeId
11. Edit a transaction — type dropdown works, disabled types shown for existing selections
12. Transaction history — shows type names correctly

- [ ] **Step 2: Verify deployment**

Run: `npx convex dev --once`
Expected: "Convex functions ready!" with no errors or warnings

- [ ] **Step 3: Commit any remaining cleanup**

```bash
git add -A
git status
# Only commit if there are changes
git commit -m "chore: final verification pass for configurable credit types"
```

---

### Task 9: Phase 2 schema — make `typeId` required, remove `type`

**Files:**
- Modify: `convex/schema.ts`

**Prerequisites:** Task 8 must be complete and all transactions must be migrated (no transactions with `type` field remaining).

- [ ] **Step 1: Update the transactions table schema to Phase 2**

In `convex/schema.ts`, replace the Phase 1 transactions table with the final schema:

```typescript
transactions: defineTable({
  customerId: v.id("customers"),
  amount: v.float64(),
  typeId: v.id("creditTypes"),
  description: v.optional(v.string()),
  notes: v.optional(v.string()),
  employeeId: v.id("users"),
  createdAt: v.float64(),
})
  .index("by_customer", ["customerId"])
  .index("by_typeId", ["typeId"]),
```

- [ ] **Step 2: Remove Phase 1 compatibility code from transactions.ts**

In `convex/transactions.ts`, in the `listByCustomer` query, simplify the enrichment since all transactions now have `typeId`:

Replace the `typeName` resolution line:
```typescript
typeName: transaction.typeId
  ? typeIdToName.get(transaction.typeId) ?? "Unknown"
  : (transaction as any).type ?? "Unknown",
```
with:
```typescript
typeName: typeIdToName.get(transaction.typeId) ?? "Unknown",
```

Also remove the `slugToId` map and `resolvedTypeId` logic since they are no longer needed — all transactions have `typeId`.

- [ ] **Step 3: Verify deployment**

Run: `npx convex dev --once`
Expected: "Convex functions ready!" — if any transactions still have the old `type` field without `typeId`, this will fail. Re-run migration first in that case.

- [ ] **Step 4: Commit**

```bash
git add convex/schema.ts convex/transactions.ts
git commit -m "feat: Phase 2 schema — make typeId required, remove legacy type field"
```

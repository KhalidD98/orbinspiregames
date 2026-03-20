# Configurable Credit Types

## Problem

Transaction types (buy_in, purchase, adjustment, correction, migration) are hardcoded in the Convex schema as a union of string literals. Admins cannot add, rename, or disable types without code changes.

## Solution

Replace the hardcoded union with a `creditTypes` table. Admins (owner/manager) can create, rename, enable/disable, reorder, and delete types through a new Settings page. Transactions reference types by foreign key.

## Data Model

### New `creditTypes` table

```
creditTypes {
  name: string            // Display name, e.g. "Buy-in"
  slug: string            // Internal key, e.g. "buy_in" (immutable after creation)
  isActive: boolean       // false = disabled, can't be used for new transactions
  sortOrder: float64      // Controls display order in dropdowns
  createdBy: id("users")
  createdAt: float64
  // Indexes: by_slug (unique lookup), by_sort_order (ordered listing)
}
```

### `transactions` table change

Phased schema transition to avoid breaking existing documents:

**Phase 1 (deploy + migrate):** Schema accepts both fields:
- `type: v.optional(v.union(...))` — old field, now optional
- `typeId: v.optional(v.id("creditTypes"))` — new field, optional during transition

Deploy this schema, then run the migration to backfill `typeId` and clear `type`.

**Phase 2 (post-migration deploy):** Schema has only:
- `typeId: v.id("creditTypes")` — required

Deploy after confirming all transactions have been migrated.

### Seed data

Five default types created on first run (idempotent):

| slug       | name       | isActive |
|------------|------------|----------|
| buy_in     | Buy-in     | true     |
| purchase   | Purchase   | true     |
| adjustment | Adjustment | true     |
| correction | Correction | true     |
| migration  | Migration  | true     |

### Migration strategy

The migration runs as a Convex action that processes transactions in batches to avoid hitting Convex mutation write limits (~8192 writes per mutation):

1. **Seed types**: A mutation creates the 5 default `creditTypes` rows (idempotent — checks by slug before inserting).
2. **Batch migrate**: An action queries transactions that still have `type` but no `typeId`, in batches of 100. For each batch, it calls an internal mutation that maps each string type to the corresponding `creditTypes` ID and patches the transaction (sets `typeId`, clears `type`).
3. **Repeat** until no unmigrated transactions remain.

**Trigger**: The seed/migration is called automatically when the Settings page loads for the first time and detects no `creditTypes` exist. It can also be triggered manually via a "Run Migration" button on the Settings page (visible to owners only, hidden after migration completes).

## Backend (Convex Functions)

### New `convex/creditTypes.ts`

| Function | Type     | Access         | Description |
|----------|----------|----------------|-------------|
| `list`   | query    | authenticated  | Returns all types ordered by `sortOrder` |
| `listActive` | query | authenticated | Returns only `isActive === true` types ordered by `sortOrder` |
| `create` | mutation | owner/manager  | Creates new type. Auto-generates slug from name (lowercase, spaces to underscores, strip non-alphanumeric). **Rejects if slug already exists** (query `by_slug` index first). Sets `isActive: true`, appends to end of sort order. |
| `update` | mutation | owner/manager  | Updates `name`, `isActive`, `sortOrder`. Slug is immutable. |
| `remove` | mutation | owner/manager  | Deletes type only if zero transactions reference it (query `by_typeId` index). Returns error otherwise, directing user to disable instead. |
| `seed`   | mutation | owner          | Idempotent seed of default types. |
| `migrateTransactions` | action | owner | Batched migration of old string types to typeId references. |
| `_migrateBatch` | internal mutation | internal | Processes a single batch of transaction migrations. |

Note: All authenticated users (including employees) can read active types via `listActive`, since all authenticated users can create transactions. This matches existing auth behavior where `transactions.create` only requires `requireAuth`, not `requireRole`.

### Changes to `convex/transactions.ts`

- `create` mutation: `type` arg becomes `typeId: v.id("creditTypes")`. Validates type exists and `isActive === true`.
- `update` mutation: same change. **Exception**: if the `typeId` matches the transaction's existing `typeId`, skip the `isActive` check. This allows editing amount/description on transactions with disabled types without forcing a type change.
- `listByCustomer` query: joins on `typeId` to include `typeName` in each returned transaction. If the type document is missing (defensive), falls back to displaying "Unknown".

### Query optimization

- Add `by_typeId` index on `transactions` table for efficient lookups when checking if a type is in use (for delete validation).
- `listByCustomer`: batch the type lookups. Since there are typically few distinct types, cache the type map in-memory during the query (fetch all creditTypes once, then map) rather than doing N individual lookups per transaction.
- `listActive` and `list`: leverage the `by_sort_order` index for pre-sorted results without in-memory sorting.
- `remove` mutation: use `by_typeId` index with `.first()` instead of `.collect()` — we only need to know if at least one transaction exists, not count them all.

### Changes to `convex/import.ts`

- CSV import looks up "migration" credit type by slug (using `by_slug` index) and uses its `_id` as the `typeId`.

### Changes to `convex/schema.ts`

- Add `creditTypes` table definition with `by_slug` and `by_sort_order` indexes.
- Phase 1: Add `typeId: v.optional(v.id("creditTypes"))` to transactions, make `type` optional.
- Phase 2: Replace with `typeId: v.id("creditTypes")`, remove `type`.
- Add `by_typeId` index on transactions for efficient type usage checks.

## Frontend

### New Settings page (`src/routes/admin/settings.tsx`)

- Route: `/admin/settings`
- Flat file following existing convention (`hours.tsx`, `events.tsx`, `users.tsx`)
- Access: owner and manager roles
- Layout: page with "Credit Types" card as the first section (extensible for future settings)
- Auto-triggers seed on first load if no credit types exist

**Credit Types card contents:**
- Header with "Credit Types" title and "Add Type" button
- List of all types in sort order, each row showing:
  - Type name
  - Status badge (Active / Disabled)
  - Up/down sort arrows (same pattern as Store Hours page)
  - Edit button (opens dialog to rename)
  - Toggle active/disabled button
  - Delete button (enabled only if no transactions use this type; disabled with tooltip otherwise)
- "Add Type" dialog: single input for name, creates type on submit

### Sidebar navigation change (`AdminLayout.tsx`)

- New nav item "Settings" with Settings (gear) icon
- Placed in the manager nav items group (visible to owner and manager)
- Route: `/admin/settings`

### Changes to `$customerId.tsx`

- Remove `TransactionType` type alias and `TRANSACTION_TYPE_LABELS` constant
- Transaction form `<Select>` populates from `creditTypes.listActive` query instead of hardcoded items
- **Edit dialog**: populates from `creditTypes.list` (all types) so the current type appears even if disabled; disabled types shown with "(Disabled)" suffix and only selectable if they match the current transaction's type
- Form state stores `typeId` (ID) instead of string type
- `createTransaction` and `updateTransaction` calls pass `typeId` instead of `type`
- Transaction history badge displays `typeName` from the enriched query response
- Fallback: if `typeName` is missing, display "Unknown"

## Deletion vs Disable Logic

- **Disable**: Sets `isActive: false`. Type remains in the database. Existing transactions keep their reference. Type no longer appears in "Add/Use Credit" dropdowns. Can be re-enabled.
- **Delete**: Permanently removes the type row. Only allowed when zero transactions reference the `typeId` (checked via `by_typeId` index). For accidental creation cleanup.
- UI: Delete button is greyed out with a tooltip ("Cannot delete — transactions exist. Disable instead.") when transactions reference the type.

## Out of Scope

- Credit type categories or grouping
- Per-type balance tracking
- Type-specific validation rules
- Audit logging of type changes
- Optimistic updates for reorder operations (can be added later)

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

- `type` field changes from `v.union(v.literal("buy_in"), ...)` to `v.id("creditTypes")`
- Field renamed from `type` to `typeId` for clarity

### Seed data

Five default types created on first run (idempotent):

| slug       | name       | isActive |
|------------|------------|----------|
| buy_in     | Buy-in     | true     |
| purchase   | Purchase   | true     |
| adjustment | Adjustment | true     |
| correction | Correction | true     |
| migration  | Migration  | true     |

### Migration

A one-time seed mutation:
1. Creates the 5 default `creditTypes` rows (if they don't already exist, checked by slug)
2. Finds all existing transactions with the old string `type` field
3. Maps each string to the corresponding `creditTypes` ID
4. Patches each transaction: sets `typeId`, removes old `type` field

## Backend (Convex Functions)

### New `convex/creditTypes.ts`

| Function | Type     | Access         | Description |
|----------|----------|----------------|-------------|
| `list`   | query    | authenticated  | Returns all types ordered by `sortOrder` |
| `listActive` | query | authenticated | Returns only `isActive === true` types ordered by `sortOrder` |
| `create` | mutation | owner/manager  | Creates new type. Auto-generates slug from name (lowercase, spaces to underscores). Sets `isActive: true`, appends to end of sort order. |
| `update` | mutation | owner/manager  | Updates `name`, `isActive`, `sortOrder`. Slug is immutable. |
| `remove` | mutation | owner/manager  | Deletes type only if zero transactions reference it. Returns error otherwise, directing user to disable instead. |
| `seed`   | mutation | owner          | Idempotent seed of default types + migration of existing transactions. |

### Changes to `convex/transactions.ts`

- `create` mutation: `type` arg becomes `typeId: v.id("creditTypes")`. Validates type exists and `isActive === true`.
- `update` mutation: same change. Validates type exists and `isActive === true`.
- `listByCustomer` query: joins on `typeId` to include `typeName` in each returned transaction.

### Changes to `convex/import.ts`

- CSV import looks up "migration" credit type by slug and uses its `_id` as the `typeId`.

### Changes to `convex/schema.ts`

- Add `creditTypes` table definition with `by_slug` and `by_sort_order` indexes.
- Change `transactions.type` to `transactions.typeId: v.id("creditTypes")`.

## Frontend

### New Settings page (`/admin/settings/index.tsx`)

- Route: `/admin/settings`
- Access: owner and manager roles
- Layout: page with "Credit Types" card as the first section (extensible for future settings)

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
- Form state stores `typeId` (ID) instead of string type
- `createTransaction` and `updateTransaction` calls pass `typeId` instead of `type`
- Transaction history badge displays `typeName` from the enriched query response
- Fallback: if `typeName` is missing (shouldn't happen), display `typeId`

## Deletion vs Disable Logic

- **Disable**: Sets `isActive: false`. Type remains in the database. Existing transactions keep their reference. Type no longer appears in "Add/Use Credit" dropdowns. Can be re-enabled.
- **Delete**: Permanently removes the type row. Only allowed when zero transactions reference the `typeId`. For accidental creation cleanup.
- UI: Delete button is greyed out with a tooltip ("Cannot delete — transactions exist. Disable instead.") when transactions reference the type.

## Out of Scope

- Credit type categories or grouping
- Per-type balance tracking
- Type-specific validation rules
- Audit logging of type changes

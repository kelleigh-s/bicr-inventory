# BICR Operations Dashboard — Design Spec
> Date: 2026-03-23
> Author: Kelleigh Stewart (Co-CEO / CMTO), Big Island Coffee Roasters
> Status: Approved — ready for implementation planning
> Spec revision: v5 (post spec-review fixes, round 4)

---

## Overview

A standalone internal web application that replaces BICR's Google Sheet inventory system. The app serves as a growing **Operations Dashboard**, with **Inventory** as the first and primary tab. It is designed for desktop use, is mobile-responsive, and is accessible to the full team via a shared password.

The system solves three documented failures of the current Google Sheet:
- **Adoption** — team does not update it consistently (too much friction)
- **Alerts** — no proactive notification when stock gets low
- **Decision support** — no depletion math, lead time awareness, or reorder guidance

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14 (App Router) |
| Database | Supabase (PostgreSQL) |
| Styling | Tailwind CSS |
| Hosting | Vercel (auto-deploy on merge to `main`) |
| Auth | `next-auth` — single shared team password |
| Alerts | Supabase Edge Function (daily cron) + Slack webhook to `#inventory_supplies` |

---

## Tab Structure

| Tab | Phase 1 |
|-----|---------|
| Inventory | Built — primary tab |
| SOPs | Visible, not built |
| Team | Visible, not built |
| Reports | Visible, not built |

---

## Data Model

### `vendors`
| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | PK |
| `name` | text | e.g. "SAVOR" |
| `contact_name` | text | e.g. "Tessa" |
| `contact_email` | text | e.g. tessa@savorbrands.com |
| `website` | text | |
| `default_lead_days` | int | Fallback lead time if item has no `lead_time_days` set |

### `items`
| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | PK |
| `name` | text | e.g. "BICR 8oz Bags" |
| `category` | enum | `bags`, `shipping`, `labels`, `packaging`, `clothing`, `merch` |
| `vendor_id` | uuid | FK → vendors |
| `unit_label` | text | e.g. "boxes", "rolls", "units" |
| `units_per_package` | int | e.g. 1000; stored and displayed in detail panel; not used in calculations Phase 1 |
| `burn_rate` | numeric | Nullable; if null, no depletion is calculated |
| `burn_rate_period` | enum | `day`, `week`, `month`; **required if `burn_rate` is non-null** |
| `reorder_point` | numeric | Threshold that triggers "Reorder Now" status; if null, item never shows "Reorder Now" |
| `lead_time_days` | int | Item-specific lead time; if null, falls back to `vendor.default_lead_days` |
| `assigned_to` | text | Team member name responsible for this item |
| `reorder_action_type` | enum | `url`, `email`, `none` |
| `reorder_action_value` | text | URL or email address for the reorder action |
| `notes` | text | Free text |
| `archived` | bool | Soft delete; archived items hidden from main table |

**Lead time precedence:** `items.lead_time_days` takes priority. If null, display `vendors.default_lead_days`. If both null, display "—".

**Burn rate validation:** The UI enforces that `burn_rate_period` is required whenever `burn_rate` is non-null. Saving an item with a burn rate but no period is not permitted.

### `item_variants`
Child rows for items with size/location dimensions (clothing, merch). Simple items (bags, labels, packaging, shipping) have no variants.

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | PK |
| `item_id` | uuid | FK → items |
| `variant_key` | text | Always formatted as `[size] / [location]` e.g. "M / Storage" |
| `quantity` | numeric | **Authoritative live stock count for this variant** |

**Variant quantity source of truth:** `item_variants.quantity` is the live, authoritative source for variant item stock. It is updated directly on each variant edit. `stock_events` rows written for variant edits are for audit purposes only and do not drive displayed quantities.

**Variant dimensions (Phase 1 hardcoded):**
- Sizes: XS, S, M, L, XL, 2XL, 3XL
- Locations: Storage, Café
- `variant_key` is always the string `[size] / [location]` — e.g., "M / Storage", "XL / Café"

### `orders`
| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | PK |
| `item_id` | uuid | FK → items |
| `variant_id` | uuid | Nullable FK → item_variants (reserved for future use; not used in Phase 1) |
| `ordered_by` | text | Team member name; pre-filled from session `localStorage` |
| `order_date` | date | |
| `quantity_ordered` | numeric | |
| `est_receive_date` | date | |
| `received_date` | date | null until received |
| `quantity_received` | numeric | null until received; may differ from `quantity_ordered` |
| `status` | enum | `pending`, `received` |

**Partial receipt:** Out of scope Phase 1. Orders are received in a single action. `quantity_received` is recorded for accuracy but partial-close workflows are not supported.

### `stock_events`
Append-only audit log. Cannot be modified or deleted.

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | PK |
| `item_id` | uuid | FK → items |
| `variant_id` | uuid | Nullable FK → item_variants; set when event affects a specific variant |
| `event_type` | enum | `count_update`, `ordered`, `received`, `edited` |
| `quantity_before` | numeric | |
| `quantity_after` | numeric | |
| `note` | text | e.g. "Counted by Lora" |
| `performed_by` | text | Team member name |
| `created_at` | timestamptz | Auto-set on insert |

---

## Quantity, Status, and Depletion Logic

### On-hand quantity — simple items
Current quantity = `quantity_after` of the most recent `stock_events` row for that `item_id`. If no events exist, quantity = 0.

### On-hand quantity — variant items
Current quantity = sum of all `item_variants.quantity` rows for that `item_id`. (`item_variants.quantity` is authoritative; `stock_events` is audit only.)

### Depletion date formula
```
burn_rate_per_day =
  burn_rate / 1   if burn_rate_period = 'day'
  burn_rate / 7   if burn_rate_period = 'week'
  burn_rate / 30  if burn_rate_period = 'month'

est_depletion = today + (quantity_on_hand / burn_rate_per_day)
```
- 30 days is used as the fixed monthly divisor. This is intentional and does not vary by calendar month.
- If `burn_rate` is null or 0, display "—" for depletion (no division performed)
- Calculated at query time — not stored

### Item status logic
```
if any order with status = 'pending' exists for this item  →  "On Order"
else if reorder_point is not null
     AND quantity_on_hand <= reorder_point                 →  "Reorder Now"
else                                                        →  "OK"
```

**"On Order" fully overrides "Reorder Now" styling.** An item showing "On Order" is excluded from the alert banner count and nav badge count, even if its quantity is below reorder point. An item with a pending order shows "On Order" status only — no red row highlight — regardless of whether its quantity is also below the reorder point. This is intentional: the order is already in flight.

---

## Features

### Inventory Table
- Displays all non-archived items
- Default sort: Reorder Now → On Order → OK; secondary sort alphabetical by item name
- User can override sort by clicking any column header
- Columns: Item Name, Category, Vendor, On Hand, Burn Rate, Reorder Point, Est. Depletion, Lead Time, Assigned To, Status, Actions
- Filters: Category, Status, Vendor, Search (item name)
- **Alert banner** above the table shows count of "Reorder Now" items; clicking it applies `Status = Reorder Now` filter to the current table (does not navigate away)
- **Nav badge** on the Inventory tab shows the same count as a numeric badge; both the banner and badge exist simultaneously and show the same number

### Detail Panel
Slides open on row click. Shows:
- Item name, category badge, current status
- Vendor name + contact email
- All item configuration fields
- All pending orders for this item, sorted by order date descending
- Audit log (all `stock_events` for this item and its variants, reverse chronological order)
- "Mark as Ordered" button (always opens the ordered modal regardless of `reorder_action_type`)
- "Edit Item" button

### Reorder Action (table row Order button)
The Order button in the table row executes the configured action:
- **URL** — opens vendor reorder page in a new browser tab
- **Email** — opens a Gmail compose window using the Google Workspace compose URL: `https://mail.google.com/mail/?view=cm&to=[vendor_email]&su=Reorder%3A%20[Item Name]`; opens in a new tab
- **None** — button renders as disabled; no action on click

The Order button in the table row does **not** open the Mark as Ordered modal. The modal is only accessible from the detail panel.

### Mark as Ordered Flow
Triggered from "Mark as Ordered" in the detail panel only:
1. Modal opens with fields: quantity to order (required), estimated receive date (required), note (optional)
2. `ordered_by` is pre-filled from the session name stored in `localStorage` (same as Update Counts). If no name is stored, the field is editable and required.
3. On confirm: `orders` row inserted with `status = 'pending'`; `stock_events` row written with `event_type = 'ordered'`, `quantity_before` = current on-hand, `quantity_after` = current on-hand (no stock change — the event records the action, not a quantity change); item status recalculates to "On Order"

### Mark as Received Flow
**Applies to simple items only.** Variant items (clothing, merch) do not use this flow — stock updates for variant items are entered directly in the Variant View matrix.

**Closing orders for variant items:** If a pending order exists for a variant item, a **"Close Order"** button appears in the detail panel (distinct from "Mark as Received"). Clicking it opens a minimal modal confirming the order date and allowing an optional note. On confirm: `orders.status → 'received'` and `orders.received_date` set; no `stock_events` row is written and no `item_variants.quantity` is changed. The team member then manually updates the relevant variant cells in the Variant View to reflect received stock.

Triggered from the detail panel when a simple item has one or more pending orders. If multiple pending orders exist, the Mark as Received action targets the oldest pending order (earliest `order_date`).

1. Modal shows pending order details: quantity ordered, order date, est. receive date
2. User confirms or adjusts the quantity actually received (required)
3. User confirms or adjusts the receive date (required)
4. On confirm: `orders.status → 'received'`; `orders.received_date` and `orders.quantity_received` set; `stock_events` row written with `event_type = 'received'`, `quantity_before` = current on-hand, `quantity_after` = current on-hand + quantity received. On-hand after receipt = `quantity_after` of this new `stock_events` row (same derivation rule as all simple-item quantity reads). Item status recalculates.

### Update Counts Flow
Guided step-by-step flow accessed via "Update Counts" button. **Applies to simple items only** (bags, shipping, labels, packaging). Variant items (clothing, merch) are excluded from this flow and updated directly via the Variant View in the detail panel.

1. User is prompted once per session for their name (stored in `localStorage`; pre-filled on return)
2. Categories are presented in enum order: bags → shipping → labels → packaging (clothing and merch excluded)
3. Items within each category are sorted alphabetically by name
4. A progress indicator shows current position: "Item 3 of 12"
5. Each step shows: item name, last known quantity, and date of last count. "Last count date" is derived from the most recent `stock_events` row with `event_type = 'count_update'` for that `item_id`; if none exists, displays "Never counted"
6. User enters new count (required) and note (optional); can skip to next item without submitting
7. On submit: `stock_events` row written with `event_type = 'count_update'`, `quantity_before` = previous quantity (from most recent event), `quantity_after` = new count, `performed_by` = session name

### Variant View (Clothing / Merch)
Items with variants display a size × location matrix:
- Rows: XS, S, M, L, XL, 2XL, 3XL
- Columns: Storage, Café
- Dimensions are hardcoded for Phase 1
- Each cell is independently editable inline
- On cell edit: `item_variants.quantity` is updated directly; a `stock_events` row is written with `variant_id` set (audit only)

### Accountability
- Each item has an `assigned_to` field visible in the table and detail panel
- Daily Slack alerts include the assigned owner's name as plain text (e.g., "Assigned: Kelleigh")
- Phase 1 does not use Slack @mentions (no Slack member ID mapping)

### Audit Log
- Per-item changelog shown in the detail panel
- All `stock_events` for the item (including variant events where `variant_id` is set), reverse chronological order
- Each entry: event type, quantity before → after, performed by, timestamp, note
- Read-only; cannot be edited or deleted

### Alerts
- **Nav badge** on Inventory tab: live count of "Reorder Now" items
- **Alert banner** above table: same count, with filter link
- **Daily cron** (Supabase Edge Function): queries all items where `reorder_point IS NOT NULL` AND `quantity_on_hand <= reorder_point` AND no pending order exists (i.e., applies the same "Reorder Now" logic as the UI, explicitly excluding "On Order" items); posts a single summary message to Slack `#inventory_supplies` listing each qualifying item's name, on-hand quantity, reorder point, and assigned owner; no message sent if no items qualify

### Item Management (all authenticated users)
All users share a single password with identical permissions. No role distinction in Phase 1.
- Add new items (all configuration fields)
- Edit existing items
- Archive items (hidden from table; data retained)
- Add and edit vendors

### Auth
- `next-auth` credentials provider with a single shared team password
- All routes protected; unauthenticated users redirected to `/login`
- Password stored as environment variable in Vercel
- All Vercel preview deployments are password-protected
- Session duration: 24 hours. After expiry, user is redirected to `/login`
- A "Log out" option is available in the nav (top right); clears the session cookie immediately

---

## Inventory Categories

| Category (enum) | Items | Vendor Examples |
|-----------------|-------|-----------------|
| `bags` | Coffee bags (8oz, 5lb, 4oz, Nick Kuchar) | SAVOR (6-month lead time) |
| `shipping` | FedEx envelopes/paks/boxes, USPS, biodegradable mailers | FedEx, USPS, Amazon |
| `labels` | 910 labels, 910 ink, Dymo labels | Primera (4-week lead), Amazon |
| `packaging` | Veritiv boxes, packing tape, butcher paper | Veritiv (2-week lead) |
| `clothing` | Explorer shirts, hoodies, tanks, V-necks (XS–3XL, Storage/Café) | TBD |
| `merch` | Miir, towels, totes, mugs, pottery | TBD |

---

## Acceptance Criteria

**Inventory Table**
1. All items load sorted by status: Reorder Now → On Order → OK; ties sorted alphabetically by item name
2. Table filters by category, vendor, and status; search works on item name
3. Depletion date calculates correctly for items with burn rate (day/week/month normalized to daily; 30-day fixed month)
4. Items with burn rate null or 0 display "—" for depletion with no errors
5. Assigned owner is visible in the table row and in the detail panel
6. Clicking the alert banner applies `Status = Reorder Now` filter to the current table; does not navigate away

**Alerts**
7. Items at or below reorder point with no pending order display "Reorder Now" status with red row highlight
8. Items with a pending order display "On Order" status with no red highlight, regardless of quantity
9. Nav badge and alert banner both show count of items currently in "Reorder Now" status (excludes items in "On Order" status even if quantity is below reorder point)
10. Daily cron posts a Slack summary to `#inventory_supplies` listing all items with quantity ≤ reorder point AND no pending order (plain text names and assigned owners); no message sent if none qualify

**Reorder Action (table row)**
11. URL-type Order button opens the vendor URL in a new tab
12. Email-type Order button opens a Google Workspace Gmail compose URL in a new tab, pre-addressed to vendor email with subject pre-filled as "Reorder: [Item Name]"
13. None-type Order button renders as disabled
14. Table row Order button does not open the Mark as Ordered modal

**Mark as Ordered (detail panel)**
15. "Mark as Ordered" in the detail panel always opens the modal regardless of `reorder_action_type`
16. Modal pre-fills `ordered_by` from `localStorage` session name; prompts for name if none stored
17. Confirming creates an `orders` row (status=pending) and a `stock_events` row with `event_type = 'ordered'` and `quantity_before = quantity_after = current on-hand`; item status becomes "On Order"

**Mark as Received (simple items only)**
18. Mark as Received is available only for simple items; variant items show a "Close Order" button instead
19. When multiple pending orders exist for a simple item, the modal targets the oldest by order date
20. Mark as Received modal shows pending order details and allows quantity adjustment
21. Confirming sets `orders.status = 'received'`, records `quantity_received` and `received_date`, writes `stock_events` row (`event_type = 'received'`, `quantity_before` = current on-hand, `quantity_after` = current on-hand + quantity received); item status recalculates

**Close Order (variant items only)**
22. Variant items with a pending order show a "Close Order" button in the detail panel
23. Confirming Close Order sets `orders.status = 'received'` and `orders.received_date`; no `stock_events` row written; no `item_variants.quantity` changed
24. Team member manually updates variant cells after closing the order

**Update Counts (simple items only)**
25. Flow includes only simple-item categories: bags, shipping, labels, packaging — clothing and merch are excluded
26. Flow prompts for performer name once per session; name persists in `localStorage`
27. Categories presented in enum order (bags → shipping → labels → packaging); items within each category sorted alphabetically
28. Progress indicator shows "Item X of Y" throughout the flow
29. Each step shows item name, last known quantity, and date of most recent `count_update` event (or "Never counted" if none exists)
30. Submitting a count writes a `stock_events` row with `event_type = 'count_update'`, `quantity_before` = previous quantity, `quantity_after` = new count, `performed_by` = session name
31. User can skip individual items without submitting

**Variant Items**
32. Clothing and merch items display a size × location matrix (XS–3XL rows / Storage + Café columns); dimensions are hardcoded in the UI
33. Each cell is independently editable inline; edits update `item_variants.quantity` directly and write a `stock_events` row with `variant_id` set (audit only)

**Audit Log**
34. Per-item detail panel shows all `stock_events` (including variant events) in reverse chronological order with event type, quantity before/after, performed by, and timestamp
35. All pending orders for an item are listed in the detail panel, sorted by order date descending

**Item Management**
36. Any authenticated user can add, edit, and archive items and vendors
37. Saving an item with a burn rate value but no period is blocked at the form level
38. Lead time displays item-level value if set; falls back to vendor default; shows "—" if both null

**Auth**
39. All routes require team password; unauthenticated users redirected to `/login`
40. All Vercel preview deployments are password-protected
41. Session expires after 24 hours; expired sessions redirect to `/login`
42. "Log out" in nav clears session and redirects to `/login`

---

## Out of Scope — Phase 1

- Shopify integration
- Per-user accounts / role-based permissions (single shared password; all users equal)
- Actual Slack @mention tagging (names shown as plain text only)
- Partial order receipts (orders received in full only)
- Variant-level order tracking (`orders.variant_id` reserved but unused)
- Email notifications (Slack only)
- SOPs, Team, Reports tabs (visible but not built)
- Mobile app / native push notifications
- Migration of historical order data (start fresh)

---

## Project Artifacts

| Resource | Path |
|----------|------|
| Decisions doc | `Artifacts/BICR-OPS-DASHBOARD-DECISIONS.md` |
| Source spreadsheet | `Artifacts/Products & Supplies Inventory Sheet (1).xlsx` |
| Dashboard mockup | `nimbalyst-local/mockups/bicr-operations-dashboard.mockup.html` |
| Clothing variants mockup | `nimbalyst-local/mockups/bicr-clothing-variants.mockup.html` |
| Update Counts mockup | `nimbalyst-local/mockups/bicr-update-counts.mockup.html` |
| Add/Edit Item mockup | `nimbalyst-local/mockups/bicr-add-edit-item.mockup.html` |
| Superpowers framework | `superpowers/` |

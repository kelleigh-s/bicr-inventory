# BICR Operations Dashboard — Design Decisions
> Project: BICR Operations Dashboard (Inventory Management System)
> Started: March 23, 2026
> Owner: Kelleigh Stewart, Co-CEO / CMTO
> Status: Brainstorming / Design Phase

---

## Problem Statement

The current inventory management system (Google Sheet) is failing in three ways:

- **A — Adoption:** Team does not update it consistently (habit/friction problem)
- **B — Alerts:** No proactive notification when stock gets low (visibility problem)
- **D — Decision support:** Hard to know what to order and when (no depletion math, lead time awareness, or reorder guidance)

---

## Decisions Made

### App Structure

| Decision | Choice | Rationale |
| --- | --- | --- |
| Standalone vs. embedded | **Standalone app** | Separate from Kell's Command Center (big-hub.vercel.app). Clean separation, easier team access |
| App name | **BICR Operations Dashboard** | Positions this as a growing team tool, not just an inventory sheet |
| Primary tab | **Inventory** | First priority; other tabs to follow |
| Future tabs | SOPs · Team · Reports | Planned but not built in Phase 1 — tabs visible but greyed out |
| Shopify integration | **None** | Not needed for this use case |

### Tech Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 14 (App Router) |
| Database | Supabase (PostgreSQL) |
| Styling | Tailwind CSS |
| Hosting | Vercel (auto-deploy from GitHub) |
| Auth | next-auth — single shared team password |
| Alerts | Supabase Edge Function (daily cron) + Slack webhook |

> **Why Supabase over Firebase:** Inventory data is relational (items, variants, orders, vendors). PostgreSQL handles threshold queries, filtering, and depletion math far better than Firestore.

### Data Architecture

| Decision | Choice |
| --- | --- |
| Data model | **Approach C — Items + Variants** |
| Simple items | Single row in `items` table (e.g., FedEx labels, packing tape) |
| Complex items | Parent row in `items` + child rows in `item_variants` (e.g., clothing by size × location) |
| Extensibility | New variant dimensions (color, warehouse location) can be added without schema changes |

> **Why Approach C over A or B:**
> - Approach A (flat JSON) gets messy for clothing size queries
> - Approach B (category-specific tables) requires schema changes to add new category types
> - Approach C handles both simple and complex items elegantly and grows with the business

### Inventory Categories (from existing spreadsheet)

| Sheet | Category | Notes |
| --- | --- | --- |
| Ship, Print & Pack Supplies | Shipping · Labels · Packaging | Grouped by vendor; most have burn rates and reorder points |
| Clothing Inventory | Clothing | Tracked by size (XS–3XL) × location (Storage / Café) |
| Merch Inventory | Merch | Simple count per item; Storage vs. Café |
| Bag Orders | Coffee Bags | Historical order log; 18-month rolling history |
| Annual Bag Orders | Coffee Bags | Annual order history back to 2021 |

### Alerts & Notifications

| Channel | Trigger |
| --- | --- |
| In-dashboard badge | Badge on Inventory tab when items are below reorder threshold |
| Slack `#inventory_supplies` | Webhook notification when item drops below reorder threshold |
| Frequency | Daily cron check via Supabase Edge Function |

### UX & Design

| Decision | Choice |
| --- | --- |
| Responsive | Desktop-optimized, mobile-responsive |
| Input method | Guided "Count Session" flow (step-by-step by category) + inline edit |
| Password protection | Yes — required for all BICR Vercel apps |
| Brand | BICR colors and typography (teal #006373, navy #023d5b, orange #F8B457) |

### Key Features — Phase 1

- [ ] Inventory table with filtering by category, vendor, status
- [ ] Per-item: burn rate, reorder point, lead time, vendor details, units per package
- [ ] Estimated depletion date (calculated from on-hand ÷ burn rate)
- [ ] Reorder status: OK / Reorder Now / On Order
- [ ] Guided "Update Counts" flow (step-by-step by category)
- [ ] Mark as Ordered → logs order date, sets status to "On Order"
- [ ] Mark as Received → logs receiving date, updates stock
- [ ] Clothing/merch variant view (size × location matrix)
- [ ] Order history log per item
- [ ] Dashboard alert badge + Slack webhook
- [ ] Password protection
- [ ] Admin: add/edit/archive items, set thresholds, vendor details
- [ ] **Accountability assignment** — each item (or category) has an assigned owner visible to all users; reorder alerts tag the assignee in Slack
- [ ] **Change history / audit log** — every count update, order event, and edit is timestamped and attributed to a user; viewable per-item as a changelog
- [ ] **Status-based sort** — table always sorts "Reorder Now" to top by default; user can override sort
- [ ] **Customizable reorder action** — per item, the Order button can trigger a URL (vendor reorder page) or compose a Gmail draft to the account rep; configured in item admin
- [ ] **Configurable burn rate period** — burn rate can be set as per day / per week / per month; depletion date calculation normalizes automatically

### Out of Scope — Phase 1

- Shopify integration
- Per-user accounts / role-based permissions (use shared password)
- Email notifications (Slack only)
- SOPs, Team, Reports tabs (structure visible but not built)
- Mobile app / native notifications

---

## Open Questions

- [ ] Who is the primary person responsible for acting on reorder alerts?
- [ ] Should clothing/merch have its own SOP for Shopify sync? (noted in spreadsheet)
- [ ] Are there any items where the vendor contact is unknown or needs to be confirmed?
- [ ] Should order history be migrated from the existing spreadsheet, or start fresh?

---

## Inventory Data Source

**File:** `Artifacts/Products & Supplies Inventory Sheet (1).xlsx`
Vendors identified in current sheet:
- **SAVOR** — tessa@savorbrands.com (coffee bags — 6-month lead time)
- **Amazon** — amazon.com (misc supplies — ~1 week)
- **FedEx** — fedex.com / scott.mori@fedex.com (FedEx packaging — 2 weeks)
- **USPS** — website unknown (~2 months)
- **Primera** — primera.com (910 labels & ink — 4 weeks standard)
- **Veritiv** — veritiv.com (boxes, tape, paper — 2 weeks)

---

## Project Links

| Resource | Path / URL |
| --- | --- |
| Decisions doc | `Artifacts/BICR-OPS-DASHBOARD-DECISIONS.md` (this file) |
| Dashboard mockup | `nimbalyst-local/mockups/bicr-operations-dashboard.mockup.html` |
| Clothing variants mockup | `nimbalyst-local/mockups/bicr-clothing-variants.mockup.html` |
| Update Counts mockup | `nimbalyst-local/mockups/bicr-update-counts.mockup.html` |
| Add/Edit Item mockup | `nimbalyst-local/mockups/bicr-add-edit-item.mockup.html` |
| Source spreadsheet | `Artifacts/Products & Supplies Inventory Sheet (1).xlsx` |
| Superpowers framework | `superpowers/` |

---

## Next Steps

1. ~~Review and approve the full design (Section 2: Data Model, Section 3: Acceptance Criteria)~~ ✅ Done
2. ~~Write design spec doc~~ ✅ Done → `docs/superpowers/specs/2026-03-23-bicr-ops-dashboard-design.md` (v5, reviewer-approved, 42 ACs)
3. **Write implementation plan** → `docs/superpowers/plans/2026-03-23-bicr-ops-dashboard.md` ← current step
4. Write project-level `CLAUDE.md`
5. Initialize GitHub repo + Supabase project
6. Begin Phase 1 implementation

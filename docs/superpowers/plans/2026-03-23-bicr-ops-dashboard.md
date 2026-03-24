# BICR Operations Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a password-protected internal operations dashboard with inventory management as the first tab, replacing BICR's Google Sheet system.

**Architecture:** Next.js 14 App Router with Supabase PostgreSQL backend. All business logic (depletion math, status derivation) lives in pure utility functions for testability. Server-side data fetching via Supabase client; client components for interactive UI (table, modals, detail panel). Single shared password via next-auth credentials provider.

**Tech Stack:** Next.js 14 (App Router), Supabase (PostgreSQL + Edge Functions), Tailwind CSS, next-auth, Slack webhooks

**Spec:** `docs/specs/2026-03-23-bicr-ops-dashboard-design.md`

---

## File Structure

```
bicr-inventory/
├── app/
│   ├── layout.tsx                          # Root layout, global styles, auth session provider
│   ├── page.tsx                            # Redirect to /inventory
│   ├── login/
│   │   └── page.tsx                        # Login form (shared team password)
│   ├── inventory/
│   │   ├── page.tsx                        # Inventory page — table + filters + alert banner
│   │   └── loading.tsx                     # Loading skeleton
│   ├── api/
│   │   ├── auth/[...nextauth]/
│   │   │   └── route.ts                    # next-auth credentials provider
│   │   ├── items/
│   │   │   ├── route.ts                    # GET all items, POST new item
│   │   │   └── [id]/
│   │   │       ├── route.ts                # GET/PATCH single item
│   │   │       ├── archive/route.ts        # PATCH archive toggle
│   │   │       ├── orders/route.ts         # GET/POST orders for item
│   │   │       ├── receive/route.ts        # POST mark as received
│   │   │       ├── close-order/route.ts    # POST close order (variant items)
│   │   │       └── events/route.ts         # GET stock events for item
│   │   ├── vendors/
│   │   │   ├── route.ts                    # GET all, POST new vendor
│   │   │   └── [id]/route.ts              # GET/PATCH single vendor
│   │   └── counts/
│   │       ├── route.ts                    # GET items for update-counts flow
│   │       └── submit/route.ts             # POST count update
│   └── globals.css                         # Tailwind base + BICR brand tokens
├── components/
│   ├── nav/
│   │   └── NavBar.tsx                      # Tab nav with badge count
│   ├── inventory/
│   │   ├── InventoryTable.tsx              # Main table with sorting
│   │   ├── InventoryFilters.tsx            # Category, status, vendor, search filters
│   │   ├── AlertBanner.tsx                 # "X items need reorder" banner
│   │   ├── DetailPanel.tsx                 # Slide-out item detail
│   │   ├── AuditLog.tsx                    # Stock events list for detail panel
│   │   ├── OrdersList.tsx                  # Pending orders list for detail panel
│   │   ├── VariantMatrix.tsx               # Size x location grid for clothing/merch
│   │   ├── UpdateCountsFlow.tsx            # Step-by-step count wizard
│   │   └── OrderButton.tsx                 # Table row reorder action button
│   └── modals/
│       ├── MarkAsOrderedModal.tsx          # Order placement modal
│       ├── MarkAsReceivedModal.tsx         # Receipt confirmation modal (simple items)
│       ├── CloseOrderModal.tsx             # Close order modal (variant items)
│       ├── ItemFormModal.tsx               # Add/edit item form
│       └── VendorFormModal.tsx             # Add/edit vendor form
├── lib/
│   ├── supabase/
│   │   ├── client.ts                       # Browser Supabase client
│   │   ├── server.ts                       # Server-side Supabase client
│   │   └── types.ts                        # Generated DB types + app types
│   ├── inventory/
│   │   ├── calculations.ts                 # burnRatePerDay, depletionDate, itemStatus — pure functions
│   │   ├── queries.ts                      # Supabase query builders for items, orders, events
│   │   └── constants.ts                    # Category enum, burn rate periods, variant dimensions
│   └── auth.ts                             # next-auth config
├── middleware.ts                            # Route protection — redirect unauthenticated to /login
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql          # All tables: vendors, items, item_variants, orders, stock_events
├── supabase/functions/
│   └── daily-alert/
│       └── index.ts                        # Edge function: query reorder-now items, post to Slack
├── __tests__/
│   ├── lib/inventory/
│   │   ├── calculations.test.ts            # Unit tests for depletion, burn rate, status logic
│   │   └── constants.test.ts               # Enum/constant validation
│   └── api/
│       ├── items.test.ts                   # API route integration tests
│       └── counts.test.ts                  # Update counts flow tests
├── tailwind.config.ts
├── next.config.ts
├── package.json
├── tsconfig.json
└── .env.local.example                      # Template for required env vars
```

---

## Task 1: Project Initialization

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`, `app/globals.css`, `.env.local.example`, `.gitignore`

- [ ] **Step 1: Scaffold Next.js 14 project**

```bash
cd ~/Developer/bicr-inventory
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm
```

Select defaults when prompted. This creates the Next.js project in the current directory.

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js next-auth@4 date-fns
npm install -D jest @jest/globals ts-jest @testing-library/react @testing-library/jest-dom @types/jest jest-environment-jsdom
```

- [ ] **Step 3: Configure Tailwind with BICR brand colors**

Replace the `theme.extend` section in `tailwind.config.ts`:

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bicr: {
          teal: "#006373",
          "light-blue": "#C3E3F2",
          "light-teal": "#b5e2e4",
          orange: "#F8B457",
          navy: "#023d5b",
          "light-green": "#a0dab3",
          "warm-orange": "#faa475",
          "burnt-orange": "#db704f",
          "dusty-pink": "#dba5a1",
          charcoal: "#434C53",
        },
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 4: Create environment variable template**

Create `.env.local.example`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000
TEAM_PASSWORD=your-shared-team-password
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/yyy/zzz
```

- [ ] **Step 5: Configure Jest**

Create `jest.config.ts`:

```typescript
import type { Config } from "jest";
import nextJest from "next/jest";

const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};

export default createJestConfig(config);
```

Add to `package.json` scripts: `"test": "jest", "test:watch": "jest --watch"`

- [ ] **Step 6: Verify project runs**

```bash
npm run dev
```
Expected: Dev server starts at localhost:3000 with default Next.js page.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 14 project with Tailwind, Supabase, next-auth deps"
```

---

## Task 2: Database Schema

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migrations/001_initial_schema.sql`:

```sql
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types
CREATE TYPE item_category AS ENUM ('bags', 'shipping', 'labels', 'packaging', 'clothing', 'merch');
CREATE TYPE burn_rate_period AS ENUM ('day', 'week', 'month');
CREATE TYPE reorder_action_type AS ENUM ('url', 'email', 'none');
CREATE TYPE order_status AS ENUM ('pending', 'received');
CREATE TYPE event_type AS ENUM ('count_update', 'ordered', 'received', 'edited');

-- Vendors
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  website TEXT,
  default_lead_days INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Items
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category item_category NOT NULL,
  vendor_id UUID REFERENCES vendors(id),
  unit_label TEXT,
  units_per_package INT,
  burn_rate NUMERIC,
  burn_rate_period burn_rate_period,
  reorder_point NUMERIC,
  lead_time_days INT,
  assigned_to TEXT,
  reorder_action_type reorder_action_type DEFAULT 'none',
  reorder_action_value TEXT,
  notes TEXT,
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT burn_rate_period_required
    CHECK (burn_rate IS NULL OR burn_rate_period IS NOT NULL)
);

-- Item variants (clothing/merch size x location)
CREATE TABLE item_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  variant_key TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_id, variant_key)
);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES item_variants(id),
  ordered_by TEXT NOT NULL,
  order_date DATE NOT NULL,
  quantity_ordered NUMERIC NOT NULL,
  est_receive_date DATE NOT NULL,
  received_date DATE,
  quantity_received NUMERIC,
  status order_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock events (append-only audit log)
CREATE TABLE stock_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES item_variants(id),
  event_type event_type NOT NULL,
  quantity_before NUMERIC NOT NULL,
  quantity_after NUMERIC NOT NULL,
  note TEXT,
  performed_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_items_category ON items(category);
CREATE INDEX idx_items_archived ON items(archived);
CREATE INDEX idx_items_vendor ON items(vendor_id);
CREATE INDEX idx_item_variants_item ON item_variants(item_id);
CREATE INDEX idx_orders_item ON orders(item_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_stock_events_item ON stock_events(item_id);
CREATE INDEX idx_stock_events_created ON stock_events(created_at DESC);

-- Prevent modification/deletion of stock_events (append-only)
CREATE OR REPLACE FUNCTION prevent_stock_event_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'stock_events is append-only. Updates and deletes are not permitted.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER no_update_stock_events
  BEFORE UPDATE ON stock_events
  FOR EACH ROW EXECUTE FUNCTION prevent_stock_event_mutation();

CREATE TRIGGER no_delete_stock_events
  BEFORE DELETE ON stock_events
  FOR EACH ROW EXECUTE FUNCTION prevent_stock_event_mutation();

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_vendors_updated_at
  BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_items_updated_at
  BEFORE UPDATE ON items FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_item_variants_updated_at
  BEFORE UPDATE ON item_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

- [ ] **Step 2: Apply migration to Supabase**

Go to the Supabase dashboard → SQL Editor → paste and run the migration SQL. Alternatively, if using Supabase CLI:

```bash
npx supabase db push
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/001_initial_schema.sql
git commit -m "feat: add database schema — vendors, items, variants, orders, stock_events"
```

---

## Task 3: TypeScript Types & Constants

**Files:**
- Create: `lib/supabase/types.ts`, `lib/inventory/constants.ts`
- Test: `__tests__/lib/inventory/constants.test.ts`

- [ ] **Step 1: Write constants with enums and variant dimensions**

Create `lib/inventory/constants.ts`:

```typescript
export const ITEM_CATEGORIES = [
  "bags",
  "shipping",
  "labels",
  "packaging",
  "clothing",
  "merch",
] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

/** Categories included in Update Counts flow (simple items only) */
export const SIMPLE_CATEGORIES: ItemCategory[] = [
  "bags",
  "shipping",
  "labels",
  "packaging",
];

/** Categories that use variant matrix (size x location) */
export const VARIANT_CATEGORIES: ItemCategory[] = ["clothing", "merch"];

export const BURN_RATE_PERIODS = ["day", "week", "month"] as const;
export type BurnRatePeriod = (typeof BURN_RATE_PERIODS)[number];

export const ORDER_STATUSES = ["pending", "received"] as const;
export const EVENT_TYPES = [
  "count_update",
  "ordered",
  "received",
  "edited",
] as const;

export const REORDER_ACTION_TYPES = ["url", "email", "none"] as const;
export type ReorderActionType = (typeof REORDER_ACTION_TYPES)[number];

/** Item status as derived from current data — not stored */
export type ItemStatus = "Reorder Now" | "On Order" | "OK";

/** Hardcoded variant dimensions for Phase 1 */
export const VARIANT_SIZES = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "2XL",
  "3XL",
] as const;
export const VARIANT_LOCATIONS = ["Storage", "Caf\u00e9"] as const;

/** Burn rate period divisors (days) */
export const PERIOD_DIVISORS: Record<BurnRatePeriod, number> = {
  day: 1,
  week: 7,
  month: 30,
};

/** Update Counts category order (matches enum order for simple categories) */
export const UPDATE_COUNTS_CATEGORY_ORDER: ItemCategory[] = [
  "bags",
  "shipping",
  "labels",
  "packaging",
];
```

- [ ] **Step 2: Write types**

Create `lib/supabase/types.ts`:

```typescript
import type {
  ItemCategory,
  BurnRatePeriod,
  ReorderActionType,
  ItemStatus,
} from "@/lib/inventory/constants";

/** Database row types */

export interface Vendor {
  id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  website: string | null;
  default_lead_days: number | null;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: string;
  name: string;
  category: ItemCategory;
  vendor_id: string | null;
  unit_label: string | null;
  units_per_package: number | null;
  burn_rate: number | null;
  burn_rate_period: BurnRatePeriod | null;
  reorder_point: number | null;
  lead_time_days: number | null;
  assigned_to: string | null;
  reorder_action_type: ReorderActionType;
  reorder_action_value: string | null;
  notes: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface ItemVariant {
  id: string;
  item_id: string;
  variant_key: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  item_id: string;
  variant_id: string | null;
  ordered_by: string;
  order_date: string;
  quantity_ordered: number;
  est_receive_date: string;
  received_date: string | null;
  quantity_received: number | null;
  status: "pending" | "received";
  created_at: string;
}

export interface StockEvent {
  id: string;
  item_id: string;
  variant_id: string | null;
  event_type: "count_update" | "ordered" | "received" | "edited";
  quantity_before: number;
  quantity_after: number;
  note: string | null;
  performed_by: string;
  created_at: string;
}

/** Enriched item for display — includes computed fields */
export interface InventoryItem extends Item {
  vendor?: Vendor | null;
  quantity_on_hand: number;
  status: ItemStatus;
  est_depletion_date: string | null;
  effective_lead_days: number | null;
  pending_orders_count: number;
  last_count_date: string | null;
  variants?: ItemVariant[];
}
```

- [ ] **Step 3: Write constants test**

Create `__tests__/lib/inventory/constants.test.ts`:

```typescript
import {
  SIMPLE_CATEGORIES,
  VARIANT_CATEGORIES,
  ITEM_CATEGORIES,
  PERIOD_DIVISORS,
  UPDATE_COUNTS_CATEGORY_ORDER,
} from "@/lib/inventory/constants";

describe("constants", () => {
  test("simple + variant categories cover all item categories", () => {
    const all = [...SIMPLE_CATEGORIES, ...VARIANT_CATEGORIES];
    expect(all.sort()).toEqual([...ITEM_CATEGORIES].sort());
  });

  test("no category appears in both simple and variant", () => {
    const overlap = SIMPLE_CATEGORIES.filter((c) =>
      VARIANT_CATEGORIES.includes(c)
    );
    expect(overlap).toEqual([]);
  });

  test("period divisors are positive integers", () => {
    Object.values(PERIOD_DIVISORS).forEach((d) => {
      expect(d).toBeGreaterThan(0);
      expect(Number.isInteger(d)).toBe(true);
    });
  });

  test("update counts order matches simple categories", () => {
    expect(UPDATE_COUNTS_CATEGORY_ORDER.sort()).toEqual(
      [...SIMPLE_CATEGORIES].sort()
    );
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npx jest __tests__/lib/inventory/constants.test.ts --verbose
```
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/types.ts lib/inventory/constants.ts __tests__/lib/inventory/constants.test.ts
git commit -m "feat: add TypeScript types, constants, and category/variant enums"
```

---

## Task 4: Business Logic — Pure Calculation Functions (TDD)

**Files:**
- Create: `lib/inventory/calculations.ts`
- Test: `__tests__/lib/inventory/calculations.test.ts`

- [ ] **Step 1: Write failing tests for burnRatePerDay**

Create `__tests__/lib/inventory/calculations.test.ts`:

```typescript
import {
  burnRatePerDay,
  estimatedDepletionDate,
  deriveItemStatus,
} from "@/lib/inventory/calculations";

describe("burnRatePerDay", () => {
  test("returns null when burn_rate is null", () => {
    expect(burnRatePerDay(null, null)).toBeNull();
  });

  test("returns null when burn_rate is 0", () => {
    expect(burnRatePerDay(0, "day")).toBeNull();
  });

  test("daily rate returns as-is", () => {
    expect(burnRatePerDay(10, "day")).toBe(10);
  });

  test("weekly rate divides by 7", () => {
    expect(burnRatePerDay(70, "week")).toBe(10);
  });

  test("monthly rate divides by 30", () => {
    expect(burnRatePerDay(300, "month")).toBe(10);
  });
});

describe("estimatedDepletionDate", () => {
  const today = new Date("2026-03-23");

  test("returns null when burn rate is null", () => {
    expect(estimatedDepletionDate(100, null, null, today)).toBeNull();
  });

  test("returns null when quantity is 0", () => {
    expect(estimatedDepletionDate(0, 10, "day", today)).toBeNull();
  });

  test("calculates correct date for daily burn", () => {
    // 100 units / 10 per day = 10 days from today
    const result = estimatedDepletionDate(100, 10, "day", today);
    expect(result).toBe("2026-04-02");
  });

  test("calculates correct date for weekly burn", () => {
    // 70 units / (14/7 = 2 per day) = 35 days
    const result = estimatedDepletionDate(70, 14, "week", today);
    expect(result).toBe("2026-04-27");
  });

  test("calculates correct date for monthly burn", () => {
    // 300 units / (300/30 = 10 per day) = 30 days
    const result = estimatedDepletionDate(300, 300, "month", today);
    expect(result).toBe("2026-04-22");
  });
});

describe("deriveItemStatus", () => {
  test("returns 'On Order' when pending orders exist, even below reorder point", () => {
    expect(deriveItemStatus(5, 10, true)).toBe("On Order");
  });

  test("returns 'Reorder Now' when at reorder point with no pending order", () => {
    expect(deriveItemStatus(10, 10, false)).toBe("Reorder Now");
  });

  test("returns 'Reorder Now' when below reorder point with no pending order", () => {
    expect(deriveItemStatus(3, 10, false)).toBe("Reorder Now");
  });

  test("returns 'OK' when above reorder point", () => {
    expect(deriveItemStatus(20, 10, false)).toBe("OK");
  });

  test("returns 'OK' when reorder point is null", () => {
    expect(deriveItemStatus(5, null, false)).toBe("OK");
  });

  test("returns 'On Order' overrides reorder even when reorder_point is null", () => {
    expect(deriveItemStatus(5, null, true)).toBe("On Order");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/lib/inventory/calculations.test.ts --verbose
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement calculations**

Create `lib/inventory/calculations.ts`:

```typescript
import { addDays, format } from "date-fns";
import { PERIOD_DIVISORS } from "@/lib/inventory/constants";
import type { BurnRatePeriod, ItemStatus } from "@/lib/inventory/constants";

/**
 * Convert burn rate to a daily rate.
 * Returns null if burn_rate is null or 0 (no depletion to calculate).
 */
export function burnRatePerDay(
  burnRate: number | null,
  period: BurnRatePeriod | null
): number | null {
  if (burnRate === null || burnRate === 0 || period === null) {
    return null;
  }
  return burnRate / PERIOD_DIVISORS[period];
}

/**
 * Calculate estimated depletion date.
 * Returns ISO date string (YYYY-MM-DD) or null if not calculable.
 */
export function estimatedDepletionDate(
  quantityOnHand: number,
  burnRate: number | null,
  burnRatePeriod: BurnRatePeriod | null,
  today: Date = new Date()
): string | null {
  if (quantityOnHand <= 0) return null;

  const dailyRate = burnRatePerDay(burnRate, burnRatePeriod);
  if (dailyRate === null) return null;

  const daysRemaining = quantityOnHand / dailyRate;
  const depletionDate = addDays(today, Math.floor(daysRemaining));
  return format(depletionDate, "yyyy-MM-dd");
}

/**
 * Derive item status from current state.
 * "On Order" fully overrides "Reorder Now".
 */
export function deriveItemStatus(
  quantityOnHand: number,
  reorderPoint: number | null,
  hasPendingOrder: boolean
): ItemStatus {
  if (hasPendingOrder) return "On Order";
  if (reorderPoint !== null && quantityOnHand <= reorderPoint)
    return "Reorder Now";
  return "OK";
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/lib/inventory/calculations.test.ts --verbose
```
Expected: All 13 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/inventory/calculations.ts __tests__/lib/inventory/calculations.test.ts
git commit -m "feat: add inventory calculation functions — burn rate, depletion date, item status"
```

---

## Task 5: Supabase Client Setup

**Files:**
- Create: `lib/supabase/client.ts`, `lib/supabase/server.ts`

- [ ] **Step 1: Create browser client**

Create `lib/supabase/client.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 2: Create server client**

Create `lib/supabase/server.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";

export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceRoleKey);
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/client.ts lib/supabase/server.ts
git commit -m "feat: add Supabase client setup — browser and server"
```

---

## Task 6: Authentication

**Files:**
- Create: `lib/auth.ts`, `app/api/auth/[...nextauth]/route.ts`, `app/login/page.tsx`, `middleware.ts`

- [ ] **Step 1: Configure next-auth**

Create `lib/auth.ts`:

```typescript
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Team Password",
      credentials: {
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (credentials?.password === process.env.TEAM_PASSWORD) {
          return { id: "team", name: "BICR Team" };
        }
        return null;
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: "/login",
  },
};
```

- [ ] **Step 2: Create auth API route**

Create `app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

- [ ] **Step 3: Create login page**

Create `app/login/page.tsx`:

```tsx
"use client";

import { signIn } from "next-auth/react";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Incorrect password");
      setLoading(false);
    } else {
      router.push("/inventory");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-bicr-navy text-center mb-2">
            BICR Operations
          </h1>
          <p className="text-sm text-gray-500 text-center mb-6">
            Enter the team password to continue
          </p>

          <form onSubmit={handleSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Team password"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-bicr-teal focus:border-transparent"
              autoFocus
              required
            />

            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full bg-bicr-teal text-white py-2 px-4 rounded-md hover:bg-bicr-navy transition-colors disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create middleware for route protection**

Create `middleware.ts`:

```typescript
export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    /*
     * Protect all routes except:
     * - /login
     * - /api/auth (next-auth routes)
     * - /_next (Next.js internals)
     * - /favicon.ico, /icons, etc.
     */
    "/((?!login|api/auth|_next|favicon.ico).*)",
  ],
};
```

- [ ] **Step 5: Verify login flow manually**

```bash
npm run dev
```
1. Navigate to `localhost:3000` — should redirect to `/login`
2. Enter incorrect password — should show error
3. Enter correct password (from `.env.local`) — should redirect to `/inventory` (will 404 for now, that's expected)

- [ ] **Step 6: Commit**

```bash
git add lib/auth.ts app/api/auth/ app/login/page.tsx middleware.ts
git commit -m "feat: add authentication — next-auth shared password, login page, route protection"
```

---

## Task 7: App Shell & Navigation

**Files:**
- Create: `app/layout.tsx` (replace default), `app/page.tsx` (replace default), `components/nav/NavBar.tsx`, `app/inventory/page.tsx`, `app/inventory/loading.tsx`

- [ ] **Step 1: Create session provider wrapper**

We need a client-side SessionProvider. Create `components/SessionWrapper.tsx`:

```tsx
"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

export default function SessionWrapper({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

- [ ] **Step 2: Create NavBar component**

Create `components/nav/NavBar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

interface NavBarProps {
  reorderCount: number;
}

const TABS = [
  { name: "Inventory", href: "/inventory", enabled: true },
  { name: "SOPs", href: "#", enabled: false },
  { name: "Team", href: "#", enabled: false },
  { name: "Reports", href: "#", enabled: false },
];

export default function NavBar({ reorderCount }: NavBarProps) {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left: Logo + tabs */}
          <div className="flex items-center space-x-8">
            <span className="text-xl font-bold text-bicr-navy">
              BICR Ops
            </span>

            <div className="flex space-x-1">
              {TABS.map((tab) => {
                const isActive = pathname === tab.href;
                return (
                  <Link
                    key={tab.name}
                    href={tab.enabled ? tab.href : "#"}
                    className={`
                      relative px-4 py-2 rounded-md text-sm font-medium transition-colors
                      ${isActive
                        ? "bg-bicr-teal text-white"
                        : tab.enabled
                          ? "text-bicr-charcoal hover:bg-gray-100"
                          : "text-gray-300 cursor-not-allowed"
                      }
                    `}
                    aria-disabled={!tab.enabled}
                  >
                    {tab.name}
                    {tab.name === "Inventory" && reorderCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1">
                        {reorderCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right: Logout */}
          <div className="flex items-center">
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-sm text-gray-500 hover:text-bicr-charcoal transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 3: Update root layout**

Replace `app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SessionWrapper from "@/components/SessionWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BICR Operations Dashboard",
  description: "Big Island Coffee Roasters internal operations dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50`}>
        <SessionWrapper>{children}</SessionWrapper>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Create root page redirect**

Replace `app/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/inventory");
}
```

- [ ] **Step 5: Create inventory page skeleton**

Create `app/inventory/page.tsx`:

```tsx
import NavBar from "@/components/nav/NavBar";

export default function InventoryPage() {
  return (
    <div className="min-h-screen">
      <NavBar reorderCount={0} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-bold text-bicr-navy">Inventory</h1>
        <p className="text-gray-500 mt-2">Loading inventory table...</p>
      </main>
    </div>
  );
}
```

Create `app/inventory/loading.tsx`:

```tsx
export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-bicr-teal text-lg">Loading...</div>
    </div>
  );
}
```

- [ ] **Step 6: Verify app shell**

```bash
npm run dev
```
1. Login and navigate to `/inventory` — should see NavBar with "Inventory" tab active, other tabs greyed out
2. Log out button visible in top right

- [ ] **Step 7: Commit**

```bash
git add components/SessionWrapper.tsx components/nav/NavBar.tsx app/layout.tsx app/page.tsx app/inventory/
git commit -m "feat: add app shell — NavBar with tab structure, inventory page skeleton, root redirect"
```

---

## Task 8: Inventory Data Queries

**Files:**
- Create: `lib/inventory/queries.ts`, `app/api/items/route.ts`

- [ ] **Step 1: Build query helper**

Create `lib/inventory/queries.ts`:

```typescript
import { createServerClient } from "@/lib/supabase/server";
import { deriveItemStatus, estimatedDepletionDate } from "./calculations";
import { VARIANT_CATEGORIES } from "./constants";
import type { InventoryItem, Item, Order, StockEvent } from "@/lib/supabase/types";
import type { ItemCategory } from "./constants";

/**
 * Fetch all active inventory items with computed fields.
 */
export async function fetchInventoryItems(): Promise<InventoryItem[]> {
  const supabase = createServerClient();

  // Fetch items with vendor join
  const { data: items, error: itemsError } = await supabase
    .from("items")
    .select("*, vendor:vendors(*)")
    .eq("archived", false)
    .order("name");

  if (itemsError) throw itemsError;
  if (!items) return [];

  // Fetch all pending orders
  const { data: pendingOrders } = await supabase
    .from("orders")
    .select("item_id")
    .eq("status", "pending");

  const pendingOrdersByItem = new Set(
    (pendingOrders ?? []).map((o) => o.item_id)
  );

  // Fetch latest stock event per simple item (for on-hand quantity)
  const { data: latestEvents } = await supabase
    .from("stock_events")
    .select("item_id, quantity_after, created_at")
    .order("created_at", { ascending: false });

  // Build map: item_id -> most recent event
  const latestEventByItem = new Map<
    string,
    { quantity_after: number; created_at: string }
  >();
  for (const event of latestEvents ?? []) {
    if (!latestEventByItem.has(event.item_id)) {
      latestEventByItem.set(event.item_id, event);
    }
  }

  // Fetch last count_update event per item (for "last count date")
  const { data: countEvents } = await supabase
    .from("stock_events")
    .select("item_id, created_at")
    .eq("event_type", "count_update")
    .order("created_at", { ascending: false });

  const lastCountByItem = new Map<string, string>();
  for (const event of countEvents ?? []) {
    if (!lastCountByItem.has(event.item_id)) {
      lastCountByItem.set(event.item_id, event.created_at);
    }
  }

  // Fetch all variant quantities
  const { data: variants } = await supabase
    .from("item_variants")
    .select("*");

  const variantsByItem = new Map<string, typeof variants>();
  for (const v of variants ?? []) {
    const existing = variantsByItem.get(v.item_id) ?? [];
    existing.push(v);
    variantsByItem.set(v.item_id, existing);
  }

  // Enrich items
  const enriched: InventoryItem[] = items.map((item: Item & { vendor: any }) => {
    const isVariant = VARIANT_CATEGORIES.includes(item.category as ItemCategory);
    const itemVariants = variantsByItem.get(item.id) ?? [];

    // On-hand quantity
    let quantityOnHand: number;
    if (isVariant) {
      quantityOnHand = itemVariants.reduce(
        (sum, v) => sum + Number(v.quantity),
        0
      );
    } else {
      const latestEvent = latestEventByItem.get(item.id);
      quantityOnHand = latestEvent ? Number(latestEvent.quantity_after) : 0;
    }

    const hasPendingOrder = pendingOrdersByItem.has(item.id);
    const status = deriveItemStatus(
      quantityOnHand,
      item.reorder_point ? Number(item.reorder_point) : null,
      hasPendingOrder
    );

    const estDepletion = estimatedDepletionDate(
      quantityOnHand,
      item.burn_rate ? Number(item.burn_rate) : null,
      item.burn_rate_period
    );

    const effectiveLeadDays =
      item.lead_time_days ?? item.vendor?.default_lead_days ?? null;

    // Count pending orders for this item
    const pendingCount = hasPendingOrder ? 1 : 0; // Simplified; refined in detail panel

    return {
      ...item,
      vendor: item.vendor,
      quantity_on_hand: quantityOnHand,
      status,
      est_depletion_date: estDepletion,
      effective_lead_days: effectiveLeadDays,
      pending_orders_count: pendingCount,
      last_count_date: lastCountByItem.get(item.id) ?? null,
      variants: isVariant ? itemVariants : undefined,
    };
  });

  return enriched;
}

/**
 * Fetch a single item with all related data for the detail panel.
 */
export async function fetchItemDetail(itemId: string) {
  const supabase = createServerClient();

  const [itemResult, ordersResult, eventsResult, variantsResult] =
    await Promise.all([
      supabase
        .from("items")
        .select("*, vendor:vendors(*)")
        .eq("id", itemId)
        .single(),
      supabase
        .from("orders")
        .select("*")
        .eq("item_id", itemId)
        .order("order_date", { ascending: false }),
      supabase
        .from("stock_events")
        .select("*")
        .eq("item_id", itemId)
        .order("created_at", { ascending: false }),
      supabase.from("item_variants").select("*").eq("item_id", itemId),
    ]);

  if (itemResult.error) throw itemResult.error;

  return {
    item: itemResult.data,
    orders: ordersResult.data ?? [],
    events: eventsResult.data ?? [],
    variants: variantsResult.data ?? [],
  };
}
```

- [ ] **Step 2: Create items API route**

Create `app/api/items/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchInventoryItems } from "@/lib/inventory/queries";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await fetchInventoryItems();
    return NextResponse.json(items);
  } catch (error) {
    console.error("Failed to fetch items:", error);
    return NextResponse.json(
      { error: "Failed to fetch items" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/inventory/queries.ts app/api/items/route.ts
git commit -m "feat: add inventory data queries — item enrichment with status, depletion, quantity"
```

---

## Task 9: Inventory Table Component

**Files:**
- Create: `components/inventory/InventoryTable.tsx`, `components/inventory/OrderButton.tsx`

- [ ] **Step 1: Create OrderButton component**

Create `components/inventory/OrderButton.tsx`:

```tsx
"use client";

import type { InventoryItem } from "@/lib/supabase/types";

interface OrderButtonProps {
  item: InventoryItem;
}

export default function OrderButton({ item }: OrderButtonProps) {
  const actionType = item.reorder_action_type;
  const actionValue = item.reorder_action_value;

  if (actionType === "none" || !actionValue) {
    return (
      <button
        disabled
        className="text-xs px-3 py-1 rounded bg-gray-100 text-gray-400 cursor-not-allowed"
      >
        Order
      </button>
    );
  }

  function handleClick() {
    if (actionType === "url") {
      window.open(actionValue!, "_blank", "noopener");
    } else if (actionType === "email") {
      const subject = encodeURIComponent(`Reorder: ${item.name}`);
      const gmailUrl = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(actionValue!)}&su=${subject}`;
      window.open(gmailUrl, "_blank", "noopener");
    }
  }

  return (
    <button
      onClick={handleClick}
      className="text-xs px-3 py-1 rounded bg-bicr-teal text-white hover:bg-bicr-navy transition-colors"
    >
      Order
    </button>
  );
}
```

- [ ] **Step 2: Create InventoryTable component**

Create `components/inventory/InventoryTable.tsx`:

```tsx
"use client";

import { useState, useMemo } from "react";
import type { InventoryItem } from "@/lib/supabase/types";
import type { ItemStatus } from "@/lib/inventory/constants";
import OrderButton from "./OrderButton";

interface InventoryTableProps {
  items: InventoryItem[];
  onRowClick: (item: InventoryItem) => void;
}

type SortField =
  | "name" | "category" | "vendor" | "quantity_on_hand"
  | "burn_rate" | "reorder_point" | "est_depletion_date"
  | "effective_lead_days" | "assigned_to" | "status";

const STATUS_SORT_ORDER: Record<ItemStatus, number> = {
  "Reorder Now": 0,
  "On Order": 1,
  OK: 2,
};

export default function InventoryTable({ items, onRowClick }: InventoryTableProps) {
  const [sortField, setSortField] = useState<SortField>("status");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      let cmp = 0;
      if (sortField === "status") {
        cmp = STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status];
        if (cmp === 0) cmp = a.name.localeCompare(b.name);
      } else if (sortField === "vendor") {
        cmp = (a.vendor?.name ?? "").localeCompare(b.vendor?.name ?? "");
      } else if (sortField === "name" || sortField === "category" || sortField === "assigned_to") {
        const aVal = String(a[sortField] ?? "");
        const bVal = String(b[sortField] ?? "");
        cmp = aVal.localeCompare(bVal);
      } else if (sortField === "est_depletion_date") {
        cmp = (a.est_depletion_date ?? "9999-12-31").localeCompare(b.est_depletion_date ?? "9999-12-31");
      } else {
        cmp = ((a[sortField] as number) ?? 0) - ((b[sortField] as number) ?? 0);
      }
      return sortDirection === "desc" ? -cmp : cmp;
    });
  }, [items, sortField, sortDirection]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  const columns: { label: string; field: SortField }[] = [
    { label: "Item Name", field: "name" },
    { label: "Category", field: "category" },
    { label: "Vendor", field: "vendor" },
    { label: "On Hand", field: "quantity_on_hand" },
    { label: "Burn Rate", field: "burn_rate" },
    { label: "Reorder Pt", field: "reorder_point" },
    { label: "Est. Depletion", field: "est_depletion_date" },
    { label: "Lead Time", field: "effective_lead_days" },
    { label: "Assigned To", field: "assigned_to" },
    { label: "Status", field: "status" },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.field}
                onClick={() => handleSort(col.field)}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-bicr-teal select-none"
              >
                {col.label}
                {sortField === col.field && (
                  <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
                )}
              </th>
            ))}
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sorted.map((item) => (
            <tr
              key={item.id}
              onClick={() => onRowClick(item)}
              className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                item.status === "Reorder Now" ? "bg-red-50 hover:bg-red-100" : ""
              }`}
            >
              <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{item.name}</td>
              <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">{item.category}</span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{item.vendor?.name ?? "—"}</td>
              <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                {item.quantity_on_hand}{item.unit_label ? ` ${item.unit_label}` : ""}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                {item.burn_rate ? `${item.burn_rate}/${item.burn_rate_period}` : "—"}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{item.reorder_point ?? "—"}</td>
              <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{item.est_depletion_date ?? "—"}</td>
              <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                {item.effective_lead_days ? `${item.effective_lead_days}d` : "—"}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{item.assigned_to ?? "—"}</td>
              <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={item.status} /></td>
              <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                <OrderButton item={item} />
              </td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr><td colSpan={11} className="px-4 py-8 text-center text-gray-500">No items found</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: ItemStatus }) {
  const styles: Record<ItemStatus, string> = {
    "Reorder Now": "bg-red-100 text-red-800",
    "On Order": "bg-blue-100 text-blue-800",
    OK: "bg-green-100 text-green-800",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/inventory/InventoryTable.tsx components/inventory/OrderButton.tsx
git commit -m "feat: add inventory table with sorting, status badges, and order button"
```

---

## Task 10: Filters & Alert Banner

**Files:**
- Create: `components/inventory/InventoryFilters.tsx`, `components/inventory/AlertBanner.tsx`

- [ ] **Step 1: Create InventoryFilters**

Create `components/inventory/InventoryFilters.tsx`:

```tsx
"use client";

import { ITEM_CATEGORIES } from "@/lib/inventory/constants";
import type { ItemStatus } from "@/lib/inventory/constants";
import type { Vendor } from "@/lib/supabase/types";

interface FiltersProps {
  categoryFilter: string;
  statusFilter: string;
  vendorFilter: string;
  searchQuery: string;
  vendors: Vendor[];
  onCategoryChange: (val: string) => void;
  onStatusChange: (val: string) => void;
  onVendorChange: (val: string) => void;
  onSearchChange: (val: string) => void;
}

const STATUS_OPTIONS: ItemStatus[] = ["Reorder Now", "On Order", "OK"];

export default function InventoryFilters({
  categoryFilter, statusFilter, vendorFilter, searchQuery,
  vendors, onCategoryChange, onStatusChange, onVendorChange, onSearchChange,
}: FiltersProps) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <input
        type="text"
        placeholder="Search items..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal focus:border-transparent w-48"
      />
      <select value={categoryFilter} onChange={(e) => onCategoryChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-bicr-teal">
        <option value="">All Categories</option>
        {ITEM_CATEGORIES.map((cat) => (
          <option key={cat} value={cat} className="capitalize">{cat}</option>
        ))}
      </select>
      <select value={statusFilter} onChange={(e) => onStatusChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-bicr-teal">
        <option value="">All Statuses</option>
        {STATUS_OPTIONS.map((s) => (<option key={s} value={s}>{s}</option>))}
      </select>
      <select value={vendorFilter} onChange={(e) => onVendorChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-bicr-teal">
        <option value="">All Vendors</option>
        {vendors.map((v) => (<option key={v.id} value={v.id}>{v.name}</option>))}
      </select>
    </div>
  );
}
```

- [ ] **Step 2: Create AlertBanner**

Create `components/inventory/AlertBanner.tsx`:

```tsx
"use client";

interface AlertBannerProps {
  reorderCount: number;
  onFilterReorder: () => void;
}

export default function AlertBanner({ reorderCount, onFilterReorder }: AlertBannerProps) {
  if (reorderCount === 0) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 flex items-center justify-between">
      <span className="text-red-600 font-medium text-sm">
        {reorderCount} item{reorderCount !== 1 ? "s" : ""} need{reorderCount === 1 ? "s" : ""} reorder
      </span>
      <button onClick={onFilterReorder} className="text-sm text-red-700 underline hover:text-red-900">
        Show items
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/inventory/InventoryFilters.tsx components/inventory/AlertBanner.tsx
git commit -m "feat: add inventory filters and alert banner"
```

---

## Task 11: Wire Up Inventory Page

**Files:**
- Modify: `app/inventory/page.tsx`
- Create: `app/api/vendors/route.ts`

- [ ] **Step 1: Create vendors API route**

Create `app/api/vendors/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const { data, error } = await supabase.from("vendors").select("*").order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
```

- [ ] **Step 2: Replace inventory page with full wiring**

Replace `app/inventory/page.tsx`:

```tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import NavBar from "@/components/nav/NavBar";
import InventoryTable from "@/components/inventory/InventoryTable";
import InventoryFilters from "@/components/inventory/InventoryFilters";
import AlertBanner from "@/components/inventory/AlertBanner";
import DetailPanel from "@/components/inventory/DetailPanel";
import type { InventoryItem, Vendor } from "@/lib/supabase/types";

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [itemsRes, vendorsRes] = await Promise.all([
        fetch("/api/items"),
        fetch("/api/vendors"),
      ]);
      setItems(await itemsRes.json());
      setVendors(await vendorsRes.json());
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (categoryFilter && item.category !== categoryFilter) return false;
      if (statusFilter && item.status !== statusFilter) return false;
      if (vendorFilter && item.vendor_id !== vendorFilter) return false;
      if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [items, categoryFilter, statusFilter, vendorFilter, searchQuery]);

  const reorderCount = useMemo(
    () => items.filter((i) => i.status === "Reorder Now").length,
    [items]
  );

  function handleFilterReorder() {
    setStatusFilter("Reorder Now");
    setCategoryFilter("");
    setVendorFilter("");
    setSearchQuery("");
  }

  function handleDataChange() {
    fetchData();
    setSelectedItemId(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <NavBar reorderCount={0} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-pulse text-bicr-teal">Loading inventory...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <NavBar reorderCount={reorderCount} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-bicr-navy">Inventory</h1>
          <div className="flex space-x-2">
            {/* Update Counts and Add Item buttons wired in later tasks */}
            <button className="px-4 py-2 bg-bicr-orange text-white rounded-md hover:bg-amber-500 transition-colors text-sm font-medium">
              Update Counts
            </button>
            <button className="px-4 py-2 bg-bicr-teal text-white rounded-md hover:bg-bicr-navy transition-colors text-sm font-medium">
              Add Item
            </button>
          </div>
        </div>

        <AlertBanner reorderCount={reorderCount} onFilterReorder={handleFilterReorder} />

        <div className="mb-4">
          <InventoryFilters
            categoryFilter={categoryFilter} statusFilter={statusFilter}
            vendorFilter={vendorFilter} searchQuery={searchQuery} vendors={vendors}
            onCategoryChange={setCategoryFilter} onStatusChange={setStatusFilter}
            onVendorChange={setVendorFilter} onSearchChange={setSearchQuery}
          />
        </div>

        <div className="bg-white rounded-lg shadow">
          <InventoryTable items={filtered} onRowClick={(item) => setSelectedItemId(item.id)} />
        </div>
      </main>

      {selectedItemId && (
        <DetailPanel
          itemId={selectedItemId}
          onClose={() => setSelectedItemId(null)}
          onDataChange={handleDataChange}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify manually**

```bash
npm run dev
```
Login → see table with filters, alert banner, nav badge. Click a row → detail panel opens (next task).

- [ ] **Step 4: Commit**

```bash
git add app/inventory/page.tsx app/api/vendors/route.ts
git commit -m "feat: wire up inventory page with data fetching, filters, alert banner, nav badge"
```

---

## Task 12: Detail Panel

**Files:**
- Create: `components/inventory/DetailPanel.tsx`, `components/inventory/AuditLog.tsx`, `components/inventory/OrdersList.tsx`, `app/api/items/[id]/route.ts`

- [ ] **Step 1: Create AuditLog**

Create `components/inventory/AuditLog.tsx`:

```tsx
import { format } from "date-fns";
import type { StockEvent } from "@/lib/supabase/types";

const EVENT_LABELS: Record<string, string> = {
  count_update: "Count updated",
  ordered: "Marked as ordered",
  received: "Received",
  edited: "Edited",
};

export default function AuditLog({ events }: { events: StockEvent[] }) {
  if (events.length === 0) return <p className="text-sm text-gray-400">No activity recorded yet.</p>;

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <div key={event.id} className="border-l-2 border-gray-200 pl-3 py-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">{EVENT_LABELS[event.event_type] ?? event.event_type}</span>
            <span className="text-xs text-gray-400">{format(new Date(event.created_at), "MMM d, yyyy h:mm a")}</span>
          </div>
          <p className="text-xs text-gray-500">
            {event.quantity_before} → {event.quantity_after}{event.variant_id && " (variant)"} · by {event.performed_by}
          </p>
          {event.note && <p className="text-xs text-gray-400 italic mt-0.5">{event.note}</p>}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create OrdersList**

Create `components/inventory/OrdersList.tsx`:

```tsx
import { format } from "date-fns";
import type { Order } from "@/lib/supabase/types";

export default function OrdersList({ orders }: { orders: Order[] }) {
  const pending = orders.filter((o) => o.status === "pending");
  if (pending.length === 0) return <p className="text-sm text-gray-400">No pending orders.</p>;

  return (
    <div className="space-y-2">
      {pending.map((order) => (
        <div key={order.id} className="bg-blue-50 border border-blue-100 rounded-md p-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-blue-800">{order.quantity_ordered} ordered</span>
            <span className="text-xs text-blue-600">{format(new Date(order.order_date), "MMM d, yyyy")}</span>
          </div>
          <p className="text-xs text-blue-600 mt-1">
            Est. arrival: {format(new Date(order.est_receive_date), "MMM d, yyyy")} · by {order.ordered_by}
          </p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create DetailPanel**

Create `components/inventory/DetailPanel.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import AuditLog from "./AuditLog";
import OrdersList from "./OrdersList";
import { VARIANT_CATEGORIES } from "@/lib/inventory/constants";
import type { Item, Vendor, Order, StockEvent, ItemVariant } from "@/lib/supabase/types";
import type { ItemCategory } from "@/lib/inventory/constants";

interface DetailPanelProps {
  itemId: string;
  onClose: () => void;
  onDataChange: () => void;
}

interface DetailData {
  item: Item & { vendor: Vendor | null };
  orders: Order[];
  events: StockEvent[];
  variants: ItemVariant[];
}

export default function DetailPanel({ itemId, onClose, onDataChange }: DetailPanelProps) {
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/items/${itemId}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, [itemId]);

  if (loading || !data) {
    return (
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-xl border-l border-gray-200 z-50 p-6">
        <div className="animate-pulse text-bicr-teal">Loading...</div>
      </div>
    );
  }

  const { item, orders, events, variants } = data;
  const isVariant = VARIANT_CATEGORIES.includes(item.category as ItemCategory);
  const hasPendingOrder = orders.some((o) => o.status === "pending");
  const effectiveLeadDays = item.lead_time_days ?? item.vendor?.default_lead_days ?? null;

  // Compute on-hand and status for display
  const quantityOnHand = isVariant
    ? variants.reduce((sum, v) => sum + Number(v.quantity), 0)
    : Number(events[0]?.quantity_after ?? 0);
  const currentStatus = hasPendingOrder
    ? "On Order"
    : (item.reorder_point !== null && quantityOnHand <= Number(item.reorder_point))
      ? "Reorder Now"
      : "OK";
  const statusStyles: Record<string, string> = {
    "Reorder Now": "bg-red-100 text-red-800",
    "On Order": "bg-blue-100 text-blue-800",
    OK: "bg-green-100 text-green-800",
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-xl border-l border-gray-200 z-50 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-bicr-navy">{item.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">{item.category}</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[currentStatus]}`}>{currentStatus}</span>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
          </div>

          {item.vendor && (
            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm font-medium text-gray-700">{item.vendor.name}</p>
              {item.vendor.contact_email && (
                <p className="text-xs text-gray-500">{item.vendor.contact_name} · {item.vendor.contact_email}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-6 text-sm">
            <div><span className="text-gray-500">Unit:</span> {item.unit_label ?? "—"}</div>
            <div><span className="text-gray-500">Per Package:</span> {item.units_per_package ?? "—"}</div>
            <div><span className="text-gray-500">Burn Rate:</span> {item.burn_rate ? `${item.burn_rate}/${item.burn_rate_period}` : "—"}</div>
            <div><span className="text-gray-500">Reorder Point:</span> {item.reorder_point ?? "—"}</div>
            <div><span className="text-gray-500">Lead Time:</span> {effectiveLeadDays ? `${effectiveLeadDays} days` : "—"}</div>
            <div><span className="text-gray-500">Assigned To:</span> {item.assigned_to ?? "—"}</div>
          </div>

          {item.notes && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-1">Notes</h3>
              <p className="text-sm text-gray-500">{item.notes}</p>
            </div>
          )}

          {/* Action buttons — modals wired in Tasks 13-15 */}
          <div className="flex space-x-2 mb-6">
            <button className="px-4 py-2 bg-bicr-teal text-white rounded-md text-sm hover:bg-bicr-navy transition-colors">
              Mark as Ordered
            </button>
            {hasPendingOrder && !isVariant && (
              <button className="px-4 py-2 bg-bicr-light-teal text-bicr-navy rounded-md text-sm hover:bg-bicr-light-blue transition-colors">
                Mark as Received
              </button>
            )}
            {hasPendingOrder && isVariant && (
              <button className="px-4 py-2 bg-bicr-light-teal text-bicr-navy rounded-md text-sm hover:bg-bicr-light-blue transition-colors">
                Close Order
              </button>
            )}
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50 transition-colors">
              Edit Item
            </button>
          </div>

          {isVariant && variants.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Stock by Size / Location</h3>
              <p className="text-xs text-gray-400">Variant matrix — built in Task 17.</p>
            </div>
          )}

          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Pending Orders</h3>
            <OrdersList orders={orders} />
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Activity Log</h3>
            <AuditLog events={events} />
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Create item detail API route**

Create `app/api/items/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchItemDetail } from "@/lib/inventory/queries";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const detail = await fetchItemDetail(params.id);
    return NextResponse.json(detail);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch item" }, { status: 500 });
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add components/inventory/DetailPanel.tsx components/inventory/AuditLog.tsx components/inventory/OrdersList.tsx app/api/items/\[id\]/route.ts
git commit -m "feat: add detail panel with audit log, pending orders, vendor info"
```

---

## Task 13: Mark as Ordered Modal

**Files:**
- Create: `components/modals/MarkAsOrderedModal.tsx`, `app/api/items/[id]/orders/route.ts`
- Modify: `components/inventory/DetailPanel.tsx`

- [ ] **Step 1: Create MarkAsOrderedModal**

Create `components/modals/MarkAsOrderedModal.tsx`:

```tsx
"use client";

import { useState, FormEvent } from "react";

interface Props {
  itemId: string;
  itemName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MarkAsOrderedModal({ itemId, itemName, onClose, onSuccess }: Props) {
  const storedName = typeof window !== "undefined" ? localStorage.getItem("bicr_user_name") ?? "" : "";
  const [orderedBy, setOrderedBy] = useState(storedName);
  const [quantity, setQuantity] = useState("");
  const [estReceiveDate, setEstReceiveDate] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    if (orderedBy) localStorage.setItem("bicr_user_name", orderedBy);

    const res = await fetch(`/api/items/${itemId}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ordered_by: orderedBy,
        quantity_ordered: Number(quantity),
        est_receive_date: estReceiveDate,
        note: note || null,
      }),
    });

    if (res.ok) { onSuccess(); } else { setSubmitting(false); alert("Failed to create order."); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-bicr-navy mb-1">Mark as Ordered</h2>
        <p className="text-sm text-gray-500 mb-4">{itemName}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ordered by</label>
            <input type="text" required value={orderedBy} onChange={(e) => setOrderedBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity to order</label>
            <input type="number" required min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estimated receive date</label>
            <input type="date" required value={estReceiveDate} onChange={(e) => setEstReceiveDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal" />
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
            <button type="submit" disabled={submitting}
              className="px-4 py-2 bg-bicr-teal text-white rounded-md text-sm hover:bg-bicr-navy disabled:opacity-50">
              {submitting ? "Saving..." : "Confirm Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create orders API**

Create `app/api/items/[id]/orders/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { VARIANT_CATEGORIES } from "@/lib/inventory/constants";
import type { ItemCategory } from "@/lib/inventory/constants";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const supabase = createServerClient();

  // Determine current on-hand quantity (differs for variant vs simple items)
  const { data: item } = await supabase
    .from("items").select("category").eq("id", params.id).single();
  const isVariant = VARIANT_CATEGORIES.includes(item?.category as ItemCategory);

  let currentQty = 0;
  if (isVariant) {
    const { data: variants } = await supabase
      .from("item_variants").select("quantity").eq("item_id", params.id);
    currentQty = (variants ?? []).reduce((sum, v) => sum + Number(v.quantity), 0);
  } else {
    const { data: latestEvent } = await supabase
      .from("stock_events").select("quantity_after").eq("item_id", params.id)
      .is("variant_id", null)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    currentQty = Number(latestEvent?.quantity_after ?? 0);
  }

  // Insert order
  const { error: orderError } = await supabase.from("orders").insert({
    item_id: params.id, ordered_by: body.ordered_by,
    order_date: new Date().toISOString().split("T")[0],
    quantity_ordered: body.quantity_ordered,
    est_receive_date: body.est_receive_date, status: "pending",
  });
  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 });

  // Write stock event (records action, not quantity change)
  await supabase.from("stock_events").insert({
    item_id: params.id, event_type: "ordered",
    quantity_before: currentQty, quantity_after: currentQty,
    note: body.note, performed_by: body.ordered_by,
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
```

- [ ] **Step 3: Wire modal into DetailPanel**

In `components/inventory/DetailPanel.tsx`, add import and state for the modal, then connect the "Mark as Ordered" button's onClick to open it. Pattern:

```tsx
// Add at top of file:
import MarkAsOrderedModal from "@/components/modals/MarkAsOrderedModal";

// Add state:
const [showOrderedModal, setShowOrderedModal] = useState(false);

// Replace "Mark as Ordered" button:
<button onClick={() => setShowOrderedModal(true)} ...>Mark as Ordered</button>

// Add modal render at end of component (before closing fragments):
{showOrderedModal && (
  <MarkAsOrderedModal
    itemId={item.id} itemName={item.name}
    onClose={() => setShowOrderedModal(false)}
    onSuccess={() => { setShowOrderedModal(false); onDataChange(); }}
  />
)}
```

- [ ] **Step 4: Commit**

```bash
git add components/modals/MarkAsOrderedModal.tsx app/api/items/\[id\]/orders/route.ts components/inventory/DetailPanel.tsx
git commit -m "feat: add Mark as Ordered modal with orders API"
```

---

## Task 14: Mark as Received Modal (Simple Items)

**Files:**
- Create: `components/modals/MarkAsReceivedModal.tsx`, `app/api/items/[id]/receive/route.ts`
- Modify: `components/inventory/DetailPanel.tsx`

- [ ] **Step 1: Create MarkAsReceivedModal**

Create `components/modals/MarkAsReceivedModal.tsx`:

```tsx
"use client";

import { useState, FormEvent } from "react";
import { format } from "date-fns";
import type { Order } from "@/lib/supabase/types";

interface Props {
  itemId: string;
  itemName: string;
  order: Order;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MarkAsReceivedModal({ itemId, itemName, order, onClose, onSuccess }: Props) {
  const [quantityReceived, setQuantityReceived] = useState(String(order.quantity_ordered));
  const [receivedDate, setReceivedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const res = await fetch(`/api/items/${itemId}/receive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: order.id,
        quantity_received: Number(quantityReceived),
        received_date: receivedDate,
        performed_by: localStorage.getItem("bicr_user_name") ?? "team",
      }),
    });

    if (res.ok) { onSuccess(); } else { setSubmitting(false); alert("Failed to mark as received."); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-bicr-navy mb-1">Mark as Received</h2>
        <p className="text-sm text-gray-500 mb-4">{itemName}</p>
        <div className="bg-blue-50 rounded-md p-3 mb-4 text-sm">
          <p>Ordered: {order.quantity_ordered} on {format(new Date(order.order_date), "MMM d, yyyy")}</p>
          <p>Est. arrival: {format(new Date(order.est_receive_date), "MMM d, yyyy")}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity received</label>
            <input type="number" required min="0" value={quantityReceived}
              onChange={(e) => setQuantityReceived(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Received date</label>
            <input type="date" required value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal" />
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
            <button type="submit" disabled={submitting}
              className="px-4 py-2 bg-bicr-teal text-white rounded-md text-sm hover:bg-bicr-navy disabled:opacity-50">
              {submitting ? "Saving..." : "Confirm Receipt"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create receive API**

Create `app/api/items/[id]/receive/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const supabase = createServerClient();

  const { data: latestEvent } = await supabase
    .from("stock_events").select("quantity_after").eq("item_id", params.id)
    .is("variant_id", null).order("created_at", { ascending: false }).limit(1).maybeSingle();

  const currentQty = Number(latestEvent?.quantity_after ?? 0);
  const newQty = currentQty + Number(body.quantity_received);

  const { error: orderError } = await supabase.from("orders").update({
    status: "received", received_date: body.received_date, quantity_received: body.quantity_received,
  }).eq("id", body.order_id);
  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 });

  await supabase.from("stock_events").insert({
    item_id: params.id, event_type: "received",
    quantity_before: currentQty, quantity_after: newQty,
    performed_by: body.performed_by ?? "team", note: `Received ${body.quantity_received} units`,
  });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Wire into DetailPanel**

Add `MarkAsReceivedModal` import and state to DetailPanel. The "Mark as Received" button targets the oldest pending order:

```tsx
import MarkAsReceivedModal from "@/components/modals/MarkAsReceivedModal";

// State:
const [showReceivedModal, setShowReceivedModal] = useState(false);

// Find oldest pending order:
const oldestPending = orders
  .filter((o) => o.status === "pending")
  .sort((a, b) => a.order_date.localeCompare(b.order_date))[0];

// Button:
<button onClick={() => setShowReceivedModal(true)} ...>Mark as Received</button>

// Modal:
{showReceivedModal && oldestPending && (
  <MarkAsReceivedModal
    itemId={item.id} itemName={item.name} order={oldestPending}
    onClose={() => setShowReceivedModal(false)}
    onSuccess={() => { setShowReceivedModal(false); onDataChange(); }}
  />
)}
```

- [ ] **Step 4: Commit**

```bash
git add components/modals/MarkAsReceivedModal.tsx app/api/items/\[id\]/receive/route.ts components/inventory/DetailPanel.tsx
git commit -m "feat: add Mark as Received modal and receive API (simple items)"
```

---

## Task 15: Close Order Modal (Variant Items)

**Files:**
- Create: `components/modals/CloseOrderModal.tsx`, `app/api/items/[id]/close-order/route.ts`
- Modify: `components/inventory/DetailPanel.tsx`

- [ ] **Step 1: Create CloseOrderModal**

Create `components/modals/CloseOrderModal.tsx`:

```tsx
"use client";

import { useState, FormEvent } from "react";
import { format } from "date-fns";
import type { Order } from "@/lib/supabase/types";

interface Props {
  itemId: string;
  itemName: string;
  order: Order;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CloseOrderModal({ itemId, itemName, order, onClose, onSuccess }: Props) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const res = await fetch(`/api/items/${itemId}/close-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: order.id, note: note || null }),
    });

    if (res.ok) { onSuccess(); } else { setSubmitting(false); alert("Failed to close order."); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-bicr-navy mb-1">Close Order</h2>
        <p className="text-sm text-gray-500 mb-4">{itemName}</p>
        <div className="bg-blue-50 rounded-md p-3 mb-4 text-sm">
          <p>Ordered: {order.quantity_ordered} on {format(new Date(order.order_date), "MMM d, yyyy")}</p>
          <p className="mt-1 text-xs text-gray-500">Update variant quantities in the size/location matrix after closing.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal" />
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
            <button type="submit" disabled={submitting}
              className="px-4 py-2 bg-bicr-teal text-white rounded-md text-sm hover:bg-bicr-navy disabled:opacity-50">
              {submitting ? "Closing..." : "Close Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create close-order API**

Create `app/api/items/[id]/close-order/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const supabase = createServerClient();

  // Close order — no stock_events, no quantity changes
  const { error } = await supabase.from("orders").update({
    status: "received", received_date: new Date().toISOString().split("T")[0],
  }).eq("id", body.order_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Wire into DetailPanel**

Same pattern — import `CloseOrderModal`, add state, connect button, render modal.

- [ ] **Step 4: Commit**

```bash
git add components/modals/CloseOrderModal.tsx app/api/items/\[id\]/close-order/route.ts components/inventory/DetailPanel.tsx
git commit -m "feat: add Close Order modal and API (variant items — no stock change)"
```

---

## Task 16: Update Counts Flow

**Files:**
- Create: `components/inventory/UpdateCountsFlow.tsx`, `app/api/counts/route.ts`, `app/api/counts/submit/route.ts`
- Modify: `app/inventory/page.tsx`

- [ ] **Step 1: Create counts API**

Create `app/api/counts/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { UPDATE_COUNTS_CATEGORY_ORDER } from "@/lib/inventory/constants";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const { data: items, error } = await supabase.from("items").select("id, name, category")
    .eq("archived", false).in("category", UPDATE_COUNTS_CATEGORY_ORDER).order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const sorted = [...(items ?? [])].sort((a, b) => {
    const catA = UPDATE_COUNTS_CATEGORY_ORDER.indexOf(a.category as any);
    const catB = UPDATE_COUNTS_CATEGORY_ORDER.indexOf(b.category as any);
    if (catA !== catB) return catA - catB;
    return a.name.localeCompare(b.name);
  });

  const { data: events } = await supabase.from("stock_events")
    .select("item_id, quantity_after, created_at, event_type")
    .order("created_at", { ascending: false });

  const latestByItem = new Map<string, number>();
  const lastCountByItem = new Map<string, string>();
  for (const event of events ?? []) {
    if (!latestByItem.has(event.item_id)) latestByItem.set(event.item_id, Number(event.quantity_after));
    if (event.event_type === "count_update" && !lastCountByItem.has(event.item_id))
      lastCountByItem.set(event.item_id, event.created_at);
  }

  return NextResponse.json(sorted.map((item) => ({
    id: item.id, name: item.name, category: item.category,
    quantity_on_hand: latestByItem.get(item.id) ?? 0,
    last_count_date: lastCountByItem.get(item.id) ?? null,
  })));
}
```

Create `app/api/counts/submit/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const supabase = createServerClient();

  const { data: latestEvent } = await supabase.from("stock_events")
    .select("quantity_after").eq("item_id", body.item_id).is("variant_id", null)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();

  const { error } = await supabase.from("stock_events").insert({
    item_id: body.item_id, event_type: "count_update",
    quantity_before: Number(latestEvent?.quantity_after ?? 0),
    quantity_after: body.new_count,
    note: body.note, performed_by: body.performed_by,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Create UpdateCountsFlow component**

Create `components/inventory/UpdateCountsFlow.tsx`:

```tsx
"use client";

import { useState, useEffect, FormEvent } from "react";
import { format } from "date-fns";

interface CountItem {
  id: string; name: string; category: string;
  quantity_on_hand: number; last_count_date: string | null;
}

interface Props { onClose: () => void; onComplete: () => void; }

export default function UpdateCountsFlow({ onClose, onComplete }: Props) {
  const [step, setStep] = useState<"name" | "counting" | "done">("name");
  const [performerName, setPerformerName] = useState(
    typeof window !== "undefined" ? localStorage.getItem("bicr_user_name") ?? "" : ""
  );
  const [items, setItems] = useState<CountItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [newCount, setNewCount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch("/api/counts").then((r) => r.json()).then((d) => { setItems(d); setLoading(false); });
  }, []);

  function handleNameSubmit(e: FormEvent) {
    e.preventDefault();
    localStorage.setItem("bicr_user_name", performerName);
    setStep("counting");
  }

  async function handleCountSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await fetch("/api/counts/submit", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item_id: items[currentIndex].id, new_count: Number(newCount),
        note: note || null, performed_by: performerName,
      }),
    });
    setSubmitting(false);
    advance();
  }

  function advance() {
    setNewCount(""); setNote("");
    if (currentIndex + 1 >= items.length) setStep("done");
    else setCurrentIndex((i) => i + 1);
  }

  // Name prompt
  if (step === "name") {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
          <h2 className="text-lg font-bold text-bicr-navy mb-4">Update Counts</h2>
          <form onSubmit={handleNameSubmit}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your name</label>
            <input type="text" required value={performerName} onChange={(e) => setPerformerName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal" autoFocus />
            <div className="flex justify-end space-x-2 mt-4">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-bicr-teal text-white rounded-md text-sm">Start Counting</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Done
  if (step === "done") {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 text-center">
          <h2 className="text-lg font-bold text-bicr-navy mb-2">Counts Complete</h2>
          <p className="text-sm text-gray-500 mb-4">All items have been reviewed.</p>
          <button onClick={() => { onComplete(); onClose(); }}
            className="px-4 py-2 bg-bicr-teal text-white rounded-md text-sm">Done</button>
        </div>
      </div>
    );
  }

  if (loading || items.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 text-center">
          <p className="text-bicr-teal">Loading items...</p>
        </div>
      </div>
    );
  }

  const item = items[currentIndex];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-gray-500 font-medium uppercase">{item.category}</span>
          <span className="text-xs text-gray-400">Item {currentIndex + 1} of {items.length}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4">
          <div className="bg-bicr-teal h-1.5 rounded-full transition-all"
            style={{ width: `${((currentIndex + 1) / items.length) * 100}%` }} />
        </div>
        <h3 className="text-lg font-bold text-bicr-navy mb-2">{item.name}</h3>
        <div className="bg-gray-50 rounded-md p-3 mb-4 text-sm">
          <p><span className="text-gray-500">Last count:</span> <span className="font-medium">{item.quantity_on_hand}</span></p>
          <p><span className="text-gray-500">Last counted:</span>{" "}
            {item.last_count_date ? format(new Date(item.last_count_date), "MMM d, yyyy") : "Never counted"}
          </p>
        </div>
        <form onSubmit={handleCountSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New count</label>
            <input type="number" required min="0" value={newCount} onChange={(e) => setNewCount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal" />
          </div>
          <div className="flex justify-between pt-2">
            <button type="button" onClick={advance} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Skip</button>
            <button type="submit" disabled={submitting}
              className="px-4 py-2 bg-bicr-teal text-white rounded-md text-sm hover:bg-bicr-navy disabled:opacity-50">
              {submitting ? "Saving..." : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire into inventory page**

In `app/inventory/page.tsx`, add state for `showUpdateCounts` and connect the button:

```tsx
import UpdateCountsFlow from "@/components/inventory/UpdateCountsFlow";

const [showUpdateCounts, setShowUpdateCounts] = useState(false);

// Button:
<button onClick={() => setShowUpdateCounts(true)} ...>Update Counts</button>

// Render:
{showUpdateCounts && (
  <UpdateCountsFlow
    onClose={() => setShowUpdateCounts(false)}
    onComplete={fetchData}
  />
)}
```

- [ ] **Step 4: Commit**

```bash
git add components/inventory/UpdateCountsFlow.tsx app/api/counts/ app/inventory/page.tsx
git commit -m "feat: add Update Counts step-by-step flow with progress indicator"
```

---

## Task 17: Variant Matrix (Clothing / Merch)

**Files:**
- Create: `components/inventory/VariantMatrix.tsx`, `app/api/items/[id]/variants/route.ts`
- Modify: `components/inventory/DetailPanel.tsx`

- [ ] **Step 1: Create variant update API**

Create `app/api/items/[id]/variants/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  // body: { variant_id, new_quantity, performed_by }
  const supabase = createServerClient();

  // Get current variant quantity
  const { data: variant } = await supabase
    .from("item_variants").select("quantity").eq("id", body.variant_id).single();
  const previousQty = Number(variant?.quantity ?? 0);

  // Update variant quantity directly
  const { error: updateError } = await supabase
    .from("item_variants").update({ quantity: body.new_quantity }).eq("id", body.variant_id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  // Write audit event
  await supabase.from("stock_events").insert({
    item_id: params.id, variant_id: body.variant_id,
    event_type: "count_update",
    quantity_before: previousQty, quantity_after: body.new_quantity,
    performed_by: body.performed_by,
    note: `Variant updated: ${previousQty} → ${body.new_quantity}`,
  });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Create VariantMatrix component**

Create `components/inventory/VariantMatrix.tsx`:

```tsx
"use client";

import { useState } from "react";
import { VARIANT_SIZES, VARIANT_LOCATIONS } from "@/lib/inventory/constants";
import type { ItemVariant } from "@/lib/supabase/types";

interface Props {
  itemId: string;
  variants: ItemVariant[];
  onUpdate: () => void;
}

export default function VariantMatrix({ itemId, variants, onUpdate }: Props) {
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Build lookup: variant_key -> variant
  const variantMap = new Map<string, ItemVariant>();
  for (const v of variants) {
    variantMap.set(v.variant_key, v);
  }

  function getVariant(size: string, location: string): ItemVariant | undefined {
    return variantMap.get(`${size} / ${location}`);
  }

  async function handleSave(size: string, location: string) {
    const variant = getVariant(size, location);
    if (!variant) return;

    const performerName = localStorage.getItem("bicr_user_name") ?? "team";

    await fetch(`/api/items/${itemId}/variants`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        variant_id: variant.id,
        new_quantity: Number(editValue),
        performed_by: performerName,
      }),
    });

    setEditingCell(null);
    onUpdate();
  }

  function handleKeyDown(e: React.KeyboardEvent, size: string, location: string) {
    if (e.key === "Enter") handleSave(size, location);
    if (e.key === "Escape") setEditingCell(null);
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-200 text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 border-b">Size</th>
            {VARIANT_LOCATIONS.map((loc) => (
              <th key={loc} className="px-3 py-2 text-center text-xs font-medium text-gray-500 border-b">
                {loc}
              </th>
            ))}
            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 border-b">Total</th>
          </tr>
        </thead>
        <tbody>
          {VARIANT_SIZES.map((size) => {
            const rowTotal = VARIANT_LOCATIONS.reduce((sum, loc) => {
              const v = getVariant(size, loc);
              return sum + Number(v?.quantity ?? 0);
            }, 0);

            return (
              <tr key={size} className="border-b border-gray-100">
                <td className="px-3 py-2 font-medium text-gray-700">{size}</td>
                {VARIANT_LOCATIONS.map((loc) => {
                  const cellKey = `${size} / ${loc}`;
                  const variant = getVariant(size, loc);
                  const qty = Number(variant?.quantity ?? 0);
                  const isEditing = editingCell === cellKey;

                  return (
                    <td key={loc} className="px-3 py-2 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => handleSave(size, loc)}
                          onKeyDown={(e) => handleKeyDown(e, size, loc)}
                          className="w-16 px-2 py-1 border border-bicr-teal rounded text-center text-sm focus:outline-none"
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={() => {
                            setEditingCell(cellKey);
                            setEditValue(String(qty));
                          }}
                          className="w-16 px-2 py-1 text-center hover:bg-bicr-light-teal rounded transition-colors cursor-pointer"
                        >
                          {qty}
                        </button>
                      )}
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-center font-medium text-gray-600">{rowTotal}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Wire into DetailPanel**

In `components/inventory/DetailPanel.tsx`, replace the variant placeholder with:

```tsx
import VariantMatrix from "./VariantMatrix";

// In the variant section:
{isVariant && variants.length > 0 && (
  <div className="mb-6">
    <h3 className="text-sm font-medium text-gray-700 mb-2">Stock by Size / Location</h3>
    <VariantMatrix itemId={item.id} variants={variants} onUpdate={onDataChange} />
  </div>
)}
```

- [ ] **Step 4: Commit**

```bash
git add components/inventory/VariantMatrix.tsx app/api/items/\[id\]/variants/route.ts components/inventory/DetailPanel.tsx
git commit -m "feat: add variant matrix with inline editing for clothing/merch items"
```

---

## Task 18: Item Form (Add / Edit)

**Files:**
- Create: `components/modals/ItemFormModal.tsx`
- Modify: `app/api/items/route.ts` (add POST), `app/api/items/[id]/route.ts` (add PATCH)
- Modify: `app/inventory/page.tsx`, `components/inventory/DetailPanel.tsx`

- [ ] **Step 1: Create ItemFormModal**

Create `components/modals/ItemFormModal.tsx`:

```tsx
"use client";

import { useState, useEffect, FormEvent } from "react";
import { ITEM_CATEGORIES, BURN_RATE_PERIODS, REORDER_ACTION_TYPES, VARIANT_CATEGORIES, VARIANT_SIZES, VARIANT_LOCATIONS } from "@/lib/inventory/constants";
import type { Item, Vendor } from "@/lib/supabase/types";
import type { ItemCategory } from "@/lib/inventory/constants";

interface Props {
  item?: Item | null; // null = add mode
  vendors: Vendor[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function ItemFormModal({ item, vendors, onClose, onSuccess }: Props) {
  const isEdit = !!item;
  const [form, setForm] = useState({
    name: item?.name ?? "",
    category: item?.category ?? "bags",
    vendor_id: item?.vendor_id ?? "",
    unit_label: item?.unit_label ?? "",
    units_per_package: item?.units_per_package?.toString() ?? "",
    burn_rate: item?.burn_rate?.toString() ?? "",
    burn_rate_period: item?.burn_rate_period ?? "",
    reorder_point: item?.reorder_point?.toString() ?? "",
    lead_time_days: item?.lead_time_days?.toString() ?? "",
    assigned_to: item?.assigned_to ?? "",
    reorder_action_type: item?.reorder_action_type ?? "none",
    reorder_action_value: item?.reorder_action_value ?? "",
    notes: item?.notes ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    // Burn rate validation: if burn_rate is set, period is required
    if (form.burn_rate && !form.burn_rate_period) {
      setError("Burn rate period is required when burn rate is set.");
      return;
    }

    setSubmitting(true);

    const payload = {
      name: form.name,
      category: form.category,
      vendor_id: form.vendor_id || null,
      unit_label: form.unit_label || null,
      units_per_package: form.units_per_package ? Number(form.units_per_package) : null,
      burn_rate: form.burn_rate ? Number(form.burn_rate) : null,
      burn_rate_period: form.burn_rate_period || null,
      reorder_point: form.reorder_point ? Number(form.reorder_point) : null,
      lead_time_days: form.lead_time_days ? Number(form.lead_time_days) : null,
      assigned_to: form.assigned_to || null,
      reorder_action_type: form.reorder_action_type,
      reorder_action_value: form.reorder_action_value || null,
      notes: form.notes || null,
    };

    const url = isEdit ? `/api/items/${item!.id}` : "/api/items";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      onSuccess();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to save item.");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center overflow-y-auto py-8">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 my-auto">
        <h2 className="text-lg font-bold text-bicr-navy mb-4">
          {isEdit ? "Edit Item" : "Add Item"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
            <input type="text" required value={form.name} onChange={(e) => update("name", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal" />
          </div>

          {/* Category + Vendor row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={form.category} onChange={(e) => update("category", e.target.value)}
                disabled={isEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-bicr-teal disabled:bg-gray-100">
                {ITEM_CATEGORIES.map((c) => (<option key={c} value={c} className="capitalize">{c}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
              <select value={form.vendor_id} onChange={(e) => update("vendor_id", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-bicr-teal">
                <option value="">None</option>
                {vendors.map((v) => (<option key={v.id} value={v.id}>{v.name}</option>))}
              </select>
            </div>
          </div>

          {/* Unit + Units per package */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit Label</label>
              <input type="text" value={form.unit_label} onChange={(e) => update("unit_label", e.target.value)}
                placeholder="e.g. boxes, rolls" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Units per Package</label>
              <input type="number" min="1" value={form.units_per_package} onChange={(e) => update("units_per_package", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal" />
            </div>
          </div>

          {/* Burn rate + period */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Burn Rate</label>
              <input type="number" min="0" value={form.burn_rate} onChange={(e) => update("burn_rate", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Per</label>
              <select value={form.burn_rate_period} onChange={(e) => update("burn_rate_period", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-bicr-teal">
                <option value="">—</option>
                {BURN_RATE_PERIODS.map((p) => (<option key={p} value={p}>{p}</option>))}
              </select>
            </div>
          </div>

          {/* Reorder point + Lead time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Point</label>
              <input type="number" min="0" value={form.reorder_point} onChange={(e) => update("reorder_point", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lead Time (days)</label>
              <input type="number" min="0" value={form.lead_time_days} onChange={(e) => update("lead_time_days", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal" />
            </div>
          </div>

          {/* Assigned to */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
            <input type="text" value={form.assigned_to} onChange={(e) => update("assigned_to", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal" />
          </div>

          {/* Reorder action */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Action</label>
              <select value={form.reorder_action_type} onChange={(e) => update("reorder_action_type", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-bicr-teal">
                {REORDER_ACTION_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {form.reorder_action_type === "url" ? "URL" : form.reorder_action_type === "email" ? "Email" : "Value"}
              </label>
              <input type="text" value={form.reorder_action_value}
                onChange={(e) => update("reorder_action_value", e.target.value)}
                disabled={form.reorder_action_type === "none"}
                placeholder={form.reorder_action_type === "url" ? "https://..." : form.reorder_action_type === "email" ? "vendor@example.com" : ""}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal disabled:bg-gray-100" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal" />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end space-x-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
            <button type="submit" disabled={submitting}
              className="px-4 py-2 bg-bicr-teal text-white rounded-md text-sm hover:bg-bicr-navy disabled:opacity-50">
              {submitting ? "Saving..." : isEdit ? "Save Changes" : "Add Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add POST to items API**

In `app/api/items/route.ts`, add a POST handler:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { VARIANT_CATEGORIES, VARIANT_SIZES, VARIANT_LOCATIONS } from "@/lib/inventory/constants";

// ... existing GET ...

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const supabase = createServerClient();

  const { data: item, error } = await supabase
    .from("items").insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If variant category, create all variant rows
  if (VARIANT_CATEGORIES.includes(body.category)) {
    const variantRows = [];
    for (const size of VARIANT_SIZES) {
      for (const location of VARIANT_LOCATIONS) {
        variantRows.push({
          item_id: item.id,
          variant_key: `${size} / ${location}`,
          quantity: 0,
        });
      }
    }
    await supabase.from("item_variants").insert(variantRows);
  }

  return NextResponse.json(item, { status: 201 });
}
```

- [ ] **Step 3: Add PATCH to item detail API**

In `app/api/items/[id]/route.ts`, add:

```typescript
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("items").update(body).eq("id", params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
```

- [ ] **Step 4: Wire "Add Item" button in inventory page and "Edit Item" in DetailPanel**

In `app/inventory/page.tsx`:
```tsx
import ItemFormModal from "@/components/modals/ItemFormModal";
const [showItemForm, setShowItemForm] = useState(false);

// "Add Item" button:
<button onClick={() => setShowItemForm(true)} ...>Add Item</button>

// Render:
{showItemForm && (
  <ItemFormModal vendors={vendors} onClose={() => setShowItemForm(false)} onSuccess={() => { setShowItemForm(false); fetchData(); }} />
)}
```

In `components/inventory/DetailPanel.tsx`, add a `vendors` prop to the component interface:
```tsx
import ItemFormModal from "@/components/modals/ItemFormModal";
import type { Vendor } from "@/lib/supabase/types";

// Update interface:
interface DetailPanelProps {
  itemId: string;
  vendors: Vendor[];  // <-- add this prop
  onClose: () => void;
  onDataChange: () => void;
}

const [showEditForm, setShowEditForm] = useState(false);

// "Edit Item" button:
<button onClick={() => setShowEditForm(true)} ...>Edit Item</button>

// Render:
{showEditForm && (
  <ItemFormModal item={item} vendors={vendors} onClose={() => setShowEditForm(false)} onSuccess={onDataChange} />
)}
```

In `app/inventory/page.tsx`, pass vendors to DetailPanel:
```tsx
<DetailPanel itemId={selectedItemId} vendors={vendors} onClose={...} onDataChange={...} />
```

- [ ] **Step 5: Commit**

```bash
git add components/modals/ItemFormModal.tsx app/api/items/route.ts app/api/items/\[id\]/route.ts app/inventory/page.tsx components/inventory/DetailPanel.tsx
git commit -m "feat: add item form modal (add/edit) with burn rate validation and variant auto-creation"
```

---

## Task 19: Vendor Form (Add / Edit)

**Files:**
- Create: `components/modals/VendorFormModal.tsx`, `app/api/vendors/[id]/route.ts`
- Modify: `app/api/vendors/route.ts` (add POST)

- [ ] **Step 1: Create VendorFormModal**

Create `components/modals/VendorFormModal.tsx`:

```tsx
"use client";

import { useState, FormEvent } from "react";
import type { Vendor } from "@/lib/supabase/types";

interface Props {
  vendor?: Vendor | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function VendorFormModal({ vendor, onClose, onSuccess }: Props) {
  const isEdit = !!vendor;
  const [form, setForm] = useState({
    name: vendor?.name ?? "",
    contact_name: vendor?.contact_name ?? "",
    contact_email: vendor?.contact_email ?? "",
    website: vendor?.website ?? "",
    default_lead_days: vendor?.default_lead_days?.toString() ?? "",
  });
  const [submitting, setSubmitting] = useState(false);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      name: form.name,
      contact_name: form.contact_name || null,
      contact_email: form.contact_email || null,
      website: form.website || null,
      default_lead_days: form.default_lead_days ? Number(form.default_lead_days) : null,
    };

    const url = isEdit ? `/api/vendors/${vendor!.id}` : "/api/vendors";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) { onSuccess(); } else { setSubmitting(false); alert("Failed to save vendor."); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-bicr-navy mb-4">{isEdit ? "Edit Vendor" : "Add Vendor"}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name</label>
            <input type="text" required value={form.name} onChange={(e) => update("name", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
              <input type="text" value={form.contact_name} onChange={(e) => update("contact_name", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
              <input type="email" value={form.contact_email} onChange={(e) => update("contact_email", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input type="text" value={form.website} onChange={(e) => update("website", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Lead Days</label>
              <input type="number" min="0" value={form.default_lead_days} onChange={(e) => update("default_lead_days", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal" />
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
            <button type="submit" disabled={submitting}
              className="px-4 py-2 bg-bicr-teal text-white rounded-md text-sm hover:bg-bicr-navy disabled:opacity-50">
              {submitting ? "Saving..." : isEdit ? "Save" : "Add Vendor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add POST to vendors API and create vendor detail route**

Add to `app/api/vendors/route.ts`:

```typescript
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const supabase = createServerClient();
  const { data, error } = await supabase.from("vendors").insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
```

Create `app/api/vendors/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const supabase = createServerClient();
  const { data, error } = await supabase.from("vendors").update(body).eq("id", params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
```

- [ ] **Step 3: Commit**

```bash
git add components/modals/VendorFormModal.tsx app/api/vendors/route.ts app/api/vendors/\[id\]/route.ts
git commit -m "feat: add vendor form modal (add/edit) and vendor API routes"
```

---

## Task 20: Archive Item

**Files:**
- Create: `app/api/items/[id]/archive/route.ts`
- Modify: `components/inventory/DetailPanel.tsx`

- [ ] **Step 1: Create archive API route**

Create `app/api/items/[id]/archive/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const { error } = await supabase
    .from("items").update({ archived: true }).eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Add archive button to DetailPanel**

In `components/inventory/DetailPanel.tsx`, add an "Archive" button after Edit:

```tsx
<button
  onClick={async () => {
    if (!confirm("Archive this item? It will be hidden from the table.")) return;
    await fetch(`/api/items/${item.id}/archive`, { method: "PATCH" });
    onDataChange();
  }}
  className="px-4 py-2 border border-red-300 text-red-600 rounded-md text-sm hover:bg-red-50 transition-colors"
>
  Archive
</button>
```

- [ ] **Step 3: Commit**

```bash
git add app/api/items/\[id\]/archive/route.ts components/inventory/DetailPanel.tsx
git commit -m "feat: add archive item functionality"
```

---

## Task 21: Wire All Modal Connections

**Files:**
- Modify: `app/inventory/page.tsx`, `components/inventory/DetailPanel.tsx`

This task ensures all TODO comments for modal wiring are completed. Review both files and verify:

- [ ] **Step 1: Verify inventory page has all modal state and imports**

Ensure `app/inventory/page.tsx` has:
- `showUpdateCounts` state + `UpdateCountsFlow` import and render
- `showItemForm` state + `ItemFormModal` import and render
- Both buttons wired to open their respective modals

- [ ] **Step 2: Verify DetailPanel has all modal state and imports**

Ensure `components/inventory/DetailPanel.tsx` has:
- `showOrderedModal` → `MarkAsOrderedModal`
- `showReceivedModal` → `MarkAsReceivedModal`
- `showCloseOrderModal` → `CloseOrderModal`
- `showEditForm` → `ItemFormModal` (edit mode)
- Archive button wired
- All buttons connected to their respective state toggles

- [ ] **Step 3: Test all flows manually**

```bash
npm run dev
```
Verify: Add Item, Edit Item, Mark as Ordered, Mark as Received, Close Order, Update Counts, Archive — all open their modals and submit successfully.

- [ ] **Step 4: Commit**

```bash
git add app/inventory/page.tsx components/inventory/DetailPanel.tsx
git commit -m "feat: wire all modal connections in inventory page and detail panel"
```

---

## Task 22: Supabase Edge Function — Daily Slack Alert

**Files:**
- Create: `supabase/functions/daily-alert/index.ts`

- [ ] **Step 1: Write the Edge Function**

Create `supabase/functions/daily-alert/index.ts`:

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const slackWebhookUrl = Deno.env.get("SLACK_WEBHOOK_URL")!;

Deno.serve(async () => {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Fetch non-archived items with reorder_point set
  const { data: items } = await supabase
    .from("items")
    .select("id, name, reorder_point, assigned_to")
    .eq("archived", false)
    .not("reorder_point", "is", null);

  if (!items || items.length === 0) {
    return new Response("No items with reorder points configured.");
  }

  // Fetch pending orders
  const { data: pendingOrders } = await supabase
    .from("orders")
    .select("item_id")
    .eq("status", "pending");

  const pendingSet = new Set((pendingOrders ?? []).map((o) => o.item_id));

  // Fetch latest stock events for quantity
  const { data: events } = await supabase
    .from("stock_events")
    .select("item_id, quantity_after")
    .order("created_at", { ascending: false });

  const latestQty = new Map<string, number>();
  for (const e of events ?? []) {
    if (!latestQty.has(e.item_id)) latestQty.set(e.item_id, Number(e.quantity_after));
  }

  // Fetch variant quantities
  const { data: variants } = await supabase.from("item_variants").select("item_id, quantity");
  const variantTotals = new Map<string, number>();
  for (const v of variants ?? []) {
    variantTotals.set(v.item_id, (variantTotals.get(v.item_id) ?? 0) + Number(v.quantity));
  }

  // Determine items needing reorder
  const reorderItems: { name: string; onHand: number; reorderPoint: number; assignedTo: string }[] = [];

  for (const item of items) {
    // Skip if pending order exists
    if (pendingSet.has(item.id)) continue;

    const qty = variantTotals.get(item.id) ?? latestQty.get(item.id) ?? 0;
    if (qty <= Number(item.reorder_point)) {
      reorderItems.push({
        name: item.name,
        onHand: qty,
        reorderPoint: Number(item.reorder_point),
        assignedTo: item.assigned_to ?? "Unassigned",
      });
    }
  }

  if (reorderItems.length === 0) {
    return new Response("No items need reorder.");
  }

  // Build Slack message
  const lines = reorderItems.map(
    (item) => `• *${item.name}* — ${item.onHand} on hand (reorder at ${item.reorderPoint}) — Assigned: ${item.assignedTo}`
  );

  const message = {
    text: `🔴 *Inventory Alert: ${reorderItems.length} item${reorderItems.length > 1 ? "s" : ""} need reorder*\n\n${lines.join("\n")}`,
  };

  // Post to Slack
  const slackRes = await fetch(slackWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });

  if (!slackRes.ok) {
    console.error("Slack webhook failed:", await slackRes.text());
    return new Response("Failed to post to Slack", { status: 500 });
  }

  return new Response(`Posted alert for ${reorderItems.length} items.`);
});
```

- [ ] **Step 2: Configure daily cron in Supabase**

In the Supabase dashboard:
1. Go to Edge Functions → deploy `daily-alert`
2. Go to Database → Extensions → enable `pg_cron` if not enabled
3. Set up a cron job to invoke the function daily at 8:00 AM HST (6:00 PM UTC):

```sql
SELECT cron.schedule(
  'daily-inventory-alert',
  '0 18 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/daily-alert',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('supabase.service_role_key'))
  );
  $$
);
```

- [ ] **Step 3: Set environment variables**

In Supabase dashboard → Edge Functions → Settings:
- `SLACK_WEBHOOK_URL` = your Slack webhook for `#inventory_supplies`

- [ ] **Step 4: Test the function**

```bash
# Invoke locally or via dashboard to verify it works
curl -X POST https://your-project.supabase.co/functions/v1/daily-alert \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/daily-alert/index.ts
git commit -m "feat: add daily Slack alert edge function for reorder-now items"
```

---

## Task 23: Deployment & Final Verification

**Files:**
- No new files

- [ ] **Step 1: Create Vercel project**

1. Go to vercel.com → New Project
2. Import the `bicr-inventory` GitHub repo
3. Framework preset: Next.js
4. Set environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXTAUTH_SECRET`
  - `NEXTAUTH_URL` (set to production domain)
  - `TEAM_PASSWORD`
  - `SLACK_WEBHOOK_URL`

- [ ] **Step 2: Push to GitHub**

```bash
git remote add origin git@github.com:kelleigh-s/bicr-inventory.git
git push -u origin main
```

- [ ] **Step 3: Verify deployment**

After Vercel auto-deploys:
1. Navigate to deployment URL → should show login page
2. Login with team password → should see inventory table
3. Verify all preview deployments also require login (Vercel password protection)

- [ ] **Step 4: End-to-end smoke test**

Walk through every acceptance criteria:
- [ ] AC 1-6: Table loads sorted, filters work, depletion calculates, alert banner filters
- [ ] AC 7-10: Status badges correct, nav badge counts right, On Order overrides Reorder
- [ ] AC 11-14: Order buttons work (URL, email, none/disabled)
- [ ] AC 15-17: Mark as Ordered from detail panel
- [ ] AC 18-21: Mark as Received for simple items
- [ ] AC 22-24: Close Order for variant items
- [ ] AC 25-31: Update Counts flow (name, progress, categories, skip)
- [ ] AC 32-33: Variant matrix inline editing
- [ ] AC 34-35: Audit log and orders in detail panel
- [ ] AC 36-38: Add/edit/archive items and vendors, burn rate validation
- [ ] AC 39-42: Auth (login, logout, session expiry, route protection)

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup and deployment configuration"
git push
```

---

## Acceptance Criteria Coverage Map

| AC # | Spec Requirement | Implemented In |
| --- | --- | --- |
| 1-2 | Table sorting & filters | Tasks 9, 10, 11 |
| 3-4 | Depletion calculation | Task 4 (calculations.ts) |
| 5 | Assigned owner visible | Tasks 9, 12 |
| 6 | Alert banner filter | Task 10 |
| 7-9 | Status logic & badges | Tasks 4, 9, 10 |
| 10 | Daily Slack cron | Task 22 |
| 11-14 | Order button actions | Task 9 (OrderButton) |
| 15-17 | Mark as Ordered | Task 13 |
| 18-21 | Mark as Received | Task 14 |
| 22-24 | Close Order (variants) | Task 15 |
| 25-31 | Update Counts flow | Task 16 |
| 32-33 | Variant matrix | Task 17 |
| 34-35 | Audit log + orders list | Task 12 |
| 36-38 | Item/vendor CRUD | Tasks 18, 19, 20 |
| 39-42 | Auth | Task 6 |

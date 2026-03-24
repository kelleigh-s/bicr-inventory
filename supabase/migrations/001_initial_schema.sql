-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types
CREATE TYPE item_category AS ENUM ('bags', 'shipping', 'labels', 'packaging', 'clothing', 'merch');
CREATE TYPE burn_rate_period AS ENUM ('day', 'week', 'month');
CREATE TYPE reorder_action_type AS ENUM ('url', 'email', 'none');
CREATE TYPE order_status AS ENUM ('pending', 'received');
CREATE TYPE event_type AS ENUM ('count_update', 'ordered', 'received', 'edited');

-- Vendors table
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

-- Items table with burn_rate_period_required constraint
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
  CONSTRAINT burn_rate_period_required CHECK (burn_rate IS NULL OR burn_rate_period IS NOT NULL)
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

-- Indexes for performance
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

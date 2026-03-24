import type { ItemCategory, BurnRatePeriod, ReorderActionType, ItemStatus } from "@/lib/inventory/constants";

export interface Vendor {
  id: string; name: string; contact_name: string | null; contact_email: string | null;
  website: string | null; default_lead_days: number | null; created_at: string; updated_at: string;
}

export interface Item {
  id: string; name: string; category: ItemCategory; vendor_id: string | null;
  unit_label: string | null; units_per_package: number | null;
  burn_rate: number | null; burn_rate_period: BurnRatePeriod | null;
  reorder_point: number | null; lead_time_days: number | null;
  assigned_to: string | null; reorder_action_type: ReorderActionType;
  reorder_action_value: string | null; notes: string | null;
  archived: boolean; created_at: string; updated_at: string;
}

export interface ItemVariant {
  id: string; item_id: string; variant_key: string; quantity: number;
  created_at: string; updated_at: string;
}

export interface Order {
  id: string; item_id: string; variant_id: string | null; ordered_by: string;
  order_date: string; quantity_ordered: number; est_receive_date: string;
  received_date: string | null; quantity_received: number | null;
  status: "pending" | "received"; created_at: string;
}

export interface StockEvent {
  id: string; item_id: string; variant_id: string | null;
  event_type: "count_update" | "ordered" | "received" | "edited";
  quantity_before: number; quantity_after: number; note: string | null;
  performed_by: string; created_at: string;
}

export interface InventoryItem extends Item {
  vendor?: Vendor | null; quantity_on_hand: number; status: ItemStatus;
  est_depletion_date: string | null; effective_lead_days: number | null;
  pending_orders_count: number; last_count_date: string | null;
  variants?: ItemVariant[];
}

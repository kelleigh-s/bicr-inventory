import { createServerClient } from "@/lib/supabase/server";
import { deriveItemStatus, estimatedDepletionDate } from "./calculations";
import { VARIANT_CATEGORIES } from "./constants";
import type { InventoryItem, Item, Vendor, ItemVariant } from "@/lib/supabase/types";
import type { ItemCategory } from "./constants";

type RawItem = Item & { vendor: Vendor | null };

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

  const pendingOrdersByItem = new Set<string>(
    (pendingOrders ?? []).map((o: { item_id: string }) => o.item_id)
  );

  // Fetch latest stock event per simple item (for on-hand quantity)
  const { data: latestEvents } = await supabase
    .from("stock_events")
    .select("item_id, quantity_after, created_at")
    .order("created_at", { ascending: false });

  const latestEventByItem = new Map<string, { quantity_after: number; created_at: string }>();
  for (const event of (latestEvents ?? []) as { item_id: string; quantity_after: number; created_at: string }[]) {
    if (!latestEventByItem.has(event.item_id)) {
      latestEventByItem.set(event.item_id, event);
    }
  }

  // Fetch last count_update event per item
  const { data: countEvents } = await supabase
    .from("stock_events")
    .select("item_id, created_at")
    .eq("event_type", "count_update")
    .order("created_at", { ascending: false });

  const lastCountByItem = new Map<string, string>();
  for (const event of (countEvents ?? []) as { item_id: string; created_at: string }[]) {
    if (!lastCountByItem.has(event.item_id)) {
      lastCountByItem.set(event.item_id, event.created_at);
    }
  }

  // Fetch all variant quantities
  const { data: variants } = await supabase
    .from("item_variants")
    .select("*");

  const variantsByItem = new Map<string, ItemVariant[]>();
  for (const v of (variants ?? []) as ItemVariant[]) {
    const existing = variantsByItem.get(v.item_id) ?? [];
    existing.push(v);
    variantsByItem.set(v.item_id, existing);
  }

  // Enrich items
  const enriched: InventoryItem[] = (items as RawItem[]).map((item) => {
    const isVariant = VARIANT_CATEGORIES.includes(item.category as ItemCategory);
    const itemVariants = variantsByItem.get(item.id) ?? [];

    let quantityOnHand: number;
    if (isVariant) {
      quantityOnHand = itemVariants.reduce((sum: number, v: ItemVariant) => sum + Number(v.quantity), 0);
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

    const effectiveLeadDays = item.lead_time_days ?? item.vendor?.default_lead_days ?? null;

    return {
      ...item,
      vendor: item.vendor,
      quantity_on_hand: quantityOnHand,
      status,
      est_depletion_date: estDepletion,
      effective_lead_days: effectiveLeadDays,
      pending_orders_count: hasPendingOrder ? 1 : 0,
      last_count_date: lastCountByItem.get(item.id) ?? null,
      variants: isVariant ? itemVariants : undefined,
    };
  });

  return enriched;
}

export async function fetchItemDetail(itemId: string) {
  const supabase = createServerClient();

  const [itemResult, ordersResult, eventsResult, variantsResult] = await Promise.all([
    supabase.from("items").select("*, vendor:vendors(*)").eq("id", itemId).single(),
    supabase.from("orders").select("*").eq("item_id", itemId).order("order_date", { ascending: false }),
    supabase.from("stock_events").select("*").eq("item_id", itemId).order("created_at", { ascending: false }),
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

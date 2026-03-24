import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { UPDATE_COUNTS_CATEGORY_ORDER } from "@/lib/inventory/constants";
import type { ItemCategory } from "@/lib/inventory/constants";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  // Fetch non-archived items in the simple counting categories
  const { data: items, error: itemsError } = await supabase
    .from("items")
    .select("id, name, category")
    .eq("archived", false)
    .in("category", UPDATE_COUNTS_CATEGORY_ORDER);

  if (itemsError) {
    return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
  }
  if (!items || items.length === 0) {
    return NextResponse.json([]);
  }

  const itemIds = items.map((i: { id: string }) => i.id);

  // Fetch latest stock_event per item (quantity_on_hand)
  const { data: stockEvents } = await supabase
    .from("stock_events")
    .select("item_id, quantity_after, created_at")
    .in("item_id", itemIds)
    .is("variant_id", null)
    .order("created_at", { ascending: false });

  const latestStockByItem = new Map<string, number>();
  for (const event of (stockEvents ?? []) as { item_id: string; quantity_after: number; created_at: string }[]) {
    if (!latestStockByItem.has(event.item_id)) {
      latestStockByItem.set(event.item_id, event.quantity_after);
    }
  }

  // Fetch latest count_update event per item (last_count_date)
  const { data: countEvents } = await supabase
    .from("stock_events")
    .select("item_id, created_at")
    .in("item_id", itemIds)
    .eq("event_type", "count_update")
    .order("created_at", { ascending: false });

  const lastCountByItem = new Map<string, string>();
  for (const event of (countEvents ?? []) as { item_id: string; created_at: string }[]) {
    if (!lastCountByItem.has(event.item_id)) {
      lastCountByItem.set(event.item_id, event.created_at);
    }
  }

  // Enrich items
  const enriched = items.map((item: { id: string; name: string; category: string }) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    quantity_on_hand: latestStockByItem.get(item.id) ?? 0,
    last_count_date: lastCountByItem.get(item.id) ?? null,
  }));

  // Sort by category enum order then alphabetically within
  const categoryOrder = UPDATE_COUNTS_CATEGORY_ORDER as readonly ItemCategory[];
  enriched.sort((a: { category: string; name: string }, b: { category: string; name: string }) => {
    const aIdx = categoryOrder.indexOf(a.category as ItemCategory);
    const bIdx = categoryOrder.indexOf(b.category as ItemCategory);
    if (aIdx !== bIdx) return aIdx - bIdx;
    return a.name.localeCompare(b.name);
  });

  return NextResponse.json(enriched);
}

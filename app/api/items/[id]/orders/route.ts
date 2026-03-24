import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { VARIANT_CATEGORIES } from "@/lib/inventory/constants";
import type { ItemCategory } from "@/lib/inventory/constants";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const itemId = params.id;

  let body: {
    ordered_by: string;
    quantity_ordered: number;
    est_receive_date: string;
    note?: string | null;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.ordered_by || !body.quantity_ordered || !body.est_receive_date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Fetch item to determine if variant or simple
  const { data: item, error: itemError } = await supabase
    .from("items")
    .select("id, category")
    .eq("id", itemId)
    .single();

  if (itemError || !item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const isVariant = VARIANT_CATEGORIES.includes(item.category as ItemCategory);

  let currentQty = 0;

  if (isVariant) {
    // Sum variant quantities
    const { data: variants } = await supabase
      .from("item_variants")
      .select("quantity")
      .eq("item_id", itemId);

    currentQty = (variants ?? []).reduce(
      (sum: number, v: { quantity: number }) => sum + Number(v.quantity),
      0
    );
  } else {
    // Latest stock_event where variant_id IS NULL
    const { data: events } = await supabase
      .from("stock_events")
      .select("quantity_after")
      .eq("item_id", itemId)
      .is("variant_id", null)
      .order("created_at", { ascending: false })
      .limit(1);

    currentQty = events && events.length > 0 ? Number(events[0].quantity_after) : 0;
  }

  const today = new Date().toISOString().split("T")[0];

  // Insert order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      item_id: itemId,
      ordered_by: body.ordered_by,
      order_date: today,
      quantity_ordered: body.quantity_ordered,
      est_receive_date: body.est_receive_date,
      status: "pending",
    })
    .select()
    .single();

  if (orderError) {
    console.error("Failed to create order:", orderError);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }

  // Write stock event (no quantity change — ordered event)
  const { error: eventError } = await supabase.from("stock_events").insert({
    item_id: itemId,
    variant_id: null,
    event_type: "ordered",
    quantity_before: currentQty,
    quantity_after: currentQty,
    note: body.note ?? null,
    performed_by: body.ordered_by,
  });

  if (eventError) {
    console.error("Failed to create stock event:", eventError);
    // Non-fatal — order was created
  }

  return NextResponse.json(order, { status: 201 });
}

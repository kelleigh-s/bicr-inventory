import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

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
    order_id: string;
    quantity_received: number;
    received_date: string;
    performed_by?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.order_id || !body.quantity_received || !body.received_date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = createServerClient();
  const performedBy = body.performed_by ?? "team";

  // Update order status
  const { error: orderError } = await supabase
    .from("orders")
    .update({
      status: "received",
      received_date: body.received_date,
      quantity_received: body.quantity_received,
    })
    .eq("id", body.order_id)
    .eq("item_id", itemId);

  if (orderError) {
    console.error("Failed to update order:", orderError);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }

  // Get current on-hand from latest stock_event (variant_id IS NULL)
  const { data: events } = await supabase
    .from("stock_events")
    .select("quantity_after")
    .eq("item_id", itemId)
    .is("variant_id", null)
    .order("created_at", { ascending: false })
    .limit(1);

  const currentQty =
    events && events.length > 0 ? Number(events[0].quantity_after) : 0;
  const newQty = currentQty + body.quantity_received;

  // Write stock event
  const { error: eventError } = await supabase.from("stock_events").insert({
    item_id: itemId,
    variant_id: null,
    event_type: "received",
    quantity_before: currentQty,
    quantity_after: newQty,
    note: null,
    performed_by: performedBy,
  });

  if (eventError) {
    console.error("Failed to write stock event:", eventError);
    return NextResponse.json({ error: "Failed to write stock event" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

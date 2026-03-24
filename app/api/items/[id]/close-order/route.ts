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
    note?: string | null;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.order_id) {
    return NextResponse.json({ error: "order_id is required" }, { status: 400 });
  }

  const supabase = createServerClient();
  const today = new Date().toISOString().split("T")[0];

  // Update order status to received, set received_date to today
  // Does NOT touch stock_events or variant quantities
  const { error: orderError } = await supabase
    .from("orders")
    .update({
      status: "received",
      received_date: today,
    })
    .eq("id", body.order_id)
    .eq("item_id", itemId);

  if (orderError) {
    console.error("Failed to close order:", orderError);
    return NextResponse.json({ error: "Failed to close order" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

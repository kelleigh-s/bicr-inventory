import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

interface SubmitCountBody {
  item_id: string;
  new_count: number;
  note?: string;
  performed_by: string;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: SubmitCountBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { item_id, new_count, note, performed_by } = body;

  if (!item_id || new_count === undefined || new_count === null || !performed_by) {
    return NextResponse.json(
      { error: "item_id, new_count, and performed_by are required" },
      { status: 400 }
    );
  }

  if (new_count < 0) {
    return NextResponse.json({ error: "new_count must be >= 0" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Get current quantity from latest stock_event where variant_id IS NULL
  const { data: latestEvent } = await supabase
    .from("stock_events")
    .select("quantity_after")
    .eq("item_id", item_id)
    .is("variant_id", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const quantityBefore = latestEvent ? Number(latestEvent.quantity_after) : 0;

  // Write count_update stock event
  const { error: insertError } = await supabase.from("stock_events").insert({
    item_id,
    variant_id: null,
    event_type: "count_update",
    quantity_before: quantityBefore,
    quantity_after: new_count,
    note: note ?? null,
    performed_by,
  });

  if (insertError) {
    console.error("Failed to submit count:", insertError);
    return NextResponse.json({ error: "Failed to submit count" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

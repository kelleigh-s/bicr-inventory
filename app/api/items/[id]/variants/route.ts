import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

interface PatchVariantBody {
  variant_id: string;
  new_quantity: number;
  performed_by: string;
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PatchVariantBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { variant_id, new_quantity, performed_by } = body;

  if (!variant_id || new_quantity === undefined || new_quantity === null || !performed_by) {
    return NextResponse.json(
      { error: "variant_id, new_quantity, and performed_by are required" },
      { status: 400 }
    );
  }

  if (new_quantity < 0) {
    return NextResponse.json({ error: "new_quantity must be >= 0" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Get current variant quantity
  const { data: variant, error: fetchError } = await supabase
    .from("item_variants")
    .select("quantity, item_id")
    .eq("id", variant_id)
    .eq("item_id", params.id)
    .single();

  if (fetchError || !variant) {
    return NextResponse.json({ error: "Variant not found" }, { status: 404 });
  }

  const quantityBefore = Number(variant.quantity);

  // Update variant quantity
  const { error: updateError } = await supabase
    .from("item_variants")
    .update({ quantity: new_quantity })
    .eq("id", variant_id);

  if (updateError) {
    console.error("Failed to update variant:", updateError);
    return NextResponse.json({ error: "Failed to update variant" }, { status: 500 });
  }

  // Write audit stock_event with variant_id set
  const { error: eventError } = await supabase.from("stock_events").insert({
    item_id: params.id,
    variant_id,
    event_type: "count_update",
    quantity_before: quantityBefore,
    quantity_after: new_quantity,
    note: null,
    performed_by,
  });

  if (eventError) {
    console.error("Failed to write stock event for variant:", eventError);
    // Non-fatal — quantity already updated
  }

  return NextResponse.json({ success: true });
}

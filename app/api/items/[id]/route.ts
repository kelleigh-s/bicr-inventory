import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchItemDetail } from "@/lib/inventory/queries";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await fetchItemDetail(params.id);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch item detail:", error);
    return NextResponse.json({ error: "Failed to fetch item detail" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const supabase = createServerClient();

    const { data: item, error } = await supabase
      .from("items")
      .update({
        name: body.name,
        vendor_id: body.vendor_id ?? null,
        unit_label: body.unit_label ?? null,
        units_per_package: body.units_per_package ?? null,
        burn_rate: body.burn_rate ?? null,
        burn_rate_period: body.burn_rate_period ?? null,
        reorder_point: body.reorder_point ?? null,
        lead_time_days: body.lead_time_days ?? null,
        assigned_to: body.assigned_to ?? null,
        reorder_action_type: body.reorder_action_type ?? "none",
        reorder_action_value: body.reorder_action_value ?? null,
        notes: body.notes ?? null,
      })
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("Failed to update item:", error);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}

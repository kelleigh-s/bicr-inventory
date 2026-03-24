import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchInventoryItems } from "@/lib/inventory/queries";
import { createServerClient } from "@/lib/supabase/server";
import { VARIANT_CATEGORIES, VARIANT_SIZES, VARIANT_LOCATIONS } from "@/lib/inventory/constants";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await fetchInventoryItems();
    return NextResponse.json(items);
  } catch (error) {
    console.error("Failed to fetch items:", error);
    return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const supabase = createServerClient();

    const { data: item, error } = await supabase
      .from("items")
      .insert({
        name: body.name,
        category: body.category,
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
        archived: false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Auto-create variants for variant categories
    if (VARIANT_CATEGORIES.includes(body.category)) {
      const variantRows = [];
      for (const size of VARIANT_SIZES) {
        for (const location of VARIANT_LOCATIONS) {
          variantRows.push({
            item_id: item.id,
            variant_key: `${size} / ${location}`,
            quantity: 0,
          });
        }
      }
      const { error: variantError } = await supabase
        .from("item_variants")
        .insert(variantRows);
      if (variantError) {
        console.error("Failed to create variants:", variantError);
      }
    }

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Failed to create item:", error);
    return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
  }
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const slackWebhookUrl = Deno.env.get("SLACK_WEBHOOK_URL")!;

const VARIANT_CATS = ["Clothing", "Merch"];

Deno.serve(async () => {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Fetch non-archived items with reorder_point set
  const { data: items } = await supabase
    .from("items")
    .select("id, name, category, reorder_point, assigned_to")
    .eq("archived", false)
    .not("reorder_point", "is", null);

  if (!items || items.length === 0) {
    return new Response("No items with reorder points configured.");
  }

  // Fetch pending orders
  const { data: pendingOrders } = await supabase
    .from("orders")
    .select("item_id")
    .eq("status", "pending");

  const pendingSet = new Set((pendingOrders ?? []).map((o) => o.item_id));

  // Fetch latest stock events for simple item quantity (filter variant_id is null)
  const { data: events } = await supabase
    .from("stock_events")
    .select("item_id, variant_id, quantity_after")
    .is("variant_id", null)
    .order("created_at", { ascending: false });

  const latestQty = new Map<string, number>();
  for (const e of events ?? []) {
    if (!latestQty.has(e.item_id)) latestQty.set(e.item_id, Number(e.quantity_after));
  }

  // Fetch variant quantities
  const { data: variants } = await supabase.from("item_variants").select("item_id, quantity");
  const variantTotals = new Map<string, number>();
  for (const v of variants ?? []) {
    variantTotals.set(v.item_id, (variantTotals.get(v.item_id) ?? 0) + Number(v.quantity));
  }

  // Determine items needing reorder
  const reorderItems: { name: string; onHand: number; reorderPoint: number; assignedTo: string }[] = [];

  for (const item of items) {
    // Skip if pending order exists
    if (pendingSet.has(item.id)) continue;

    // Use variant totals for variant categories, stock events for simple items
    const qty = VARIANT_CATS.includes(item.category)
      ? (variantTotals.get(item.id) ?? 0)
      : (latestQty.get(item.id) ?? 0);

    if (qty <= Number(item.reorder_point)) {
      reorderItems.push({
        name: item.name,
        onHand: qty,
        reorderPoint: Number(item.reorder_point),
        assignedTo: item.assigned_to ?? "Unassigned",
      });
    }
  }

  if (reorderItems.length === 0) {
    return new Response("No items need reorder.");
  }

  // Build Slack message
  const lines = reorderItems.map(
    (item) => `• *${item.name}* — ${item.onHand} on hand (reorder at ${item.reorderPoint}) — Assigned: ${item.assignedTo}`
  );

  const message = {
    text: `🔴 *Inventory Alert: ${reorderItems.length} item${reorderItems.length > 1 ? "s" : ""} need reorder*\n\n${lines.join("\n")}`,
  };

  // Post to Slack
  const slackRes = await fetch(slackWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });

  if (!slackRes.ok) {
    console.error("Slack webhook failed:", await slackRes.text());
    return new Response("Failed to post to Slack", { status: 500 });
  }

  return new Response(`Posted alert for ${reorderItems.length} items.`);
});

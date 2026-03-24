"use client";

import { format } from "date-fns";
import type { Order } from "@/lib/supabase/types";

interface Props {
  orders: Order[];
}

export default function OrdersList({ orders }: Props) {
  const pending = orders.filter((o) => o.status === "pending");

  if (pending.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic">No pending orders.</p>
    );
  }

  return (
    <ul className="space-y-3">
      {pending.map((order) => (
        <li key={order.id} className="text-sm border border-yellow-200 rounded-md bg-yellow-50 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-gray-800">
              Qty: {order.quantity_ordered}
            </span>
            <span className="text-xs text-gray-500">
              Ordered {format(new Date(order.order_date + "T00:00:00"), "MMM d, yyyy")}
            </span>
          </div>
          <div className="text-gray-500 mt-0.5">
            Est. arrival:{" "}
            {order.est_receive_date
              ? format(new Date(order.est_receive_date + "T00:00:00"), "MMM d, yyyy")
              : "—"}
            {" "}&middot; by {order.ordered_by}
          </div>
        </li>
      ))}
    </ul>
  );
}

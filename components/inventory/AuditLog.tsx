"use client";

import { format } from "date-fns";
import type { StockEvent } from "@/lib/supabase/types";

const EVENT_LABELS: Record<StockEvent["event_type"], string> = {
  count_update: "Count updated",
  ordered: "Marked as ordered",
  received: "Received",
  edited: "Edited",
};

interface Props {
  events: StockEvent[];
}

export default function AuditLog({ events }: Props) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic">No activity recorded yet.</p>
    );
  }

  return (
    <ul className="space-y-3">
      {events.map((event) => (
        <li key={event.id} className="text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-gray-800">
              {EVENT_LABELS[event.event_type]}
            </span>
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {format(new Date(event.created_at), "MMM d, yyyy h:mm a")}
            </span>
          </div>
          <div className="text-gray-500 mt-0.5">
            {event.quantity_before} → {event.quantity_after} &middot; by{" "}
            {event.performed_by}
          </div>
          {event.note && (
            <div className="text-gray-400 italic mt-0.5">{event.note}</div>
          )}
        </li>
      ))}
    </ul>
  );
}

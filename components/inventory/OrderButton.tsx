"use client";

import type { InventoryItem } from "@/lib/supabase/types";

interface OrderButtonProps {
  item: InventoryItem;
}

export default function OrderButton({ item }: OrderButtonProps) {
  const { reorder_action_type, reorder_action_value, name, vendor } = item;

  if (reorder_action_type === "url") {
    const url = reorder_action_value || vendor?.website || "#";
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md bg-bicr-teal text-white hover:bg-bicr-navy transition-colors"
      >
        Order
      </a>
    );
  }

  if (reorder_action_type === "email") {
    const email = reorder_action_value || vendor?.contact_email || "";
    const subject = encodeURIComponent(`Reorder: ${name}`);
    const gmailUrl = `https://mail.google.com/mail/?view=cm&to=${email}&su=${subject}`;
    return (
      <a
        href={gmailUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md bg-bicr-teal text-white hover:bg-bicr-navy transition-colors"
      >
        Email
      </a>
    );
  }

  // none
  return (
    <button
      disabled
      className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-400 cursor-not-allowed"
    >
      —
    </button>
  );
}

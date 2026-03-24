"use client";

import { useState } from "react";
import { format } from "date-fns";
import type { Order } from "@/lib/supabase/types";

interface Props {
  itemId: string;
  itemName: string;
  order: Order;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CloseOrderModal({
  itemId,
  itemName,
  order,
  onClose,
  onSuccess,
}: Props) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orderDateDisplay = format(
    new Date(order.order_date + "T00:00:00"),
    "MMM d, yyyy"
  );
  const estArrivalDisplay = order.est_receive_date
    ? format(new Date(order.est_receive_date + "T00:00:00"), "MMM d, yyyy")
    : "—";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/items/${itemId}/close-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: order.id,
          note: note.trim() || null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to close order");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-bicr-navy">
            Close Order
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <p className="text-sm text-gray-600">
            Closing the pending order for{" "}
            <span className="font-medium text-gray-800">{itemName}</span>.
          </p>

          {/* Order info */}
          <div className="bg-gray-50 rounded-md px-3 py-2 text-sm text-gray-600 space-y-1">
            <div>
              <span className="text-gray-400">Ordered:</span>{" "}
              {order.quantity_ordered} units on {orderDateDisplay}
            </div>
            <div>
              <span className="text-gray-400">Est. arrival:</span>{" "}
              {estArrivalDisplay}
            </div>
          </div>

          {/* Variant note */}
          <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2 text-sm text-blue-700">
            This item tracks stock by variant (size/location). Please update
            variant quantities manually in the variant matrix after closing this
            order.
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Note (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal resize-none"
              placeholder="Any relevant notes…"
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {submitting ? "Closing…" : "Close Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

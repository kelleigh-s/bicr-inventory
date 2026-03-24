"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import type { Order } from "@/lib/supabase/types";

interface Props {
  itemId: string;
  itemName: string;
  order: Order;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MarkAsReceivedModal({
  itemId,
  itemName,
  order,
  onClose,
  onSuccess,
}: Props) {
  const [quantityReceived, setQuantityReceived] = useState(
    order.quantity_ordered.toString()
  );
  const [receivedDate, setReceivedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [performedBy, setPerformedBy] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = typeof window !== "undefined"
      ? localStorage.getItem("bicr_user_name") ?? ""
      : "";
    setPerformedBy(saved);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!quantityReceived || isNaN(Number(quantityReceived)) || Number(quantityReceived) <= 0) {
      setError("Enter a valid quantity received.");
      return;
    }
    if (!receivedDate) {
      setError("Received date is required.");
      return;
    }

    setSubmitting(true);
    try {
      if (performedBy.trim()) {
        localStorage.setItem("bicr_user_name", performedBy.trim());
      }

      const res = await fetch(`/api/items/${itemId}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: order.id,
          quantity_received: Number(quantityReceived),
          received_date: receivedDate,
          performed_by: performedBy.trim() || "team",
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to mark as received");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  const orderDateDisplay = format(
    new Date(order.order_date + "T00:00:00"),
    "MMM d, yyyy"
  );
  const estArrivalDisplay = order.est_receive_date
    ? format(new Date(order.est_receive_date + "T00:00:00"), "MMM d, yyyy")
    : "—";

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-bicr-navy">
            Mark as Received
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
            Receiving stock for <span className="font-medium text-gray-800">{itemName}</span>.
          </p>

          {/* Order details */}
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

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Quantity received <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={quantityReceived}
              onChange={(e) => setQuantityReceived(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Received date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Received by
            </label>
            <input
              type="text"
              value={performedBy}
              onChange={(e) => setPerformedBy(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal"
              placeholder="Your name"
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
              className="px-4 py-2 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Confirm Receipt"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

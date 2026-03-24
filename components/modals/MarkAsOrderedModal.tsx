"use client";

import { useState, useEffect } from "react";

interface Props {
  itemId: string;
  itemName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MarkAsOrderedModal({
  itemId,
  itemName,
  onClose,
  onSuccess,
}: Props) {
  const [orderedBy, setOrderedBy] = useState("");
  const [quantityOrdered, setQuantityOrdered] = useState("");
  const [estReceiveDate, setEstReceiveDate] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill name from localStorage
  useEffect(() => {
    const saved = typeof window !== "undefined"
      ? localStorage.getItem("bicr_user_name") ?? ""
      : "";
    setOrderedBy(saved);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!orderedBy.trim()) {
      setError("Ordered by is required.");
      return;
    }
    if (!quantityOrdered || isNaN(Number(quantityOrdered)) || Number(quantityOrdered) <= 0) {
      setError("Enter a valid quantity.");
      return;
    }
    if (!estReceiveDate) {
      setError("Est. receive date is required.");
      return;
    }

    setSubmitting(true);
    try {
      // Save name for next time
      localStorage.setItem("bicr_user_name", orderedBy.trim());

      const res = await fetch(`/api/items/${itemId}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ordered_by: orderedBy.trim(),
          quantity_ordered: Number(quantityOrdered),
          est_receive_date: estReceiveDate,
          note: note.trim() || null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to create order");
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
            Mark as Ordered
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
            Recording an order for <span className="font-medium text-gray-800">{itemName}</span>.
          </p>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Ordered by <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={orderedBy}
              onChange={(e) => setOrderedBy(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal"
              placeholder="Your name"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Quantity to order <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={quantityOrdered}
              onChange={(e) => setQuantityOrdered(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal"
              placeholder="0"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Est. receive date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={estReceiveDate}
              onChange={(e) => setEstReceiveDate(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal"
              required
            />
          </div>

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
              className="px-4 py-2 text-sm font-medium rounded-md bg-bicr-teal text-white hover:bg-bicr-navy transition-colors disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

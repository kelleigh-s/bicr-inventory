"use client";

import { useEffect, useRef, useState } from "react";

interface CountItem {
  id: string;
  name: string;
  category: string;
  quantity_on_hand: number;
  last_count_date: string | null;
}

type Phase = "name" | "counting" | "done";

interface UpdateCountsFlowProps {
  onClose: () => void;
  onComplete: () => void;
}

function formatDate(iso: string | null): string {
  if (!iso) return "Never counted";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function UpdateCountsFlow({ onClose, onComplete }: UpdateCountsFlowProps) {
  const [phase, setPhase] = useState<Phase>("name");
  const [userName, setUserName] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("bicr_user_name") ?? "";
    }
    return "";
  });

  const [items, setItems] = useState<CountItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [newCount, setNewCount] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const countInputRef = useRef<HTMLInputElement>(null);

  // Focus count input when item changes
  useEffect(() => {
    if (phase === "counting") {
      setNewCount("");
      setNote("");
      setSubmitError(null);
      countInputRef.current?.focus();
    }
  }, [currentIndex, phase]);

  async function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = userName.trim();
    if (!trimmed) return;
    localStorage.setItem("bicr_user_name", trimmed);

    // Fetch items
    setLoadingItems(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/counts");
      if (!res.ok) throw new Error("Failed to load items");
      const data: CountItem[] = await res.json();
      setItems(data);
      setCurrentIndex(0);
      setPhase("counting");
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load items");
    } finally {
      setLoadingItems(false);
    }
  }

  async function handleSubmitCount() {
    const parsed = parseInt(newCount, 10);
    if (isNaN(parsed) || parsed < 0) {
      setSubmitError("Please enter a valid count (0 or more).");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/counts/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: items[currentIndex].id,
          new_count: parsed,
          note: note.trim() || undefined,
          performed_by: userName.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to submit count");
      advance();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSkip() {
    advance();
  }

  function advance() {
    if (currentIndex + 1 >= items.length) {
      setPhase("done");
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }

  function handleDone() {
    onComplete();
    onClose();
  }

  const currentItem = items[currentIndex] ?? null;
  const progress = items.length > 0 ? ((currentIndex) / items.length) * 100 : 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-bicr-navy">Update Counts</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              aria-label="Close"
            >
              &times;
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 px-6 py-6">
            {/* Phase: Name */}
            {phase === "name" && (
              <form onSubmit={handleNameSubmit} className="space-y-5">
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    Who is doing this count? This will be recorded with each entry.
                  </p>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    autoFocus
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="e.g. Kelleigh"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal"
                  />
                </div>
                {fetchError && (
                  <p className="text-sm text-red-500">{fetchError}</p>
                )}
                <button
                  type="submit"
                  disabled={!userName.trim() || loadingItems}
                  className="w-full px-4 py-2 text-sm font-medium rounded-md bg-bicr-teal text-white hover:bg-bicr-navy transition-colors disabled:opacity-50"
                >
                  {loadingItems ? "Loading items…" : "Start Counting"}
                </button>
              </form>
            )}

            {/* Phase: Counting */}
            {phase === "counting" && currentItem && (
              <div className="space-y-5">
                {/* Category + Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      {currentItem.category}
                    </span>
                    <span className="text-xs text-gray-500">
                      Item {currentIndex + 1} of {items.length}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-bicr-teal transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Item name */}
                <h3 className="text-xl font-bold text-bicr-navy">{currentItem.name}</h3>

                {/* Last count info box */}
                <div className="bg-gray-50 border border-gray-200 rounded-md px-4 py-3 text-sm text-gray-600 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Last count</span>
                    <span className="font-medium">{currentItem.quantity_on_hand}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Last counted</span>
                    <span className="font-medium">{formatDate(currentItem.last_count_date)}</span>
                  </div>
                </div>

                {/* New count input */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    New Count *
                  </label>
                  <input
                    ref={countInputRef}
                    type="number"
                    min={0}
                    value={newCount}
                    onChange={(e) => setNewCount(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSubmitCount();
                    }}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal"
                  />
                </div>

                {/* Note input */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Note (optional)
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Recount pending delivery"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal"
                  />
                </div>

                {submitError && (
                  <p className="text-sm text-red-500">{submitError}</p>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={handleSkip}
                    disabled={submitting}
                    className="flex-1 px-4 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Skip
                  </button>
                  <button
                    onClick={handleSubmitCount}
                    disabled={submitting || newCount === ""}
                    className="flex-1 px-4 py-2 text-sm font-medium rounded-md bg-bicr-teal text-white hover:bg-bicr-navy transition-colors disabled:opacity-50"
                  >
                    {submitting ? "Saving…" : "Submit"}
                  </button>
                </div>
              </div>
            )}

            {/* Phase: Done */}
            {phase === "done" && (
              <div className="text-center space-y-4 py-4">
                <div className="text-4xl">&#10003;</div>
                <h3 className="text-xl font-bold text-bicr-navy">Counts Complete</h3>
                <p className="text-sm text-gray-500">
                  All items have been counted. The inventory has been updated.
                </p>
                <button
                  onClick={handleDone}
                  className="w-full px-4 py-2 text-sm font-medium rounded-md bg-bicr-teal text-white hover:bg-bicr-navy transition-colors"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

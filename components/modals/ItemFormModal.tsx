"use client";

import { useState } from "react";
import type { Item, Vendor } from "@/lib/supabase/types";
import {
  ITEM_CATEGORIES,
  BURN_RATE_PERIODS,
  REORDER_ACTION_TYPES,
  type ItemCategory,
} from "@/lib/inventory/constants";

interface Props {
  item?: Item | null;
  vendors: Vendor[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function ItemFormModal({ item, vendors, onClose, onSuccess }: Props) {
  const isEdit = !!item;

  const [name, setName] = useState(item?.name ?? "");
  const [category, setCategory] = useState<ItemCategory>(item?.category ?? "bags");
  const [vendorId, setVendorId] = useState(item?.vendor_id ?? "");
  const [unitLabel, setUnitLabel] = useState(item?.unit_label ?? "");
  const [unitsPerPackage, setUnitsPerPackage] = useState(
    item?.units_per_package?.toString() ?? ""
  );
  const [burnRate, setBurnRate] = useState(item?.burn_rate?.toString() ?? "");
  const [burnRatePeriod, setBurnRatePeriod] = useState(item?.burn_rate_period ?? "");
  const [reorderPoint, setReorderPoint] = useState(item?.reorder_point?.toString() ?? "");
  const [leadTimeDays, setLeadTimeDays] = useState(item?.lead_time_days?.toString() ?? "");
  const [assignedTo, setAssignedTo] = useState(item?.assigned_to ?? "");
  const [reorderActionType, setReorderActionType] = useState<string>(
    item?.reorder_action_type ?? "none"
  );
  const [reorderActionValue, setReorderActionValue] = useState(
    item?.reorder_action_value ?? ""
  );
  const [notes, setNotes] = useState(item?.notes ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    if (burnRate && !burnRatePeriod) {
      setError("Burn rate period is required when burn rate is set.");
      return;
    }

    const body = {
      name: name.trim(),
      category,
      vendor_id: vendorId || null,
      unit_label: unitLabel.trim() || null,
      units_per_package: unitsPerPackage ? Number(unitsPerPackage) : null,
      burn_rate: burnRate ? Number(burnRate) : null,
      burn_rate_period: burnRatePeriod || null,
      reorder_point: reorderPoint ? Number(reorderPoint) : null,
      lead_time_days: leadTimeDays ? Number(leadTimeDays) : null,
      assigned_to: assignedTo.trim() || null,
      reorder_action_type: reorderActionType,
      reorder_action_value:
        reorderActionType === "none" ? null : reorderActionValue.trim() || null,
      notes: notes.trim() || null,
    };

    setSubmitting(true);
    try {
      const url = isEdit ? `/api/items/${item!.id}` : "/api/items";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save item");
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
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-bicr-navy">
            {isEdit ? "Edit Item" : "Add Item"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Scrollable form body */}
        <form
          onSubmit={handleSubmit}
          className="overflow-y-auto flex-1 px-5 py-4 space-y-4"
        >
          {error && <p className="text-sm text-red-500">{error}</p>}

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal"
              placeholder="Item name"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ItemCategory)}
              disabled={isEdit}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal disabled:bg-gray-100 disabled:text-gray-500"
            >
              {ITEM_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {isEdit && (
              <p className="text-xs text-gray-400 mt-1">
                Category cannot be changed after creation.
              </p>
            )}
          </div>

          {/* Vendor */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Vendor</label>
            <select
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal"
            >
              <option value="">— None —</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          {/* Unit label + Units per package */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Unit Label
              </label>
              <input
                type="text"
                value={unitLabel}
                onChange={(e) => setUnitLabel(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal"
                placeholder="e.g. bag, box"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Units per Package
              </label>
              <input
                type="number"
                min="0"
                value={unitsPerPackage}
                onChange={(e) => setUnitsPerPackage(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal"
                placeholder="0"
              />
            </div>
          </div>

          {/* Burn rate + period */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Burn Rate
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={burnRate}
                onChange={(e) => setBurnRate(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Burn Rate Period
              </label>
              <select
                value={burnRatePeriod}
                onChange={(e) => setBurnRatePeriod(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal"
              >
                <option value="">— None —</option>
                {BURN_RATE_PERIODS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reorder point + Lead time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Reorder Point
              </label>
              <input
                type="number"
                min="0"
                value={reorderPoint}
                onChange={(e) => setReorderPoint(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Lead Time (days)
              </label>
              <input
                type="number"
                min="0"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal"
                placeholder="0"
              />
            </div>
          </div>

          {/* Assigned to */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Assigned To
            </label>
            <input
              type="text"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal"
              placeholder="Team member name"
            />
          </div>

          {/* Reorder action type + value */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Reorder Action
            </label>
            <select
              value={reorderActionType}
              onChange={(e) => setReorderActionType(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal mb-2"
            >
              {REORDER_ACTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={reorderActionValue}
              onChange={(e) => setReorderActionValue(e.target.value)}
              disabled={reorderActionType === "none"}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal disabled:bg-gray-100 disabled:text-gray-400"
              placeholder={
                reorderActionType === "url"
                  ? "https://..."
                  : reorderActionType === "email"
                  ? "vendor@example.com"
                  : "N/A"
              }
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal resize-none"
              placeholder="Any relevant notes…"
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2 pb-1">
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
              {submitting ? "Saving…" : isEdit ? "Save Changes" : "Add Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

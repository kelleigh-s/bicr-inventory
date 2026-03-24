"use client";

import { useState } from "react";
import type { ItemVariant } from "@/lib/supabase/types";
import { VARIANT_SIZES, VARIANT_LOCATIONS } from "@/lib/inventory/constants";

interface VariantMatrixProps {
  itemId: string;
  variants: ItemVariant[];
  onUpdate: () => void;
}

type EditingCell = {
  variantId: string;
  value: string;
} | null;

function buildVariantKey(size: string, location: string): string {
  return `${size} / ${location}`;
}

function findVariant(
  variants: ItemVariant[],
  size: string,
  location: string
): ItemVariant | undefined {
  const key = buildVariantKey(size, location);
  return variants.find((v) => v.variant_key === key);
}

export default function VariantMatrix({
  itemId,
  variants,
  onUpdate,
}: VariantMatrixProps) {
  const [editing, setEditing] = useState<EditingCell>(null);
  const [saving, setSaving] = useState<string | null>(null); // variantId being saved
  const [saveError, setSaveError] = useState<string | null>(null);

  function getPerformedBy(): string {
    if (typeof window !== "undefined") {
      return localStorage.getItem("bicr_user_name") ?? "Unknown";
    }
    return "Unknown";
  }

  function startEdit(variant: ItemVariant) {
    setEditing({ variantId: variant.id, value: String(variant.quantity) });
    setSaveError(null);
  }

  function cancelEdit() {
    setEditing(null);
    setSaveError(null);
  }

  async function commitEdit(variant: ItemVariant) {
    if (!editing) return;
    const parsed = parseInt(editing.value, 10);
    if (isNaN(parsed) || parsed < 0) {
      setSaveError("Enter a valid quantity (0 or more).");
      return;
    }
    if (parsed === Number(variant.quantity)) {
      // No change — just close
      setEditing(null);
      return;
    }

    setSaving(variant.id);
    setSaveError(null);
    try {
      const res = await fetch(`/api/items/${itemId}/variants`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variant_id: variant.id,
          new_quantity: parsed,
          performed_by: getPerformedBy(),
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setEditing(null);
      onUpdate();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="overflow-x-auto">
      {saveError && (
        <p className="text-xs text-red-500 mb-2">{saveError}</p>
      )}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-1.5 pr-3 w-16">
              Size
            </th>
            {VARIANT_LOCATIONS.map((loc) => (
              <th
                key={loc}
                className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wide py-1.5 px-2"
              >
                {loc}
              </th>
            ))}
            <th className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wide py-1.5 px-2">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {VARIANT_SIZES.map((size) => {
            const rowVariants = VARIANT_LOCATIONS.map((loc) =>
              findVariant(variants, size, loc)
            );
            const rowTotal = rowVariants.reduce(
              (sum, v) => sum + (v ? Number(v.quantity) : 0),
              0
            );

            return (
              <tr key={size} className="border-t border-gray-100">
                <td className="py-1.5 pr-3 font-medium text-bicr-navy">{size}</td>
                {rowVariants.map((variant, locIdx) => {
                  const location = VARIANT_LOCATIONS[locIdx];
                  const isEditing =
                    editing !== null && variant !== undefined && editing.variantId === variant.id;
                  const isSaving = variant !== undefined && saving === variant.id;

                  return (
                    <td
                      key={location}
                      className="py-1.5 px-2 text-center"
                    >
                      {!variant ? (
                        <span className="text-gray-300">—</span>
                      ) : isEditing ? (
                        <input
                          type="number"
                          min={0}
                          value={editing.value}
                          autoFocus
                          onChange={(e) =>
                            setEditing({ ...editing, value: e.target.value })
                          }
                          onBlur={() => commitEdit(variant)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              commitEdit(variant);
                            } else if (e.key === "Escape") {
                              cancelEdit();
                            }
                          }}
                          className="w-16 text-center px-1 py-0.5 border border-bicr-teal rounded text-sm focus:outline-none focus:ring-1 focus:ring-bicr-teal"
                        />
                      ) : (
                        <button
                          onClick={() => startEdit(variant)}
                          disabled={isSaving}
                          title="Click to edit"
                          className="px-2 py-0.5 rounded hover:bg-bicr-lightblue hover:text-bicr-navy transition-colors cursor-pointer disabled:opacity-50 font-medium text-gray-700"
                        >
                          {isSaving ? "…" : Number(variant.quantity)}
                        </button>
                      )}
                    </td>
                  );
                })}
                <td className="py-1.5 px-2 text-center font-semibold text-bicr-navy">
                  {rowTotal}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-xs text-gray-400 mt-2">Click any cell to edit. Press Enter or click away to save. Press Escape to cancel.</p>
    </div>
  );
}

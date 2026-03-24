"use client";

import { ITEM_CATEGORIES } from "@/lib/inventory/constants";
import type { Vendor } from "@/lib/supabase/types";

const STATUSES = ["Reorder Now", "On Order", "OK"] as const;

interface InventoryFiltersProps {
  vendors: Vendor[];
  categoryFilter: string;
  statusFilter: string;
  vendorFilter: string;
  searchQuery: string;
  onCategoryChange: (val: string) => void;
  onStatusChange: (val: string) => void;
  onVendorChange: (val: string) => void;
  onSearchChange: (val: string) => void;
}

export default function InventoryFilters({
  vendors,
  categoryFilter,
  statusFilter,
  vendorFilter,
  searchQuery,
  onCategoryChange,
  onStatusChange,
  onVendorChange,
  onSearchChange,
}: InventoryFiltersProps) {
  const selectClass =
    "block rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-bicr-teal focus:outline-none focus:ring-1 focus:ring-bicr-teal";

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Text search */}
      <input
        type="text"
        placeholder="Search items…"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="block rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-bicr-teal focus:outline-none focus:ring-1 focus:ring-bicr-teal w-48"
      />

      {/* Category */}
      <select
        value={categoryFilter}
        onChange={(e) => onCategoryChange(e.target.value)}
        className={selectClass}
      >
        <option value="">All Categories</option>
        {ITEM_CATEGORIES.map((cat) => (
          <option key={cat} value={cat} className="capitalize">
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </option>
        ))}
      </select>

      {/* Status */}
      <select
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value)}
        className={selectClass}
      >
        <option value="">All Statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      {/* Vendor */}
      <select
        value={vendorFilter}
        onChange={(e) => onVendorChange(e.target.value)}
        className={selectClass}
      >
        <option value="">All Vendors</option>
        {vendors.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}
          </option>
        ))}
      </select>

      {/* Clear filters */}
      {(categoryFilter || statusFilter || vendorFilter || searchQuery) && (
        <button
          onClick={() => {
            onCategoryChange("");
            onStatusChange("");
            onVendorChange("");
            onSearchChange("");
          }}
          className="text-sm text-gray-500 hover:text-bicr-navy underline transition-colors"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

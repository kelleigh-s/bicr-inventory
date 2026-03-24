"use client";

import { useEffect, useState, useMemo } from "react";
import NavBar from "@/components/nav/NavBar";
import InventoryTable from "@/components/inventory/InventoryTable";
import InventoryFilters from "@/components/inventory/InventoryFilters";
import AlertBanner from "@/components/inventory/AlertBanner";
import type { InventoryItem, Vendor } from "@/lib/supabase/types";

// TODO: Task 12 — import DetailPanel once created
// import DetailPanel from "@/components/inventory/DetailPanel";

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Detail panel state — TODO: Task 12 will use this
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Fetch data on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const [itemsRes, vendorsRes] = await Promise.all([
          fetch("/api/items"),
          fetch("/api/vendors"),
        ]);

        if (!itemsRes.ok) throw new Error("Failed to fetch items");
        if (!vendorsRes.ok) throw new Error("Failed to fetch vendors");

        const [itemsData, vendorsData] = await Promise.all([
          itemsRes.json(),
          vendorsRes.json(),
        ]);

        setItems(itemsData);
        setVendors(vendorsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Reorder count from unfiltered items
  const reorderCount = useMemo(
    () => items.filter((i) => i.status === "Reorder Now").length,
    [items]
  );

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (categoryFilter && item.category !== categoryFilter) return false;
      if (statusFilter && item.status !== statusFilter) return false;
      if (vendorFilter && item.vendor_id !== vendorFilter) return false;
      if (
        searchQuery &&
        !item.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      return true;
    });
  }, [items, categoryFilter, statusFilter, vendorFilter, searchQuery]);

  function handleShowReorderItems() {
    setStatusFilter("Reorder Now");
    setCategoryFilter("");
    setVendorFilter("");
    setSearchQuery("");
  }

  function handleRowClick(item: InventoryItem) {
    setSelectedItem(item);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar reorderCount={reorderCount} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-bicr-navy">Inventory</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {loading ? "Loading…" : `${items.length} items`}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => {
                /* TODO: Task 16 — open Update Counts modal */
              }}
            >
              Update Counts
            </button>
            <button
              className="px-4 py-2 text-sm font-medium rounded-md bg-bicr-teal text-white hover:bg-bicr-navy transition-colors"
              onClick={() => {
                /* TODO: Task 18 — open Add Item modal */
              }}
            >
              + Add Item
            </button>
          </div>
        </div>

        {/* Alert banner */}
        <AlertBanner
          reorderCount={reorderCount}
          onShowReorderItems={handleShowReorderItems}
        />

        {/* Filters */}
        <div className="mb-4">
          <InventoryFilters
            vendors={vendors}
            categoryFilter={categoryFilter}
            statusFilter={statusFilter}
            vendorFilter={vendorFilter}
            searchQuery={searchQuery}
            onCategoryChange={setCategoryFilter}
            onStatusChange={setStatusFilter}
            onVendorChange={setVendorFilter}
            onSearchChange={setSearchQuery}
          />
        </div>

        {/* Table or states */}
        {error ? (
          <div className="text-center py-16 text-red-500">{error}</div>
        ) : loading ? (
          <div className="text-center py-16 text-gray-400">Loading inventory…</div>
        ) : (
          <InventoryTable items={filteredItems} onRowClick={handleRowClick} />
        )}

        {/* TODO: Task 12 — render DetailPanel once created */}
        {/* {selectedItem && (
          <DetailPanel
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
          />
        )} */}
      </main>
    </div>
  );
}

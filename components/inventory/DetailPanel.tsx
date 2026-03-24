"use client";

import { useEffect, useState } from "react";
import type { Vendor, Order, StockEvent, ItemVariant } from "@/lib/supabase/types";
import type { Item } from "@/lib/supabase/types";
import { VARIANT_CATEGORIES } from "@/lib/inventory/constants";
import type { ItemCategory } from "@/lib/inventory/constants";
import AuditLog from "./AuditLog";
import OrdersList from "./OrdersList";
import VariantMatrix from "./VariantMatrix";

// Lazy imports for modals (imported by parent after creation — passed as props for now)
// Modals are wired via state lifted here
import MarkAsOrderedModal from "@/components/modals/MarkAsOrderedModal";
import MarkAsReceivedModal from "@/components/modals/MarkAsReceivedModal";
import CloseOrderModal from "@/components/modals/CloseOrderModal";

interface DetailPanelProps {
  itemId: string;
  vendors: Vendor[];
  onClose: () => void;
  onDataChange: () => void;
}

interface ItemDetail {
  item: Item & { vendor?: Vendor | null };
  orders: Order[];
  events: StockEvent[];
  variants: ItemVariant[];
}

const STATUS_BADGE: Record<string, string> = {
  "Reorder Now": "bg-red-100 text-red-700 border border-red-200",
  "On Order": "bg-yellow-100 text-yellow-700 border border-yellow-200",
  OK: "bg-green-100 text-green-700 border border-green-200",
};

const CATEGORY_BADGE =
  "inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-bicr-lightblue text-bicr-navy capitalize";

export default function DetailPanel({
  itemId,
  vendors: _vendors, // eslint-disable-line @typescript-eslint/no-unused-vars
  onClose,
  onDataChange,
}: DetailPanelProps) {
  const [detail, setDetail] = useState<ItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showOrderedModal, setShowOrderedModal] = useState(false);
  const [showReceivedModal, setShowReceivedModal] = useState(false);
  const [showCloseOrderModal, setShowCloseOrderModal] = useState(false);

  async function loadDetail() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/items/${itemId}`);
      if (!res.ok) throw new Error("Failed to load item");
      const data: ItemDetail = await res.json();
      setDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  // Derived values
  const item = detail?.item ?? null;
  const orders = detail?.orders ?? [];
  const events = detail?.events ?? [];
  const variants = detail?.variants ?? [];

  const isVariant = item
    ? VARIANT_CATEGORIES.includes(item.category as ItemCategory)
    : false;

  const hasPendingOrder = orders.some((o) => o.status === "pending");

  const quantityOnHand = isVariant
    ? variants.reduce((sum, v) => sum + Number(v.quantity), 0)
    : Number(events[0]?.quantity_after ?? 0);

  const currentStatus = hasPendingOrder
    ? "On Order"
    : item?.reorder_point !== null &&
      item?.reorder_point !== undefined &&
      quantityOnHand <= Number(item.reorder_point)
    ? "Reorder Now"
    : "OK";

  // Oldest pending order for received/close flows
  const oldestPending = orders
    .filter((o) => o.status === "pending")
    .sort((a, b) => a.order_date.localeCompare(b.order_date))[0];

  function handleModalSuccess() {
    setShowOrderedModal(false);
    setShowReceivedModal(false);
    setShowCloseOrderModal(false);
    loadDetail();
    onDataChange();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-bicr-navy truncate">
            {loading ? "Loading…" : item?.name ?? "Item Detail"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-4 flex-shrink-0"
            aria-label="Close panel"
          >
            &times;
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          {!loading && item && (
            <>
              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={CATEGORY_BADGE}>{item.category}</span>
                <span
                  className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border whitespace-nowrap ${STATUS_BADGE[currentStatus]}`}
                >
                  {currentStatus}
                </span>
              </div>

              {/* Vendor */}
              {item.vendor && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Vendor
                  </h3>
                  <p className="text-sm text-gray-800 font-medium">{item.vendor.name}</p>
                  {item.vendor.contact_email && (
                    <a
                      href={`mailto:${item.vendor.contact_email}`}
                      className="text-sm text-bicr-teal hover:underline"
                    >
                      {item.vendor.contact_email}
                    </a>
                  )}
                </div>
              )}

              {/* Config grid */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Configuration
                </h3>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <ConfigField label="Unit" value={item.unit_label} />
                  <ConfigField
                    label="Per Package"
                    value={item.units_per_package?.toString()}
                  />
                  <ConfigField
                    label="Burn Rate"
                    value={
                      item.burn_rate != null && item.burn_rate_period
                        ? `${item.burn_rate}/${item.burn_rate_period}`
                        : null
                    }
                  />
                  <ConfigField
                    label="Reorder Point"
                    value={item.reorder_point?.toString()}
                  />
                  <ConfigField
                    label="Lead Time"
                    value={
                      item.lead_time_days != null
                        ? `${item.lead_time_days}d`
                        : null
                    }
                  />
                  <ConfigField label="Assigned To" value={item.assigned_to} />
                </dl>
              </div>

              {/* Notes */}
              {item.notes && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Notes
                  </h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.notes}</p>
                </div>
              )}

              {/* Action buttons */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Actions
                </h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setShowOrderedModal(true)}
                    className="px-3 py-1.5 text-sm font-medium rounded-md bg-bicr-teal text-white hover:bg-bicr-navy transition-colors"
                  >
                    Mark as Ordered
                  </button>

                  {!isVariant && hasPendingOrder && (
                    <button
                      onClick={() => setShowReceivedModal(true)}
                      className="px-3 py-1.5 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors"
                    >
                      Mark as Received
                    </button>
                  )}

                  {isVariant && hasPendingOrder && (
                    <button
                      onClick={() => setShowCloseOrderModal(true)}
                      className="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    >
                      Close Order
                    </button>
                  )}

                  <button
                    className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      /* TODO: Task 18 — Edit Item */
                    }}
                  >
                    Edit Item
                  </button>
                </div>
              </div>

              {/* Variant matrix */}
              {isVariant && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Variant Stock
                  </h3>
                  <VariantMatrix
                    itemId={item.id}
                    variants={variants}
                    onUpdate={loadDetail}
                  />
                </div>
              )}

              {/* Pending Orders */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Pending Orders
                </h3>
                <OrdersList orders={orders} />
              </div>

              {/* Activity Log */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Activity Log
                </h3>
                <AuditLog events={events} />
              </div>
            </>
          )}

          {loading && (
            <p className="text-sm text-gray-400">Loading item details…</p>
          )}
        </div>
      </div>

      {/* Modals */}
      {showOrderedModal && item && (
        <MarkAsOrderedModal
          itemId={item.id}
          itemName={item.name}
          onClose={() => setShowOrderedModal(false)}
          onSuccess={handleModalSuccess}
        />
      )}

      {showReceivedModal && item && oldestPending && (
        <MarkAsReceivedModal
          itemId={item.id}
          itemName={item.name}
          order={oldestPending}
          onClose={() => setShowReceivedModal(false)}
          onSuccess={handleModalSuccess}
        />
      )}

      {showCloseOrderModal && item && oldestPending && (
        <CloseOrderModal
          itemId={item.id}
          itemName={item.name}
          order={oldestPending}
          onClose={() => setShowCloseOrderModal(false)}
          onSuccess={handleModalSuccess}
        />
      )}
    </>
  );
}

function ConfigField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="text-gray-400 text-xs">{label}</dt>
      <dd className="text-gray-800 font-medium">{value ?? "—"}</dd>
    </div>
  );
}

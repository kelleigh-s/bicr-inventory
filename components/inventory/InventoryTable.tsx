"use client";

import { useState, useMemo } from "react";
import type { InventoryItem } from "@/lib/supabase/types";
import type { ItemStatus } from "@/lib/inventory/constants";
import OrderButton from "./OrderButton";

type SortKey =
  | "name"
  | "category"
  | "vendor"
  | "quantity_on_hand"
  | "burn_rate"
  | "reorder_point"
  | "est_depletion_date"
  | "lead_time_days"
  | "assigned_to"
  | "status";

type SortDir = "asc" | "desc";

const STATUS_ORDER: Record<ItemStatus, number> = {
  "Reorder Now": 0,
  "On Order": 1,
  OK: 2,
};

const STATUS_BADGE: Record<ItemStatus, string> = {
  "Reorder Now": "bg-red-100 text-red-700 border border-red-200",
  "On Order": "bg-yellow-100 text-yellow-700 border border-yellow-200",
  OK: "bg-green-100 text-green-700 border border-green-200",
};

interface Props {
  items: InventoryItem[];
  onRowClick: (item: InventoryItem) => void;
}

export default function InventoryTable({ items, onRowClick }: Props) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleHeaderClick(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = useMemo(() => {
    const copy = [...items];

    if (sortKey === null) {
      // Default: Reorder Now → On Order → OK, then alpha by name
      return copy.sort((a, b) => {
        const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (statusDiff !== 0) return statusDiff;
        return a.name.localeCompare(b.name);
      });
    }

    return copy.sort((a, b) => {
      let aVal: string | number | null;
      let bVal: string | number | null;

      switch (sortKey) {
        case "name":
          aVal = a.name;
          bVal = b.name;
          break;
        case "category":
          aVal = a.category;
          bVal = b.category;
          break;
        case "vendor":
          aVal = a.vendor?.name ?? "";
          bVal = b.vendor?.name ?? "";
          break;
        case "quantity_on_hand":
          aVal = a.quantity_on_hand;
          bVal = b.quantity_on_hand;
          break;
        case "burn_rate":
          aVal = a.burn_rate ?? -1;
          bVal = b.burn_rate ?? -1;
          break;
        case "reorder_point":
          aVal = a.reorder_point ?? -1;
          bVal = b.reorder_point ?? -1;
          break;
        case "est_depletion_date":
          aVal = a.est_depletion_date ?? "";
          bVal = b.est_depletion_date ?? "";
          break;
        case "lead_time_days":
          aVal = a.effective_lead_days ?? -1;
          bVal = b.effective_lead_days ?? -1;
          break;
        case "assigned_to":
          aVal = a.assigned_to ?? "";
          bVal = b.assigned_to ?? "";
          break;
        case "status":
          aVal = STATUS_ORDER[a.status];
          bVal = STATUS_ORDER[b.status];
          break;
        default:
          return 0;
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      const strA = String(aVal ?? "");
      const strB = String(bVal ?? "");
      const cmp = strA.localeCompare(strB);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [items, sortKey, sortDir]);

  function SortIndicator({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="ml-1 text-gray-300">↕</span>;
    return <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  function Th({
    col,
    label,
    className = "",
  }: {
    col: SortKey;
    label: string;
    className?: string;
  }) {
    return (
      <th
        className={`px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-bicr-navy whitespace-nowrap select-none ${className}`}
        onClick={() => handleHeaderClick(col)}
      >
        {label}
        <SortIndicator col={col} />
      </th>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">No items match your filters.</div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <Th col="name" label="Item Name" />
            <Th col="category" label="Category" />
            <Th col="vendor" label="Vendor" />
            <Th col="quantity_on_hand" label="On Hand" />
            <Th col="burn_rate" label="Burn Rate" />
            <Th col="reorder_point" label="Reorder Pt" />
            <Th col="est_depletion_date" label="Est. Depletion" />
            <Th col="lead_time_days" label="Lead Time" />
            <Th col="assigned_to" label="Assigned To" />
            <Th col="status" label="Status" />
            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {sorted.map((item) => {
            const isReorderNow = item.status === "Reorder Now";
            const rowClass = isReorderNow
              ? "bg-red-50 hover:bg-red-100 cursor-pointer"
              : "hover:bg-gray-50 cursor-pointer";

            const burnRateDisplay =
              item.burn_rate != null && item.burn_rate_period
                ? `${item.burn_rate}/${item.burn_rate_period}`
                : "—";

            const depletionDisplay = item.est_depletion_date
              ? new Date(item.est_depletion_date + "T00:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "—";

            const leadDisplay =
              item.effective_lead_days != null ? `${item.effective_lead_days}d` : "—";

            return (
              <tr
                key={item.id}
                className={`transition-colors ${rowClass}`}
                onClick={() => onRowClick(item)}
              >
                <td className="px-3 py-3 font-medium text-bicr-navy whitespace-nowrap">
                  {item.name}
                </td>
                <td className="px-3 py-3 text-gray-600 capitalize">{item.category}</td>
                <td className="px-3 py-3 text-gray-600">{item.vendor?.name ?? "—"}</td>
                <td className="px-3 py-3 text-gray-700 font-mono">
                  {item.quantity_on_hand}
                  {item.unit_label ? ` ${item.unit_label}` : ""}
                </td>
                <td className="px-3 py-3 text-gray-600">{burnRateDisplay}</td>
                <td className="px-3 py-3 text-gray-600">
                  {item.reorder_point != null ? item.reorder_point : "—"}
                </td>
                <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{depletionDisplay}</td>
                <td className="px-3 py-3 text-gray-600">{leadDisplay}</td>
                <td className="px-3 py-3 text-gray-600">{item.assigned_to ?? "—"}</td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${STATUS_BADGE[item.status]}`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                  <OrderButton item={item} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

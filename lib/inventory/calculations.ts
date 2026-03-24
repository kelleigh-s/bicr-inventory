import { addDays, format } from "date-fns";
import { PERIOD_DIVISORS } from "@/lib/inventory/constants";
import type { BurnRatePeriod, ItemStatus } from "@/lib/inventory/constants";

export function burnRatePerDay(
  burnRate: number | null, period: BurnRatePeriod | null
): number | null {
  if (burnRate === null || burnRate === 0 || period === null) return null;
  return burnRate / PERIOD_DIVISORS[period];
}

export function estimatedDepletionDate(
  quantityOnHand: number, burnRate: number | null,
  burnRatePeriod: BurnRatePeriod | null, today: Date = new Date()
): string | null {
  if (quantityOnHand <= 0) return null;
  const dailyRate = burnRatePerDay(burnRate, burnRatePeriod);
  if (dailyRate === null) return null;
  const daysRemaining = quantityOnHand / dailyRate;
  // Normalize using UTC components to avoid ISO-string UTC-parse timezone shifts
  const localToday = new Date(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const depletionDate = addDays(localToday, Math.floor(daysRemaining));
  return format(depletionDate, "yyyy-MM-dd");
}

export function deriveItemStatus(
  quantityOnHand: number, reorderPoint: number | null, hasPendingOrder: boolean
): ItemStatus {
  if (hasPendingOrder) return "On Order";
  if (reorderPoint !== null && quantityOnHand <= reorderPoint) return "Reorder Now";
  return "OK";
}

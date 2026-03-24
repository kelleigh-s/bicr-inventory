export const ITEM_CATEGORIES = [
  "bags", "shipping", "labels", "packaging", "clothing", "merch",
] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export const SIMPLE_CATEGORIES: ItemCategory[] = ["bags", "shipping", "labels", "packaging"];
export const VARIANT_CATEGORIES: ItemCategory[] = ["clothing", "merch"];

export const BURN_RATE_PERIODS = ["day", "week", "month"] as const;
export type BurnRatePeriod = (typeof BURN_RATE_PERIODS)[number];

export const ORDER_STATUSES = ["pending", "received"] as const;
export const EVENT_TYPES = ["count_update", "ordered", "received", "edited"] as const;

export const REORDER_ACTION_TYPES = ["url", "email", "none"] as const;
export type ReorderActionType = (typeof REORDER_ACTION_TYPES)[number];

export type ItemStatus = "Reorder Now" | "On Order" | "OK";

export const VARIANT_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"] as const;
export const VARIANT_LOCATIONS = ["Storage", "Café"] as const;

export const PERIOD_DIVISORS: Record<BurnRatePeriod, number> = {
  day: 1, week: 7, month: 30,
};

export const UPDATE_COUNTS_CATEGORY_ORDER: ItemCategory[] = [
  "bags", "shipping", "labels", "packaging",
];

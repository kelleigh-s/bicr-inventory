import {
  SIMPLE_CATEGORIES, VARIANT_CATEGORIES, ITEM_CATEGORIES,
  PERIOD_DIVISORS, UPDATE_COUNTS_CATEGORY_ORDER,
} from "@/lib/inventory/constants";

describe("constants", () => {
  test("simple + variant categories cover all item categories", () => {
    const all = [...SIMPLE_CATEGORIES, ...VARIANT_CATEGORIES];
    expect(all.sort()).toEqual([...ITEM_CATEGORIES].sort());
  });

  test("no category appears in both simple and variant", () => {
    const overlap = SIMPLE_CATEGORIES.filter((c) => VARIANT_CATEGORIES.includes(c));
    expect(overlap).toEqual([]);
  });

  test("period divisors are positive integers", () => {
    Object.values(PERIOD_DIVISORS).forEach((d) => {
      expect(d).toBeGreaterThan(0);
      expect(Number.isInteger(d)).toBe(true);
    });
  });

  test("update counts order matches simple categories", () => {
    expect(UPDATE_COUNTS_CATEGORY_ORDER.sort()).toEqual([...SIMPLE_CATEGORIES].sort());
  });
});

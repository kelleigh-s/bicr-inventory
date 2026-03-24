import {
  burnRatePerDay, estimatedDepletionDate, deriveItemStatus,
} from "@/lib/inventory/calculations";

describe("burnRatePerDay", () => {
  test("returns null when burn_rate is null", () => {
    expect(burnRatePerDay(null, null)).toBeNull();
  });
  test("returns null when burn_rate is 0", () => {
    expect(burnRatePerDay(0, "day")).toBeNull();
  });
  test("daily rate returns as-is", () => {
    expect(burnRatePerDay(10, "day")).toBe(10);
  });
  test("weekly rate divides by 7", () => {
    expect(burnRatePerDay(70, "week")).toBe(10);
  });
  test("monthly rate divides by 30", () => {
    expect(burnRatePerDay(300, "month")).toBe(10);
  });
});

describe("estimatedDepletionDate", () => {
  const today = new Date("2026-03-23");

  test("returns null when burn rate is null", () => {
    expect(estimatedDepletionDate(100, null, null, today)).toBeNull();
  });
  test("returns null when quantity is 0", () => {
    expect(estimatedDepletionDate(0, 10, "day", today)).toBeNull();
  });
  test("calculates correct date for daily burn", () => {
    const result = estimatedDepletionDate(100, 10, "day", today);
    expect(result).toBe("2026-04-02");
  });
  test("calculates correct date for weekly burn", () => {
    const result = estimatedDepletionDate(70, 14, "week", today);
    expect(result).toBe("2026-04-27");
  });
  test("calculates correct date for monthly burn", () => {
    const result = estimatedDepletionDate(300, 300, "month", today);
    expect(result).toBe("2026-04-22");
  });
});

describe("deriveItemStatus", () => {
  test("returns 'On Order' when pending orders exist, even below reorder point", () => {
    expect(deriveItemStatus(5, 10, true)).toBe("On Order");
  });
  test("returns 'Reorder Now' when at reorder point with no pending order", () => {
    expect(deriveItemStatus(10, 10, false)).toBe("Reorder Now");
  });
  test("returns 'Reorder Now' when below reorder point with no pending order", () => {
    expect(deriveItemStatus(3, 10, false)).toBe("Reorder Now");
  });
  test("returns 'OK' when above reorder point", () => {
    expect(deriveItemStatus(20, 10, false)).toBe("OK");
  });
  test("returns 'OK' when reorder point is null", () => {
    expect(deriveItemStatus(5, null, false)).toBe("OK");
  });
  test("returns 'On Order' overrides even when reorder_point is null", () => {
    expect(deriveItemStatus(5, null, true)).toBe("On Order");
  });
});

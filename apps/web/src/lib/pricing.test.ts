import { describe, expect, it } from "vitest";
import {
  calculateUnitPrice,
  SIZE_OPTIONS,
  TOPPING_OPTIONS,
} from "./pricing";

describe("calculateUnitPrice", () => {
  it.each(SIZE_OPTIONS)("adds the $name size surcharge", ({ name, surcharge }) => {
    expect(calculateUnitPrice(25000, name, [])).toBe(25000 + surcharge);
  });

  it("adds multiple topping surcharges and counts a topping ID once", () => {
    const pearls = TOPPING_OPTIONS[0];
    const espresso = TOPPING_OPTIONS[2];

    expect(calculateUnitPrice(25000, "M", [pearls, espresso, pearls])).toBe(
      43000,
    );
  });

  it("does not produce invalid totals for invalid base prices or topping surcharges", () => {
    const invalidTopping = {
      id: "invalid",
      name: "Invalid",
      surcharge: Number.NaN,
    };

    expect(calculateUnitPrice(-1, "S", [invalidTopping])).toBe(0);
    expect(calculateUnitPrice(Number.MAX_SAFE_INTEGER, "L", [])).toBe(0);
  });
});

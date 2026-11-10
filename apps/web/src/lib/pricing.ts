export const SIZE_OPTIONS = [
  { name: "S", surcharge: 0 },
  { name: "M", surcharge: 5000 },
  { name: "L", surcharge: 10000 },
] as const;

export const TOPPING_OPTIONS = [
  { id: "pearls", name: "Trân châu", surcharge: 5000 },
  { id: "cheese-foam", name: "Kem cheese", surcharge: 10000 },
  { id: "espresso", name: "Shot espresso", surcharge: 8000 },
] as const;

export type ProductSize = (typeof SIZE_OPTIONS)[number]["name"];
export type ProductTopping = {
  id: string;
  name: string;
  surcharge: number;
};

export function calculateUnitPrice(
  basePrice: number,
  size: ProductSize,
  toppings: readonly ProductTopping[],
): number {
  const safeBasePrice = Number.isSafeInteger(basePrice) && basePrice >= 0 ? basePrice : 0;
  const sizeSurcharge = SIZE_OPTIONS.find((option) => option.name === size)?.surcharge ?? 0;
  const uniqueToppings = new Map(toppings.map((topping) => [topping.id, topping]));
  const toppingSurcharge = [...uniqueToppings.values()].reduce(
    (total, topping) => total + (Number.isSafeInteger(topping.surcharge) && topping.surcharge > 0 ? topping.surcharge : 0),
    0,
  );
  const total = safeBasePrice + sizeSurcharge + toppingSurcharge;

  return Number.isSafeInteger(total) ? total : 0;
}

export type InventoryRecord = {
  productId: number;
  productName: string;
  stock: number;
  available: boolean;
};

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/$/, "");

export async function fetchInventory(signal?: AbortSignal): Promise<InventoryRecord[]> {
  const response = await fetch(`${API_URL}/inventory`, {
    cache: "no-store",
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) throw new Error(`Tồn kho trả HTTP ${response.status}`);
  const payload: unknown = await response.json();
  if (!Array.isArray(payload) || !payload.every((item) =>
    typeof item === "object" && item !== null &&
    Number.isSafeInteger((item as InventoryRecord).productId) &&
    Number.isSafeInteger((item as InventoryRecord).stock) &&
    (item as InventoryRecord).stock >= 0 &&
    typeof (item as InventoryRecord).productName === "string" &&
    typeof (item as InventoryRecord).available === "boolean"
  )) {
    throw new Error("Dữ liệu tồn kho không hợp lệ");
  }
  return payload as InventoryRecord[];
}

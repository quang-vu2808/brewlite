export type InventoryRecord = {
  productId: number;
  productName: string;
  stock: number;
  available: boolean;
  recipeConfigured: boolean;
  sizes?: Array<{
    size: "S" | "M" | "L";
    stock: number;
    available: boolean;
    recipeConfigured: boolean;
    usesSharedRecipe: boolean;
  }>;
};

export function inventoryStatusMessage(
  record: InventoryRecord | null | undefined,
  loading: boolean,
  error?: string,
  size?: "S" | "M" | "L",
): string {
  if (error) return `Không thể tải tồn kho: ${error}`;
  if (loading) return "Đang tải tồn kho...";
  if (!record) return "Không có dữ liệu tồn kho";
  if (size && record.sizes) {
    const sizeRecord = record.sizes.find((item) => item.size === size);
    if (!sizeRecord || !sizeRecord.recipeConfigured) return `Size ${size}: chưa cấu hình công thức`;
    if (!sizeRecord.stock) return `Size ${size}: hết nguyên liệu hoặc vật tư`;
    return `Size ${size}: pha tối đa ${sizeRecord.stock} ly`;
  }
  if (record.sizes?.length) {
    return record.sizes.map((item) => !item.recipeConfigured
      ? `${item.size}: chưa cấu hình`
      : item.stock === 0
        ? `${item.size}: hết nguyên liệu hoặc vật tư`
        : `${item.size}: ${item.stock} ly`,
    ).join(" · ");
  }
  if (!record.recipeConfigured) return "Chưa có công thức nguyên liệu";
  if (record.stock === 0) return "Hết nguyên liệu hoặc vật tư";
  return `Pha tối đa ${record.stock} ly`;
}

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
    typeof (item as InventoryRecord).available === "boolean" &&
    typeof (item as InventoryRecord).recipeConfigured === "boolean" &&
    ((item as InventoryRecord).sizes === undefined ||
      (Array.isArray((item as InventoryRecord).sizes) &&
        (item as InventoryRecord).sizes!.every((size) =>
          (size.size === "S" || size.size === "M" || size.size === "L") &&
          Number.isSafeInteger(size.stock) && size.stock >= 0 &&
          typeof size.available === "boolean" && typeof size.recipeConfigured === "boolean" &&
          typeof size.usesSharedRecipe === "boolean",
        )))
  )) {
    throw new Error("Dữ liệu tồn kho không hợp lệ");
  }
  return payload as InventoryRecord[];
}

export function watchInventory(
  onUpdate: (records: InventoryRecord[]) => void,
  onError: (error: unknown) => void,
): () => void {
  let controller: AbortController | undefined;
  let stopped = false;

  function refresh() {
    if (document.visibilityState === "hidden") return;
    controller?.abort();
    const request = new AbortController();
    controller = request;
    void fetchInventory(request.signal).then((records) => {
      if (!stopped && !request.signal.aborted) onUpdate(records);
    }).catch((error: unknown) => {
      if (!stopped && !request.signal.aborted) onError(error);
    });
  }

  refresh();
  const interval = window.setInterval(refresh, 10000);
  window.addEventListener("focus", refresh);
  window.addEventListener("popstate", refresh);
  document.addEventListener("visibilitychange", refresh);
  window.addEventListener("pageshow", refresh);
  return () => {
    stopped = true;
    controller?.abort();
    window.clearInterval(interval);
    window.removeEventListener("focus", refresh);
    window.removeEventListener("popstate", refresh);
    document.removeEventListener("visibilitychange", refresh);
    window.removeEventListener("pageshow", refresh);
  };
}

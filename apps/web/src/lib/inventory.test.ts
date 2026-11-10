import { afterEach, describe, expect, it, vi } from "vitest";
import { inventoryStatusMessage, watchInventory } from "./inventory";

describe("inventoryStatusMessage", () => {
  it("distinguishes loading, load failure, missing recipes, depleted stock, and availability", () => {
    expect(inventoryStatusMessage(null, true)).toBe("Đang tải tồn kho...");
    expect(inventoryStatusMessage(null, false, "HTTP 503"))
      .toBe("Không thể tải tồn kho: HTTP 503");
    expect(inventoryStatusMessage(null, false)).toBe("Không có dữ liệu tồn kho");
    expect(inventoryStatusMessage({
      productId: 1,
      productName: "Coffee",
      stock: 0,
      available: false,
      recipeConfigured: false,
    }, false)).toBe("Chưa có công thức nguyên liệu");
    expect(inventoryStatusMessage({
      productId: 1,
      productName: "Coffee",
      stock: 0,
      available: false,
      recipeConfigured: true,
    }, false)).toBe("Hết nguyên liệu hoặc vật tư");
    expect(inventoryStatusMessage({
      productId: 1,
      productName: "Coffee",
      stock: 3,
      available: true,
      recipeConfigured: true,
    }, false)).toBe("Pha tối đa 3 ly");
  });

  it("reports each configured size independently while preserving the shared recipe status", () => {
    const record = {
      productId: 1,
      productName: "Coffee",
      stock: 3,
      available: true,
      recipeConfigured: true,
      sizes: [
        { size: "S" as const, stock: 3, available: true, recipeConfigured: true, usesSharedRecipe: true },
        { size: "M" as const, stock: 0, available: false, recipeConfigured: true, usesSharedRecipe: false },
        { size: "L" as const, stock: 0, available: false, recipeConfigured: false, usesSharedRecipe: false },
      ],
    };
    expect(inventoryStatusMessage(record, false, undefined, "S")).toBe("Size S: pha tối đa 3 ly");
    expect(inventoryStatusMessage(record, false, undefined, "M")).toBe("Size M: hết nguyên liệu hoặc vật tư");
    expect(inventoryStatusMessage(record, false, undefined, "L")).toBe("Size L: chưa cấu hình công thức");
    expect(inventoryStatusMessage(record, false)).toBe("S: 3 ly · M: hết nguyên liệu hoặc vật tư · L: chưa cấu hình");
  });
});

describe("watchInventory", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("refreshes stock while visible and when the user returns, then cleans up", async () => {
    vi.useFakeTimers();
    let stock = 10;
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => [{
        productId: 1,
        productName: "Coffee",
        stock,
        available: stock > 0,
        recipeConfigured: true,
      }],
    }));
    vi.stubGlobal("fetch", fetchMock);
    const onUpdate = vi.fn();
    const onError = vi.fn();
    const stop = watchInventory(onUpdate, onError);

    await vi.advanceTimersByTimeAsync(0);
    expect(onUpdate).toHaveBeenLastCalledWith([expect.objectContaining({ stock: 10 })]);
    stock = 5;
    await vi.advanceTimersByTimeAsync(10000);
    expect(onUpdate).toHaveBeenLastCalledWith([expect.objectContaining({ stock: 5 })]);
    stock = 3;
    window.dispatchEvent(new Event("focus"));
    await vi.advanceTimersByTimeAsync(0);
    expect(onUpdate).toHaveBeenLastCalledWith([expect.objectContaining({ stock: 3 })]);
    stock = 2;
    window.dispatchEvent(new PopStateEvent("popstate"));
    await vi.advanceTimersByTimeAsync(0);
    expect(onUpdate).toHaveBeenLastCalledWith([expect.objectContaining({ stock: 2 })]);
    expect(onError).not.toHaveBeenCalled();

    stop();
    const count = fetchMock.mock.calls.length;
    window.dispatchEvent(new Event("focus"));
    await vi.advanceTimersByTimeAsync(10000);
    expect(fetchMock).toHaveBeenCalledTimes(count);
  });
});

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "./auth-provider";
import { StaffIngredientsPanel } from "./staff-ingredients-panel";

describe("StaffIngredientsPanel", () => {
  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("separates shared stock from formulas and does not configure global toppings per product size", async () => {
    window.sessionStorage.setItem("brewlite-auth-v1", "staff-token");
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/auth/me")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            id: "staff-id",
            email: "staff@example.com",
            loyaltyPoints: 0,
            role: "STAFF",
          }),
        });
      }
      if (url.endsWith("/ingredients/recipes")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [{
            productId: 1,
            productName: "Cà phê sữa",
            items: [{
              ingredientId: "ingredient-id",
              ingredientName: "Hạt cà phê",
              unit: "g",
              quantityRequired: 18,
            }],
            sizes: ["S", "M", "L"].map((size) => ({
              size,
              configured: false,
              availability: { stock: 0, recipeConfigured: false, usesSharedRecipe: false },
              items: [],
              packaging: [],
              toppings: [],
            })),
          }],
        });
      }
      if (url.endsWith("/toppings/staff")) {
        return Promise.resolve({ ok: true, status: 200, json: async () => [] });
      }
      if (url.endsWith("/products")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [{ id: 1, name: "Cà phê sữa" }],
        });
      }
      if (url.endsWith("/ingredients")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [{
            id: "ingredient-id",
            name: "Hạt cà phê",
            code: "COFFEE_BEANS",
            unit: "g",
            stock: 10000,
            warningThreshold: 500,
            lowStock: false,
            kind: "INGREDIENT",
            category: null,
            isActive: true,
            compatibleSizes: [],
          }],
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({}),
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const confirmMock = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<AuthProvider><StaffIngredientsPanel /></AuthProvider>);
    expect(await screen.findByText("Hạt cà phê")).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Kho nguyên liệu" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.click(screen.getByRole("tab", { name: "Công thức pha chế" }));
    expect(await screen.findByRole("heading", { name: "Cà phê sữa · Size S" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Topping dùng chung toàn menu" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "So sánh công thức S/M/L" })).toBeTruthy();
    fireEvent.click(screen.getByText("Công thức chung · không tự áp dụng cho size"));
    const saveButton = screen.getByRole("button", { name: "Lưu bản nháp công thức" });
    expect(saveButton.hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Chép công thức chung vào bản nháp" }));
    expect(saveButton.hasAttribute("disabled")).toBe(false);
    confirmMock.mockReturnValue(false);
    fireEvent.click(screen.getByRole("tab", { name: "M" }));
    expect(screen.getByRole("tab", { name: "S" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Lưu bản nháp công thức" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/ingredients/recipes/1/S"),
      expect.objectContaining({ method: "PUT" }),
    ));
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/ingredients/packaging-recipes/1/S"),
      expect.objectContaining({ method: "PUT" }),
    );
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/ingredients/topping-recipes/"))).toBe(false);
  });

  it("compares size quantities and identifies identical pending formulas", async () => {
    window.sessionStorage.setItem("brewlite-auth-v1", "staff-token");
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/auth/me")) return Promise.resolve({
        ok: true, status: 200, json: async () => ({
          id: "staff-id", email: "staff@example.com", loyaltyPoints: 0, role: "STAFF",
        }),
      });
      if (url.endsWith("/ingredients")) return Promise.resolve({
        ok: true, status: 200, json: async () => [{
          id: "beans-id", name: "Hạt cà phê", code: "COFFEE", unit: "g", stock: 900,
          warningThreshold: 0, lowStock: false, kind: "INGREDIENT", category: null,
          isActive: true, compatibleSizes: [],
        }],
      });
      if (url.endsWith("/ingredients/recipes")) return Promise.resolve({
        ok: true, status: 200, json: async () => [{
          productId: 1, productName: "Cà phê sữa", items: [],
          sizes: ["S", "M", "L"].map((size) => ({
            size,
            configured: size !== "L",
            approvalStatus: size === "S" || size === "M" ? "PENDING" : null,
            availability: { stock: 0, recipeConfigured: false, usesSharedRecipe: false },
            items: size === "S" || size === "M" ? [{
              ingredientId: "beans-id",
              ingredientName: "Hạt cà phê",
              unit: "g",
              quantityRequired: 18,
            }] : [],
            packaging: [],
            toppings: [],
          })),
        }],
      });
      if (url.endsWith("/products")) return Promise.resolve({
        ok: true, status: 200, json: async () => [{ id: 1, name: "Cà phê sữa" }],
      });
      if (url.endsWith("/toppings/staff")) return Promise.resolve({
        ok: true, status: 200, json: async () => [],
      });
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AuthProvider><StaffIngredientsPanel /></AuthProvider>);
    await screen.findByText("Hạt cà phê");
    fireEvent.click(screen.getByRole("tab", { name: "Công thức pha chế" }));

    expect((await screen.findAllByText("18 g")).length).toBe(2);
    expect(screen.getAllByText("Đề xuất – Chờ xác nhận").length).toBeGreaterThan(0);
    expect(screen.getByText(/có size đang dùng định lượng nguyên liệu giống hệt nhau/i)).toBeTruthy();
    expect(screen.getByText(/chưa dùng để bán/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Xác nhận và kích hoạt size" })).toBeTruthy();
  });

  it("opens a stock adjustment dialog from the shared ingredient inventory", async () => {
    window.sessionStorage.setItem("brewlite-auth-v1", "staff-token");
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/auth/me")) return Promise.resolve({
        ok: true, status: 200, json: async () => ({
          id: "staff-id", email: "staff@example.com", loyaltyPoints: 0, role: "STAFF",
        }),
      });
      if (url.endsWith("/ingredients")) return Promise.resolve({
        ok: true, status: 200, json: async () => [{
          id: "ingredient-id", name: "Hạt cà phê", code: "COFFEE_BEANS", unit: "g",
          stock: 10000, warningThreshold: 500, lowStock: false, kind: "INGREDIENT",
          category: null, isActive: true, compatibleSizes: [],
        }],
      });
      if (url.endsWith("/ingredients/recipes")) return Promise.resolve({
        ok: true, status: 200, json: async () => [],
      });
      if (url.endsWith("/products") || url.endsWith("/toppings/staff")) return Promise.resolve({
        ok: true, status: 200, json: async () => [],
      });
      return Promise.resolve({ ok: true, status: 200, json: async () => [] });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AuthProvider><StaffIngredientsPanel /></AuthProvider>);
    await screen.findByText("Hạt cà phê");
    fireEvent.click(screen.getByRole("button", { name: "Nhập kho" }));
    expect(screen.getByRole("dialog", { name: /Hạt cà phê/ })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Số lượng (g)"), { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText("Lý do"), { target: { value: "Kiểm thử nhập kho" } });
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận nhập" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/ingredients/ingredient-id/adjustments"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ delta: 100, reason: "Kiểm thử nhập kho" }),
      }),
    ));
  });

  it("shows the shared topping inventory in formulas without adding per-size topping rules", async () => {
    window.sessionStorage.setItem("brewlite-auth-v1", "staff-token");
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/auth/me")) return Promise.resolve({
        ok: true, status: 200, json: async () => ({
          id: "staff-id", email: "staff@example.com", loyaltyPoints: 0, role: "STAFF",
        }),
      });
      if (url.endsWith("/ingredients")) return Promise.resolve({
        ok: true, status: 200, json: async () => [{
          id: "beans-id", name: "Hạt cà phê", code: "COFFEE_BEANS", unit: "g",
          stock: 10000, warningThreshold: 500, lowStock: false, kind: "INGREDIENT",
          category: null, isActive: true, compatibleSizes: [],
        }],
      });
      if (url.endsWith("/ingredients/recipes")) return Promise.resolve({
        ok: true, status: 200, json: async () => [{
          productId: 1, productName: "Cà phê sữa", items: [{
            ingredientId: "beans-id", ingredientName: "Hạt cà phê", unit: "g", quantityRequired: 18,
          }], sizes: ["S", "M", "L"].map((size) => ({
            size, configured: false,
            availability: { stock: 0, recipeConfigured: false, usesSharedRecipe: false },
            items: [], packaging: [], toppings: [],
          })),
        }],
      });
      if (url.endsWith("/products")) return Promise.resolve({
        ok: true, status: 200, json: async () => [{ id: 1, name: "Cà phê sữa" }],
      });
      if (url.endsWith("/toppings/staff")) return Promise.resolve({
        ok: true, status: 200, json: async () => [{
          id: "cheese-foam", name: "Kem cheese", surcharge: 10000,
          portionQuantityRequired: 10, availablePortions: 5, ingredientId: "cheese-id",
          ingredientName: "Kem cheese", ingredientUnit: "g", ingredientStock: 50,
          ingredientWarningThreshold: 0, ingredientLowStock: false, isActive: true,
        }, {
          id: "pearls", name: "Trân châu", surcharge: 5000,
          portionQuantityRequired: null, availablePortions: null, ingredientId: "pearls-id",
          ingredientName: "Trân châu", ingredientUnit: "g", ingredientStock: 100,
          ingredientWarningThreshold: 0, ingredientLowStock: false, isActive: false,
        }],
      });
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AuthProvider><StaffIngredientsPanel /></AuthProvider>);
    await screen.findByText("Hạt cà phê");
    fireEvent.click(screen.getByRole("tab", { name: "Công thức pha chế" }));

    expect(await screen.findByRole("heading", { name: "Topping dùng chung toàn menu" })).toBeTruthy();
    expect(screen.getByRole("row", { name: /Kem cheeseKem cheese 10 g 50 g 5 Còn bán/ })).toBeTruthy();
    expect(screen.getByRole("row", { name: /Trân châuTrân châu Chưa cấu hình 100 g — Đang tắt/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mở Kho topping" })).toBeTruthy();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/ingredients/topping-recipes/"))).toBe(false);
  });
});

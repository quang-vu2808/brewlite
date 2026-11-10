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

  it("loads inventory and saves a product recipe through the Staff API", async () => {
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
          }],
        });
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

    render(<AuthProvider><StaffIngredientsPanel /></AuthProvider>);
    expect(await screen.findByText("COFFEE_BEANS · 10000 g")).toBeTruthy();
    expect(screen.getByText("Công thức sản phẩm")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Lưu công thức" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/ingredients/recipes/1"),
      expect.objectContaining({ method: "PUT" }),
    ));
  });
});

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProductDetailPage from "./page";

const { addItemMock } = vi.hoisted(() => ({ addItemMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "1" }),
  usePathname: () => "/products/1",
}));

vi.mock("../../../components/site-header", () => ({ SiteHeader: () => null }));
vi.mock("../../../components/cart-provider", () => ({
  useCart: () => ({ addItem: addItemMock, hydrated: true }),
}));

function installFetch(options: { configured?: boolean; toppingConfigured?: boolean } = {}) {
  const configured = options.configured ?? true;
  const toppingConfigured = options.toppingConfigured ?? true;
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/products/1")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: 1, name: "Cà phê sữa", price: 25000 }),
      };
    }
    if (url.includes("/inventory")) {
      return {
        ok: true,
        status: 200,
        json: async () => [{
          productId: 1,
          productName: "Cà phê sữa",
          stock: configured ? 3 : 0,
          available: configured,
          recipeConfigured: configured,
          sizes: ["S", "M", "L"].map((size) => ({
            size,
            stock: configured && size !== "L" ? 3 : 0,
            available: configured && size !== "L",
            recipeConfigured: configured && size !== "L",
            usesSharedRecipe: false,
          })),
        }],
      };
    }
    if (url.includes("/toppings?")) {
      return {
        ok: true,
        status: 200,
        json: async () => [{
          id: "pearls",
          name: "Trân châu",
          surcharge: 5000,
          configured: toppingConfigured,
          available: toppingConfigured,
          maxPortions: toppingConfigured ? 2 : 0,
          availablePortions: toppingConfigured ? 2 : 0,
          portionQuantityRequired: toppingConfigured ? 50 : null,
          ingredientUnit: toppingConfigured ? "g" : null,
        }],
      };
    }
    throw new Error(`Unexpected request: ${url}`);
  }));
}

describe("ProductDetailPage inventory-aware options", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    addItemMock.mockReset();
  });

  it("shows size stock, topping portions and updates price while enforcing actual availability", async () => {
    installFetch();
    render(<ProductDetailPage />);

    expect(await screen.findByText("Cà phê sữa")).toBeTruthy();
    expect(await screen.findByText("Size M: pha tối đa 3 ly")).toBeTruthy();
    expect(await screen.findByText("50 g/phần")).toBeTruthy();
    expect(screen.getByText("Còn 2 phần")).toBeTruthy();
    expect(screen.queryByText(/giá mẫu/i)).toBeNull();

    const increase = screen.getByRole("button", { name: "Tăng phần Trân châu" });
    fireEvent.click(increase);
    fireEvent.click(increase);
    expect(increase.hasAttribute("disabled")).toBe(true);
    expect(screen.getByText(/40\.000/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Thêm vào giỏ hàng" }));
    expect(addItemMock).toHaveBeenCalledWith(expect.objectContaining({
      productId: "1",
      size: "M",
      toppings: [expect.objectContaining({ id: "pearls", quantity: 2 })],
    }));

    fireEvent.click(screen.getByRole("radio", { name: /Size L/ }));
    await waitFor(() => expect(screen.getByText("Size L: chưa cấu hình công thức")).toBeTruthy());
    expect(screen.getByRole("button", { name: "Thêm vào giỏ hàng" }).hasAttribute("disabled")).toBe(true);
  });

  it("distinguishes an unconfigured recipe from configured stock and topping states", async () => {
    installFetch({ configured: false, toppingConfigured: false });
    render(<ProductDetailPage />);

    expect(await screen.findByText("Size M: chưa cấu hình công thức")).toBeTruthy();
    expect(await screen.findByText("Chưa cấu hình")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Thêm vào giỏ hàng" }).hasAttribute("disabled")).toBe(true);
  });
});

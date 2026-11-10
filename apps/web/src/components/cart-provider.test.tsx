import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CartProvider, useCart } from "./cart-provider";

const STORAGE_KEY = "brewlite-cart-v1";

function CartProbe() {
  const cart = useCart();

  return (
    <div>
      <output data-testid="hydrated">{String(cart.hydrated)}</output>
      <output data-testid="total-items">{cart.totalItems}</output>
      <output data-testid="total-price">{cart.totalPrice}</output>
      <output data-testid="items">{JSON.stringify(cart.items)}</output>
      <button onClick={() => cart.addItem({
        productId: "1",
        name: "Cà phê sữa",
        image: null,
        basePrice: 25000,
        size: "S",
        sizeSurcharge: 0,
        toppings: [],
      })}>
        Add small
      </button>
      <button onClick={() => cart.addItem({
        productId: "1",
        name: "Cà phê sữa",
        image: null,
        basePrice: 25000,
        size: "M",
        sizeSurcharge: 5000,
        toppings: [],
      })}>
        Add medium
      </button>
      <button onClick={() => cart.addItem({
        productId: "1",
        name: "Cà phê sữa",
        image: null,
        basePrice: 25000,
        size: "S",
        sizeSurcharge: 0,
        toppings: [{ id: "pearls", name: "Trân châu", surcharge: 5000 }],
      })}>
        Add pearls
      </button>
      <button onClick={() => cart.increaseQuantity(cart.items[0]?.key ?? "")}>
        Increase first
      </button>
      <button onClick={() => cart.decreaseQuantity(cart.items[0]?.key ?? "")}>
        Decrease first
      </button>
      <button onClick={() => cart.removeItem(cart.items[0]?.key ?? "")}>
        Remove first
      </button>
      <button onClick={cart.clearCart}>Clear cart</button>
    </div>
  );
}

function renderCart() {
  return render(
    <CartProvider>
      <CartProbe />
    </CartProvider>,
  );
}

function readItems() {
  return JSON.parse(screen.getByTestId("items").textContent ?? "[]") as Array<{
    size: string;
    quantity: number;
    unitPrice: number;
    toppings: Array<{ id: string }>;
  }>;
}

describe("CartProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("merges identical product options and keeps size and topping variants separate", async () => {
    renderCart();
    await screen.findByText("true");

    fireEvent.click(screen.getByRole("button", { name: "Add small" }));
    fireEvent.click(screen.getByRole("button", { name: "Add small" }));
    fireEvent.click(screen.getByRole("button", { name: "Add medium" }));
    fireEvent.click(screen.getByRole("button", { name: "Add pearls" }));

    expect(readItems()).toEqual([
      expect.objectContaining({ size: "S", quantity: 2, unitPrice: 25000 }),
      expect.objectContaining({ size: "M", quantity: 1, unitPrice: 30000 }),
      expect.objectContaining({
        size: "S",
        quantity: 1,
        unitPrice: 30000,
        toppings: [{ id: "pearls", name: "Trân châu", surcharge: 5000 }],
      }),
    ]);
    expect(screen.getByTestId("total-items").textContent).toBe("4");
    expect(screen.getByTestId("total-price").textContent).toBe("110000");
  });

  it("clamps quantity at one, recalculates totals, and removes only the chosen item", async () => {
    renderCart();
    await screen.findByText("true");

    fireEvent.click(screen.getByRole("button", { name: "Add small" }));
    fireEvent.click(screen.getByRole("button", { name: "Increase first" }));
    expect(screen.getByTestId("total-price").textContent).toBe("50000");

    fireEvent.click(screen.getByRole("button", { name: "Decrease first" }));
    fireEvent.click(screen.getByRole("button", { name: "Decrease first" }));
    expect(readItems()[0].quantity).toBe(1);
    expect(screen.getByTestId("total-price").textContent).toBe("25000");

    fireEvent.click(screen.getByRole("button", { name: "Add medium" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove first" }));
    expect(readItems()).toEqual([
      expect.objectContaining({ size: "M", quantity: 1, unitPrice: 30000 }),
    ]);
    expect(screen.getByTestId("total-items").textContent).toBe("1");
    expect(screen.getByTestId("total-price").textContent).toBe("30000");
  });

  it("persists items across provider remounts and clears them on request", async () => {
    const firstRender = renderCart();
    await screen.findByText("true");
    fireEvent.click(screen.getByRole("button", { name: "Add pearls" }));

    await waitFor(() => {
      expect(window.localStorage.getItem(STORAGE_KEY)).toContain('"productId":"1"');
    });
    firstRender.unmount();

    renderCart();
    await screen.findByText("true");
    expect(readItems()).toEqual([
      expect.objectContaining({
        size: "S",
        quantity: 1,
        unitPrice: 30000,
        toppings: [{ id: "pearls", name: "Trân châu", surcharge: 5000 }],
      }),
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Clear cart" }));
    expect(screen.getByTestId("total-items").textContent).toBe("0");
    expect(screen.getByTestId("total-price").textContent).toBe("0");
  });
});

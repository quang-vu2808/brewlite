import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "../../components/auth-provider";
import { CartProvider, useCart } from "../../components/cart-provider";
import {
  CheckoutProvider,
  useCheckout,
  type CheckoutOrder,
} from "../../components/checkout-provider";
import CheckoutPage from "./page";

const order: CheckoutOrder = {
  id: "order-uuid",
  orderCode: "order-uuid",
  status: "PENDING",
  totalAmount: 75000,
  createdAt: "2026-01-01T00:00:00.000Z",
  items: [{
    productId: 1,
    productName: "Cà phê sữa",
    size: "M",
    toppings: [{ id: "pearls", name: "Trân châu", surcharge: 5000 }],
    quantity: 2,
    unitPrice: 37500,
    lineTotal: 75000,
  }],
};

function TestHarness() {
  const { signIn } = useAuth();
  const { setOrder } = useCheckout();
  const { addItem, totalItems } = useCart();

  useEffect(() => {
    signIn("test-access-token", {
      id: "user-uuid",
      email: "customer@example.com",
      loyaltyPoints: 0,
    });
    setOrder(order);
  }, [setOrder, signIn]);

  return (
    <>
      <output data-testid="cart-count">{totalItems}</output>
      <button
        onClick={() => addItem({
          productId: "1",
          name: "Cà phê sữa",
          image: null,
          basePrice: 25000,
          size: "S",
          sizeSurcharge: 0,
          toppings: [],
        })}
        type="button"
      >
        Add test cart item
      </button>
      <CheckoutPage />
    </>
  );
}

function renderCheckout() {
  return render(
    <CartProvider>
      <AuthProvider>
        <CheckoutProvider>
          <TestHarness />
        </CheckoutProvider>
      </AuthProvider>
    </CartProvider>,
  );
}

function paymentResponse(status: "SUCCESS" | "FAILED", method: "WALLET" | "CARD" = "WALLET") {
  return {
    paymentId: "payment-uuid",
    orderId: order.id,
    method,
    status,
    orderStatus: status === "SUCCESS" ? "PAID" : "PAYMENT_FAILED",
    amount: order.totalAmount,
    message: status === "SUCCESS"
      ? "Thanh toán giả lập thành công"
      : "Thanh toán giả lập thất bại",
    createdAt: "2026-01-01T00:01:00.000Z",
  };
}

function mockJsonResponse(payload: unknown, status = 201) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  };
}

describe("CheckoutPage", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("offers wallet and card, sends only the order and method, and clears cart after success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockJsonResponse(paymentResponse("SUCCESS", "CARD")),
    );
    vi.stubGlobal("fetch", fetchMock);
    renderCheckout();

    await screen.findByRole("radiogroup", { name: "Phương thức thanh toán" });
    fireEvent.click(screen.getByRole("button", { name: "Add test cart item" }));
    fireEvent.click(screen.getByRole("radio", { name: /Thẻ/ }));
    expect((screen.getByRole("radio", { name: /Thẻ/ }) as HTMLInputElement).checked).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /Thanh toán/ }));

    await screen.findByRole("heading", { name: "Thanh toán thành công" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:3001/payments");
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(request.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer test-access-token",
    });
    expect(JSON.parse(String(request.body))).toEqual({
      orderId: order.id,
      method: "CARD",
    });
    expect(screen.getByTestId("cart-count").textContent).toBe("0");
  });

  it("shows a deterministic failure and keeps the cart for a retry on the same order", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockJsonResponse(paymentResponse("FAILED")),
    );
    vi.stubGlobal("fetch", fetchMock);
    renderCheckout();

    await screen.findByRole("radiogroup", { name: "Phương thức thanh toán" });
    fireEvent.click(screen.getByRole("button", { name: "Add test cart item" }));
    fireEvent.click(screen.getByRole("button", { name: /Thanh toán/ }));

    await screen.findByRole("heading", { name: "Thanh toán chưa thành công" });
    expect(screen.getAllByText(/PAYMENT_FAILED/)).toHaveLength(2);
    expect(screen.getByTestId("cart-count").textContent).toBe("1");
    expect((screen.getByRole("button", { name: /Thanh toán/ }) as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: /Thanh toán/ }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
      orderId: order.id,
      method: "WALLET",
    });
  });

  it("prevents duplicate submissions while a payment request is pending", async () => {
    let resolveResponse: ((response: ReturnType<typeof mockJsonResponse>) => void) | undefined;
    const fetchMock = vi.fn().mockReturnValue(new Promise((resolve) => {
      resolveResponse = resolve;
    }));
    vi.stubGlobal("fetch", fetchMock);
    renderCheckout();
    await screen.findByRole("radiogroup", { name: "Phương thức thanh toán" });

    const button = screen.getByRole("button", { name: /Thanh toán/ });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((button as HTMLButtonElement).disabled).toBe(true);

    resolveResponse?.(mockJsonResponse(paymentResponse("SUCCESS")));
    await screen.findByRole("heading", { name: "Thanh toán thành công" });
  });

  it("shows API errors without changing the order to a failed payment", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockJsonResponse({ message: "Dịch vụ tạm thời không khả dụng" }, 503),
    );
    vi.stubGlobal("fetch", fetchMock);
    renderCheckout();

    await screen.findByRole("radiogroup", { name: "Phương thức thanh toán" });
    fireEvent.click(screen.getByRole("button", { name: /Thanh toán/ }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Dịch vụ tạm thời không khả dụng",
    );
    expect(screen.getByText("PENDING")).toBeTruthy();
  });
});

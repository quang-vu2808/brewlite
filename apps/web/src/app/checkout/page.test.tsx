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

function mockOrderResponse() {
  return mockJsonResponse({ ...order, payment: null }, 200);
}

function mockPaymentConfigResponse(demoFailureEnabled = false) {
  return mockJsonResponse({ provider: "MOCK", demoFailureEnabled }, 200);
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
    const fetchMock = vi.fn((...args: Parameters<typeof fetch>) => {
      const url = String(args[0]);
      return Promise.resolve(url.endsWith(`/orders/${order.id}`)
        ? mockOrderResponse()
        : url.endsWith("/payments/config")
          ? mockPaymentConfigResponse()
          : mockJsonResponse(paymentResponse("SUCCESS", "CARD")));
    });
    vi.stubGlobal("fetch", fetchMock);
    renderCheckout();

    await screen.findByRole("radiogroup", { name: "Phương thức thanh toán" });
    fireEvent.click(screen.getByRole("button", { name: "Add test cart item" }));
    fireEvent.click(screen.getByRole("radio", { name: /Thẻ/ }));
    expect((screen.getByRole("radio", { name: /Thẻ/ }) as HTMLInputElement).checked).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /Thanh toán/ }));
    await screen.findByRole("region", { name: "Mã QR thanh toán mô phỏng" });
    expect(screen.queryByRole("checkbox", { name: /Mô phỏng thanh toán thất bại/ })).toBeNull();
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/payments"))).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận thanh toán mô phỏng" }));

    await screen.findByRole("heading", { name: "Thanh toán thành công" });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    const paymentCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/payments"));
    expect(paymentCall?.[0]).toBe("http://localhost:3001/payments");
    const request = paymentCall?.[1] as RequestInit;
    expect((request.headers as Record<string, string>)["Idempotency-Key"]).toMatch(/^[0-9a-f-]{36}$/i);
    expect(request.headers).toMatchObject({
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
    const fetchMock = vi.fn((...args: Parameters<typeof fetch>) => {
      const url = String(args[0]);
      return Promise.resolve(url.endsWith(`/orders/${order.id}`)
        ? mockOrderResponse()
        : url.endsWith("/payments/config")
          ? mockPaymentConfigResponse()
          : mockJsonResponse(paymentResponse("FAILED")));
    });
    vi.stubGlobal("fetch", fetchMock);
    renderCheckout();

    await screen.findByRole("radiogroup", { name: "Phương thức thanh toán" });
    fireEvent.click(screen.getByRole("button", { name: "Add test cart item" }));
    fireEvent.click(screen.getByRole("button", { name: /Thanh toán/ }));
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận thanh toán mô phỏng" }));

    await screen.findByRole("heading", { name: "Thanh toán chưa thành công" });
    expect(screen.getAllByText(/PAYMENT_FAILED/)).toHaveLength(2);
    expect(screen.getByTestId("cart-count").textContent).toBe("1");
    expect((screen.getByRole("button", { name: "Xác nhận thanh toán mô phỏng" }) as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Xác nhận thanh toán mô phỏng" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));
    const paymentCall = fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/payments")).at(-1);
    expect(JSON.parse(String(paymentCall?.[1]?.body))).toEqual({
      orderId: order.id,
      method: "WALLET",
    });
  });

  it("shows the demo failure switch only when enabled and sends the selected outcome", async () => {
    const fetchMock = vi.fn((...args: Parameters<typeof fetch>) => {
      const url = String(args[0]);
      return Promise.resolve(url.endsWith(`/orders/${order.id}`)
        ? mockOrderResponse()
        : url.endsWith("/payments/config")
          ? mockPaymentConfigResponse(true)
          : mockJsonResponse(paymentResponse("FAILED")));
    });
    vi.stubGlobal("fetch", fetchMock);
    renderCheckout();

    await screen.findByRole("radiogroup", { name: "Phương thức thanh toán" });
    expect(document.querySelector("svg title")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Thanh toán/ }));
    const demoOption = await screen.findByRole("checkbox", { name: /Mô phỏng thanh toán thất bại/ });
    expect(document.querySelector("svg title")).toBeTruthy();
    fireEvent.click(demoOption);
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận thanh toán mô phỏng" }));

    await screen.findByRole("heading", { name: "Thanh toán chưa thành công" });
    const paymentCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/payments"));
    expect(JSON.parse(String(paymentCall?.[1]?.body))).toEqual({
      orderId: order.id,
      method: "WALLET",
      simulateFailure: true,
    });
  });

  it("prevents duplicate submissions while a payment request is pending", async () => {
    let resolveResponse: ((response: ReturnType<typeof mockJsonResponse>) => void) | undefined;
    const fetchMock = vi.fn((...args: Parameters<typeof fetch>) => {
      if (String(args[0]).endsWith(`/orders/${order.id}`)) {
        return Promise.resolve(mockOrderResponse());
      }
      if (String(args[0]).endsWith("/payments/config")) {
        return Promise.resolve(mockPaymentConfigResponse());
      }
      return new Promise((resolve) => { resolveResponse = resolve; });
    });
    vi.stubGlobal("fetch", fetchMock);
    renderCheckout();
    await screen.findByRole("radiogroup", { name: "Phương thức thanh toán" });

    fireEvent.click(screen.getByRole("button", { name: /Thanh toán/ }));
    const button = screen.getByRole("button", { name: "Xác nhận thanh toán mô phỏng" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(fetchMock).toHaveBeenCalledTimes(4);
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
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận thanh toán mô phỏng" }));

    await waitFor(() => expect(screen.getAllByRole("alert").some((element) =>
      element.textContent?.includes("Dịch vụ tạm thời không khả dụng"),
    )).toBe(true));
    expect(screen.getByText("PENDING")).toBeTruthy();
  });

  it("refreshes the saved order status without submitting another payment", async () => {
    const snapshot = {
      ...order,
      status: "PAID",
      payment: {
        id: "payment-uuid",
        method: "CARD",
        status: "SUCCESS",
        amount: order.totalAmount,
        createdAt: "2026-01-01T00:01:00.000Z",
      },
    };
    const fetchMock = vi.fn((...args: Parameters<typeof fetch>) => {
      const url = String(args[0]);
      if (url.endsWith(`/orders/${order.id}`)) return Promise.resolve(mockJsonResponse(snapshot, 200));
      if (url.endsWith("/payments/config")) return Promise.resolve(mockPaymentConfigResponse());
      return Promise.reject(new Error("Unexpected payment request"));
    });
    vi.stubGlobal("fetch", fetchMock);
    renderCheckout();

    await screen.findByRole("heading", { name: "Thanh toán thành công" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.some(([url]) => String(url) === `http://localhost:3001/orders/${order.id}`)).toBe(true);
    expect(screen.getAllByText("PAID").length).toBeGreaterThan(0);
  });
});

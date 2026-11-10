import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "../../components/auth-provider";
import { CartProvider } from "../../components/cart-provider";
import { CheckoutProvider } from "../../components/checkout-provider";
import CartPage from "./page";

const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
}));

function jsonResponse(payload: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => payload };
}

function CartHarness() {
  const { signIn } = useAuth();
  useEffect(() => {
    signIn("cart-test-token", {
      id: "customer-id",
      email: "customer@example.com",
      loyaltyPoints: 100,
      role: "CUSTOMER",
    });
  }, [signIn]);
  return <CartPage />;
}

describe("Cart pricing preview", () => {
  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
    window.localStorage.clear();
    vi.unstubAllGlobals();
    navigation.push.mockReset();
  });

  it("applies backend coupon and points discounts to the visible payable total", async () => {
    const previewBodies: Array<Record<string, unknown>> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/auth/me")) {
        return jsonResponse({
          id: "customer-id",
          email: "customer@example.com",
          loyaltyPoints: 100,
          role: "CUSTOMER",
        });
      }
      if (url.endsWith("/inventory")) {
        return jsonResponse([{ productId: 1, productName: "Cà phê sữa", stock: 10, available: true }]);
      }
      if (url.endsWith("/orders/preview")) {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        previewBodies.push(body);
        if (body.promoCode === "BAD") return jsonResponse({ message: "Mã khuyến mãi không hợp lệ" }, 400);
        const itemList = body.items as Array<{ quantity: number }>;
        const subtotalAmount = itemList.reduce((total, item) => total + item.quantity * 25000, 0);
        const discountAmount = body.promoCode ? Math.floor(subtotalAmount * 0.1) : 0;
        const redeemedPoints = Number(body.redeemPoints ?? 0);
        const loyaltyDiscountAmount = redeemedPoints * 100;
        const totalAmount = subtotalAmount - discountAmount - loyaltyDiscountAmount;
        return jsonResponse({
          subtotalAmount,
          promoCode: body.promoCode ?? null,
          discountAmount,
          redeemedPoints,
          loyaltyDiscountAmount,
          totalAmount,
          loyaltyPointsAvailable: 100,
          projectedLoyaltyPoints: Math.floor(totalAmount / 1000),
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    window.localStorage.setItem("brewlite-cart-v1", JSON.stringify([{
      key: '["1","S",[]]',
      productId: "1",
      name: "Cà phê sữa",
      image: null,
      basePrice: 25000,
      size: "S",
      sizeSurcharge: 0,
      toppings: [],
      unitPrice: 25000,
      quantity: 1,
    }]));
    render(
      <CartProvider>
        <AuthProvider>
          <CheckoutProvider><CartHarness /></CheckoutProvider>
        </AuthProvider>
      </CartProvider>,
    );

    await screen.findByRole("button", { name: "Áp dụng mã" });
    await waitFor(() => expect(previewBodies.some((body) => !body.promoCode)).toBe(true));
    fireEvent.change(screen.getByLabelText("Mã khuyến mãi"), { target: { value: "brew10" } });
    fireEvent.click(screen.getByRole("button", { name: "Áp dụng mã" }));
    await screen.findByText(/Đã áp dụng BREW10, giảm/);
    expect(screen.getByText("Tổng cần thanh toán").parentElement?.textContent).toContain("22.500");

    fireEvent.change(screen.getByLabelText("Đổi điểm thành viên"), { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: "Áp dụng điểm" }));
    await waitFor(() => expect(previewBodies.some((body) =>
      body.promoCode === "BREW10" && body.redeemPoints === 100,
    )).toBe(true));
    await waitFor(() => expect(screen.getByText("Tổng cần thanh toán").parentElement?.textContent)
      .toContain("12.500"));
    expect(screen.getByText("Giảm bằng điểm").parentElement?.textContent).toContain("10.000");
    expect(screen.getByText("Tổng cần thanh toán").parentElement?.textContent).toContain("12.500");
    expect(previewBodies.some((body) => body.promoCode === "BREW10" && body.redeemPoints === 100)).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Tăng số lượng Cà phê sữa" }));
    await waitFor(() => expect(previewBodies.some((body) =>
      body.promoCode === "BREW10" &&
      body.redeemPoints === 100 &&
      (body.items as Array<{ quantity: number }>)[0]?.quantity === 2,
    )).toBe(true));
    await waitFor(() => expect(screen.getByText("Tổng cần thanh toán").parentElement?.textContent)
      .toContain("35.000"));

    fireEvent.change(screen.getByLabelText("Mã khuyến mãi"), { target: { value: "BAD" } });
    fireEvent.click(screen.getByRole("button", { name: "Áp dụng mã" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Mã khuyến mãi không hợp lệ");
  });
});

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../components/auth-provider";
import { CartProvider } from "../../components/cart-provider";
import { CheckoutProvider } from "../../components/checkout-provider";
import LoginPage from "./page";

const navigation = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
}));

function renderLogin(returnTo: string) {
  window.history.replaceState({}, "", `/login?returnTo=${encodeURIComponent(returnTo)}`);
  return render(
    <CartProvider>
      <AuthProvider>
        <CheckoutProvider><LoginPage /></CheckoutProvider>
      </AuthProvider>
    </CartProvider>,
  );
}

function mockLogin(role: "CUSTOMER" | "STAFF") {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      accessToken: "test-token",
      user: {
        id: "test-id",
        email: `${role.toLowerCase()}@example.com`,
        loyaltyPoints: 0,
        role,
      },
    }),
  }));
}

async function submitLogin() {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.com" } });
  fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "test-password" } });
  fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));
}

describe("role-based login redirect", () => {
  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
    vi.unstubAllGlobals();
    navigation.replace.mockReset();
  });

  it("sends staff to the staff home instead of a customer return path", async () => {
    mockLogin("STAFF");
    renderLogin("/cart");
    await submitLogin();
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/staff"));
  });

  it("sends a customer away from staff routes to the menu", async () => {
    mockLogin("CUSTOMER");
    renderLogin("/staff/orders");
    await submitLogin();
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/"));
  });

  it("sends a customer with no return path to the menu", async () => {
    mockLogin("CUSTOMER");
    renderLogin("/");
    await submitLogin();
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/"));
  });

  it("preserves a valid checkout return path for a customer", async () => {
    mockLogin("CUSTOMER");
    renderLogin("/checkout?from=cart");
    await submitLogin();
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/checkout?from=cart"));
  });

  it("keeps a staff return path within the staff workspace", async () => {
    mockLogin("STAFF");
    renderLogin("/staff/promotions");
    await submitLogin();
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/staff/promotions"));
  });
});

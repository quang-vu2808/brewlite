import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "./auth-provider";
import { StaffOrdersPanel } from "./staff-orders-panel";

const sessionKey = "brewlite-auth-v1";

describe("StaffOrdersPanel order history", () => {
  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows archived state filters and retains the cancel action for allowed queue states", async () => {
    window.sessionStorage.setItem(sessionKey, "staff-token");
    vi.stubGlobal("fetch", vi.fn().mockImplementation((input: RequestInfo | URL) =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => String(input).endsWith("/auth/me")
          ? {
            id: "staff-id",
            email: "staff@example.com",
            loyaltyPoints: 0,
            role: "STAFF",
          }
          : {
            items: [{
              id: "order-id",
              orderCode: "order-id",
              status: "PAID",
              totalAmount: 25000,
              createdAt: new Date().toISOString(),
              items: [],
            }],
            total: 1,
            page: 1,
            limit: 20,
          },
      }),
    ));
    vi.stubGlobal("confirm", vi.fn(() => true));

    render(<AuthProvider><StaffOrdersPanel /></AuthProvider>);
    expect(await screen.findByText(/order-id/)).toBeTruthy();
    expect(screen.getByRole("option", { name: "Đã hoàn thành" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Đã hủy" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Hủy đơn" }));
    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/orders/order-id/status"),
      expect.objectContaining({ method: "PATCH" }),
    ));
  });
});

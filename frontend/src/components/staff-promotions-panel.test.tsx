import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "./auth-provider";
import { StaffPromotionsPanel } from "./staff-promotions-panel";

describe("StaffPromotionsPanel", () => {
  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("summarizes, searches and filters promotions by their effective status", async () => {
    window.sessionStorage.setItem("brewlite-auth-v1", "staff-token");
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/auth/me")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: "staff-id",
            email: "staff@example.com",
            loyaltyPoints: 0,
            role: "STAFF",
          }),
        };
      }
      if (url.endsWith("/promotions/staff")) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            {
              code: "BREW10",
              discountType: "PERCENT",
              value: 10,
              minimumAmount: 0,
              maximumDiscount: null,
              isActive: true,
              startsAt: null,
              endsAt: null,
              usageLimit: null,
              usageCount: 2,
            },
            {
              code: "BREW20",
              discountType: "FIXED",
              value: 20000,
              minimumAmount: 100000,
              maximumDiscount: null,
              isActive: false,
              startsAt: null,
              endsAt: null,
              usageLimit: null,
              usageCount: 0,
            },
          ],
        };
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AuthProvider><StaffPromotionsPanel /></AuthProvider>);

    expect(await screen.findByText("BREW10")).toBeTruthy();
    expect(screen.getByText("BREW20")).toBeTruthy();
    expect(screen.getByText("Tổng mã").parentElement?.textContent).toContain("2");

    fireEvent.change(screen.getByLabelText("Tìm mã"), { target: { value: "brew10" } });
    expect(screen.getByText("BREW10")).toBeTruthy();
    expect(screen.queryByText("BREW20")).toBeNull();

    fireEvent.change(screen.getByLabelText("Trạng thái"), { target: { value: "paused" } });
    fireEvent.change(screen.getByLabelText("Tìm mã"), { target: { value: "" } });
    expect(screen.getByText("BREW20")).toBeTruthy();
    expect(screen.queryByText("BREW10")).toBeNull();
  });
});

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "./auth-provider";
import { StaffShell } from "./staff-shell";

const navigation = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
  usePathname: () => "/staff/orders",
}));

describe("StaffShell", () => {
  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
    vi.unstubAllGlobals();
    navigation.replace.mockReset();
  });

  it("only renders staff navigation after the backend confirms STAFF role", async () => {
    window.sessionStorage.setItem("brewlite-auth-v1", "verified-token");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: "staff-id",
        email: "staff@example.com",
        loyaltyPoints: 0,
        role: "STAFF",
      }),
    }));

    render(<AuthProvider><StaffShell><p>Staff-only content</p></StaffShell></AuthProvider>);
    expect(await screen.findByText("Staff-only content")).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Điều hướng nhân viên" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Quản lý đơn hàng" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Giỏ hàng/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Đăng xuất" })).toBeTruthy();
  });

  it("does not render staff pages for a customer token", async () => {
    window.sessionStorage.setItem("brewlite-auth-v1", "customer-token");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: "customer-id",
        email: "customer@example.com",
        loyaltyPoints: 2,
        role: "CUSTOMER",
      }),
    }));

    render(<AuthProvider><StaffShell><p>Staff-only content</p></StaffShell></AuthProvider>);
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/"));
    expect(screen.queryByText("Staff-only content")).toBeNull();
  });
});

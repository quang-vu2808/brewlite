import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../../components/auth-provider";
import StaffLoginPage from "./page";

const navigation = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));

function renderPage(returnTo = "/staff/orders") {
  window.history.replaceState({}, "", `/staff/login?returnTo=${encodeURIComponent(returnTo)}`);
  return render(<AuthProvider><StaffLoginPage /></AuthProvider>);
}

function mockLogin(role: "STAFF" | "CUSTOMER") {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      accessToken: "test-token",
      user: {
        id: "user-id",
        email: `${role.toLowerCase()}@example.com`,
        loyaltyPoints: 0,
        role,
      },
    }),
  }));
}

async function submit() {
  fireEvent.change(screen.getByLabelText("Email nhân viên"), { target: { value: "staff@example.com" } });
  fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "test-password" } });
  fireEvent.click(screen.getByRole("button", { name: "Đăng nhập vào Staff" }));
}

describe("staff login", () => {
  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
    vi.unstubAllGlobals();
    navigation.replace.mockReset();
  });

  it("uses the current auth API and sends staff to their safe staff return path", async () => {
    mockLogin("STAFF");
    renderPage("/staff/orders");
    await submit();
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/staff/orders"));
    expect(window.sessionStorage.getItem("brewlite-auth-v1")).toBe("test-token");
  });

  it("does not save or route a customer token into Staff", async () => {
    mockLogin("CUSTOMER");
    renderPage();
    await submit();
    expect((await screen.findByRole("alert")).textContent?.toLowerCase()).toContain("không có quyền");
    expect(navigation.replace).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem("brewlite-auth-v1")).toBeNull();
  });

  it("rejects a customer return path and falls back to the Staff home", async () => {
    mockLogin("STAFF");
    renderPage("/checkout");
    await submit();
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/staff"));
  });
});

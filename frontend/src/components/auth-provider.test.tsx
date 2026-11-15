import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./auth-provider";

function AuthProbe() {
  const { token, user, signIn, logout } = useAuth();

  return (
    <div>
      <output data-testid="session-user">{user?.email ?? "signed-out"}</output>
      <output data-testid="session-token">{token ?? "no-token"}</output>
      <button onClick={() => signIn("memory-only-token", {
        id: "user-id",
        email: "customer@example.com",
        loyaltyPoints: 0,
      })}>
        Sign in
      </button>
      <button onClick={logout}>Sign out</button>
    </div>
  );
}

function renderAuth() {
  return render(
    <AuthProvider>
      <AuthProbe />
    </AuthProvider>,
  );
}

describe("AuthProvider", () => {
  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("shares the session, keeps the token in tab session storage, and clears it on logout", () => {
    renderAuth();
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByTestId("session-user").textContent).toBe("customer@example.com");
    expect(screen.getByTestId("session-token").textContent).toBe("memory-only-token");
    expect(window.sessionStorage.getItem("brewlite-auth-v1")).toBe("memory-only-token");
    expect(window.localStorage.length).toBe(0);

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(screen.getByTestId("session-user").textContent).toBe("signed-out");
    expect(screen.getByTestId("session-token").textContent).toBe("no-token");
    expect(window.sessionStorage.getItem("brewlite-auth-v1")).toBeNull();
  });

  it("restores a tab session only after the backend verifies the current role", async () => {
    window.sessionStorage.setItem("brewlite-auth-v1", "saved-staff-token");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: "staff-id",
        email: "staff@example.com",
        loyaltyPoints: 0,
        role: "STAFF",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const mounted = renderAuth();
    await waitFor(() => {
      expect(screen.getByTestId("session-user").textContent).toBe("staff@example.com");
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/auth/me",
      expect.objectContaining({
        headers: { Authorization: "Bearer saved-staff-token" },
        cache: "no-store",
      }),
    );
    mounted.unmount();
    vi.unstubAllGlobals();
  });
});

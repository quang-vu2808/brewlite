import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
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
  afterEach(cleanup);

  it("shares the session and clears it on logout without persisting the token", () => {
    renderAuth();
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByTestId("session-user").textContent).toBe("customer@example.com");
    expect(screen.getByTestId("session-token").textContent).toBe("memory-only-token");
    expect(window.localStorage.length).toBe(0);

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(screen.getByTestId("session-user").textContent).toBe("signed-out");
    expect(screen.getByTestId("session-token").textContent).toBe("no-token");
  });

  it("requires a fresh login after the in-memory provider is remounted", () => {
    const mounted = renderAuth();
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    mounted.unmount();

    renderAuth();
    expect(screen.getByTestId("session-user").textContent).toBe("signed-out");
    expect(screen.getByTestId("session-token").textContent).toBe("no-token");
  });
});

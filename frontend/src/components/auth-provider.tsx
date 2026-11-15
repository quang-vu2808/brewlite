"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/$/, "");
const SESSION_KEY = "brewlite-auth-v1";

export type AuthUser = {
  id: string;
  email: string;
  loyaltyPoints: number;
  role?: "CUSTOMER" | "STAFF";
};

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  status: "loading" | "authenticated" | "anonymous" | "error";
  authError: string | null;
  signIn: (token: string, user: AuthUser) => void;
  updateUser: (updates: Partial<AuthUser>) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<{
    token: string;
    user: AuthUser;
  } | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");
  const [authError, setAuthError] = useState<string | null>(null);
  const authEpoch = useRef(0);

  useEffect(() => {
    const epoch = authEpoch.current;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      let savedToken: string | null;
      try {
        savedToken = window.sessionStorage.getItem(SESSION_KEY);
      } catch {
        setAuthError("Không thể đọc phiên đăng nhập trong tab này.");
        setStatus("error");
        return;
      }
      if (!savedToken) {
        setStatus("anonymous");
        return;
      }

      void fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${savedToken}` },
        signal: controller.signal,
        cache: "no-store",
      }).then(async (response) => {
        if (response.status === 401 || response.status === 403) {
          if (authEpoch.current === epoch && !controller.signal.aborted) {
            window.sessionStorage.removeItem(SESSION_KEY);
            setSession(null);
            setStatus("anonymous");
          }
          return null;
        }
        if (!response.ok) throw new Error(`Session verification failed (${response.status}).`);
        const payload: unknown = await response.json().catch(() => null);
        if (!isAuthUser(payload)) throw new Error("Session verification returned invalid user data.");
        if (authEpoch.current !== epoch || controller.signal.aborted) return;
        setSession({ token: savedToken, user: payload });
        setStatus("authenticated");
        setAuthError(null);
      }).catch((error: unknown) => {
        if (authEpoch.current !== epoch || controller.signal.aborted) return;
        setAuthError(error instanceof Error ? error.message : "Không thể xác minh phiên đăng nhập.");
        setStatus("error");
      });
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, []);

  const signIn = useCallback((token: string, user: AuthUser) => {
    authEpoch.current += 1;
    window.sessionStorage.setItem(SESSION_KEY, token);
    setSession({ token, user });
    setStatus("authenticated");
    setAuthError(null);
  }, []);

  const logout = useCallback(() => {
    authEpoch.current += 1;
    window.sessionStorage.removeItem(SESSION_KEY);
    setSession(null);
    setStatus("anonymous");
    setAuthError(null);
  }, []);
  const updateUser = useCallback((updates: Partial<AuthUser>) => {
    setSession((current) => current
      ? { ...current, user: { ...current.user, ...updates } }
      : current);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    token: session?.token ?? null,
    user: session?.user ?? null,
    status,
    authError,
    signIn,
    updateUser,
    logout,
  }), [session, status, authError, signIn, updateUser, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function isAuthUser(value: unknown): value is AuthUser {
  if (typeof value !== "object" || value === null) return false;
  const user = value as Record<string, unknown>;
  return typeof user.id === "string" &&
    typeof user.email === "string" &&
    Number.isSafeInteger(user.loyaltyPoints) &&
    (user.role === "CUSTOMER" || user.role === "STAFF");
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth phải được sử dụng bên trong AuthProvider");
  return context;
}

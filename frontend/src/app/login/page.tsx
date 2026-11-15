"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AuthUser, useAuth } from "../../components/auth-provider";
import { SiteHeader } from "../../components/site-header";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/$/, "");

function isLoginResponse(value: unknown): value is {
  accessToken: string;
  user: AuthUser;
} {
  if (typeof value !== "object" || value === null) return false;
  const response = value as Record<string, unknown>;
  if (typeof response.accessToken !== "string" || typeof response.user !== "object" || response.user === null) return false;
  const user = response.user as Record<string, unknown>;
  return typeof user.id === "string" &&
    typeof user.email === "string" &&
    Number.isSafeInteger(user.loyaltyPoints) &&
    (user.role === "CUSTOMER" || user.role === "STAFF");
}

function readErrorMessage(value: unknown): string {
  if (typeof value !== "object" || value === null || !("message" in value)) {
    return "Không thể đăng nhập. Vui lòng thử lại.";
  }
  const message = value.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message) && message.every((item) => typeof item === "string")) {
    return message.join(", ");
  }
  return "Không thể đăng nhập. Vui lòng thử lại.";
}

function safeReturnTo(value: string | null, role: AuthUser["role"]): string {
  if (!value?.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return role === "STAFF" ? "/staff" : "/";
  }
  const path = new URL(value, "http://brewlite.local").pathname;
  const staffPath = path === "/staff" || path.startsWith("/staff/");
  if (role === "STAFF") return staffPath ? value : "/staff";
  return staffPath ? "/" : value;
}

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [returnTo, setReturnTo] = useState("/");
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      setReturnTo(params.get("returnTo") ?? "/");
      setRegistered(params.get("registered") === "1");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(readErrorMessage(payload));
      if (!isLoginResponse(payload)) throw new Error("Phản hồi đăng nhập không hợp lệ");

      signIn(payload.accessToken, payload.user);
      const requestedPath = new URLSearchParams(window.location.search).get("returnTo") ?? returnTo;
      router.replace(safeReturnTo(requestedPath, payload.user.role));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể đăng nhập. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  const registerHref = `/register?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <div className="site-shell">
      <SiteHeader />
      <main className="auth-main">
        <section className="auth-card">
          <span className="section-kicker">WELCOME BACK</span>
          <h1>Đăng nhập</h1>
          <p className="auth-intro">Đăng nhập để tiếp tục với giỏ hàng và tạo đơn BrewLite.</p>
          {registered && <p className="auth-success" role="status">Đăng ký thành công. Hãy đăng nhập để tiếp tục.</p>}
          <form className="auth-form" onSubmit={submit}>
            <label htmlFor="login-email">Email</label>
            <input
              autoComplete="email"
              id="login-email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
            <label htmlFor="login-password">Mật khẩu</label>
            <input
              autoComplete="current-password"
              id="login-password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="detail-action auth-submit" disabled={submitting} type="submit">
              {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>
          <p className="auth-switch">Chưa có tài khoản? <Link href={registerHref}>Đăng ký</Link></p>
          <p className="auth-switch">Là nhân viên? <Link href="/staff/login">Đăng nhập Staff</Link></p>
        </section>
      </main>
      <footer className="footer">
        <div><span className="footer-brand">Brew<span>Lite</span></span><p>Một chút cà phê, một ngày nhiều cảm hứng.</p></div>
        <div className="footer-right"><span>Đồ án học phần Công nghệ phần mềm · Trường Đại học Sài Gòn</span><small>© {new Date().getFullYear()} BrewLite</small></div>
      </footer>
    </div>
  );
}

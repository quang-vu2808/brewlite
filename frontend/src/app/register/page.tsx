"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { SiteHeader } from "../../components/site-header";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/$/, "");

function readErrorMessage(value: unknown): string {
  if (typeof value !== "object" || value === null || !("message" in value)) {
    return "Không thể đăng ký. Vui lòng thử lại.";
  }
  const message = value.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message) && message.every((item) => typeof item === "string")) {
    return message.join(", ");
  }
  return "Không thể đăng ký. Vui lòng thử lại.";
}

function safeReturnTo(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") && !value.includes("\\")
    ? value
    : "/";
}

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [returnTo, setReturnTo] = useState("/");
  const [error, setError] = useState("");
  const [registered, setRegistered] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setReturnTo(safeReturnTo(new URLSearchParams(window.location.search).get("returnTo")));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    if (password !== confirmation) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}/.test(password)) {
      setError("Mật khẩu cần ít nhất 12 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(readErrorMessage(payload));
      setPassword("");
      setConfirmation("");
      setRegistered(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể đăng ký. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  const loginHref = `/login?registered=1&returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <div className="site-shell">
      <SiteHeader />
      <main className="auth-main">
        <section className="auth-card">
          <span className="section-kicker">JOIN BREWLITE</span>
          <h1>Tạo tài khoản</h1>
          <p className="auth-intro">Đăng ký để lưu lại thông tin và tiếp tục đặt món yêu thích.</p>
          {registered ? (
            <div className="auth-success-panel" role="status">
              <p>Đăng ký thành công. Mật khẩu đã được bảo vệ và bạn có thể đăng nhập ngay.</p>
              <Link className="detail-action auth-submit" href={loginHref}>Đi đến đăng nhập</Link>
            </div>
          ) : (
            <form className="auth-form" onSubmit={submit}>
              <label htmlFor="register-email">Email</label>
              <input
                autoComplete="email"
                id="register-email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
              <label htmlFor="register-password">Mật khẩu</label>
              <input
                autoComplete="new-password"
                id="register-password"
                minLength={12}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
              <small className="auth-help">Ít nhất 12 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.</small>
              <label htmlFor="register-confirmation">Nhập lại mật khẩu</label>
              <input
                autoComplete="new-password"
                id="register-confirmation"
                onChange={(event) => setConfirmation(event.target.value)}
                required
                type="password"
                value={confirmation}
              />
              {error && <p className="auth-error" role="alert">{error}</p>}
              <button className="detail-action auth-submit" disabled={submitting} type="submit">
                {submitting ? "Đang tạo tài khoản..." : "Đăng ký"}
              </button>
            </form>
          )}
          <p className="auth-switch">Đã có tài khoản? <Link href={`/login?returnTo=${encodeURIComponent(returnTo)}`}>Đăng nhập</Link></p>
        </section>
      </main>
      <footer className="footer">
        <div><span className="footer-brand">Brew<span>Lite</span></span><p>Một chút cà phê, một ngày nhiều cảm hứng.</p></div>
        <div className="footer-right"><span>Đồ án học phần Công nghệ phần mềm · Trường Đại học Sài Gòn</span><small>© {new Date().getFullYear()} BrewLite</small></div>
      </footer>
    </div>
  );
}

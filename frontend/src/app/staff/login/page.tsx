"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AuthUser, useAuth } from "../../../components/auth-provider";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/$/, "");

function isLoginResponse(value: unknown): value is { accessToken: string; user: AuthUser } {
  if (typeof value !== "object" || value === null) return false;
  const response = value as Record<string, unknown>;
  if (typeof response.accessToken !== "string" || typeof response.user !== "object" || response.user === null) return false;
  const user = response.user as Record<string, unknown>;
  return typeof user.id === "string" &&
    typeof user.email === "string" &&
    Number.isSafeInteger(user.loyaltyPoints) &&
    (user.role === "CUSTOMER" || user.role === "STAFF");
}

function safeStaffReturnTo(value: string | null) {
  if (!value?.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/staff";
  const path = new URL(value, "http://brewlite.local").pathname;
  return path === "/staff" || path.startsWith("/staff/") ? value : "/staff";
}

function errorMessage(value: unknown) {
  if (typeof value !== "object" || value === null || !("message" in value)) return "Không thể đăng nhập.";
  const message = value.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message) && message.every((item) => typeof item === "string")) return message.join(", ");
  return "Không thể đăng nhập.";
}

export default function StaffLoginPage() {
  const router = useRouter();
  const { signIn, status, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [returnTo, setReturnTo] = useState("/staff");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setReturnTo(safeStaffReturnTo(new URLSearchParams(window.location.search).get("returnTo")));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (status === "authenticated" && user?.role === "STAFF") router.replace(returnTo);
  }, [status, user?.role, returnTo, router]);

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
      if (!response.ok) throw new Error(errorMessage(payload));
      if (!isLoginResponse(payload)) throw new Error("Phản hồi đăng nhập không hợp lệ.");
      if (payload.user.role !== "STAFF") {
        setError("Tài khoản này không có quyền đăng nhập khu vực nhân viên.");
        return;
      }
      signIn(payload.accessToken, payload.user);
      router.replace(returnTo);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể đăng nhập.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="staff-login-page">
      <section className="staff-login-card">
        <Link className="staff-login-brand" href="/staff/login" aria-label="BrewLite Staff">
          <span className="staff-brand-mark">B</span>
          <span>BrewLite<small>CỔNG NHÂN VIÊN</small></span>
        </Link>
        <span className="section-kicker">STAFF ACCESS</span>
        <h1>Đăng nhập nhân viên</h1>
        <p>Đăng nhập bằng tài khoản nhân viên được quản trị viên cấp.</p>
        <form className="auth-form" onSubmit={submit}>
          <label htmlFor="staff-login-email">Email nhân viên</label>
          <input id="staff-login-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
          <label htmlFor="staff-login-password">Mật khẩu</label>
          <input id="staff-login-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="detail-action auth-submit" type="submit" disabled={submitting}>
            {submitting ? "Đang xác minh..." : "Đăng nhập vào Staff"}
          </button>
        </form>
        <Link className="staff-login-back" href="/">Quay lại BrewLite</Link>
      </section>
    </main>
  );
}

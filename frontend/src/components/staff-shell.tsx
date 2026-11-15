"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth, type AuthUser } from "./auth-provider";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/$/, "");
const links = [
  { href: "/staff", label: "Tổng quan" },
  { href: "/staff/orders", label: "Quản lý đơn hàng" },
  { href: "/staff/ingredients", label: "Quản lý nguyên liệu" },
  { href: "/staff/promotions", label: "Quản lý khuyến mãi" },
  { href: "/staff/account", label: "Tài khoản nhân viên" },
];

export function StaffShell({ children }: { children: ReactNode }) {
  const { status, authError, user, token, logout, updateUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const userId = user?.id;
  const userRole = user?.role;
  const [menuOpen, setMenuOpen] = useState(false);
  const [verifiedPath, setVerifiedPath] = useState("");
  const [verificationError, setVerificationError] = useState("");

  useEffect(() => {
    if (status === "anonymous") {
      router.replace(`/staff/login?returnTo=${encodeURIComponent(pathname || "/staff")}`);
    } else if (status === "authenticated" && userRole !== "STAFF") {
      router.replace("/");
    } else if (status === "authenticated" && token && userId) {
      const controller = new AbortController();
      const path = pathname;
      const timer = window.setTimeout(() => {
        void fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
          cache: "no-store",
        }).then(async (response) => {
          const payload: unknown = await response.json().catch(() => null);
          if (!response.ok) {
            if (response.status === 401 || response.status === 403) logout();
            throw new Error(`Không thể xác minh quyền nhân viên (HTTP ${response.status}).`);
          }
          if (!isStaffUser(payload)) {
            logout();
            router.replace("/");
            return;
          }
          updateUser(payload);
          setVerificationError("");
          setVerifiedPath(path);
        }).catch((error: unknown) => {
          if (!controller.signal.aborted) {
            setVerificationError(error instanceof Error ? error.message : "Không thể xác minh quyền nhân viên.");
          }
        });
      }, 0);
      return () => {
        window.clearTimeout(timer);
        controller.abort();
      };
    }
  }, [status, userId, userRole, token, pathname, router, logout, updateUser]);

  if (status === "error") {
    return (
      <main className="staff-auth-state">
        <h1>Không thể xác minh phiên nhân viên</h1>
        <p role="alert">{authError}</p>
        <button className="detail-action" type="button" onClick={() => window.location.reload()}>
          Thử xác minh lại
        </button>
      </main>
    );
  }
  if (status !== "authenticated" || user?.role !== "STAFF" || verifiedPath !== pathname) {
    if (verificationError) {
      return (
        <main className="staff-auth-state">
          <h1>Không thể xác minh quyền nhân viên</h1>
          <p role="alert">{verificationError}</p>
          <button className="detail-action" type="button" onClick={() => window.location.reload()}>
            Thử xác minh lại
          </button>
        </main>
      );
    }
    return <main className="staff-auth-state" role="status">Đang xác minh quyền truy cập...</main>;
  }

  return (
    <div className="staff-shell">
      <aside id="staff-sidebar" className={`staff-sidebar${menuOpen ? " is-open" : ""}`}>
        <Link className="staff-brand" href="/staff" onClick={() => setMenuOpen(false)}>
          <span className="staff-brand-mark">B</span>
          <span>BrewLite<small>KHÔNG GIAN NHÂN VIÊN</small></span>
        </Link>
        <nav className="staff-navigation" aria-label="Điều hướng nhân viên">
          {links.map((link) => (
            <Link
              aria-current={pathname === link.href ? "page" : undefined}
              className={pathname === link.href ? "is-active" : ""}
              href={link.href}
              key={link.href}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="staff-sidebar-account">
          <span className="staff-user-avatar" aria-hidden="true">{user.email.charAt(0).toUpperCase()}</span>
          <span className="staff-user-email">{user.email}</span>
          <button type="button" onClick={logout}>Đăng xuất</button>
        </div>
      </aside>
      <div className="staff-workspace">
        <header className="staff-topbar">
          <button
            type="button"
            className="staff-menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="staff-sidebar"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? "Đóng menu" : "Menu nhân viên"}
          </button>
          <span>{user.email}</span>
        </header>
        <main className="staff-content">{children}</main>
      </div>
    </div>
  );
}

function isStaffUser(value: unknown): value is AuthUser {
  if (typeof value !== "object" || value === null) return false;
  const user = value as Record<string, unknown>;
  return typeof user.id === "string" &&
    typeof user.email === "string" &&
    Number.isSafeInteger(user.loyaltyPoints) &&
    user.role === "STAFF";
}

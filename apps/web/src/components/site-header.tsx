"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "./cart-provider";
import { useAuth } from "./auth-provider";

export function SiteHeader({ home = false }: { home?: boolean }) {
  const { hydrated, totalItems } = useCart();
  const { user, logout } = useAuth();
  const [navigationOpen, setNavigationOpen] = useState(false);
  const closeNavigation = () => setNavigationOpen(false);

  return (
    <header className="header">
      <Link href="/" className="brand" aria-label="BrewLite - trang chủ">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="BrewLite" width="166" height="45" />
      </Link>
      <button
        className="header-nav-toggle"
        type="button"
        aria-label={navigationOpen ? "Đóng điều hướng" : "Mở điều hướng"}
        aria-expanded={navigationOpen}
        aria-controls="primary-navigation"
        onClick={() => setNavigationOpen((open) => !open)}
      >
        <span /><span /><span />
      </button>
      <nav id="primary-navigation" className={`nav${navigationOpen ? " is-open" : ""}`} aria-label="Điều hướng chính">
        {user?.role === "STAFF" ? (
          <Link href="/staff" onClick={closeNavigation}>Khu vực nhân viên</Link>
        ) : home ? <>
          <a href="#gioi-thieu" onClick={closeNavigation}>Giới thiệu</a>
          <a href="#menu" onClick={closeNavigation}>Menu</a>
        </> : <>
          <Link href="/#gioi-thieu" onClick={closeNavigation}>Giới thiệu</Link>
          <Link href="/#menu" onClick={closeNavigation}>Menu</Link>
        </>}
      </nav>
      <div className="header-actions">
        <div className={`header-auth-controls${user ? " is-authenticated" : ""}`}>
          {user ? (
            <details className="header-account-menu">
              <summary className="header-account-link" aria-label={`Tài khoản, ${user.email}`}>
                <span className="header-account-avatar" aria-hidden="true">
                  {user.email.charAt(0).toUpperCase()}
                </span>
                <span className="header-account-label">{user.email}</span>
                <span aria-hidden="true">⌄</span>
              </summary>
              <div className="header-account-popover">
                <Link href="/account">Tài khoản · {user.loyaltyPoints} điểm</Link>
                {user.role !== "STAFF" && <Link href="/orders">Lịch sử đơn hàng</Link>}
                {user.role === "STAFF" && <Link href="/staff">Trang quản lý</Link>}
                <button className="header-auth-button" type="button" onClick={logout}>Đăng xuất</button>
              </div>
            </details>
          ) : (
            <Link className="header-auth-button" href="/login">Đăng nhập</Link>
          )}
        </div>
        {user?.role !== "STAFF" && (
          <Link className="cart-header-link" href="/cart" aria-label={`Giỏ hàng${hydrated ? `, ${totalItems} sản phẩm` : ""}`}>
            <span aria-hidden="true">🛒</span><span className="cart-header-text">Giỏ hàng</span>
            <span className="cart-badge" aria-live="polite">{hydrated ? totalItems : 0}</span>
          </Link>
        )}
      </div>
    </header>
  );
}

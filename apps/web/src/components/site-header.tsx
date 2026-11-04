"use client";

import Link from "next/link";
import { useCart } from "./cart-provider";
import { useAuth } from "./auth-provider";

export function SiteHeader({ home = false }: { home?: boolean }) {
  const { hydrated, totalItems } = useCart();
  const { user, logout } = useAuth();

  return (
    <header className="header">
      <Link href="/" className="brand" aria-label="BrewLite - trang chủ">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="BrewLite" width="166" height="45" />
      </Link>
      <nav className="nav" aria-label="Điều hướng chính">
        {home ? <><a href="#gioi-thieu">Giới thiệu</a><a href="#menu">Menu</a></> : <><Link href="/#gioi-thieu">Giới thiệu</Link><Link href="/#menu">Menu</Link></>}
      </nav>
      <div className="header-actions">
        {home && <a className="header-button" href="#menu">Xem menu <span aria-hidden="true">↗</span></a>}
        {!home && <Link className="header-button" href="/#menu">← Quay lại menu</Link>}
        <div className={`header-auth-controls${user ? " is-authenticated" : ""}`}>
          {user ? (
            <>
              <Link className="header-orders-link" href="/orders">Đơn hàng</Link>
              <Link
                className="header-account-link"
                href="/account"
                aria-label={`Tài khoản, ${user.email}`}
                title={user.email}
              >
                <span className="header-account-avatar" aria-hidden="true">
                  {user.email.charAt(0).toUpperCase()}
                </span>
                <span className="header-account-label">Tài khoản</span>
              </Link>
              <button className="header-auth-button" type="button" onClick={logout}>Đăng xuất</button>
            </>
          ) : (
            <Link className="header-auth-button" href="/login">Đăng nhập</Link>
          )}
        </div>
        <Link className="cart-header-link" href="/cart" aria-label={`Giỏ hàng${hydrated ? `, ${totalItems} sản phẩm` : ""}`}>
          <span aria-hidden="true">🛒</span><span className="cart-header-text">Giỏ hàng</span>
          <span className="cart-badge" aria-live="polite">{hydrated ? totalItems : 0}</span>
        </Link>
      </div>
    </header>
  );
}

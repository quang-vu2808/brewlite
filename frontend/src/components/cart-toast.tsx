"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "./cart-provider";

const formatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export function CartToast() {
  const { recentlyAdded, dismissAddedItem } = useCart();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = hovered || focused;

  useEffect(() => {
    if (!recentlyAdded || paused) return;
    const timer = window.setTimeout(dismissAddedItem, 4500);
    return () => window.clearTimeout(timer);
  }, [recentlyAdded, paused, dismissAddedItem]);

  if (!recentlyAdded) return null;

  return (
    <aside
      className="cart-toast"
      role="status"
      aria-live="polite"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      <div className="cart-toast-heading">
        <span className="cart-toast-success-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="m6 12.5 4 4 8-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <h2>Đã thêm vào giỏ hàng!</h2>
        <button className="cart-toast-close" type="button" onClick={dismissAddedItem} aria-label="Đóng thông báo">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m7 7 10 10M17 7 7 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="cart-toast-product">
        <div className="cart-toast-image product-image">
          {recentlyAdded.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={recentlyAdded.image} alt="" />
          ) : <span aria-hidden="true">☕</span>}
        </div>
        <div className="cart-toast-product-info">
          <strong>{recentlyAdded.name}</strong>
          <span>
            Size {recentlyAdded.size}
            {recentlyAdded.toppings.length > 0
              ? ` · ${recentlyAdded.toppings.map((topping) => topping.name).join(", ")}`
              : ""}
          </span>
          <span>Số lượng: {recentlyAdded.quantity}</span>
          <b>{formatter.format(recentlyAdded.unitPrice * recentlyAdded.quantity)}</b>
        </div>
      </div>

      <div className="cart-toast-actions">
        <Link className="cart-toast-view" href="/cart" onClick={dismissAddedItem}>
          Xem giỏ hàng
        </Link>
        <button className="cart-toast-continue" type="button" onClick={dismissAddedItem}>
          Tiếp tục mua sắm
        </button>
      </div>
    </aside>
  );
}

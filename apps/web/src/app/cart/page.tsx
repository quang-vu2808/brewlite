"use client";

import Link from "next/link";
import { useState } from "react";
import { SiteHeader } from "../../components/site-header";
import { useCart } from "../../components/cart-provider";
import { useAuth } from "../../components/auth-provider";

type CreatedOrder = {
  orderCode: string;
  status: "PENDING";
  totalAmount: number;
};

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/$/, "");
const formatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

function isCreatedOrder(value: unknown): value is CreatedOrder {
  if (typeof value !== "object" || value === null) return false;
  const order = value as Record<string, unknown>;
  return typeof order.orderCode === "string" &&
    order.status === "PENDING" &&
    Number.isSafeInteger(order.totalAmount) &&
    Number(order.totalAmount) >= 0;
}

export default function CartPage() {
  const { items, hydrated, totalItems, totalPrice, increaseQuantity, decreaseQuantity, removeItem, clearCart } = useCart();
  const { token, user, logout } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);
  const [requiresAuthentication, setRequiresAuthentication] = useState(false);

  async function createOrder() {
    if (submitting || items.length === 0 || !token) return;
    setSubmitting(true);
    setOrderError("");
    setRequiresAuthentication(false);

    try {
      const response = await fetch(`${API_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: Number(item.productId),
            size: item.size,
            toppings: item.toppings.map((topping) => topping.id),
            quantity: item.quantity,
          })),
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          setRequiresAuthentication(true);
          throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.");
        }
        const detail: unknown = await response.json().catch(() => null);
        const message = typeof detail === "object" && detail !== null &&
          "message" in detail && typeof detail.message === "string"
          ? detail.message
          : `API trả HTTP ${response.status}`;
        throw new Error(message);
      }

      const payload: unknown = await response.json();
      if (!isCreatedOrder(payload)) throw new Error("Phản hồi tạo đơn hàng không hợp lệ");

      setCreatedOrder(payload);
      clearCart();
    } catch (error) {
      setOrderError(error instanceof Error ? error.message : "Không thể tạo đơn hàng");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="site-shell">
      <SiteHeader />
      <main className="cart-main">
        <div className="cart-heading">
          <div>
            <span className="section-kicker">BREWLITE SELECTION</span>
            <h1>Giỏ hàng <span>của bạn.</span></h1>
          </div>
          {hydrated && items.length > 0 && <span className="cart-item-count">{totalItems} sản phẩm</span>}
        </div>

        {createdOrder && (
          <section className="order-created-panel" role="status">
            <span className="order-created-check" aria-hidden="true">✓</span>
            <div>
              <h2>Đơn hàng đã được tạo</h2>
              <p>Mã đơn: <strong>{createdOrder.orderCode}</strong></p>
              <p>Trạng thái: <strong>{createdOrder.status}</strong> · Tổng tiền {formatter.format(createdOrder.totalAmount)}</p>
              <small>Đơn đang chờ xử lý. Đây chưa phải xác nhận thanh toán.</small>
            </div>
          </section>
        )}

        {!hydrated ? (
          <div className="cart-loading" role="status">Đang tải giỏ hàng...</div>
        ) : items.length === 0 ? (
          <section className="state-panel empty-cart">
            <span className="state-icon" aria-hidden="true">☕</span>
            <h2>Giỏ hàng đang trống</h2>
            <p>Chọn món yêu thích từ menu để bắt đầu.</p>
            <Link className="detail-action" href="/#menu">Khám phá menu</Link>
          </section>
        ) : (
          <div className="cart-layout">
            <section className="cart-items" aria-label="Các sản phẩm trong giỏ">
              {items.map((item) => (
                <article className="cart-item" key={item.key}>
                  <Link className="cart-item-image product-image" href={`/products/${encodeURIComponent(item.productId)}`} aria-label={`Xem ${item.name}`}>
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt="" />
                    ) : <span className="coffee-symbol" aria-hidden="true">☕</span>}
                  </Link>
                  <div className="cart-item-content">
                    <div className="cart-item-title">
                      <div>
                        <Link href={`/products/${encodeURIComponent(item.productId)}`}><h2>{item.name}</h2></Link>
                        <p>Size {item.size}{item.toppings.length > 0 ? ` · ${item.toppings.map((topping) => topping.name).join(", ")}` : ""}</p>
                      </div>
                      <button className="remove-cart-item" type="button" onClick={() => removeItem(item.key)} aria-label={`Xóa ${item.name}, size ${item.size}`}>
                        Xóa
                      </button>
                    </div>
                    <div className="cart-item-bottom">
                      <div className="quantity-control" aria-label={`Số lượng ${item.name}`}>
                        <button type="button" onClick={() => decreaseQuantity(item.key)} aria-label={`Giảm số lượng ${item.name}`}>−</button>
                        <span aria-live="polite">{item.quantity}</span>
                        <button type="button" onClick={() => increaseQuantity(item.key)} aria-label={`Tăng số lượng ${item.name}`} disabled={item.quantity >= 99}>+</button>
                      </div>
                      <div className="cart-item-prices">
                        <span>Đơn giá {formatter.format(item.unitPrice)}</span>
                        <strong>{formatter.format(item.unitPrice * item.quantity)}</strong>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </section>

            <aside className="cart-summary" aria-label="Tổng kết đơn hàng">
              <h2>Tổng giỏ hàng</h2>
              <p><span>Tạm tính ({totalItems} sản phẩm)</span><strong>{formatter.format(totalPrice)}</strong></p>
              <p className="cart-total"><span>Tổng cộng</span><strong>{formatter.format(totalPrice)}</strong></p>
              {!user ? (
                <div className="cart-auth-prompt">
                  <p>Đăng nhập để tiếp tục tạo đơn. Giỏ hàng của bạn vẫn được giữ nguyên.</p>
                  <Link className="detail-action create-order-button" href="/login?returnTo=%2Fcart">Đăng nhập để đặt đơn</Link>
                </div>
              ) : (
                <button className="detail-action create-order-button" type="button" onClick={createOrder} disabled={submitting || !hydrated}>
                  {submitting ? "Đang tạo đơn..." : "Tạo đơn hàng"}
                </button>
              )}
              {orderError && <p className="order-error" role="alert">{orderError}</p>}
              {requiresAuthentication && <Link className="cart-login-retry" href="/login?returnTo=%2Fcart">Đăng nhập lại</Link>}
              <Link className="continue-shopping" href="/#menu">← Tiếp tục chọn món</Link>
            </aside>
          </div>
        )}
      </main>
      <footer className="footer">
        <div><span className="footer-brand">Brew<span>Lite</span></span><p>Một chút cà phê, một ngày nhiều cảm hứng.</p></div>
        <div className="footer-right"><span>Đồ án học phần Công nghệ phần mềm · Trường Đại học Sài Gòn</span><small>© {new Date().getFullYear()} BrewLite</small></div>
      </footer>
    </div>
  );
}

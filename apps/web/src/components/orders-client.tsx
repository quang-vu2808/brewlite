"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "./auth-provider";
import { SiteHeader } from "./site-header";
import { parseCheckoutOrder, type CheckoutOrder } from "./checkout-provider";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/$/, "");
const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

type OrderPayment = {
  id: string;
  method: "WALLET" | "CARD";
  status: "SUCCESS" | "FAILED";
  amount: number;
  createdAt: string;
};

type OrderSnapshot = CheckoutOrder & { payment: OrderPayment | null };

function isOrderSnapshot(value: unknown): value is OrderSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const snapshot = value as Partial<OrderSnapshot>;
  if (!parseCheckoutOrder(value)) return false;
  if (snapshot.payment === null) return true;
  if (typeof snapshot.payment !== "object" || snapshot.payment === null) return false;
  const payment = snapshot.payment;
  return typeof payment.id === "string" &&
    (payment.method === "WALLET" || payment.method === "CARD") &&
    (payment.status === "SUCCESS" || payment.status === "FAILED") &&
    Number.isSafeInteger(payment.amount) &&
    typeof payment.createdAt === "string";
}

function getErrorMessage(value: unknown, fallback: string) {
  if (typeof value !== "object" || value === null || !("message" in value)) return fallback;
  const message = value.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message) && message.every((item) => typeof item === "string")) {
    return message.join(", ");
  }
  return fallback;
}

function OrderStatus({ status }: { status: CheckoutOrder["status"] }) {
  return <span className={`orders-status orders-status-${status.toLowerCase()}`}>{status}</span>;
}

export function OrdersClient({ detail = false }: { detail?: boolean }) {
  const params = useParams<{ id?: string }>();
  const orderId = detail ? params.id : undefined;
  const activeOrderId = orderId;
  const { token, logout } = useAuth();
  const [orders, setOrders] = useState<OrderSnapshot[]>([]);
  const [order, setOrder] = useState<OrderSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }

    const controller = new AbortController();
    async function loadOrders() {
      setLoading(true);
      setError("");
      setUnauthorized(false);
      try {
        const endpoint = activeOrderId
          ? `${API_URL}/orders/${encodeURIComponent(activeOrderId)}`
          : `${API_URL}/orders/me`;
        const response = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          if (response.status === 401) {
            logout();
            setUnauthorized(true);
          }
          throw new Error(getErrorMessage(payload, `Không thể tải đơn hàng (HTTP ${response.status}).`));
        }

        if (activeOrderId) {
          if (!isOrderSnapshot(payload) || payload.id !== activeOrderId) {
            throw new Error("Dữ liệu đơn hàng không hợp lệ.");
          }
          setOrder(payload);
        } else if (
          !Array.isArray(payload) ||
          !payload.every(isOrderSnapshot)
        ) {
          throw new Error("Dữ liệu lịch sử đơn hàng không hợp lệ.");
        } else {
          setOrders(payload);
        }
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(loadError instanceof Error ? loadError.message : "Không thể kết nối dịch vụ đơn hàng.");
        if (activeOrderId) setOrder(null);
        else setOrders([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadOrders();
    return () => controller.abort();
  }, [token, activeOrderId, logout]);

  return (
    <div className="site-shell">
      <SiteHeader />
      <main className="orders-main">
        <div className="orders-heading">
          <span className="section-kicker">BREWLITE · ĐƠN HÀNG CỦA BẠN</span>
          <h1>{detail ? "Chi tiết " : "Lịch sử "}<span>đơn hàng.</span></h1>
          <p>Theo dõi trạng thái và thông tin các đơn hàng của bạn.</p>
        </div>

        {!token ? (
          <section className="state-panel orders-state">
            <h2>Đăng nhập để xem đơn hàng</h2>
            <p>Lịch sử đơn hàng được bảo vệ và chỉ chủ tài khoản mới có thể truy cập.</p>
            <Link className="detail-action" href="/login?returnTo=%2Forders">Đăng nhập</Link>
          </section>
        ) : loading ? (
          <div className="cart-loading" role="status">Đang tải đơn hàng...</div>
        ) : error ? (
          <section className="state-panel orders-state" role="alert">
            <h2>{unauthorized ? "Phiên đăng nhập đã hết hạn" : "Chưa thể tải đơn hàng"}</h2>
            <p>{error}</p>
            <Link className="detail-action" href="/login?returnTo=%2Forders">Đăng nhập lại</Link>
          </section>
        ) : detail ? (
          order ? (
            <section className="order-detail-card">
              <div className="order-detail-top">
                <div>
                  <span className="checkout-label">MÃ ĐƠN HÀNG</span>
                  <strong className="order-code">{order.orderCode}</strong>
                </div>
                <OrderStatus status={order.status} />
              </div>
              <p className="order-date">
                Đặt lúc {new Intl.DateTimeFormat("vi-VN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(order.createdAt))}
              </p>
              <div className="order-detail-lines">
                {order.items.map((item, index) => (
                  <article className="order-detail-line" key={`${item.productId}-${index}`}>
                    <div>
                      <h2>{item.productName}</h2>
                      <p>
                        Size {item.size}
                        {item.toppings.length > 0
                          ? ` · ${item.toppings.map((topping) => topping.name).join(", ")}`
                          : ""}
                        {" · "}SL {item.quantity}
                      </p>
                      <span>{currency.format(item.unitPrice)} / món</span>
                    </div>
                    <strong>{currency.format(item.lineTotal)}</strong>
                  </article>
                ))}
              </div>
              {order.payment && (
                <div className="order-payment-note">
                  Thanh toán {order.payment.method === "WALLET" ? "ví mô phỏng" : "thẻ mô phỏng"} ·{" "}
                  {order.payment.status === "SUCCESS" ? "Thành công" : "Thất bại"}
                </div>
              )}
              <div className="order-detail-total">
                <span>Tổng cộng</span><strong>{currency.format(order.totalAmount)}</strong>
              </div>
              <div className="order-detail-actions">
                <Link className="detail-action" href="/orders">Lịch sử đơn hàng</Link>
                {order.status === "PENDING" && <Link className="continue-shopping" href="/checkout">Tiếp tục thanh toán</Link>}
              </div>
            </section>
          ) : null
        ) : orders.length === 0 ? (
          <section className="state-panel orders-state">
            <span className="state-icon" aria-hidden="true">☕</span>
            <h2>Bạn chưa có đơn hàng</h2>
            <p>Các đơn hàng sau khi tạo sẽ xuất hiện tại đây.</p>
            <Link className="detail-action" href="/#menu">Khám phá menu</Link>
          </section>
        ) : (
          <section className="orders-list" aria-label="Danh sách đơn hàng">
            {orders.map((entry) => (
              <Link className="order-list-card" href={`/orders/${encodeURIComponent(entry.id)}`} key={entry.id}>
                <div className="order-list-top">
                  <span className="order-code">{entry.orderCode}</span>
                  <OrderStatus status={entry.status} />
                </div>
                <div className="order-list-bottom">
                  <span>{entry.items.length} dòng sản phẩm · {new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(entry.createdAt))}</span>
                  <strong>{currency.format(entry.totalAmount)}</strong>
                </div>
              </Link>
            ))}
          </section>
        )}
      </main>
      <footer className="footer">
        <div><span className="footer-brand">Brew<span>Lite</span></span><p>Một chút cà phê, một ngày nhiều cảm hứng.</p></div>
        <div className="footer-right"><span>Đồ án học phần Công nghệ phần mềm · Trường Đại học Sài Gòn</span><small>© {new Date().getFullYear()} BrewLite</small></div>
      </footer>
    </div>
  );
}

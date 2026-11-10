"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-provider";
import { SiteHeader } from "./site-header";
import { parseCheckoutOrder, type CheckoutOrder, useCheckout } from "./checkout-provider";

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
  const router = useRouter();
  const orderId = detail ? params.id : undefined;
  const activeOrderId = orderId;
  const { token, logout, updateUser } = useAuth();
  const { setOrder: setCheckoutOrder } = useCheckout();
  const [orders, setOrders] = useState<OrderSnapshot[]>([]);
  const [order, setLoadedOrder] = useState<OrderSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unauthorized, setUnauthorized] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [refreshKey, setRefreshKey] = useState(0);
  const [actionBusy, setActionBusy] = useState(false);

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
          setLoadedOrder(payload);
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
        if (activeOrderId) setLoadedOrder(null);
        else setOrders([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadOrders();
    return () => controller.abort();
  }, [token, activeOrderId, logout, refreshKey]);

  async function cancelOrder() {
    if (!order || actionBusy || !window.confirm("Bạn có chắc muốn hủy đơn hàng này?")) return;
    setActionBusy(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/orders/${encodeURIComponent(order.id)}/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401) {
          logout();
          setUnauthorized(true);
        }
        throw new Error(getErrorMessage(payload, `Không thể hủy đơn (HTTP ${response.status}).`));
      }
      if (typeof payload === "object" && payload !== null &&
          "loyaltyPoints" in payload && Number.isSafeInteger(payload.loyaltyPoints)) {
        updateUser({ loyaltyPoints: Number(payload.loyaltyPoints) });
      }
      setRefreshKey((current) => current + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Không thể hủy đơn.");
    } finally {
      setActionBusy(false);
    }
  }

  function retryPayment() {
    if (!order) return;
    setCheckoutOrder(order);
    router.push("/checkout");
  }

  const visibleOrders = statusFilter === "ALL"
    ? orders
    : orders.filter((entry) => entry.status === statusFilter);
  const paidOrders = orders.filter((entry) =>
    ["PAID", "PREPARING", "READY", "COMPLETED"].includes(entry.status),
  );
  const totalSpent = paidOrders.reduce((total, entry) => total + entry.totalAmount, 0);

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
              {(order.discountAmount ?? 0) > 0 && (
                <div className="order-discount-lines">
                  <p><span>Tạm tính</span><strong>{currency.format(order.subtotalAmount ?? order.totalAmount + (order.discountAmount ?? 0) + (order.loyaltyDiscountAmount ?? 0))}</strong></p>
                  {order.promotionCode && <p><span>Mã {order.promotionCode}</span><strong>−{currency.format(order.discountAmount ?? 0)}</strong></p>}
                </div>
              )}
              {(order.loyaltyDiscountAmount ?? 0) > 0 && (
                <div className="order-discount-lines">
                  <p><span>Đổi {order.redeemedPoints} điểm</span><strong>−{currency.format(order.loyaltyDiscountAmount ?? 0)}</strong></p>
                </div>
              )}
              <div className="order-detail-total">
                <span>Tổng cộng</span><strong>{currency.format(order.totalAmount)}</strong>
              </div>
              {(order.loyaltyPointsAwarded ?? 0) > 0 && (
                <p className="order-points-earned">Đã cộng {order.loyaltyPointsAwarded} điểm thành viên</p>
              )}
              {error && <p className="order-error" role="alert">{error}</p>}
              <div className="order-detail-actions">
                <Link className="detail-action" href="/orders">Lịch sử đơn hàng</Link>
                {(order.status === "PENDING" || order.status === "PAYMENT_FAILED") && (
                  <button className="continue-shopping order-action-button" type="button" onClick={retryPayment}>
                    {order.status === "PAYMENT_FAILED" ? "Thử thanh toán lại" : "Tiếp tục thanh toán"}
                  </button>
                )}
                {["PENDING", "PAYMENT_FAILED", "PAID"].includes(order.status) && (
                  <button className="order-cancel-button" type="button" onClick={cancelOrder} disabled={actionBusy}>
                    {actionBusy ? "Đang hủy..." : "Hủy đơn hàng"}
                  </button>
                )}
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
          <>
            <section className="orders-summary" aria-label="Tóm tắt đơn hàng">
              <article><span>Tổng số đơn</span><strong>{orders.length}</strong></article>
              <article><span>Đã thanh toán</span><strong>{paidOrders.length}</strong></article>
              <article><span>Tổng chi tiêu</span><strong>{currency.format(totalSpent)}</strong></article>
            </section>
            <label className="orders-filter">
              <span>Lọc trạng thái</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="ALL">Tất cả đơn</option>
                <option value="PENDING">Chờ thanh toán</option>
                <option value="PAYMENT_FAILED">Thanh toán thất bại</option>
                <option value="PAID">Đã thanh toán</option>
                <option value="PREPARING">Đang pha chế</option>
                <option value="READY">Sẵn sàng</option>
                <option value="COMPLETED">Hoàn tất</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
            </label>
            {visibleOrders.length === 0 ? (
              <section className="state-panel orders-state"><h2>Không có đơn hàng phù hợp</h2><p>Thử chọn trạng thái khác.</p></section>
            ) : <section className="orders-list" aria-label="Danh sách đơn hàng">
            {visibleOrders.map((entry) => (
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
            </section>}
          </>
        )}
      </main>
      <footer className="footer">
        <div><span className="footer-brand">Brew<span>Lite</span></span><p>Một chút cà phê, một ngày nhiều cảm hứng.</p></div>
        <div className="footer-right"><span>Đồ án học phần Công nghệ phần mềm · Trường Đại học Sài Gòn</span><small>© {new Date().getFullYear()} BrewLite</small></div>
      </footer>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteHeader } from "../../components/site-header";
import { useAuth } from "../../components/auth-provider";
import { useCart } from "../../components/cart-provider";
import {
  parseCheckoutPayment,
  useCheckout,
  type CheckoutPayment,
  parseCheckoutOrder,
} from "../../components/checkout-provider";

type PaymentMethod = "WALLET" | "CARD";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/$/, "");
const formatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

function errorMessage(value: unknown, fallback: string): string {
  if (typeof value !== "object" || value === null || !("message" in value)) {
    return fallback;
  }
  const message = value.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message) && message.every((item) => typeof item === "string")) {
    return message.join(", ");
  }
  return fallback;
}

export default function CheckoutPage() {
  const { hydrated, order, payment, setOrder, setPayment } = useCheckout();
  const { token, user, logout } = useAuth();
  const { clearCart } = useCart();
  const [method, setMethod] = useState<PaymentMethod>("WALLET");
  const [submitting, setSubmitting] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [requiresAuthentication, setRequiresAuthentication] = useState(false);
  const [orderRefreshError, setOrderRefreshError] = useState("");
  const activeOrderId = order?.id;

  useEffect(() => {
    if (!hydrated || !activeOrderId || !token) return;
    const currentOrderId: string = activeOrderId;
    const accessToken: string = token;

    const controller = new AbortController();
    async function refreshOrder() {
      setOrderRefreshError("");
      try {
        const response = await fetch(`${API_URL}/orders/${encodeURIComponent(currentOrderId)}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
        });
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          if (response.status === 401) logout();
          throw new Error(errorMessage(payload, `Không thể xác minh đơn hàng (HTTP ${response.status}).`));
        }

        const refreshedOrder = parseCheckoutOrder(payload);
        if (!refreshedOrder || refreshedOrder.id !== currentOrderId) {
          throw new Error("Dữ liệu đơn hàng từ máy chủ không hợp lệ.");
        }
        setOrder(refreshedOrder);

        const paymentValue = typeof payload === "object" && payload !== null && "payment" in payload
          ? payload.payment
          : null;
        if (paymentValue === null) return;
        if (typeof paymentValue !== "object" || paymentValue === null) {
          throw new Error("Dữ liệu thanh toán từ máy chủ không hợp lệ.");
        }
        const snapshot = paymentValue as {
          id?: unknown;
          method?: unknown;
          status?: unknown;
          amount?: unknown;
          createdAt?: unknown;
        };
        if (
          typeof snapshot.id !== "string" ||
          (snapshot.method !== "WALLET" && snapshot.method !== "CARD") ||
          (snapshot.status !== "SUCCESS" && snapshot.status !== "FAILED") ||
          typeof snapshot.amount !== "number" ||
          !Number.isSafeInteger(snapshot.amount) ||
          typeof snapshot.createdAt !== "string"
        ) {
          throw new Error("Dữ liệu thanh toán từ máy chủ không hợp lệ.");
        }
        const payment: CheckoutPayment = {
          paymentId: snapshot.id,
          orderId: refreshedOrder.id,
          method: snapshot.method,
          status: snapshot.status,
          orderStatus: refreshedOrder.status === "PAID" ? "PAID" : "PAYMENT_FAILED",
          amount: snapshot.amount as number,
          message: snapshot.status === "SUCCESS"
            ? "Thanh toán mô phỏng thành công"
            : "Thanh toán mô phỏng thất bại",
          createdAt: snapshot.createdAt,
        };
        setPayment(payment);
      } catch (error) {
        if (!controller.signal.aborted) {
          setOrderRefreshError(error instanceof Error ? error.message : "Không thể xác minh đơn hàng.");
        }
      }
    }

    void refreshOrder();
    return () => controller.abort();
  }, [hydrated, activeOrderId, token, logout, setOrder, setPayment]);

  async function submitPayment() {
    if (!order || !token || submitting || payment?.status === "SUCCESS") return;
    setSubmitting(true);
    setRequestError("");
    setRequiresAuthentication(false);

    try {
      const response = await fetch(`${API_URL}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId: order.id, method }),
      });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          setRequiresAuthentication(true);
        }
        throw new Error(errorMessage(payload, `Không thể thanh toán (HTTP ${response.status}).`));
      }

      const result: CheckoutPayment | null = parseCheckoutPayment(payload);
      if (!result || result.orderId !== order.id || result.method !== method) {
        throw new Error("Phản hồi thanh toán không hợp lệ.");
      }

      setPayment(result);
      if (result.status === "SUCCESS") clearCart();
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Không thể kết nối dịch vụ thanh toán.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="site-shell">
      <SiteHeader />
      <main className="checkout-main">
        <div className="checkout-heading">
          <span className="section-kicker">BREWLITE · THANH TOÁN MÔ PHỎNG</span>
          <h1>Hoàn tất <span>đơn hàng.</span></h1>
          <p>Đây là giao dịch mô phỏng; không có khoản tiền thật được thu.</p>
        </div>

        {!hydrated ? (
          <div className="cart-loading" role="status">Đang tải thông tin đơn hàng...</div>
        ) : !order ? (
          <section className="state-panel checkout-empty">
            <span className="state-icon" aria-hidden="true">☕</span>
            <h2>Chưa có đơn hàng cần thanh toán</h2>
            <p>Hãy quay lại giỏ hàng để tạo đơn. Tải lại trang sẽ không tự tạo đơn mới.</p>
            <Link className="detail-action" href="/cart">Quay lại giỏ hàng</Link>
          </section>
        ) : (
          <>
            <section className="checkout-order" aria-label="Thông tin đơn hàng">
              {orderRefreshError && <p className="order-error" role="alert">{orderRefreshError}</p>}
              <div className="checkout-order-heading">
                <div>
                  <span className="checkout-label">MÃ ĐƠN HÀNG</span>
                  <strong>{order.orderCode}</strong>
                </div>
                <span className={`checkout-status ${order.status === "PAID" ? "is-paid" : order.status === "PAYMENT_FAILED" ? "is-failed" : ""}`}>
                  {order.status}
                </span>
              </div>
              <div className="checkout-lines">
                {order.items.map((item, index) => (
                  <div className="checkout-line" key={`${item.productId}-${item.size}-${index}`}>
                    <div>
                      <strong>{item.productName}</strong>
                      <span>
                        Size {item.size}
                        {item.toppings.length > 0
                          ? ` · ${item.toppings.map((topping) => topping.name).join(", ")}`
                          : ""}
                        {" · "}SL {item.quantity}
                      </span>
                    </div>
                    <strong>{formatter.format(item.lineTotal)}</strong>
                  </div>
                ))}
              </div>
              <div className="checkout-total">
                <span>Tổng thanh toán</span>
                <strong>{formatter.format(payment?.amount ?? order.totalAmount)}</strong>
              </div>
            </section>

            {payment?.status === "SUCCESS" ? (
              <section className="payment-result payment-success" role="status">
                <span className="payment-result-icon" aria-hidden="true">✓</span>
                <div>
                  <h2>Thanh toán thành công</h2>
                  <p>Đơn <strong>{order.orderCode}</strong> đã được xác nhận ở trạng thái <strong>PAID</strong>.</p>
                  <p>{payment.method === "WALLET" ? "Ví điện tử mô phỏng" : "Thẻ mô phỏng"} · {formatter.format(payment.amount)}</p>
                  <Link className="detail-action" href="/#menu">Quay về Menu</Link>
                </div>
              </section>
            ) : (
              <>
                {payment?.status === "FAILED" && (
                  <section className="payment-result payment-failure" role="status">
                    <span className="payment-result-icon" aria-hidden="true">!</span>
                    <div>
                      <h2>Thanh toán chưa thành công</h2>
                      <p>Đơn <strong>{order.orderCode}</strong> đang ở trạng thái <strong>PAYMENT_FAILED</strong>.</p>
                      <p>Bạn có thể thử lại trên chính đơn hàng này; hệ thống không tạo đơn mới.</p>
                    </div>
                  </section>
                )}

                {!user || !token ? (
                  <section className="checkout-auth-prompt">
                    {requestError && <p className="order-error" role="alert">{requestError}</p>}
                    <p>Đăng nhập để tiếp tục thanh toán. Đơn hàng vẫn được giữ lại trong phiên trình duyệt này.</p>
                    <Link className="detail-action" href="/login?returnTo=%2Fcheckout">Đăng nhập để tiếp tục</Link>
                  </section>
                ) : (
                  <section className="payment-panel">
                    <div className="payment-panel-heading">
                      <div>
                        <span className="section-kicker">CHỌN PHƯƠNG THỨC</span>
                        <h2>Thanh toán mô phỏng</h2>
                      </div>
                      <span className="mock-payment-note">Không thu tiền thật</span>
                    </div>

                    <div className="payment-methods" role="radiogroup" aria-label="Phương thức thanh toán">
                      <label className={`payment-method ${method === "WALLET" ? "is-selected" : ""}`}>
                        <input
                          checked={method === "WALLET"}
                          name="payment-method"
                          onChange={() => setMethod("WALLET")}
                          type="radio"
                          value="WALLET"
                        />
                        <span className="payment-method-icon" aria-hidden="true">▣</span>
                        <span><strong>Ví điện tử</strong><small>Ví mô phỏng BrewLite</small></span>
                        <span className="payment-radio" aria-hidden="true" />
                      </label>
                      <label className={`payment-method ${method === "CARD" ? "is-selected" : ""}`}>
                        <input
                          checked={method === "CARD"}
                          name="payment-method"
                          onChange={() => setMethod("CARD")}
                          type="radio"
                          value="CARD"
                        />
                        <span className="payment-method-icon" aria-hidden="true">▰</span>
                        <span><strong>Thẻ</strong><small>Thẻ mô phỏng, không nhập thông tin thẻ</small></span>
                        <span className="payment-radio" aria-hidden="true" />
                      </label>
                    </div>

                    {requestError && <p className="order-error" role="alert">{requestError}</p>}
                    {requiresAuthentication && (
                      <Link className="cart-login-retry" href="/login?returnTo=%2Fcheckout">
                        Đăng nhập lại để tiếp tục thanh toán
                      </Link>
                    )}
                    <button
                      className="detail-action payment-submit"
                      disabled={submitting || order.status === "PAID"}
                      onClick={submitPayment}
                      type="button"
                    >
                      {submitting
                        ? "Đang xử lý..."
                        : `Thanh toán ${formatter.format(order.totalAmount)}`}
                    </button>
                    {order.status === "PAID" && (
                      <p className="checkout-already-paid">Đơn hàng này đã được thanh toán.</p>
                    )}
                  </section>
                )}
              </>
            )}
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

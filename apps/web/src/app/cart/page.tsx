"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SiteHeader } from "../../components/site-header";
import { useCart } from "../../components/cart-provider";
import { useAuth } from "../../components/auth-provider";
import { parseCheckoutOrder, useCheckout } from "../../components/checkout-provider";
import { fetchInventory, type InventoryRecord } from "../../lib/inventory";
import { useEffect } from "react";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/$/, "");
const formatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export default function CartPage() {
  const router = useRouter();
  const { items, hydrated, totalItems, totalPrice, increaseQuantity, decreaseQuantity, removeItem } = useCart();
  const { token, user, logout, updateUser } = useAuth();
  const { setOrder } = useCheckout();
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [requiresAuthentication, setRequiresAuthentication] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [redeemPoints, setRedeemPoints] = useState("");
  const [appliedPromoCode, setAppliedPromoCode] = useState("");
  const [appliedRedeemPoints, setAppliedRedeemPoints] = useState(0);
  const [preview, setPreview] = useState<{
    subtotalAmount: number;
    discountAmount: number;
    redeemedPoints: number;
    loyaltyDiscountAmount: number;
    totalAmount: number;
    projectedLoyaltyPoints: number;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [inventory, setInventory] = useState<Map<number, InventoryRecord>>(new Map());
  const [inventoryError, setInventoryError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void fetchInventory(controller.signal).then((records) => {
      if (controller.signal.aborted) return;
      setInventory(new Map(records.map((record) => [record.productId, record])));
      setInventoryError("");
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) {
        setInventoryError(error instanceof Error ? error.message : "Không thể tải tồn kho");
      }
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!hydrated || !token || items.length === 0) {
      const resetTimer = window.setTimeout(() => {
        setPreview(null);
        setPreviewError("");
        setPreviewLoading(false);
      }, 0);
      return () => window.clearTimeout(resetTimer);
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setPreviewLoading(true);
      setPreviewError("");
      void fetch(`${API_URL}/orders/preview`, {
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
          ...(appliedPromoCode ? { promoCode: appliedPromoCode } : {}),
          ...(appliedRedeemPoints > 0 ? { redeemPoints: appliedRedeemPoints } : {}),
        }),
        signal: controller.signal,
      }).then(async (response) => {
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          if (response.status === 401) logout();
          const message = typeof payload === "object" && payload !== null &&
            "message" in payload && typeof payload.message === "string"
            ? payload.message
            : `Không thể xem trước giá (HTTP ${response.status}).`;
          throw new Error(message);
        }
        if (typeof payload !== "object" || payload === null ||
            !("subtotalAmount" in payload) || !("discountAmount" in payload) ||
            !("redeemedPoints" in payload) || !("loyaltyDiscountAmount" in payload) ||
            !("totalAmount" in payload) || !("projectedLoyaltyPoints" in payload)) {
          throw new Error("Dữ liệu xem trước giá không hợp lệ.");
        }
        const values = [
          payload.subtotalAmount,
          payload.discountAmount,
          payload.redeemedPoints,
          payload.loyaltyDiscountAmount,
          payload.totalAmount,
          payload.projectedLoyaltyPoints,
        ];
        if (values.some((value) => typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)) {
          throw new Error("Số tiền xem trước không hợp lệ.");
        }
        setPreview(payload as typeof preview);
      }).catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setPreview(null);
          setPreviewError(error instanceof Error ? error.message : "Không thể xem trước giá.");
        }
      }).finally(() => {
        if (!controller.signal.aborted) setPreviewLoading(false);
      });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [hydrated, token, items, appliedPromoCode, appliedRedeemPoints, logout]);

  const stockShortages = items.reduce((shortages, item) => {
    const productId = Number(item.productId);
    const available = inventory.get(productId)?.stock;
    const ordered = items.filter((line) => Number(line.productId) === productId)
      .reduce((sum, line) => sum + line.quantity, 0);
    if (available === undefined || ordered > available) shortages.push(item.name);
    return shortages;
  }, [] as string[]);

  async function createOrder() {
    if (submitting || items.length === 0 || !token ||
        (previewError && (appliedPromoCode || appliedRedeemPoints > 0)) ||
        (appliedPromoCode !== "" && preview?.discountAmount === 0) ||
        (appliedRedeemPoints > 0 && preview?.redeemedPoints !== appliedRedeemPoints)) return;
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
          ...(appliedPromoCode ? { promoCode: appliedPromoCode } : {}),
          ...(appliedRedeemPoints > 0 ? { redeemPoints: appliedRedeemPoints } : {}),
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
      const order = parseCheckoutOrder(payload);
      if (!order || order.status !== "PENDING") {
        throw new Error("Phản hồi tạo đơn hàng không hợp lệ");
      }

      setOrder(order);
      if (order.loyaltyPoints !== undefined) updateUser({ loyaltyPoints: order.loyaltyPoints });
      router.push("/checkout");
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
              <label className="cart-promo-field">
                <span>Mã khuyến mãi</span>
                <input
                  type="text"
                  value={promoCode}
                  onChange={(event) => {
                    setPromoCode(event.target.value);
                    setAppliedPromoCode("");
                  }}
                  placeholder="Ví dụ: BREW10"
                  maxLength={40}
                  autoComplete="off"
                />
              </label>
              <button
                className="cart-apply-button"
                type="button"
                disabled={!token || !promoCode.trim() || previewLoading}
                onClick={() => setAppliedPromoCode(promoCode.trim().toUpperCase())}
              >
                {previewLoading ? "Đang kiểm tra..." : "Áp dụng mã"}
              </button>
              {appliedPromoCode && !previewError && preview && (
                <small className="cart-preview-success" role="status">
                  {preview.discountAmount > 0
                    ? `Đã áp dụng ${appliedPromoCode}, giảm ${formatter.format(preview.discountAmount)}`
                    : `Mã ${appliedPromoCode} không được áp dụng`}
                </small>
              )}
              <label className="cart-promo-field" htmlFor="redeem-points">
                <span>Đổi điểm thành viên</span>
                <input
                  id="redeem-points"
                  type="number"
                  min="0"
                  max={user?.loyaltyPoints ?? 0}
                  step="1"
                  value={redeemPoints}
                  onChange={(event) => {
                    setRedeemPoints(event.target.value);
                    setAppliedRedeemPoints(0);
                  }}
                  disabled={!user || user.loyaltyPoints === 0}
                />
              </label>
              <p className="cart-promo-hint">Bạn có <strong>{user?.loyaltyPoints ?? 0} điểm</strong>; 1 điểm = 100đ.</p>
              <div className="cart-point-actions">
                <button
                  type="button"
                  className="cart-apply-button"
                  disabled={!token || !redeemPoints || previewLoading}
                  onClick={() => setAppliedRedeemPoints(Number(redeemPoints))}
                >
                  Áp dụng điểm
                </button>
                <button
                  type="button"
                  className="cart-apply-button is-secondary"
                  disabled={!user || !preview}
                  onClick={() => {
                    const remaining = Math.max(0, (preview?.subtotalAmount ?? totalPrice) - (preview?.discountAmount ?? 0));
                    const maximum = Math.min(user?.loyaltyPoints ?? 0, Math.floor(remaining / 100));
                    setRedeemPoints(String(maximum));
                    setAppliedRedeemPoints(maximum);
                  }}
                >
                  Dùng tối đa
                </button>
              </div>
              <div className="cart-stock-notice" role={inventoryError || stockShortages.length > 0 ? "alert" : "status"}>
                {inventoryError || (stockShortages.length > 0
                  ? `Tồn kho chưa đủ cho: ${[...new Set(stockShortages)].join(", ")}`
                  : "Tồn kho đã được kiểm tra")}
              </div>
              <div className="cart-price-breakdown" aria-live="polite">
                <p><span>Tạm tính</span><strong>{formatter.format(preview?.subtotalAmount ?? totalPrice)}</strong></p>
                {(preview?.discountAmount ?? 0) > 0 && <p><span>Mã {appliedPromoCode}</span><strong>−{formatter.format(preview?.discountAmount ?? 0)}</strong></p>}
                {(preview?.redeemedPoints ?? 0) > 0 && <>
                  <p><span>Điểm sẽ sử dụng</span><strong>{preview?.redeemedPoints} điểm</strong></p>
                  <p><span>Giảm bằng điểm</span><strong>−{formatter.format(preview?.loyaltyDiscountAmount ?? 0)}</strong></p>
                </>}
                <p className="cart-total"><span>Tổng cần thanh toán</span><strong>{formatter.format(preview?.totalAmount ?? totalPrice)}</strong></p>
                {previewLoading && <small role="status">Đang cập nhật giá từ máy chủ...</small>}
                {previewError && <p className="order-error" role="alert">{previewError}</p>}
                {preview && <small>Dự kiến nhận {preview.projectedLoyaltyPoints} điểm sau khi thanh toán thành công.</small>}
              </div>
              {!user ? (
                <div className="cart-auth-prompt">
                  <p>Đăng nhập để tiếp tục tạo đơn. Giỏ hàng của bạn vẫn được giữ nguyên.</p>
                  <Link className="detail-action create-order-button" href="/login?returnTo=%2Fcart">Đăng nhập để đặt đơn</Link>
                </div>
              ) : (
                <button className="detail-action create-order-button" type="button" onClick={createOrder} disabled={submitting || !hydrated || !!inventoryError || stockShortages.length > 0 || previewLoading || !!previewError || (appliedPromoCode && !preview?.discountAmount) || (appliedRedeemPoints > 0 && preview?.redeemedPoints !== appliedRedeemPoints)}>
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

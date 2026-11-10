"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./auth-provider";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/$/, "");
const currency = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
type OrderStatus = "PENDING" | "PAYMENT_FAILED" | "PAID" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";
type StaffOrder = {
  id: string;
  orderCode: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  items: Array<{
    productName: string;
    quantity: number;
    size: string;
    toppings: Array<{ name: string }>;
  }>;
};
type PageResult = { items: StaffOrder[]; total: number; page: number; limit: number };

function messageFrom(payload: unknown, fallback: string) {
  if (typeof payload !== "object" || payload === null || !("message" in payload)) return fallback;
  const message = payload.message;
  return typeof message === "string" ? message : fallback;
}

export function StaffOrdersPanel() {
  const { token, logout } = useAuth();
  const [result, setResult] = useState<PageResult | null>(null);
  const [status, setStatus] = useState<"ALL" | OrderStatus>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  const load = useCallback(async (signal: AbortSignal) => {
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (status !== "ALL") params.set("status", status);
    if (search.trim()) params.set("search", search.trim());
    try {
      const response = await fetch(`${API_URL}/orders/staff/queue?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
        cache: "no-store",
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) logout();
        throw new Error(messageFrom(payload, `Không thể tải đơn hàng (HTTP ${response.status}).`));
      }
      if (typeof payload !== "object" || payload === null ||
          !("items" in payload) || !Array.isArray(payload.items) ||
          !("total" in payload) || typeof payload.total !== "number") {
        throw new Error("Dữ liệu hàng đợi đơn hàng không hợp lệ.");
      }
      setResult(payload as PageResult);
      setError("");
    } catch (reason) {
      if (!signal.aborted) setError(reason instanceof Error ? reason.message : "Không thể tải đơn hàng.");
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [token, logout, page, status, search]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [load, reload]);

  async function changeStatus(order: StaffOrder, next: OrderStatus) {
    const confirmation = next === "CANCELLED"
      ? `Bạn có chắc muốn hủy đơn ${order.orderCode}? Hệ thống sẽ hoàn kho và điểm liên quan nếu đủ điều kiện.`
      : `Xác nhận chuyển đơn ${order.orderCode} sang ${next}?`;
    if (!token || !window.confirm(confirmation)) return;
    setBusy(order.id);
    setError("");
    try {
      const response = await fetch(`${API_URL}/orders/${encodeURIComponent(order.id)}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) logout();
        throw new Error(messageFrom(payload, `Không thể cập nhật đơn (HTTP ${response.status}).`));
      }
      setReload((value) => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể cập nhật trạng thái đơn.");
    } finally {
      setBusy("");
    }
  }

  const totalPages = Math.max(1, Math.ceil((result?.total ?? 0) / 20));
  const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
    PAID: "PREPARING",
    PREPARING: "READY",
    READY: "COMPLETED",
  };

  return (
    <section className="staff-page">
      <div className="staff-page-heading">
        <div><span className="section-kicker">VẬN HÀNH</span><h1>Quản lý đơn hàng</h1></div>
        <span>{result?.total ?? 0} {status === "COMPLETED" ? "đơn đã hoàn thành" : status === "CANCELLED" ? "đơn đã hủy" : "đơn"}</span>
      </div>
      <div className="staff-order-filters">
        <label>Trạng thái
          <select value={status} onChange={(event) => { setPage(1); setStatus(event.target.value as typeof status); }}>
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PENDING">Chờ thanh toán</option>
            <option value="PAYMENT_FAILED">Thanh toán thất bại</option>
            <option value="PAID">Chờ pha chế</option>
            <option value="PREPARING">Đang pha chế</option>
            <option value="READY">Đã sẵn sàng</option>
            <option value="COMPLETED">Đã hoàn thành</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
        </label>
        <label>Tìm mã đơn
          <input value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} placeholder="Nhập mã đơn" />
        </label>
      </div>
      {error && <p className="order-error" role="alert">{error}</p>}
      {loading ? <p className="cart-loading" role="status">Đang tải đơn hàng...</p> : (
        <>
          <div className="staff-order-list">
            {result?.items.map((order) => (
              <article className="staff-order-card" key={order.id}>
                <div>
                  <strong>{order.orderCode}</strong>
                  <span>{order.status} · {currency.format(order.totalAmount)}</span>
                  <small>{new Date(order.createdAt).toLocaleString("vi-VN")}</small>
                  <small>{order.items.map((item) =>
                    `${item.productName} x${item.quantity} (${item.size})${item.toppings.length ? ` · ${item.toppings.map((topping) => topping.name).join(", ")}` : ""}`,
                  ).join(" | ")}</small>
                </div>
                <div className="staff-order-actions">
                  {nextStatus[order.status] && (
                    <button className="detail-action" type="button" disabled={busy !== ""} onClick={() => void changeStatus(order, nextStatus[order.status]!)}>
                      {busy === order.id ? "Đang lưu..." : `Chuyển ${nextStatus[order.status]}`}
                    </button>
                  )}
                  {["PENDING", "PAYMENT_FAILED", "PAID"].includes(order.status) && (
                    <button className="order-cancel-button" type="button" disabled={busy !== ""} onClick={() => void changeStatus(order, "CANCELLED")}>
                      {busy === order.id ? "Đang lưu..." : "Hủy đơn"}
                    </button>
                  )}
                </div>
              </article>
            ))}
            {result?.items.length === 0 && <p className="staff-empty">Không có đơn phù hợp bộ lọc.</p>}
          </div>
          {result && result.total > 20 && (
            <nav className="staff-pagination" aria-label="Phân trang đơn hàng">
              <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Trước</button>
              <span>Trang {page} / {totalPages}</span>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Tiếp</button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}

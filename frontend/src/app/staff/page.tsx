"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../components/auth-provider";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/$/, "");
type Summary = { pending: number; preparing: number; ready: number };
type RecentOrder = { orderCode: string; status: string; totalAmount: number; createdAt: string };
const currency = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

export default function StaffPage() {
  const { token, logout } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [recent, setRecent] = useState<RecentOrder[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async (signal: AbortSignal) => {
    if (!token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [summaryResponse, queueResponse] = await Promise.all([
        fetch(`${API_URL}/orders/staff/summary`, { headers, signal, cache: "no-store" }),
        fetch(`${API_URL}/orders/staff/queue?page=1&limit=5`, { headers, signal, cache: "no-store" }),
      ]);
      const [summaryPayload, queuePayload] = await Promise.all([
        summaryResponse.json().catch(() => null),
        queueResponse.json().catch(() => null),
      ]);
      if (!summaryResponse.ok || !queueResponse.ok) {
        const status = !summaryResponse.ok ? summaryResponse.status : queueResponse.status;
        if (status === 401 || status === 403) logout();
        throw new Error(`Không thể tải tổng quan vận hành (HTTP ${status}).`);
      }
      if (typeof summaryPayload !== "object" || summaryPayload === null ||
          !("pending" in summaryPayload) || !("preparing" in summaryPayload) ||
          !("ready" in summaryPayload) || typeof queuePayload !== "object" ||
          queuePayload === null || !("items" in queuePayload) || !Array.isArray(queuePayload.items)) {
        throw new Error("Dữ liệu tổng quan không hợp lệ.");
      }
      setSummary(summaryPayload as Summary);
      setRecent(queuePayload.items as RecentOrder[]);
      setError("");
    } catch (reason) {
      if (!signal.aborted) setError(reason instanceof Error ? reason.message : "Không thể tải tổng quan.");
    }
  }, [token, logout]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [load]);

  return (
    <div className="staff-page">
      <header className="staff-page-heading">
        <div><span className="section-kicker">BREWLITE · NHÂN VIÊN</span><h1>Tổng quan vận hành</h1></div>
        <p>Trạng thái hiện tại của hàng đợi đơn hàng.</p>
      </header>
      {error && <p className="order-error" role="alert">{error}</p>}
      {!summary && !error ? <p className="cart-loading" role="status">Đang tải hoạt động...</p> : (
        <section className="staff-summary-grid" aria-label="Tóm tắt đơn hàng">
          <article><span>Chờ pha chế</span><strong>{summary?.pending ?? "—"}</strong><small>Đơn đã thanh toán</small></article>
          <article><span>Đang pha chế</span><strong>{summary?.preparing ?? "—"}</strong><small>Đơn đang được xử lý</small></article>
          <article><span>Đã sẵn sàng</span><strong>{summary?.ready ?? "—"}</strong><small>Chờ bàn giao</small></article>
        </section>
      )}
      <section className="staff-section staff-activity">
        <div className="staff-section-title"><div><span className="section-kicker">HOẠT ĐỘNG GẦN ĐÂY</span><h2>Đơn mới nhất</h2></div>
          <Link href="/staff/orders">Mở quản lý đơn →</Link></div>
        {recent.length ? recent.map((order) => (
          <div className="staff-activity-row" key={order.orderCode}>
            <strong>{order.orderCode}</strong><span>{order.status}</span>
            <span>{currency.format(order.totalAmount)}</span>
            <time dateTime={order.createdAt}>{new Date(order.createdAt).toLocaleString("vi-VN")}</time>
          </div>
        )) : <p className="staff-empty">Chưa có đơn đang xử lý.</p>}
      </section>
      <nav className="staff-quick-links" aria-label="Lối tắt quản lý">
        <Link href="/staff/orders"><strong>Quản lý đơn hàng</strong><span>Lọc, tìm kiếm và cập nhật trạng thái</span></Link>
        <Link href="/staff/ingredients"><strong>Quản lý nguyên liệu</strong><span>Điều chỉnh kho và định mức công thức</span></Link>
        <Link href="/staff/promotions"><strong>Quản lý khuyến mãi</strong><span>Tạo và cập nhật mã giảm giá</span></Link>
      </nav>
    </div>
  );
}

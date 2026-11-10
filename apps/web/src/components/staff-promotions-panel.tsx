"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "./auth-provider";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/$/, "");
const currency = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
type Promotion = {
  code: string;
  discountType: "PERCENT" | "FIXED";
  value: number;
  minimumAmount: number;
  maximumDiscount: number | null;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  usageCount: number;
};

function messageFrom(payload: unknown, fallback: string) {
  if (typeof payload !== "object" || payload === null || !("message" in payload)) return fallback;
  return typeof payload.message === "string" ? payload.message : fallback;
}

export function StaffPromotionsPanel() {
  const { token, logout } = useAuth();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  const load = useCallback(async (signal: AbortSignal) => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/promotions/staff`, {
        headers: { Authorization: `Bearer ${token}` }, signal, cache: "no-store",
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) logout();
        throw new Error(messageFrom(payload, `Không thể tải khuyến mãi (HTTP ${response.status}).`));
      }
      if (!Array.isArray(payload)) throw new Error("Dữ liệu khuyến mãi không hợp lệ.");
      setPromotions(payload as Promotion[]);
      setError("");
    } catch (reason) {
      if (!signal.aborted) setError(reason instanceof Error ? reason.message : "Không thể tải khuyến mãi.");
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [token, logout]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [load, reload]);

  async function save(url: string, method: "POST" | "PATCH", body: object) {
    if (!token) return false;
    setBusy(url);
    setError("");
    try {
      const response = await fetch(`${API_URL}${url}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) logout();
        throw new Error(messageFrom(payload, `Không thể lưu khuyến mãi (HTTP ${response.status}).`));
      }
      setReload((value) => value + 1);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể lưu khuyến mãi.");
      return false;
    } finally {
      setBusy("");
    }
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const body = promotionBody(data);
    if (await save("/promotions", "POST", {
      code: String(data.get("code") ?? "").trim().toUpperCase(),
      discountType: String(data.get("discountType") ?? "PERCENT"),
      ...body,
      isActive: true,
    })) form.reset();
  }

  return (
    <section className="staff-page">
      <div className="staff-page-heading">
        <div><span className="section-kicker">MARKETING</span><h1>Quản lý khuyến mãi</h1></div>
        <span>{promotions.length} mã</span>
      </div>
      {error && <p className="order-error" role="alert">{error}</p>}
      <section className="staff-section">
        <h2>Tạo mã mới</h2>
        <form className="staff-promotion-form" onSubmit={(event) => void create(event)}>
          <label>Mã<input name="code" minLength={3} maxLength={40} pattern="[A-Za-z0-9_-]+" required /></label>
          <label>Loại<select name="discountType"><option value="PERCENT">Phần trăm</option><option value="FIXED">Số tiền</option></select></label>
          <label>Giá trị<input name="value" type="number" min="1" required /></label>
          <label>Đơn tối thiểu<input name="minimumAmount" type="number" min="0" defaultValue="0" /></label>
          <label>Giảm tối đa<input name="maximumDiscount" type="number" min="1" /></label>
          <label>Lượt dùng tối đa<input name="usageLimit" type="number" min="1" /></label>
          <label>Bắt đầu<input name="startsAt" type="datetime-local" /></label>
          <label>Kết thúc<input name="endsAt" type="datetime-local" /></label>
          <button className="detail-action" type="submit" disabled={busy !== ""}>Tạo mã</button>
        </form>
      </section>
      <section className="staff-section">
        <h2>Mã đã tạo</h2>
        {loading ? <p role="status">Đang tải mã khuyến mãi...</p> : (
          <div className="staff-promotion-list">
            {promotions.map((promotion) => (
              <article className="staff-promotion-card" key={promotion.code}>
                <div>
                  <strong>{promotion.code}</strong>
                  <span>{promotion.discountType === "PERCENT" ? `${promotion.value}%` : currency.format(promotion.value)} · tối thiểu {currency.format(promotion.minimumAmount)}</span>
                  <small>{promotion.maximumDiscount === null ? "Không giới hạn mức giảm" : `Tối đa giảm ${currency.format(promotion.maximumDiscount)}`}</small>
                  <small>{promotion.usageCount}{promotion.usageLimit === null ? "" : ` / ${promotion.usageLimit}`} lượt · {promotion.isActive ? "Đang hoạt động" : "Đã tắt"}</small>
                  <small>{promotion.startsAt ? `Từ ${new Date(promotion.startsAt).toLocaleString("vi-VN")}` : "Không giới hạn ngày bắt đầu"} · {promotion.endsAt ? `đến ${new Date(promotion.endsAt).toLocaleString("vi-VN")}` : "không giới hạn ngày kết thúc"}</small>
                </div>
                <form className="staff-promotion-edit" onSubmit={(event) => {
                  event.preventDefault();
                  const data = new FormData(event.currentTarget);
                  void save(`/promotions/${encodeURIComponent(promotion.code)}`, "PATCH", promotionBody(data));
                }}>
                  <label>Giá trị<input name="value" type="number" min="1" defaultValue={promotion.value} required /></label>
                  <label>Loại<select name="discountType" defaultValue={promotion.discountType}><option value="PERCENT">Phần trăm</option><option value="FIXED">Số tiền</option></select></label>
                  <label>Đơn tối thiểu<input name="minimumAmount" type="number" min="0" defaultValue={promotion.minimumAmount} required /></label>
                  <label>Giảm tối đa<input name="maximumDiscount" type="number" min="1" defaultValue={promotion.maximumDiscount ?? ""} /></label>
                  <label>Lượt dùng tối đa<input name="usageLimit" type="number" min="1" defaultValue={promotion.usageLimit ?? ""} /></label>
                  <label>Bắt đầu<input name="startsAt" type="datetime-local" defaultValue={toLocalInput(promotion.startsAt)} /></label>
                  <label>Kết thúc<input name="endsAt" type="datetime-local" defaultValue={toLocalInput(promotion.endsAt)} /></label>
                  <button className="detail-action" type="submit" disabled={busy !== ""}>Lưu</button>
                  <button className="order-cancel-button" type="button" disabled={busy !== ""} onClick={() => void save(
                    `/promotions/${encodeURIComponent(promotion.code)}`,
                    "PATCH",
                    { isActive: !promotion.isActive },
                  )}>{promotion.isActive ? "Ngừng sử dụng" : "Bật lại"}</button>
                </form>
              </article>
            ))}
            {promotions.length === 0 && <p className="staff-empty">Chưa có mã khuyến mãi.</p>}
          </div>
        )}
      </section>
    </section>
  );
}

function promotionBody(data: FormData) {
  const optionalNumber = (name: string) => {
    const raw = String(data.get(name) ?? "");
    return raw ? Number(raw) : null;
  };
  const optionalDate = (name: string) => {
    const raw = String(data.get(name) ?? "");
    return raw ? new Date(raw).toISOString() : null;
  };
  return {
    ...(data.has("discountType") ? { discountType: String(data.get("discountType")) } : {}),
    value: Number(data.get("value")),
    minimumAmount: Number(data.get("minimumAmount") || 0),
    maximumDiscount: optionalNumber("maximumDiscount"),
    usageLimit: optionalNumber("usageLimit"),
    startsAt: optionalDate("startsAt"),
    endsAt: optionalDate("endsAt"),
  };
}

function toLocalInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

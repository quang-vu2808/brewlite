"use client";

import { Fragment, useCallback, useEffect, useState, type FormEvent } from "react";
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
type PromotionStatus = "active" | "scheduled" | "expired" | "paused";

function promotionStatus(promotion: Promotion, now: number): PromotionStatus {
  if (!promotion.isActive) return "paused";
  if (promotion.startsAt && new Date(promotion.startsAt).getTime() > now) return "scheduled";
  if (promotion.endsAt && new Date(promotion.endsAt).getTime() <= now) return "expired";
  if (promotion.usageLimit !== null && promotion.usageCount >= promotion.usageLimit) return "expired";
  return "active";
}

const STATUS_LABELS: Record<PromotionStatus, string> = {
  active: "Đang hoạt động",
  scheduled: "Sắp bắt đầu",
  expired: "Đã hết hạn",
  paused: "Tạm dừng",
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
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PromotionStatus | "all">("all");
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [now, setNow] = useState(0);

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
      setNow(Date.now());
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
    setNotice("");
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
      setNotice("Đã lưu thay đổi khuyến mãi.");
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

  const visiblePromotions = promotions
    .filter((promotion) => statusFilter === "all" || promotionStatus(promotion, now) === statusFilter)
    .filter((promotion) => promotion.code.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    .sort((a, b) => a.code.localeCompare(b.code));
  const summary = {
    total: promotions.length,
    active: promotions.filter((promotion) => promotionStatus(promotion, now) === "active").length,
    scheduled: promotions.filter((promotion) => promotionStatus(promotion, now) === "scheduled").length,
    expired: promotions.filter((promotion) => promotionStatus(promotion, now) === "expired").length,
  };

  return (
    <section className="staff-page">
      <div className="staff-page-heading">
        <div><span className="section-kicker">MARKETING</span><h1>Quản lý khuyến mãi</h1></div>
        <span>{promotions.length} mã</span>
      </div>
      {error && <p className="order-error" role="alert">{error}</p>}
      {notice && <p className="auth-success" role="status">{notice}</p>}
      <section className="staff-promotion-summary" aria-label="Tổng quan khuyến mãi">
        <article><span>Tổng mã</span><strong>{summary.total}</strong></article>
        <article><span>Đang hoạt động</span><strong>{summary.active}</strong></article>
        <article><span>Sắp bắt đầu</span><strong>{summary.scheduled}</strong></article>
        <article><span>Đã hết hạn / lượt</span><strong>{summary.expired}</strong></article>
      </section>
      <section className="staff-section">
        <div className="staff-section-title"><div><span className="section-kicker">CHƯƠNG TRÌNH ƯU ĐÃI</span><h2>Tạo mã mới</h2></div></div>
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
        <div className="staff-section-title"><div><span className="section-kicker">DANH SÁCH</span><h2>Mã đã tạo</h2></div><span>{visiblePromotions.length} kết quả</span></div>
        <div className="staff-promotion-filters">
          <label>Tìm mã<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nhập mã khuyến mãi" /></label>
          <label>Trạng thái<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as PromotionStatus | "all")}>
            <option value="all">Tất cả</option>
            <option value="active">Đang hoạt động</option>
            <option value="scheduled">Sắp bắt đầu</option>
            <option value="expired">Đã hết hạn</option>
            <option value="paused">Tạm dừng</option>
          </select></label>
        </div>
        {loading ? <p role="status">Đang tải mã khuyến mãi...</p> : (
          visiblePromotions.length === 0 ? <p className="staff-empty">{promotions.length ? "Không có mã khuyến mãi phù hợp bộ lọc." : "Chưa có mã khuyến mãi."}</p> :
          <div className="staff-promotion-table-wrap">
            <table className="staff-promotion-table">
              <thead><tr>
                <th>Mã</th><th>Loại giảm</th><th>Điều kiện</th><th>Thời gian</th><th>Lượt dùng</th><th>Trạng thái</th><th>Thao tác</th>
              </tr></thead>
              <tbody>
                {visiblePromotions.map((promotion) => {
                  const status = promotionStatus(promotion, now);
                  const dateRange = `${promotion.startsAt ? new Date(promotion.startsAt).toLocaleDateString("vi-VN") : "Không giới hạn"} – ${promotion.endsAt ? new Date(promotion.endsAt).toLocaleDateString("vi-VN") : "Không giới hạn"}`;
                  return (
                    <Fragment key={promotion.code}>
                      <tr>
                        <td><strong>{promotion.code}</strong></td>
                        <td>{promotion.discountType === "PERCENT" ? `${promotion.value}%` : currency.format(promotion.value)}<small>{promotion.maximumDiscount === null ? "Không giới hạn mức giảm" : `Tối đa ${currency.format(promotion.maximumDiscount)}`}</small></td>
                        <td>Tối thiểu {currency.format(promotion.minimumAmount)}</td>
                        <td>{dateRange}</td>
                        <td>{promotion.usageCount}{promotion.usageLimit === null ? " / ∞" : ` / ${promotion.usageLimit}`}</td>
                        <td><span className={`promotion-status is-${status}`}>{STATUS_LABELS[status]}</span></td>
                        <td className="staff-promotion-actions">
                          <button type="button" className="detail-action" onClick={() => setEditingCode(editingCode === promotion.code ? null : promotion.code)}>
                            {editingCode === promotion.code ? "Đóng" : "Sửa"}
                          </button>
                          <button type="button" className="order-cancel-button" disabled={busy !== ""} onClick={() => {
                            if (promotion.isActive && !window.confirm(`Tạm dừng mã ${promotion.code}?`)) return;
                            void save(`/promotions/${encodeURIComponent(promotion.code)}`, "PATCH", { isActive: !promotion.isActive });
                          }}>{promotion.isActive ? "Tạm dừng" : "Bật lại"}</button>
                        </td>
                      </tr>
                      {editingCode === promotion.code && <tr className="staff-promotion-edit-row"><td colSpan={7}>
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
                          <button className="detail-action" type="submit" disabled={busy !== ""}>Lưu thay đổi</button>
                        </form>
                      </td></tr>}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
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

"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useAuth } from "./auth-provider";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/$/, "");
type Ingredient = {
  id: string;
  name: string;
  code: string;
  unit: string;
  stock: number;
  warningThreshold: number;
  lowStock: boolean;
};
type RecipeLine = { ingredientId: string; quantityRequired: number };
type ProductRecipe = { productId: number; productName: string; items: Array<RecipeLine & { ingredientName: string; unit: string }> };
type Product = { id: number; name: string };

function errorText(payload: unknown, fallback: string) {
  if (typeof payload !== "object" || payload === null || !("message" in payload)) return fallback;
  const message = payload.message;
  return typeof message === "string" ? message : Array.isArray(message) ? message.join(", ") : fallback;
}

export function StaffIngredientsPanel() {
  const { token, logout } = useAuth();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<ProductRecipe[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [drafts, setDrafts] = useState<Record<number, RecipeLine[]>>({});
  const [metadata, setMetadata] = useState<Record<string, { name: string; code: string; unit: string; warningThreshold: string }>>({});
  const [form, setForm] = useState({ name: "", code: "", unit: "", stock: "0", warningThreshold: "0" });
  const [adjustments, setAdjustments] = useState<Record<string, { delta: string; reason: string }>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!token) return;
    setLoading(true);
    try {
      const headers = { Authorization: "Bearer " + token };
      const [ingredientResponse, recipeResponse, productResponse] = await Promise.all([
        fetch(`${API_URL}/ingredients`, { headers, signal, cache: "no-store" }),
        fetch(`${API_URL}/ingredients/recipes`, { headers, signal, cache: "no-store" }),
        fetch(`${API_URL}/products`, { signal, cache: "no-store" }),
      ]);
      const [ingredientPayload, recipePayload, productPayload] = await Promise.all([
        ingredientResponse.json().catch(() => null),
        recipeResponse.json().catch(() => null),
        productResponse.json().catch(() => null),
      ]);
      if (!ingredientResponse.ok || !recipeResponse.ok || !productResponse.ok) {
        const status = [ingredientResponse, recipeResponse, productResponse].find((response) => !response.ok)?.status ?? 500;
        if (status === 401 || status === 403) logout();
        throw new Error(`Không thể tải dữ liệu nguyên liệu (HTTP ${status}).`);
      }
      if (!Array.isArray(ingredientPayload) || !Array.isArray(recipePayload) || !Array.isArray(productPayload)) {
        throw new Error("Dữ liệu nguyên liệu, công thức hoặc sản phẩm không hợp lệ.");
      }
      const recipeRows = recipePayload as ProductRecipe[];
      setIngredients(ingredientPayload as Ingredient[]);
      setMetadata(Object.fromEntries((ingredientPayload as Ingredient[]).map((ingredient) => [
        ingredient.id,
        {
          name: ingredient.name,
          code: ingredient.code,
          unit: ingredient.unit,
          warningThreshold: String(ingredient.warningThreshold),
        },
      ])));
      setRecipes(recipeRows);
      setProducts(productPayload as Product[]);
      setDrafts(Object.fromEntries(recipeRows.map((recipe) => [
        recipe.productId,
        recipe.items.map(({ ingredientId, quantityRequired }) => ({ ingredientId, quantityRequired })),
      ])));
      setError("");
    } catch (reason) {
      if (!signal?.aborted) setError(reason instanceof Error ? reason.message : "Không thể tải dữ liệu nguyên liệu.");
    } finally {
      if (!signal?.aborted) setLoading(false);
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

  async function submit(path: string, method: "POST" | "PUT" | "PATCH", body: unknown, success: string): Promise<boolean> {
    if (!token) return false;
    setBusy(path);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API_URL}${path}`, {
        method,
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) logout();
        throw new Error(errorText(payload, `Không thể lưu thay đổi (HTTP ${response.status}).`));
      }
      setNotice(success);
      await load();
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể lưu thay đổi.");
      return false;
    } finally {
      setBusy("");
    }
  }

  function createIngredient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit("/ingredients", "POST", {
      ...form,
      code: form.code.trim().toUpperCase(),
      stock: Number(form.stock),
      warningThreshold: Number(form.warningThreshold),
    }, "Đã thêm nguyên liệu.").then((saved) => {
      if (saved) setForm({ name: "", code: "", unit: "", stock: "0", warningThreshold: "0" });
    });
  }

  return (
    <section className="staff-page">
      <header className="staff-page-heading">
        <div><span className="section-kicker">KHO VẬN HÀNH</span><h1>Quản lý nguyên liệu</h1></div>
        <span>{ingredients.length} nguyên liệu</span>
      </header>
      <p className="staff-ingredients-note">Đơn hàng sẽ trừ tồn nguyên liệu theo công thức đã lưu. Các định lượng mẫu ban đầu được tạo trong migration và có thể điều chỉnh tại đây.</p>
      {error && <p className="order-error" role="alert">{error}</p>}
      {notice && <p className="auth-success" role="status">{notice}</p>}
      {loading ? <p className="cart-loading" role="status">Đang tải kho nguyên liệu...</p> : (
        <>
          <section className="staff-section">
            <div className="staff-section-title"><div><span className="section-kicker">DANH MỤC</span><h2>Thêm nguyên liệu</h2></div></div>
            <form className="staff-ingredient-form" onSubmit={createIngredient}>
              <label>Tên<input required maxLength={160} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
              <label>Mã<input required maxLength={40} pattern="[A-Za-z0-9_-]+" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></label>
              <label>Đơn vị<input required maxLength={24} placeholder="g, ml, chai" value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} /></label>
              <label>Tồn ban đầu<input required type="number" min="0" step="1" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} /></label>
              <label>Ngưỡng cảnh báo<input required type="number" min="0" step="1" value={form.warningThreshold} onChange={(event) => setForm({ ...form, warningThreshold: event.target.value })} /></label>
              <button className="detail-action" type="submit" disabled={busy !== ""}>Thêm nguyên liệu</button>
            </form>
          </section>

          <div className="staff-ingredient-list">
            {ingredients.map((ingredient) => {
              const adjustment = adjustments[ingredient.id] ?? { delta: "", reason: "" };
              const details = metadata[ingredient.id] ?? {
                name: ingredient.name,
                code: ingredient.code,
                unit: ingredient.unit,
                warningThreshold: String(ingredient.warningThreshold),
              };
              return (
                <article className={`staff-ingredient-card${ingredient.lowStock ? " is-low-stock" : ""}`} key={ingredient.id}>
                  <div className="staff-ingredient-info">
                    <strong>{ingredient.name}</strong><span>{ingredient.code} · {ingredient.stock} {ingredient.unit}</span>
                    <small>Ngưỡng cảnh báo: {ingredient.warningThreshold} {ingredient.unit}{ingredient.lowStock ? " · Sắp hết hàng" : ""}</small>
                  </div>
                  <form className="staff-ingredient-edit" onSubmit={(event) => {
                    event.preventDefault();
                    void submit(`/ingredients/${ingredient.id}`, "PATCH", {
                      ...details,
                      warningThreshold: Number(details.warningThreshold),
                    }, `Đã cập nhật thông tin ${ingredient.name}.`);
                  }}>
                    <label>Tên<input required maxLength={160} value={details.name} onChange={(event) => setMetadata((current) => ({ ...current, [ingredient.id]: { ...details, name: event.target.value } }))} /></label>
                    <label>Mã<input required maxLength={40} pattern="[A-Za-z0-9_-]+" value={details.code} onChange={(event) => setMetadata((current) => ({ ...current, [ingredient.id]: { ...details, code: event.target.value.toUpperCase() } }))} /></label>
                    <label>Đơn vị<input required maxLength={24} value={details.unit} onChange={(event) => setMetadata((current) => ({ ...current, [ingredient.id]: { ...details, unit: event.target.value } }))} /></label>
                    <label>Ngưỡng cảnh báo<input required type="number" min="0" step="1" value={details.warningThreshold} onChange={(event) => setMetadata((current) => ({ ...current, [ingredient.id]: { ...details, warningThreshold: event.target.value } }))} /></label>
                    <button className="detail-action" type="submit" disabled={busy !== ""}>Lưu thông tin</button>
                  </form>
                  <form className="staff-ingredient-adjustment" onSubmit={(event) => {
                    event.preventDefault();
                    void submit(`/ingredients/${ingredient.id}/adjustments`, "POST", {
                      delta: Number(adjustment.delta),
                      reason: adjustment.reason,
                    }, `Đã điều chỉnh tồn ${ingredient.name}.`).then((saved) => {
                      if (saved) setAdjustments((current) => ({ ...current, [ingredient.id]: { delta: "", reason: "" } }));
                    });
                  }}>
                    <label>Điều chỉnh (+/-)
                      <input required type="number" step="1" value={adjustment.delta} onChange={(event) => setAdjustments((current) => ({ ...current, [ingredient.id]: { ...adjustment, delta: event.target.value } }))} />
                    </label>
                    <label>Lý do
                      <input required maxLength={200} value={adjustment.reason} onChange={(event) => setAdjustments((current) => ({ ...current, [ingredient.id]: { ...adjustment, reason: event.target.value } }))} />
                    </label>
                    <button className="detail-action" type="submit" disabled={busy !== ""}>Cập nhật kho</button>
                  </form>
                </article>
              );
            })}
            {!ingredients.length && <p className="staff-empty">Chưa có nguyên liệu.</p>}
          </div>

          <section className="staff-section staff-recipes-section">
            <div className="staff-section-title"><div><span className="section-kicker">ĐỊNH MỨC TIÊU HAO</span><h2>Công thức sản phẩm</h2></div></div>
            {products.map((product) => {
              const recipe = recipes.find((item) => item.productId === product.id);
              const lines = drafts[product.id] ?? [];
              return (
                <article className="staff-recipe-card" key={product.id}>
                  <header><strong>{product.name}</strong><span>{recipe?.items.length ?? 0} thành phần đang lưu</span></header>
                  {lines.map((line, index) => {
                    const ingredient = ingredients.find((item) => item.id === line.ingredientId);
                    return (
                      <div className="staff-recipe-line" key={`${product.id}-${index}`}>
                        <select aria-label={`Nguyên liệu ${index + 1} cho ${product.name}`} value={line.ingredientId} onChange={(event) => setDrafts((current) => ({
                          ...current,
                          [product.id]: lines.map((item, lineIndex) => lineIndex === index ? { ...item, ingredientId: event.target.value } : item),
                        }))}>
                          <option value="">Chọn nguyên liệu</option>
                          {ingredients.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}
                        </select>
                        <input aria-label={`Định lượng ${index + 1} cho ${product.name}`} type="number" min="1" step="1" value={line.quantityRequired} onChange={(event) => setDrafts((current) => ({
                          ...current,
                          [product.id]: lines.map((item, lineIndex) => lineIndex === index ? { ...item, quantityRequired: Number(event.target.value) } : item),
                        }))} />
                        <span>{ingredient?.unit ?? "đơn vị"}/ly</span>
                        <button className="order-cancel-button" type="button" onClick={() => setDrafts((current) => ({
                          ...current,
                          [product.id]: lines.filter((_, lineIndex) => lineIndex !== index),
                        }))}>Xóa</button>
                      </div>
                    );
                  })}
                  <div className="staff-recipe-actions">
                    <button type="button" className="detail-action" onClick={() => setDrafts((current) => ({
                      ...current,
                      [product.id]: [...(current[product.id] ?? []), { ingredientId: "", quantityRequired: 1 }],
                    }))}>Thêm thành phần</button>
                    <button type="button" className="detail-action" disabled={busy !== ""} onClick={() => void submit(
                      `/ingredients/recipes/${product.id}`,
                      "PUT",
                      { items: lines },
                      `Đã lưu công thức ${product.name}.`,
                    )}>Lưu công thức</button>
                  </div>
                </article>
              );
            })}
          </section>
        </>
      )}
    </section>
  );
}

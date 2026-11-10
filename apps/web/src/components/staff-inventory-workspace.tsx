"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "./auth-provider";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/$/, "");
type Size = "S" | "M" | "L";
type Tab = "ingredients" | "packaging" | "toppings" | "recipes";
type Ingredient = {
  id: string;
  name: string;
  code: string;
  unit: string;
  stock: number;
  warningThreshold: number;
  lowStock: boolean;
  kind: "INGREDIENT" | "PACKAGING";
  category: string | null;
  isActive: boolean;
  compatibleSizes: Size[];
};
type RecipeLine = { ingredientId: string; quantityRequired: number };
type PackagingLine = RecipeLine & {
  usageType: "PER_SERVING" | "PER_ORDER" | "PER_GROUP";
  servingsPerUnit?: number;
};
type ProductRecipe = {
  productId: number;
  productName: string;
  items: Array<RecipeLine & { ingredientName: string; unit: string }>;
  sizes: Array<{
    size: Size;
    configured: boolean;
    approvalStatus: "PENDING" | "CONFIRMED" | null;
    statusReason: string | null;
    availability: {
      stock: number;
      usesSharedRecipe: boolean;
      recipeConfigured: boolean;
    } | null;
    items: Array<RecipeLine & { ingredientName: string; unit: string }>;
    packaging: Array<PackagingLine & { ingredientName: string; unit: string }>;
  }>;
};
type Topping = {
  id: string;
  name: string;
  surcharge: number;
  portionQuantityRequired: number | null;
  availablePortions: number | null;
  ingredientId: string | null;
  ingredientName: string | null;
  ingredientUnit: string | null;
  ingredientStock: number | null;
  ingredientWarningThreshold: number | null;
  ingredientLowStock: boolean | null;
  isActive: boolean;
};
type Product = { id: number; name: string };
type Adjustment = {
  id: string;
  delta: number;
  reason: string;
  createdAt: string;
  staffEmail: string;
};
type StockDialog = {
  ingredient: Ingredient;
  direction: "in" | "out";
};

const SIZES: Size[] = ["S", "M", "L"];
const TABS: Array<{ id: Tab; label: string }> = [
  { id: "ingredients", label: "Kho nguyên liệu" },
  { id: "packaging", label: "Kho vật tư" },
  { id: "toppings", label: "Kho topping" },
  { id: "recipes", label: "Công thức pha chế" },
];

function isCup(ingredient: Ingredient) {
  const category = ingredient.category?.trim().toLocaleUpperCase();
  return ingredient.kind === "PACKAGING" && (category === "CUP" || category === "LY");
}

function isSize(value: string): value is Size {
  return SIZES.some((size) => size === value);
}

function errorText(payload: unknown, fallback: string) {
  if (typeof payload !== "object" || payload === null || !("message" in payload)) return fallback;
  const message = payload.message;
  return typeof message === "string" ? message : Array.isArray(message) ? message.join(", ") : fallback;
}

export function StaffInventoryWorkspace() {
  const { token, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("ingredients");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<ProductRecipe[]>([]);
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [recipeDrafts, setRecipeDrafts] = useState<Record<string, RecipeLine[]>>({});
  const [packagingDrafts, setPackagingDrafts] = useState<Record<string, PackagingLine[]>>({});
  const [dirtyRecipeKeys, setDirtyRecipeKeys] = useState<Set<string>>(new Set());
  const [toppingDrafts, setToppingDrafts] = useState<Record<string, {
    name: string;
    surcharge: string;
    ingredientId: string;
    portionQuantityRequired: string;
    isActive: boolean;
  }>>({});
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedSize, setSelectedSize] = useState<Size>("S");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState<StockDialog | null>(null);
  const [stockQuantity, setStockQuantity] = useState("");
  const [stockReason, setStockReason] = useState("");
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const [history, setHistory] = useState<Adjustment[]>([]);
  const [newIngredient, setNewIngredient] = useState({
    name: "",
    code: "",
    unit: "",
    stock: "0",
    warningThreshold: "0",
    category: "",
    compatibleSizes: [] as Size[],
  });
  const [newTopping, setNewTopping] = useState({
    id: "",
    name: "",
    surcharge: "",
    ingredientId: "",
    portionQuantityRequired: "",
  });

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!token) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const responses = await Promise.all([
        fetch(`${API_URL}/ingredients`, { headers, signal, cache: "no-store" }),
        fetch(`${API_URL}/ingredients/recipes`, { headers, signal, cache: "no-store" }),
        fetch(`${API_URL}/products`, { signal, cache: "no-store" }),
        fetch(`${API_URL}/toppings/staff`, { headers, signal, cache: "no-store" }),
      ]);
      const payloads: unknown[] = await Promise.all(responses.map((response) =>
        response.json().catch(() => null),
      ));
      const failedIndex = responses.findIndex((response) => !response.ok);
      if (failedIndex >= 0) {
        const status = responses[failedIndex].status;
        if (status === 401 || status === 403) logout();
        throw new Error(errorText(payloads[failedIndex], `Không thể tải dữ liệu kho (HTTP ${status}).`));
      }
      if (!payloads.every(Array.isArray)) throw new Error("Dữ liệu kho, công thức hoặc sản phẩm không hợp lệ.");
      const [ingredientRows, recipeRows, productRows, toppingRows] = payloads as [
        Ingredient[], ProductRecipe[], Product[], Topping[],
      ];
      setIngredients(ingredientRows);
      setRecipes(recipeRows);
      setProducts(productRows);
      setToppings(toppingRows);
      setSelectedProductId((current) => current || String(productRows[0]?.id ?? ""));
      setRecipeDrafts(Object.fromEntries(recipeRows.flatMap((recipe) =>
        recipe.sizes.filter((size) => size.configured).map((size) => [
          `${recipe.productId}-${size.size}`,
          size.items.map(({ ingredientId, quantityRequired }) => ({ ingredientId, quantityRequired })),
        ]),
      )));
      setDirtyRecipeKeys(new Set());
      setPackagingDrafts(Object.fromEntries(recipeRows.flatMap((recipe) =>
        recipe.sizes.map((size) => [
          `${recipe.productId}-${size.size}`,
          size.packaging
            .filter((line) => {
              const ingredient = ingredientRows.find((item) => item.id === line.ingredientId);
              return !ingredient || !isCup(ingredient);
            })
            .map(({ ingredientId, usageType, quantityRequired, servingsPerUnit }) => ({
              ingredientId,
              usageType,
              quantityRequired,
              servingsPerUnit,
            })),
        ]),
      )));
      setToppingDrafts(Object.fromEntries(toppingRows.map((topping) => [topping.id, {
        name: topping.name,
        surcharge: String(topping.surcharge),
        ingredientId: topping.ingredientId ?? "",
        portionQuantityRequired: topping.portionQuantityRequired === null
          ? ""
          : String(topping.portionQuantityRequired),
        isActive: topping.isActive,
      }])));
      setError("");
    } catch (reason) {
      if (!signal?.aborted) setError(reason instanceof Error ? reason.message : "Không thể tải dữ liệu kho.");
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

  async function request(path: string, method: "POST" | "PUT" | "PATCH", body: unknown) {
    if (!token) return false;
    setBusy(path);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API_URL}${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) logout();
        throw new Error(errorText(payload, `Không thể lưu thay đổi (HTTP ${response.status}).`));
      }
      await load();
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể lưu thay đổi.");
      return false;
    } finally {
      setBusy("");
    }
  }

  async function submitInventoryForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const kind = activeTab === "packaging" ? "PACKAGING" : "INGREDIENT";
    const saved = await request("/ingredients", "POST", {
      ...newIngredient,
      code: newIngredient.code.trim().toUpperCase(),
      stock: Number(newIngredient.stock),
      warningThreshold: Number(newIngredient.warningThreshold),
      kind,
      category: kind === "PACKAGING" ? newIngredient.category : null,
      compatibleSizes: kind === "PACKAGING" ? newIngredient.compatibleSizes : [],
    });
    if (saved) {
      setNotice(kind === "PACKAGING" ? "Đã thêm vật tư vào kho dùng chung." : "Đã thêm nguyên liệu vào kho dùng chung.");
      setNewIngredient({
        name: "", code: "", unit: "", stock: "0", warningThreshold: "0", category: "", compatibleSizes: [],
      });
    }
  }

  async function submitToppingForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await request("/toppings", "POST", {
      id: newTopping.id.trim().toLocaleLowerCase().replace(/\s+/g, "-"),
      name: newTopping.name.trim(),
      surcharge: Number(newTopping.surcharge),
      ingredientId: newTopping.ingredientId,
      portionQuantityRequired: Number(newTopping.portionQuantityRequired),
      isActive: false,
    });
    if (saved) {
      setNotice("Đã thêm topping, dùng chung tồn kho nguyên liệu đã chọn. Bật bán sau khi cấu hình công thức.");
      setNewTopping({ id: "", name: "", surcharge: "", ingredientId: "", portionQuantityRequired: "" });
    }
  }

  async function adjustStock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialog) return;
    const amount = Number(stockQuantity);
    const delta = dialog.direction === "in" ? amount : -amount;
    const saved = await request(`/ingredients/${dialog.ingredient.id}/adjustments`, "POST", {
      delta,
      reason: stockReason.trim(),
    });
    if (saved) {
      setNotice(`Đã ${dialog.direction === "in" ? "nhập" : "xuất"} ${amount} ${dialog.ingredient.unit} ${dialog.ingredient.name}.`);
      setDialog(null);
      setStockQuantity("");
      setStockReason("");
    }
  }

  async function showHistory(ingredient: Ingredient) {
    if (!token) return;
    setBusy(`history-${ingredient.id}`);
    setError("");
    try {
      const response = await fetch(`${API_URL}/ingredients/${ingredient.id}/adjustments`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) logout();
        throw new Error(errorText(payload, `Không thể tải lịch sử kho (HTTP ${response.status}).`));
      }
      if (!Array.isArray(payload)) throw new Error("Dữ liệu lịch sử kho không hợp lệ.");
      setHistory(payload as Adjustment[]);
      setHistoryFor(ingredient.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải lịch sử kho.");
    } finally {
      setBusy("");
    }
  }

  async function saveIngredientDetails(event: FormEvent<HTMLFormElement>, ingredient: Ingredient) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const compatibleSizes = form.getAll("compatibleSizes")
      .filter((value): value is string => typeof value === "string")
      .filter(isSize);
    const details = {
      name: String(form.get("name") ?? "").trim(),
      code: String(form.get("code") ?? "").trim().toUpperCase(),
      unit: String(form.get("unit") ?? "").trim(),
      warningThreshold: Number(form.get("warningThreshold")),
      kind: ingredient.kind,
      category: ingredient.kind === "PACKAGING"
        ? String(form.get("category") ?? "").trim()
        : ingredient.category,
      compatibleSizes: ingredient.kind === "PACKAGING" ? compatibleSizes : ingredient.compatibleSizes,
      isActive: form.get("isActive") === "on",
    };
    const saved = await request(`/ingredients/${ingredient.id}`, "PATCH", details);
    if (saved) setNotice(`Đã cập nhật ${ingredient.name}.`);
  }

  async function saveTopping(event: FormEvent<HTMLFormElement>, topping: Topping) {
    event.preventDefault();
    const draft = toppingDrafts[topping.id];
    if (!draft) return;
    const saved = await request(`/toppings/${encodeURIComponent(topping.id)}`, "PATCH", {
      name: draft.name,
      surcharge: Number(draft.surcharge),
      ingredientId: draft.ingredientId || null,
      portionQuantityRequired: draft.portionQuantityRequired === ""
        ? null
        : Number(draft.portionQuantityRequired),
      isActive: draft.isActive,
    });
    if (saved) setNotice(`Đã cập nhật cấu hình topping ${draft.name}.`);
  }

  async function saveFormula() {
    const productId = Number(selectedProductId);
    if (!productId || !token) return;
    const key = `${productId}-${selectedSize}`;
    const recipe = recipes.find((item) => item.productId === productId);
    const savedSize = recipe?.sizes.find((item) => item.size === selectedSize);
    const items = recipeDrafts[key] ?? (savedSize?.configured
      ? savedSize.items.map(({ ingredientId, quantityRequired }) => ({ ingredientId, quantityRequired }))
      : []);
    if (!items.length || items.some((item) =>
      !item.ingredientId || !Number.isSafeInteger(item.quantityRequired) || item.quantityRequired < 1,
    )) {
      setError("Công thức size cần ít nhất một nguyên liệu hợp lệ và định lượng lớn hơn 0.");
      return;
    }
    setBusy("formula");
    setError("");
    setNotice("");
    try {
      const changes = [
        [`/ingredients/recipes/${productId}/${selectedSize}`, { size: selectedSize, items }],
        [`/ingredients/packaging-recipes/${productId}/${selectedSize}`, {
          size: selectedSize,
          items: packagingDrafts[key] ?? [],
        }],
      ] as const;
      const responses = await Promise.all(changes.map(([path, body]) => fetch(`${API_URL}${path}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })));
      const failedIndex = responses.findIndex((response) => !response.ok);
      if (failedIndex >= 0) {
        const response = responses[failedIndex];
        const payload: unknown = await response.json().catch(() => null);
        if (response.status === 401 || response.status === 403) logout();
        throw new Error(errorText(payload, `Không thể lưu công thức (HTTP ${response.status}).`));
      }
      setNotice(`Đã lưu công thức ${recipe?.productName ?? ""} size ${selectedSize} ở trạng thái chờ xác nhận; công thức chưa được dùng để bán hoặc tiêu hao kho.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể lưu công thức.");
    } finally {
      setBusy("");
    }
  }

  const inventoryKind = activeTab === "packaging" ? "PACKAGING" : "INGREDIENT";
  const inventoryRows = useMemo(() => ingredients
    .filter((ingredient) => ingredient.kind === inventoryKind)
    .filter((ingredient) => {
      const text = `${ingredient.name} ${ingredient.code} ${ingredient.category ?? ""} ${ingredient.compatibleSizes.join(" ")}`.toLocaleLowerCase();
      return text.includes(search.trim().toLocaleLowerCase());
    }), [ingredients, inventoryKind, search]);
  const selectedProduct = recipes.find((recipe) => recipe.productId === Number(selectedProductId));
  const selectedRecipeSize = selectedProduct?.sizes.find((size) => size.size === selectedSize);
  const recipeKey = `${selectedProductId}-${selectedSize}`;
  const sizeLines = recipeDrafts[recipeKey] ?? (selectedRecipeSize?.configured
    ? selectedRecipeSize.items.map(({ ingredientId, quantityRequired }) => ({ ingredientId, quantityRequired }))
    : []);
  const packageLines = packagingDrafts[recipeKey] ?? [];
  const recipeIngredientOptions = ingredients.filter((ingredient) =>
    ingredient.kind === "INGREDIENT" && ingredient.isActive,
  );
  const packagingOptions = ingredients.filter((ingredient) =>
    ingredient.kind === "PACKAGING" && ingredient.isActive && !isCup(ingredient) &&
    ingredient.compatibleSizes.includes(selectedSize),
  );
  const cupOptions = ingredients.filter((ingredient) =>
    isCup(ingredient) && ingredient.compatibleSizes.includes(selectedSize),
  );
  const toppingInventory = toppings.filter((topping) =>
    `${topping.name} ${topping.id} ${topping.ingredientName ?? ""}`
      .toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );
  const markRecipeDirty = (key: string) => {
    setDirtyRecipeKeys((current) => new Set(current).add(key));
  };
  const formulaStatus = (size: ProductRecipe["sizes"][number]) => {
    if (!size.configured) return { label: "Chưa cấu hình", className: "is-missing" };
    if (size.approvalStatus !== "CONFIRMED") {
      return { label: "Đề xuất – Chờ xác nhận", className: "is-pending" };
    }
    if (!size.availability?.recipeConfigured) {
      return { label: "Không hợp lệ", className: "is-invalid" };
    }
    return { label: "Đã xác nhận", className: "is-confirmed" };
  };
  const confirmFormulaChange = (nextKey: string) => {
    if (nextKey === recipeKey || !dirtyRecipeKeys.has(recipeKey)) return true;
    return window.confirm("Công thức hiện tại có thay đổi chưa lưu. Bạn muốn rời đi và bỏ các thay đổi này?");
  };
  const copySharedRecipe = () => {
    if (!selectedProduct?.items.length) return;
    if (!window.confirm(`Sao chép công thức chung sang size ${selectedSize}? Công thức chung sẽ được giữ nguyên.`)) return;
    setRecipeDrafts((current) => ({
      ...current,
      [recipeKey]: selectedProduct.items.map(({ ingredientId, quantityRequired }) => ({
        ingredientId,
        quantityRequired,
      })),
    }));
    markRecipeDirty(recipeKey);
  };
  const copySizeRecipe = (sourceSize: Size) => {
    const source = selectedProduct?.sizes.find((size) => size.size === sourceSize);
    if (!source?.configured || sourceSize === selectedSize) return;
    if (!window.confirm(`Sao chép định lượng size ${sourceSize} sang bản nháp size ${selectedSize}? Bản gốc không đổi và bản sao chưa được lưu.`)) return;
    setRecipeDrafts((current) => ({
      ...current,
      [recipeKey]: source.items.map(({ ingredientId, quantityRequired }) => ({
        ingredientId,
        quantityRequired,
      })),
    }));
    setPackagingDrafts((current) => ({
      ...current,
      [recipeKey]: source.packaging.map(({ ingredientId, usageType, quantityRequired, servingsPerUnit }) => ({
        ingredientId,
        usageType,
        quantityRequired,
        servingsPerUnit,
      })),
    }));
    markRecipeDirty(recipeKey);
  };
  const confirmSelectedRecipe = async () => {
    if (!selectedRecipeSize?.configured || selectedRecipeSize.approvalStatus === "CONFIRMED" ||
        dirtyRecipeKeys.has(recipeKey)) return;
    const configuredSizes = selectedProduct?.sizes.filter((size) => size.configured) ?? [];
    const sameAcrossSizes = configuredSizes.some((left, index) =>
      configuredSizes.slice(index + 1).some((right) => {
        const signature = (size: typeof left) => size.items
          .map((item) => `${item.ingredientId}:${item.quantityRequired}`)
          .sort()
          .join("|");
        return left.items.length > 0 && signature(left) === signature(right);
      }),
    );
    const warning = sameAcrossSizes
      ? "Có ít nhất hai size đang có định lượng nguyên liệu giống hệt nhau. Hãy xác minh đây là chủ đích. "
      : "";
    if (!window.confirm(`${warning}Xác nhận công thức size ${selectedSize} đã được quản lý phê duyệt và cho phép dùng để tính tồn kho, đặt hàng?`)) return;
    const saved = await request(
      `/ingredients/recipes/${selectedProductId}/${selectedSize}/confirm`,
      "PATCH",
      {},
    );
    if (saved) setNotice(`Đã xác nhận công thức ${selectedProduct?.productName ?? ""} size ${selectedSize}.`);
  };

  return (
    <section className="staff-page staff-inventory-workspace">
      <header className="staff-page-heading">
        <div><span className="section-kicker">KHO VẬN HÀNH</span><h1>Kho & công thức</h1></div>
        <span>{ingredients.length} thành phần dùng chung</span>
      </header>
      <p className="staff-ingredients-note">
        Tồn kho được lưu một lần cho mỗi nguyên liệu hoặc vật tư. Công thức chỉ tham chiếu kho dùng chung; không tạo tồn riêng theo đồ uống.
      </p>
      {error && <p className="order-error" role="alert">{error}</p>}
      {notice && <p className="auth-success" role="status">{notice}</p>}
      <nav className="staff-inventory-tabs" aria-label="Khu vực quản lý kho">
        {TABS.map((tab) => (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? "is-active" : ""}
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setSearch("");
              setHistoryFor(null);
              if (tab.id === "packaging") setNewIngredient((current) => ({ ...current, category: "CUP" }));
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {loading ? <p className="cart-loading" role="status">Đang tải dữ liệu kho...</p> : (
        <div role="tabpanel">
          {(activeTab === "ingredients" || activeTab === "packaging") && (
            <>
              <section className="staff-inventory-summary" aria-label="Tổng quan kho">
                <article><span>Mặt hàng</span><strong>{inventoryRows.length}</strong></article>
                <article><span>Sắp hết / chạm ngưỡng</span><strong>{inventoryRows.filter((item) => item.lowStock).length}</strong></article>
                <article><span>Đang hoạt động</span><strong>{inventoryRows.filter((item) => item.isActive).length}</strong></article>
              </section>
              <div className="staff-inventory-toolbar">
                <label className="staff-inventory-search">Tìm kiếm
                  <input aria-label="Tìm trong kho" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tên, mã hoặc nhóm..." />
                </label>
                <details className="staff-inventory-create">
                  <summary>{activeTab === "packaging" ? "Thêm vật tư" : "Thêm nguyên liệu"}</summary>
                  <form className="staff-ingredient-form" onSubmit={(event) => void submitInventoryForm(event)}>
                    <label>Tên<input required maxLength={160} value={newIngredient.name} onChange={(event) => setNewIngredient({ ...newIngredient, name: event.target.value })} /></label>
                    <label>Mã kho<input required maxLength={40} pattern="[A-Za-z0-9_-]+" value={newIngredient.code} onChange={(event) => setNewIngredient({ ...newIngredient, code: event.target.value })} /></label>
                    <label>Đơn vị<input required maxLength={24} placeholder="g, ml, cái..." value={newIngredient.unit} onChange={(event) => setNewIngredient({ ...newIngredient, unit: event.target.value })} /></label>
                    <label>Tồn đầu kỳ<input required type="number" min="0" step="1" value={newIngredient.stock} onChange={(event) => setNewIngredient({ ...newIngredient, stock: event.target.value })} /></label>
                    <label>Ngưỡng cảnh báo<input required type="number" min="0" step="1" value={newIngredient.warningThreshold} onChange={(event) => setNewIngredient({ ...newIngredient, warningThreshold: event.target.value })} /></label>
                    {activeTab === "packaging" && <>
                      <label>Nhóm vật tư<input required maxLength={40} value={newIngredient.category} onChange={(event) => setNewIngredient({ ...newIngredient, category: event.target.value })} placeholder="CUP, nắp, ống hút, bịch..." /></label>
                      <fieldset className="staff-size-options"><legend>Size tương thích</legend>
                        {SIZES.map((size) => <label key={size}><input type="checkbox" checked={newIngredient.compatibleSizes.includes(size)} onChange={(event) => setNewIngredient((current) => ({
                          ...current,
                          compatibleSizes: event.target.checked
                            ? [...current.compatibleSizes, size]
                            : current.compatibleSizes.filter((value) => value !== size),
                        }))} /> {size}</label>)}
                      </fieldset>
                    </>}
                    <button className="detail-action" type="submit" disabled={busy !== ""}>Thêm vào kho dùng chung</button>
                  </form>
                  {activeTab === "packaging" && <p className="staff-ingredients-note">
                    Ly dùng nhóm <strong>CUP</strong> (hoặc LY) và size tương thích để tự động tiêu hao chung cho mọi đồ uống cùng size. Không thêm ly vào từng công thức.
                    Danh mục mới bắt đầu với tồn 0; hãy kiểm kê và nhập tồn thực tế qua thao tác kho. Nắp, ống hút và bịch chỉ tiêu hao khi được cấu hình quy tắc.
                  </p>}
                </details>
              </div>
              <div className="staff-inventory-table-wrap">
                <table className="staff-inventory-table">
                  <thead><tr><th>Tên / mã</th><th>Nhóm</th><th>Tồn kho</th><th>Ngưỡng</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
                  <tbody>
                    {inventoryRows.map((ingredient) => (
                      <tr key={ingredient.id} className={ingredient.lowStock ? "is-low-stock" : ""}>
                        <td><strong>{ingredient.name}</strong><small>{ingredient.code} · {ingredient.unit}</small></td>
                        <td>{ingredient.kind === "PACKAGING" ? <>
                          {ingredient.category ?? "Vật tư"}
                          <small>{ingredient.compatibleSizes.length ? `Size ${ingredient.compatibleSizes.join("/")}` : "Chưa phân loại size"}</small>
                        </> : "Nguyên liệu"}</td>
                        <td>{ingredient.stock.toLocaleString("vi-VN")} {ingredient.unit}</td>
                        <td>{ingredient.warningThreshold.toLocaleString("vi-VN")} {ingredient.unit}</td>
                        <td><span className={`staff-stock-badge${ingredient.lowStock ? " is-low" : ""}`}>
                          {!ingredient.isActive ? "Ngừng sử dụng" : ingredient.stock <= 0 ? "Hết hàng" : ingredient.lowStock ? "Sắp hết" : "Còn hàng"}
                        </span></td>
                        <td><div className="staff-inventory-actions">
                          <button type="button" onClick={() => { setDialog({ ingredient, direction: "in" }); setStockQuantity(""); setStockReason(""); }}>Nhập kho</button>
                          <button type="button" onClick={() => { setDialog({ ingredient, direction: "out" }); setStockQuantity(""); setStockReason(""); }}>Xuất kho</button>
                          <button type="button" onClick={() => void showHistory(ingredient)}>Lịch sử</button>
                          <details className="staff-row-edit">
                            <summary>Sửa thông tin</summary>
                            <form onSubmit={(event) => void saveIngredientDetails(event, ingredient)}>
                              <label>Tên<input name="name" required defaultValue={ingredient.name} /></label>
                              <label>Mã<input name="code" required defaultValue={ingredient.code} /></label>
                              <label>Đơn vị<input name="unit" required defaultValue={ingredient.unit} /></label>
                              <label>Ngưỡng<input name="warningThreshold" type="number" min="0" required defaultValue={ingredient.warningThreshold} /></label>
                              {ingredient.kind === "PACKAGING" && <>
                                <label>Nhóm vật tư<input name="category" required maxLength={40} defaultValue={ingredient.category ?? ""} /></label>
                                <fieldset className="staff-size-options"><legend>Size tương thích</legend>
                                  {SIZES.map((size) => <label key={size}>
                                    <input type="checkbox" name="compatibleSizes" value={size} defaultChecked={ingredient.compatibleSizes.includes(size)} />
                                    {size}
                                  </label>)}
                                </fieldset>
                              </>}
                              <label className="staff-toggle-label">Đang hoạt động
                                <input name="isActive" type="checkbox" defaultChecked={ingredient.isActive} />
                              </label>
                              <button type="submit" disabled={busy !== ""}>Lưu thông tin</button>
                            </form>
                          </details>
                        </div></td>
                      </tr>
                    ))}
                    {!inventoryRows.length && <tr><td colSpan={6} className="staff-empty">Không có dữ liệu trong kho này.</td></tr>}
                  </tbody>
                </table>
              </div>
              {historyFor && (
                <section className="staff-inventory-history" aria-label="Lịch sử kho">
                  <header><h2>Lịch sử: {ingredients.find((item) => item.id === historyFor)?.name}</h2>
                    <button type="button" onClick={() => setHistoryFor(null)}>Đóng</button></header>
                  {!history.length ? <p>Chưa có biến động kho.</p> : <ul>{history.map((entry) => (
                    <li key={entry.id}><strong>{entry.delta > 0 ? "+" : ""}{entry.delta} {ingredients.find((item) => item.id === historyFor)?.unit}</strong>
                      <span>{entry.reason} · {entry.staffEmail} · {new Date(entry.createdAt).toLocaleString("vi-VN")}</span></li>
                  ))}</ul>}
                </section>
              )}
            </>
          )}

          {activeTab === "toppings" && (
            <>
              <section className="staff-inventory-summary" aria-label="Tổng quan topping">
                <article><span>Danh mục topping</span><strong>{toppings.length}</strong></article>
                <article><span>Đang bán</span><strong>{toppings.filter((item) => item.isActive).length}</strong></article>
                <article><span>Thiếu cấu hình</span><strong>{toppings.filter((item) => !item.ingredientId || !item.portionQuantityRequired).length}</strong></article>
              </section>
              <div className="staff-inventory-toolbar">
                <label className="staff-inventory-search">Tìm topping
                  <input aria-label="Tìm trong kho" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tên topping..." />
                </label>
                <details className="staff-inventory-create">
                  <summary>Thêm topping</summary>
                  <form className="staff-ingredient-form" onSubmit={(event) => void submitToppingForm(event)}>
                    <label>Mã topping<input required maxLength={40} pattern="[a-z0-9][a-z0-9_-]*" value={newTopping.id} onChange={(event) => setNewTopping({ ...newTopping, id: event.target.value.toLocaleLowerCase() })} /></label>
                    <label>Tên<input required maxLength={100} value={newTopping.name} onChange={(event) => setNewTopping({ ...newTopping, name: event.target.value })} /></label>
                    <label>Giá thêm (đ)<input required type="number" min="0" step="1" value={newTopping.surcharge} onChange={(event) => setNewTopping({ ...newTopping, surcharge: event.target.value })} /></label>
                    <label>Nguyên liệu tồn kho<select required value={newTopping.ingredientId} onChange={(event) => setNewTopping({ ...newTopping, ingredientId: event.target.value })}>
                      <option value="">Chọn kho nguyên liệu dùng chung</option>
                      {recipeIngredientOptions.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.unit} · tồn {item.stock}</option>)}
                    </select></label>
                    <label>Định lượng mỗi phần<input required type="number" min="1" step="1" value={newTopping.portionQuantityRequired} onChange={(event) => setNewTopping({ ...newTopping, portionQuantityRequired: event.target.value })} /></label>
                    <button className="detail-action" type="submit" disabled={busy !== ""}>Tạo danh mục topping</button>
                  </form>
                </details>
              </div>
              <div className="staff-inventory-table-wrap">
                <table className="staff-inventory-table staff-topping-table">
                  <thead><tr><th>Topping / giá</th><th>Kho dùng chung</th><th>Định lượng phần</th><th>Phần khả dụng</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
                  <tbody>
                    {toppingInventory.map((topping) => {
                      const ingredient = ingredients.find((item) => item.id === topping.ingredientId);
                      const draft = toppingDrafts[topping.id];
                      const dose = topping.portionQuantityRequired;
                      const portions = ingredient && dose ? Math.floor(ingredient.stock / dose) : null;
                      const status = !ingredient || !dose ? "Chưa cấu hình"
                        : portions === 0 ? "Hết hàng"
                          : ingredient.lowStock ? "Sắp hết" : topping.isActive ? "Còn bán" : "Tạm tắt";
                      return (
                        <tr key={topping.id}>
                          <td><strong>{topping.name}</strong><small>{topping.surcharge.toLocaleString("vi-VN")} đ/phần</small></td>
                          <td>{ingredient ? <>{ingredient.name}<small>{ingredient.stock.toLocaleString("vi-VN")} {ingredient.unit} · ngưỡng {ingredient.warningThreshold}</small></> : "Chưa liên kết"}</td>
                          <td>{dose ? `${dose} ${ingredient?.unit ?? topping.ingredientUnit ?? ""}/phần` : "Chưa cấu hình"}</td>
                          <td>{portions === null ? "—" : `${portions.toLocaleString("vi-VN")} phần`}</td>
                          <td><span className={`staff-stock-badge${status === "Hết hàng" || status === "Sắp hết" ? " is-low" : ""}`}>{status}</span></td>
                          <td><div className="staff-inventory-actions">
                            {ingredient && <>
                              <button type="button" onClick={() => { setDialog({ ingredient, direction: "in" }); setStockQuantity(""); setStockReason(""); }}>Nhập kho</button>
                              <button type="button" onClick={() => { setDialog({ ingredient, direction: "out" }); setStockQuantity(""); setStockReason(""); }}>Xuất kho</button>
                              <button type="button" onClick={() => void showHistory(ingredient)}>Lịch sử</button>
                            </>}
                            <details className="staff-row-edit">
                              <summary>Cấu hình</summary>
                              {draft && <form onSubmit={(event) => void saveTopping(event, topping)}>
                                <label>Tên<input required maxLength={100} value={draft.name} onChange={(event) => setToppingDrafts((current) => ({ ...current, [topping.id]: { ...draft, name: event.target.value } }))} /></label>
                                <label>Giá thêm (đ)<input required type="number" min="0" value={draft.surcharge} onChange={(event) => setToppingDrafts((current) => ({ ...current, [topping.id]: { ...draft, surcharge: event.target.value } }))} /></label>
                                <label>Kho nguyên liệu<select value={draft.ingredientId} onChange={(event) => setToppingDrafts((current) => ({ ...current, [topping.id]: { ...draft, ingredientId: event.target.value } }))}>
                                  <option value="">Chọn nguyên liệu</option>
                                  {recipeIngredientOptions.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}
                                </select></label>
                                <label>Định lượng một phần<input type="number" min="1" step="1" value={draft.portionQuantityRequired} onChange={(event) => setToppingDrafts((current) => ({ ...current, [topping.id]: { ...draft, portionQuantityRequired: event.target.value } }))} /></label>
                                <label className="staff-toggle-label">Cho phép bán<input type="checkbox" checked={draft.isActive} onChange={(event) => setToppingDrafts((current) => ({ ...current, [topping.id]: { ...draft, isActive: event.target.checked } }))} /></label>
                                <button type="submit" disabled={busy !== ""}>Lưu topping</button>
                              </form>}
                            </details>
                          </div></td>
                        </tr>
                      );
                    })}
                    {!toppingInventory.length && <tr><td colSpan={6} className="staff-empty">Chưa có topping khớp bộ lọc.</td></tr>}
                  </tbody>
                </table>
              </div>
              <p className="staff-ingredients-note">
                Topping dùng đúng bản ghi nguyên liệu được liên kết; nhập/xuất tại đây cũng cập nhật kho nguyên liệu và lịch sử đó. Phần khả dụng = FLOOR(tồn / định lượng phần).
              </p>
            </>
          )}

          {activeTab === "recipes" && (
            <section className="staff-formula-panel">
              <div className="staff-inventory-toolbar">
                <label>Sản phẩm<select aria-label="Chọn sản phẩm" value={selectedProductId} onChange={(event) => {
                  const nextProductId = event.target.value;
                  if (confirmFormulaChange(`${nextProductId}-${selectedSize}`)) setSelectedProductId(nextProductId);
                }}>
                  {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                </select></label>
                <div className="staff-size-tabs" role="tablist" aria-label="Chọn size công thức">
                  {SIZES.map((size) => <button key={size} type="button" role="tab" aria-selected={selectedSize === size}
                    className={selectedSize === size ? "is-active" : ""} onClick={() => {
                      const nextKey = `${selectedProductId}-${size}`;
                      if (confirmFormulaChange(nextKey)) setSelectedSize(size);
                    }}>{size}</button>)}
                </div>
              </div>
              <section className="staff-formula-section staff-formula-comparison">
                <h3>So sánh công thức S/M/L</h3>
                <div className="staff-inventory-table-wrap">
                  <table className="staff-inventory-table">
                    <thead><tr>
                      <th>Nguyên liệu</th>
                      {SIZES.map((size) => <th key={size}>Size {size}</th>)}
                    </tr></thead>
                    <tbody>
                      {(() => {
                        const rows = new Map<string, { name: string; unit: string; quantities: Partial<Record<Size, number>> }>();
                        for (const size of selectedProduct?.sizes ?? []) {
                          for (const line of size.items) {
                            const row = rows.get(line.ingredientId) ?? {
                              name: line.ingredientName,
                              unit: line.unit,
                              quantities: {},
                            };
                            row.quantities[size.size] = line.quantityRequired;
                            rows.set(line.ingredientId, row);
                          }
                        }
                        return rows.size
                          ? [...rows].map(([id, row]) => (
                            <tr key={id}>
                              <td><strong>{row.name}</strong><small>{row.unit}</small></td>
                              {SIZES.map((size) => <td key={size}>
                                {row.quantities[size] === undefined
                                  ? "—"
                                  : `${row.quantities[size]} ${row.unit}`}
                              </td>)}
                            </tr>
                          ))
                          : <tr><td colSpan={4} className="staff-empty">Chưa có công thức size để so sánh.</td></tr>;
                      })()}
                      <tr className="staff-formula-status-row">
                        <th>Trạng thái</th>
                        {SIZES.map((size) => {
                          const recipeSize = selectedProduct?.sizes.find((item) => item.size === size);
                          const status = recipeSize
                            ? formulaStatus(recipeSize)
                            : { label: "Chưa cấu hình", className: "is-missing" };
                          return <td key={size}>
                            <span className={`staff-formula-status ${status.className}`}>{status.label}</span>
                          </td>;
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
                {(() => {
                  const shortSizes = selectedProduct?.sizes.filter((size) => size.configured) ?? [];
                  const signatures = shortSizes.map((size) => size.items
                    .map((item) => `${item.ingredientId}:${item.quantityRequired}`)
                    .sort()
                    .join("|"));
                  return signatures.length > 1 && signatures.some((signature, index) =>
                    signatures.slice(index + 1).some((other) => signature !== "" && signature === other),
                  ) ? <p className="staff-formula-warning" role="status">
                    Cảnh báo: có size đang dùng định lượng nguyên liệu giống hệt nhau. Hãy kiểm tra dung tích và công thức đã phê duyệt trước khi xác nhận.
                  </p> : null;
                })()}
              </section>
              <header className="staff-formula-heading">
                <div><span className="section-kicker">ĐỊNH MỨC TIÊU HAO</span>
                  <h2>{selectedProduct?.productName ?? "Chọn sản phẩm"} · Size {selectedSize}</h2></div>
                <span className="staff-formula-availability">
                  {selectedRecipeSize?.approvalStatus === "PENDING"
                    ? "Đề xuất – chờ xác nhận; chưa dùng để bán"
                    : selectedRecipeSize?.availability?.recipeConfigured &&
                    selectedRecipeSize.availability.stock > 0
                    ? `${selectedRecipeSize.availability.stock} ly tối đa${selectedRecipeSize.availability.usesSharedRecipe ? " · dùng công thức chung" : ""}`
                    : selectedRecipeSize?.availability?.recipeConfigured
                      ? "Hết nguyên liệu hoặc vật tư"
                    : selectedRecipeSize?.configured ? "Công thức chưa hợp lệ" : "Chưa cấu hình công thức"}
                </span>
              </header>
              {selectedRecipeSize && !selectedRecipeSize.configured && selectedProduct?.items.length ? (
                <details className="staff-formula-copy">
                  <summary>Công thức chung · không tự áp dụng cho size</summary>
                  <ul>{selectedProduct.items.map((item) => (
                    <li key={item.ingredientId}>
                      <span>{item.ingredientName}</span>
                      <strong>{item.quantityRequired} {item.unit}/ly</strong>
                    </li>
                  ))}</ul>
                  <button type="button" className="staff-secondary-button" onClick={copySharedRecipe}>
                    Chép công thức chung vào bản nháp
                  </button>
                </details>
              ) : null}
              {selectedRecipeSize?.statusReason && (
                <p className="staff-ingredients-note">{selectedRecipeSize.statusReason}</p>
              )}
              <div className="staff-formula-copy-options">
                {selectedProduct?.sizes.filter((size) => size.configured && size.size !== selectedSize)
                  .map((size) => <button key={size.size} type="button" className="staff-secondary-button"
                    onClick={() => copySizeRecipe(size.size)}>
                    Chép từ size {size.size} vào bản nháp
                  </button>)}
              </div>
              <section className="staff-formula-section">
                <h3>Nguyên liệu</h3>
                <p>Chọn từ kho nguyên liệu dùng chung. Không tạo tồn kho riêng theo sản phẩm.</p>
                {sizeLines.map((line, index) => {
                  const ingredient = ingredients.find((item) => item.id === line.ingredientId);
                  return <div className="staff-formula-row" key={`recipe-${index}`}>
                    <select aria-label={`Nguyên liệu dòng ${index + 1}`} value={line.ingredientId} onChange={(event) => {
                      setRecipeDrafts((current) => ({
                        ...current, [recipeKey]: sizeLines.map((item, row) => row === index ? { ...item, ingredientId: event.target.value } : item),
                      }));
                      markRecipeDirty(recipeKey);
                    }}>
                      <option value="">Chọn nguyên liệu dùng chung</option>
                      {recipeIngredientOptions.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}
                    </select>
                    <input aria-label={`Định lượng nguyên liệu dòng ${index + 1}`} type="number" min="1" step="1" value={line.quantityRequired} onChange={(event) => {
                      setRecipeDrafts((current) => ({
                        ...current, [recipeKey]: sizeLines.map((item, row) => row === index ? { ...item, quantityRequired: Number(event.target.value) } : item),
                      }));
                      markRecipeDirty(recipeKey);
                    }} />
                    <span>{ingredient?.unit ?? "đơn vị"}/ly</span>
                    <button type="button" className="order-cancel-button" onClick={() => {
                      setRecipeDrafts((current) => ({
                        ...current, [recipeKey]: sizeLines.filter((_, row) => row !== index),
                      }));
                      markRecipeDirty(recipeKey);
                    }}>Xóa</button>
                  </div>;
                })}
                <button type="button" className="staff-secondary-button" onClick={() => {
                  setRecipeDrafts((current) => ({
                    ...current, [recipeKey]: [...sizeLines, { ingredientId: "", quantityRequired: 1 }],
                  }));
                  markRecipeDirty(recipeKey);
                }}>Thêm nguyên liệu vào công thức</button>
              </section>
              <section className="staff-formula-section">
                <h3>Vật tư đóng gói</h3>
                <p>Ly theo size được tự động lấy từ kho chung. Nắp, ống hút và bịch cấu hình theo quy cách sử dụng.</p>
                {cupOptions.length === 1
                  ? <p className="staff-formula-cup">Ly dùng chung: {cupOptions[0].name} · tồn {cupOptions[0].stock} cái</p>
                  : cupOptions.length > 1
                    ? <p className="order-error">Có nhiều vật tư nhóm CUP/LY cho size này; giữ một quy cách hoạt động duy nhất.</p>
                    : <p className="staff-formula-cup">Chưa có ly cấu hình tự động cho size này.</p>}
                {packageLines.map((line, index) => {
                  const item = ingredients.find((ingredient) => ingredient.id === line.ingredientId);
                  return <div className="staff-formula-row" key={`packaging-${index}`}>
                    <select aria-label={`Vật tư dòng ${index + 1}`} value={line.ingredientId} onChange={(event) => {
                      setPackagingDrafts((current) => ({
                        ...current, [recipeKey]: packageLines.map((entry, row) => row === index ? { ...entry, ingredientId: event.target.value } : entry),
                      }));
                      markRecipeDirty(recipeKey);
                    }}>
                      <option value="">Chọn vật tư dùng chung</option>
                      {packagingOptions.map((option) => <option key={option.id} value={option.id}>{option.name} ({option.unit})</option>)}
                    </select>
                    <select aria-label={`Quy tắc vật tư dòng ${index + 1}`} value={line.usageType} onChange={(event) => {
                      setPackagingDrafts((current) => ({
                        ...current, [recipeKey]: packageLines.map((entry, row) => row === index ? {
                          ...entry,
                          usageType: event.target.value as PackagingLine["usageType"],
                        } : entry),
                      }));
                      markRecipeDirty(recipeKey);
                    }}>
                      <option value="PER_SERVING">Theo mỗi ly</option><option value="PER_ORDER">Theo đơn</option><option value="PER_GROUP">Theo nhóm ly</option>
                    </select>
                    <input aria-label={`Định lượng vật tư dòng ${index + 1}`} type="number" min="1" value={line.quantityRequired} onChange={(event) => {
                      setPackagingDrafts((current) => ({
                        ...current, [recipeKey]: packageLines.map((entry, row) => row === index ? { ...entry, quantityRequired: Number(event.target.value) } : entry),
                      }));
                      markRecipeDirty(recipeKey);
                    }} />
                    <span>{item?.unit ?? "đơn vị"}</span>
                    <button type="button" className="order-cancel-button" onClick={() => {
                      setPackagingDrafts((current) => ({
                        ...current, [recipeKey]: packageLines.filter((_, row) => row !== index),
                      }));
                      markRecipeDirty(recipeKey);
                    }}>Xóa</button>
                  </div>;
                })}
                <button type="button" className="staff-secondary-button" onClick={() => {
                  setPackagingDrafts((current) => ({
                    ...current, [recipeKey]: [...packageLines, {
                      ingredientId: "",
                      usageType: "PER_SERVING",
                      quantityRequired: 1,
                    }],
                  }));
                  markRecipeDirty(recipeKey);
                }}>Thêm quy tắc vật tư</button>
              </section>
              <section className="staff-formula-section staff-formula-toppings">
                <h3>Topping dùng chung toàn menu</h3>
                <p>Topping đang bật tại tab Kho topping áp dụng cho tất cả đồ uống và size S/M/L. Số phần chọn không bị giới hạn bởi công thức; tồn kho dùng chung là giới hạn thực tế.</p>
                <button type="button" className="staff-secondary-button" onClick={() => {
                  setActiveTab("toppings");
                  setSearch("");
                }}>Mở Kho topping</button>
                {toppings.length
                  ? <div className="staff-inventory-table-wrap">
                    <table className="staff-inventory-table">
                      <thead><tr><th>Topping</th><th>Định lượng/phần</th><th>Tồn kho nguyên liệu</th><th>Phần khả dụng</th><th>Trạng thái</th></tr></thead>
                      <tbody>{toppings.map((topping) => (
                        <tr key={topping.id}>
                          <td><strong>{topping.name}</strong><small>{topping.ingredientName ?? "Chưa liên kết"}</small></td>
                          <td>{topping.portionQuantityRequired && topping.ingredientUnit
                            ? `${topping.portionQuantityRequired} ${topping.ingredientUnit}`
                            : "Chưa cấu hình"}</td>
                          <td>{topping.ingredientStock !== null && topping.ingredientUnit
                            ? `${topping.ingredientStock.toLocaleString("vi-VN")} ${topping.ingredientUnit}`
                            : "—"}</td>
                          <td>{topping.availablePortions === null
                            ? "—"
                            : topping.availablePortions.toLocaleString("vi-VN")}</td>
                          <td><span className={`staff-stock-badge${!topping.isActive || !topping.availablePortions ? " is-low" : ""}`}>
                            {!topping.isActive ? "Đang tắt" : !topping.ingredientId || !topping.portionQuantityRequired
                              ? "Chưa cấu hình" : topping.availablePortions ? "Còn bán" : "Hết hàng"}
                          </span></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                  : <p className="staff-empty">Chưa có danh mục topping. Cấu hình tại tab Kho topping.</p>}
                <p className="staff-ingredients-note">
                  Topping được quản lý tại kho chung và áp dụng cho toàn bộ sản phẩm theo quy tắc kinh doanh hiện tại. Tồn kho chỉ được điều chỉnh tại khu vực kho.
                </p>
              </section>
              {!recipeIngredientOptions.length && <p className="staff-empty">
                Chưa có nguyên liệu hoạt động. Tạo trước tại tab Kho nguyên liệu.
              </p>}
              <div className="staff-formula-footer">
                <p>
                  {selectedRecipeSize?.approvalStatus === "CONFIRMED"
                    ? "Công thức đã xác nhận. Mọi thay đổi cần lưu và xác nhận lại."
                    : "Công thức mới hoặc vừa chỉnh sửa chỉ là đề xuất; chưa ảnh hưởng tồn kho hoặc đơn hàng cho tới khi xác nhận."}
                </p>
                {selectedRecipeSize?.configured && selectedRecipeSize.approvalStatus !== "CONFIRMED" &&
                  !dirtyRecipeKeys.has(recipeKey) && (
                  <button type="button" className="staff-secondary-button" disabled={busy !== ""}
                    onClick={() => void confirmSelectedRecipe()}>
                    Xác nhận và kích hoạt size
                  </button>
                )}
                <button className="detail-action" type="button" disabled={busy !== "" || !sizeLines.length || sizeLines.some((item) =>
                  !item.ingredientId || !Number.isSafeInteger(item.quantityRequired) || item.quantityRequired < 1,
                )} onClick={() => void saveFormula()}>
                  {busy === "formula" ? "Đang lưu..." : "Lưu bản nháp công thức"}
                </button>
              </div>
            </section>
          )}
        </div>
      )}

      {dialog && (
        <div className="staff-stock-modal-backdrop" role="presentation">
          <section className="staff-stock-modal" role="dialog" aria-modal="true" aria-labelledby="stock-modal-title">
            <button type="button" className="staff-stock-modal-close" aria-label="Đóng" onClick={() => setDialog(null)}>×</button>
            <span className="section-kicker">{dialog.direction === "in" ? "NHẬP KHO" : "XUẤT KHO"}</span>
            <h2 id="stock-modal-title">{dialog.ingredient.name}</h2>
            <p>Tồn hiện tại: {dialog.ingredient.stock.toLocaleString("vi-VN")} {dialog.ingredient.unit}</p>
            <form onSubmit={(event) => void adjustStock(event)}>
              <label>Số lượng ({dialog.ingredient.unit})<input autoFocus required type="number" min="1" step="1" value={stockQuantity} onChange={(event) => setStockQuantity(event.target.value)} /></label>
              <label>Lý do<input required maxLength={200} value={stockReason} onChange={(event) => setStockReason(event.target.value)} placeholder="Nhập lý do biến động kho" /></label>
              <div><button type="button" className="staff-secondary-button" onClick={() => setDialog(null)}>Hủy</button>
                <button type="submit" className="detail-action" disabled={busy !== ""}>{busy ? "Đang lưu..." : dialog.direction === "in" ? "Xác nhận nhập" : "Xác nhận xuất"}</button></div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}

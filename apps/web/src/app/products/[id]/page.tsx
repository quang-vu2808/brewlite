"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SiteHeader } from "../../../components/site-header";
import { useCart } from "../../../components/cart-provider";
import { calculateUnitPrice, SIZE_OPTIONS, TOPPING_OPTIONS, type ProductSize } from "../../../lib/pricing";
import { fetchInventory } from "../../../lib/inventory";

type Product = {
  id: number | string;
  name: string;
  price: number | string;
  image?: string | null;
  imageUrl?: string | null;
  description?: string | null;
};

type LoadState = "loading" | "success" | "not-found" | "error";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/$/, "");
const formatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

function isProduct(payload: unknown): payload is Product {
  if (typeof payload !== "object" || payload === null) return false;
  const product = payload as Record<string, unknown>;
  const price = Number(product.price);

  return (
    (typeof product.id === "number" || typeof product.id === "string") &&
    typeof product.name === "string" &&
    product.name.length > 0 &&
    Number.isSafeInteger(price) &&
    price >= 0
  );
}

function imageSrc(product: Product): string | null {
  const raw = product.imageUrl || product.image;
  if (!raw || typeof raw !== "string") return null;
  if (/^https?:\/\//.test(raw)) return raw;
  if (raw.startsWith("/images/products/")) return raw;
  if (raw.startsWith("/")) return `${API_URL}${raw}`;
  return null;
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { addItem, hydrated: cartHydrated } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);
  const [size, setSize] = useState<ProductSize>("M");
  const [selectedToppings, setSelectedToppings] = useState<Set<string>>(new Set());
  const [stock, setStock] = useState<number | null>(null);
  const [stockError, setStockError] = useState("");

  useEffect(() => {
    const abort = new AbortController();

    async function loadProduct() {
      setProduct(null);
      setState("loading");
      setMessage("");
      setStock(null);
      setStockError("");
      setSize("M");
      setSelectedToppings(new Set());

      if (!/^[1-9]\d*$/.test(id)) {
        setState("not-found");
        return;
      }

      try {
        const response = await fetch(`${API_URL}/products/${encodeURIComponent(id)}`, {
          signal: abort.signal,
          cache: "no-store",
        });

        if (response.status === 404) {
          if (!abort.signal.aborted) setState("not-found");
          return;
        }
        if (!response.ok) throw new Error(`API trả HTTP ${response.status}`);

        const payload: unknown = await response.json();
        if (!isProduct(payload)) throw new Error("Thông tin sản phẩm từ API không hợp lệ");

        if (!abort.signal.aborted) {
          setProduct({ ...payload, price: Number(payload.price) });
          setState("success");
        }
        try {
          const records = await fetchInventory(abort.signal);
          const productStock = records.find((record) => record.productId === Number(payload.id));
          if (!abort.signal.aborted) setStock(productStock?.stock ?? 0);
        } catch (error) {
          if (!abort.signal.aborted) {
            setStockError(error instanceof Error ? error.message : "Không thể tải tồn kho");
          }
        }
      } catch (error) {
        if (!abort.signal.aborted) {
          setMessage(error instanceof Error ? error.message : "Không thể kết nối máy chủ");
          setState("error");
        }
      }
    }

    void loadProduct();
    return () => abort.abort();
  }, [id, retry]);

  const selectedSize = SIZE_OPTIONS.find((option) => option.name === size);
  const basePrice = product ? Number(product.price) : 0;
  const selectedToppingOptions = TOPPING_OPTIONS.filter((topping) => selectedToppings.has(topping.id));
  const total = product ? calculateUnitPrice(basePrice, size, selectedToppingOptions) : 0;
  const image = product ? imageSrc(product) : null;

  return (
    <div className="site-shell">
      <SiteHeader />

      <main className="detail-main">
        <Link href="/#menu" className="detail-back">← Menu</Link>
        {state === "loading" && (
          <div className="detail-loading" role="status" aria-label="Đang tải sản phẩm">
            <div className="detail-loading-image" />
            <div className="detail-loading-copy"><span /><span /><span /></div>
          </div>
        )}
        {state === "not-found" && (
          <section className="state-panel detail-state" role="status">
            <span className="state-icon" aria-hidden="true">☕</span>
            <h1>Không tìm thấy sản phẩm</h1>
            <p>Sản phẩm này không tồn tại hoặc đã được gỡ khỏi menu.</p>
            <Link className="detail-action" href="/#menu">Quay lại menu</Link>
          </section>
        )}
        {state === "error" && (
          <section className="state-panel detail-state" role="alert">
            <span className="state-icon" aria-hidden="true">!</span>
            <h1>Không tải được sản phẩm</h1>
            <p>{message}. Kiểm tra API tại {API_URL} rồi thử lại.</p>
            <button className="detail-action" type="button" onClick={() => setRetry((value) => value + 1)}>
              Thử lại
            </button>
          </section>
        )}
        {state === "success" && product && (
          <section className="detail-card" aria-labelledby="product-name">
            <div className="detail-image product-image">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image}
                  alt={product.name}
                  onError={(event) => {
                    event.currentTarget.hidden = true;
                    event.currentTarget.parentElement?.classList.add("image-fallback");
                  }}
                />
              ) : <span className="coffee-symbol" aria-hidden="true">☕</span>}
            </div>
            <div className="detail-content">
              <span className="product-overline">BREWLITE SELECTION</span>
              <h1 id="product-name">{product.name}</h1>
              {product.description && <p className="detail-description">{product.description}</p>}
              <p className="detail-base-price">Giá cơ bản <strong>{formatter.format(basePrice)}</strong></p>
              <p className="detail-stock" role={stockError ? "alert" : undefined}>
                {stockError || (stock === null ? "Đang tải tồn kho..." : stock > 0 ? `Còn ${stock} sản phẩm` : "Tạm hết hàng")}
              </p>

              <fieldset className="option-group">
                <legend>Chọn size</legend>
                <div className="option-list" role="radiogroup" aria-label="Chọn size">
                  {SIZE_OPTIONS.map((option) => (
                    <label
                      className={`option-button size-option${size === option.name ? " selected" : ""}`}
                      key={option.name}
                    >
                      <input
                        type="radio"
                        name="product-size"
                        value={option.name}
                        checked={size === option.name}
                        onChange={() => setSize(option.name)}
                      />
                      <span>{option.name}</span>
                      <small>{option.surcharge === 0 ? "Không phụ thu" : `+${formatter.format(option.surcharge)}`}</small>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="option-group">
                <legend>Thêm topping</legend>
                <div className="topping-list">
                  {TOPPING_OPTIONS.map((topping) => {
                    const checked = selectedToppings.has(topping.id);
                    return (
                      <label
                        className={`option-button topping-option${checked ? " selected" : ""}`}
                        key={topping.id}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setSelectedToppings((current) => {
                            const next = new Set(current);
                            if (next.has(topping.id)) next.delete(topping.id);
                            else next.add(topping.id);
                            return next;
                          })}
                        />
                        <span className="topping-check" aria-hidden="true">{checked ? "✓" : "+"}</span>
                        <span>{topping.name}</span>
                        <small>+{formatter.format(topping.surcharge)}</small>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <p className="pricing-assumption">Phụ thu size và topping là giá mẫu, có thể điều chỉnh theo bảng giá thực tế.</p>
              <div className="detail-total" aria-live="polite">
                <span>Tổng giá</span>
                <strong>{formatter.format(total)}</strong>
              </div>
              <button
                className="detail-action add-to-cart"
                type="button"
                disabled={!cartHydrated || stock === null || stock <= 0}
                onClick={() => {
                  if (!product) return;
                  addItem({
                    productId: String(product.id),
                    name: product.name,
                    image,
                    basePrice,
                    size,
                    sizeSurcharge: selectedSize?.surcharge ?? 0,
                    toppings: selectedToppingOptions,
                  });
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M3 4h2l2.2 11.1a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 1.9-1.4L22 8H6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="10" cy="20" r="1" fill="currentColor" />
                  <circle cx="18" cy="20" r="1" fill="currentColor" />
                  <path d="M14 4v6m-3-3h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <span>Thêm vào giỏ hàng</span>
              </button>
            </div>
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

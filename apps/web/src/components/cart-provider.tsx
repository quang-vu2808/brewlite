"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { calculateUnitPrice, type ProductSize, type ProductTopping } from "../lib/pricing";

const STORAGE_KEY = "brewlite-cart-v1";
const MAX_QUANTITY = 99;

export type CartItem = {
  key: string;
  productId: string;
  name: string;
  image: string | null;
  basePrice: number;
  size: ProductSize;
  sizeSurcharge: number;
  toppings: ProductTopping[];
  unitPrice: number;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  hydrated: boolean;
  totalItems: number;
  totalPrice: number;
  recentlyAdded: CartItem | null;
  addItem: (item: Omit<CartItem, "key" | "unitPrice" | "quantity">) => CartItem;
  dismissAddedItem: () => void;
  increaseQuantity: (key: string) => void;
  decreaseQuantity: (key: string) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function isCartItem(value: unknown): value is CartItem {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Partial<CartItem>;
  return (
    typeof item.key === "string" &&
    typeof item.productId === "string" &&
    typeof item.name === "string" &&
    (typeof item.image === "string" || item.image === null) &&
    Number.isSafeInteger(item.basePrice) &&
    Number(item.basePrice) >= 0 &&
    (item.size === "S" || item.size === "M" || item.size === "L") &&
    Number.isSafeInteger(item.sizeSurcharge) &&
    Number(item.sizeSurcharge) >= 0 &&
    Array.isArray(item.toppings) &&
    item.toppings.every((topping: unknown) => {
      if (typeof topping !== "object" || topping === null) return false;
      const option = topping as Partial<ProductTopping>;
      return typeof option.id === "string" &&
        typeof option.name === "string" &&
        Number.isSafeInteger(option.surcharge) &&
        Number(option.surcharge) >= 0;
    }) &&
    Number.isSafeInteger(item.unitPrice) &&
    Number(item.unitPrice) >= 0 &&
    Number.isInteger(item.quantity) &&
    Number(item.quantity) >= 1 &&
    Number(item.quantity) <= MAX_QUANTITY
  );
}

function readStoredItems(): CartItem[] {
  let stored: string | null;
  try {
    stored = window.localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.error("Không thể đọc giỏ hàng từ localStorage.", error);
    return [];
  }
  if (!stored) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch (error) {
    console.error("Dữ liệu giỏ hàng trong localStorage không hợp lệ.", error);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (storageError) {
      console.error("Không thể xóa dữ liệu giỏ hàng không hợp lệ.", storageError);
    }
    return [];
  }
  if (!Array.isArray(parsed)) {
    console.error("Dữ liệu giỏ hàng trong localStorage không đúng định dạng.");
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Không thể xóa dữ liệu giỏ hàng không hợp lệ.", error);
    }
    return [];
  }

  const validItems = parsed.filter(isCartItem);
  if (validItems.length !== parsed.length) {
    console.error("Một số sản phẩm trong giỏ lưu trữ không hợp lệ và đã bị bỏ qua.");
  }
  return validItems;
}

function makeItemKey(productId: string, size: ProductSize, toppings: readonly ProductTopping[]): string {
  const toppingIds = [...new Set(toppings.map((topping) => topping.id))].sort();
  return JSON.stringify([productId, size, toppingIds]);
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [recentlyAdded, setRecentlyAdded] = useState<CartItem | null>(null);
  const itemsRef = useRef<CartItem[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const restoredItems = readStoredItems();
      itemsRef.current = restoredItems;
      setItems(restoredItems);
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const updateItems = useCallback((update: (current: CartItem[]) => CartItem[]): CartItem[] => {
    const next = update(itemsRef.current);
    itemsRef.current = next;
    setItems(next);
    return next;
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error("Không thể lưu giỏ hàng vào localStorage.", error);
    }
  }, [items, hydrated]);

  const addItem = useCallback((input: Omit<CartItem, "key" | "unitPrice" | "quantity">): CartItem => {
    const key = makeItemKey(input.productId, input.size, input.toppings);
    const currentItem = itemsRef.current.find((item) => item.key === key);
    const toppings = [...new Map(input.toppings.map((topping) => [topping.id, topping])).values()];
    const addedItem: CartItem = currentItem
      ? { ...currentItem, quantity: Math.min(MAX_QUANTITY, currentItem.quantity + 1) }
      : {
        ...input,
        key,
        toppings,
        unitPrice: calculateUnitPrice(input.basePrice, input.size, toppings),
        quantity: 1,
      };

    updateItems((current) => currentItem
      ? current.map((item) => item.key === key ? addedItem : item)
      : [...current, addedItem]);
    setRecentlyAdded(addedItem);
    return addedItem;
  }, [updateItems]);

  const increaseQuantity = useCallback((key: string) => {
    updateItems((current) => current.map((item) => item.key === key
      ? { ...item, quantity: Math.min(MAX_QUANTITY, item.quantity + 1) }
      : item));
  }, [updateItems]);

  const decreaseQuantity = useCallback((key: string) => {
    updateItems((current) => current.map((item) => item.key === key
      ? { ...item, quantity: Math.max(1, item.quantity - 1) }
      : item));
  }, [updateItems]);

  const removeItem = useCallback((key: string) => {
    updateItems((current) => current.filter((item) => item.key !== key));
  }, [updateItems]);

  const clearCart = useCallback(() => {
    updateItems(() => []);
  }, [updateItems]);

  const dismissAddedItem = useCallback(() => setRecentlyAdded(null), []);

  const value = useMemo<CartContextValue>(() => ({
    items,
    hydrated,
    totalItems: items.reduce((total, item) => total + item.quantity, 0),
    totalPrice: items.reduce((total, item) => total + item.unitPrice * item.quantity, 0),
    recentlyAdded,
    addItem,
    dismissAddedItem,
    increaseQuantity,
    decreaseQuantity,
    removeItem,
    clearCart,
  }), [items, hydrated, recentlyAdded, addItem, dismissAddedItem, increaseQuantity, decreaseQuantity, removeItem, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart phải được sử dụng bên trong CartProvider");
  return context;
}

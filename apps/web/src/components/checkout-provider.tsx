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

const STORAGE_KEY = "brewlite-checkout-v1";

export type CheckoutTopping = {
  id: string;
  name: string;
  surcharge: number;
};

export type CheckoutOrderItem = {
  productId: number;
  productName: string;
  size: "S" | "M" | "L";
  toppings: CheckoutTopping[];
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type CheckoutOrder = {
  id: string;
  orderCode: string;
  status: "PENDING" | "PAYMENT_FAILED" | "PAID" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";
  subtotalAmount?: number;
  discountAmount?: number;
  loyaltyDiscountAmount?: number;
  redeemedPoints?: number;
  loyaltyPointsAwarded?: number;
  loyaltyPoints?: number;
  promotionCode?: string | null;
  totalAmount: number;
  createdAt: string;
  items: CheckoutOrderItem[];
};

export type CheckoutPayment = {
  paymentId: string;
  orderId: string;
  method: "WALLET" | "CARD";
  status: "SUCCESS" | "FAILED";
  orderStatus: "PAID" | "PAYMENT_FAILED";
  amount: number;
  loyaltyPoints?: number;
  pointsEarned?: number;
  provider?: string;
  qrPayload?: string;
  message: string;
  createdAt: string;
};

type CheckoutValue = {
  hydrated: boolean;
  order: CheckoutOrder | null;
  payment: CheckoutPayment | null;
  setOrder: (order: CheckoutOrder) => void;
  setPayment: (payment: CheckoutPayment) => void;
  clearCheckout: () => void;
};

type StoredCheckout = {
  order: CheckoutOrder;
  payment: CheckoutPayment | null;
};

const CheckoutContext = createContext<CheckoutValue | null>(null);

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function isCheckoutOrder(value: unknown): value is CheckoutOrder {
  if (typeof value !== "object" || value === null) return false;
  const order = value as Partial<CheckoutOrder>;
  return typeof order.id === "string" &&
    typeof order.orderCode === "string" &&
    ["PENDING", "PAYMENT_FAILED", "PAID", "PREPARING", "READY", "COMPLETED", "CANCELLED"].includes(order.status ?? "") &&
    isNonNegativeInteger(order.totalAmount) &&
    (order.subtotalAmount === undefined || isNonNegativeInteger(order.subtotalAmount)) &&
    (order.discountAmount === undefined || isNonNegativeInteger(order.discountAmount)) &&
    (order.loyaltyDiscountAmount === undefined || isNonNegativeInteger(order.loyaltyDiscountAmount)) &&
    (order.redeemedPoints === undefined || isNonNegativeInteger(order.redeemedPoints)) &&
    (order.loyaltyPointsAwarded === undefined || isNonNegativeInteger(order.loyaltyPointsAwarded)) &&
    (order.loyaltyPoints === undefined || isNonNegativeInteger(order.loyaltyPoints)) &&
    (order.promotionCode === undefined || order.promotionCode === null || typeof order.promotionCode === "string") &&
    typeof order.createdAt === "string" &&
    Array.isArray(order.items) &&
    order.items.every((item) => {
      if (typeof item !== "object" || item === null) return false;
      const line = item as Partial<CheckoutOrderItem>;
      return Number.isSafeInteger(line.productId) &&
        typeof line.productName === "string" &&
        (line.size === "S" || line.size === "M" || line.size === "L") &&
        Number.isInteger(line.quantity) && Number(line.quantity) > 0 &&
        isNonNegativeInteger(line.unitPrice) &&
        isNonNegativeInteger(line.lineTotal) &&
        Array.isArray(line.toppings) &&
        line.toppings.every((topping) =>
          typeof topping?.id === "string" &&
          typeof topping.name === "string" &&
          isNonNegativeInteger(topping.surcharge)
        );
    });
}

function isCheckoutPayment(value: unknown): value is CheckoutPayment {
  if (typeof value !== "object" || value === null) return false;
  const payment = value as Partial<CheckoutPayment>;
  return typeof payment.paymentId === "string" &&
    typeof payment.orderId === "string" &&
    (payment.method === "WALLET" || payment.method === "CARD") &&
    (payment.status === "SUCCESS" || payment.status === "FAILED") &&
    (payment.orderStatus === "PAID" || payment.orderStatus === "PAYMENT_FAILED") &&
    isNonNegativeInteger(payment.amount) &&
    (payment.loyaltyPoints === undefined || isNonNegativeInteger(payment.loyaltyPoints)) &&
    (payment.pointsEarned === undefined || isNonNegativeInteger(payment.pointsEarned)) &&
    (payment.provider === undefined || typeof payment.provider === "string") &&
    (payment.qrPayload === undefined || typeof payment.qrPayload === "string") &&
    typeof payment.message === "string" &&
    typeof payment.createdAt === "string";
}

function readStoredCheckout(): StoredCheckout | null {
  let raw: string | null;
  try {
    raw = window.sessionStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.error("Không thể đọc phiên thanh toán.", error);
    return null;
  }
  if (!raw) return null;

  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value === "object" && value !== null && "order" in value) {
      const stored = value as Partial<StoredCheckout>;
      if (
        isCheckoutOrder(stored.order) &&
        (stored.payment === null || isCheckoutPayment(stored.payment)) &&
        (stored.payment === null || stored.payment.orderId === stored.order.id)
      ) {
        return { order: stored.order, payment: stored.payment };
      }
    }
  } catch (error) {
    console.error("Dữ liệu phiên thanh toán không hợp lệ.", error);
  }

  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Không thể xóa phiên thanh toán không hợp lệ.", error);
  }
  return null;
}

export function CheckoutProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [checkout, setCheckout] = useState<StoredCheckout | null>(null);
  const checkoutRef = useRef<StoredCheckout | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!checkoutRef.current) {
        checkoutRef.current = readStoredCheckout();
        setCheckout(checkoutRef.current);
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const storeCheckout = useCallback((next: StoredCheckout | null) => {
    checkoutRef.current = next;
    setCheckout(next);
    try {
      if (next) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else window.sessionStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Không thể lưu phiên thanh toán.", error);
    }
  }, []);

  const setOrder = useCallback((order: CheckoutOrder) => {
    storeCheckout({ order, payment: null });
  }, [storeCheckout]);

  const setPayment = useCallback((payment: CheckoutPayment) => {
    const current = checkoutRef.current;
    if (!current || current.order.id !== payment.orderId) return;
    storeCheckout({
      order: { ...current.order, status: payment.orderStatus },
      payment,
    });
  }, [storeCheckout]);

  const clearCheckout = useCallback(() => storeCheckout(null), [storeCheckout]);

  const value = useMemo<CheckoutValue>(() => ({
    hydrated,
    order: checkout?.order ?? null,
    payment: checkout?.payment ?? null,
    setOrder,
    setPayment,
    clearCheckout,
  }), [hydrated, checkout, setOrder, setPayment, clearCheckout]);

  return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>;
}

export function useCheckout(): CheckoutValue {
  const context = useContext(CheckoutContext);
  if (!context) throw new Error("useCheckout phải được sử dụng bên trong CheckoutProvider");
  return context;
}

export function parseCheckoutOrder(value: unknown): CheckoutOrder | null {
  return isCheckoutOrder(value) ? value : null;
}

export function parseCheckoutPayment(value: unknown): CheckoutPayment | null {
  return isCheckoutPayment(value) ? value : null;
}

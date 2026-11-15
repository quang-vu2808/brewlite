import type { Metadata } from "next";
import { AuthProvider } from "../components/auth-provider";
import { CartProvider } from "../components/cart-provider";
import { CartToast } from "../components/cart-toast";
import { CheckoutProvider } from "../components/checkout-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "BrewLite | Cà phê ngon, đặt nhanh mỗi ngày",
  description: "BrewLite – ứng dụng đặt đồ uống trực tuyến. Xem menu và giá dễ dàng.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi"><body><CartProvider><AuthProvider><CheckoutProvider>{children}<CartToast /></CheckoutProvider></AuthProvider></CartProvider></body></html>
  );
}

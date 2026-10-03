import "./globals.css";
import "./order.css";
import type { Metadata } from "next";
import { EntryProvider } from "@/lib/entry-context";
import { VisitProvider } from "@/lib/visit-context";
import { CartProvider } from "@/lib/cart";
import { OrderProvider } from "@/lib/order-context";

export const metadata: Metadata = {
  title: "NEXA Café",
  description:
    "Premium café experience. Scan your table's QR code to get started.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <EntryProvider>
          <VisitProvider>
            <CartProvider>
              <OrderProvider>{children}</OrderProvider>
            </CartProvider>
          </VisitProvider>
        </EntryProvider>
      </body>
    </html>
  );
}

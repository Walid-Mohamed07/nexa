"use client";

import * as React from "react";
import type { MenuItem } from "@/lib/api";

export type CartItem = {
  id: string;
  menuItem: MenuItem;
  quantity: number;
  selectedModifiers: string[];
};

function useCartState() {
  const [items, setItems] = React.useState<CartItem[]>([]);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem("nexa-cart");
      if (!raw) {
        setItems([]);
        return;
      }

      const parsed = JSON.parse(raw) as CartItem[];
      if (Array.isArray(parsed)) {
        setItems(
          parsed.filter(
            (item) =>
              item &&
              typeof item.id === "string" &&
              item.menuItem &&
              typeof item.menuItem.id === "string" &&
              typeof item.menuItem.name === "string" &&
              Number.isFinite(item.menuItem.price) &&
              item.menuItem.price >= 0 &&
              Number.isInteger(item.quantity) &&
              item.quantity > 0 &&
              item.quantity <= 99 &&
              Array.isArray(item.selectedModifiers) &&
              item.selectedModifiers.every(
                (option) => typeof option === "string",
              ),
          ),
        );
      }
    } catch {
      setItems([]);
    } finally {
      setReady(true);
    }
  }, []);

  React.useEffect(() => {
    if (ready) {
      try {
        window.localStorage.setItem("nexa-cart", JSON.stringify(items));
      } catch {}
    }
  }, [items, ready]);

  const addItem = React.useCallback(
    (menuItem: MenuItem, quantity = 1, selectedModifiers: string[] = []) => {
      if (
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        menuItem.availability !== "AVAILABLE"
      )
        return;
      setItems((current) => {
        const matchingIndex = current.findIndex(
          (item) =>
            item.menuItem.id === menuItem.id &&
            JSON.stringify(item.selectedModifiers) ===
              JSON.stringify(selectedModifiers),
        );

        if (matchingIndex >= 0) {
          const next = [...current];
          next[matchingIndex] = {
            ...next[matchingIndex],
            quantity: Math.min(99, next[matchingIndex].quantity + quantity),
          };
          return next;
        }

        return [
          ...current,
          {
            id: `${menuItem.id}-${selectedModifiers.join("-") || "base"}`,
            menuItem,
            quantity: Math.min(99, quantity),
            selectedModifiers,
          },
        ];
      });
    },
    [],
  );

  const updateQuantity = React.useCallback(
    (itemId: string, nextQuantity: number) => {
      setItems((current) =>
        current
          .map((item) =>
            item.id === itemId
              ? { ...item, quantity: Math.min(99, Math.max(0, nextQuantity)) }
              : item,
          )
          .filter((item) => item.quantity > 0),
      );
    },
    [],
  );

  const removeItem = React.useCallback((itemId: string) => {
    setItems((current) => current.filter((item) => item.id !== itemId));
  }, []);

  const clearCart = React.useCallback(() => {
    setItems([]);
  }, []);

  const replaceItems = React.useCallback((nextItems: CartItem[]) => {
    setItems(
      nextItems.filter(
        (item) =>
          item &&
          typeof item.id === "string" &&
          item.menuItem &&
          typeof item.menuItem.id === "string" &&
          typeof item.menuItem.name === "string" &&
          Number.isFinite(item.menuItem.price) &&
          item.menuItem.price >= 0 &&
          Number.isInteger(item.quantity) &&
          item.quantity > 0 &&
          item.quantity <= 99 &&
          Array.isArray(item.selectedModifiers) &&
          item.selectedModifiers.every((option) => typeof option === "string"),
      ),
    );
  }, []);

  const clearSubmittedItems = React.useCallback((submitted: CartItem[]) => {
    setItems((current) =>
      current
        .map((item) => ({
          ...item,
          quantity:
            item.quantity -
            (submitted.find((line) => line.id === item.id)?.quantity ?? 0),
        }))
        .filter((item) => item.quantity > 0),
    );
  }, []);

  const subtotal = React.useMemo(
    () =>
      items.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0),
    [items],
  );

  return {
    ready,
    items,
    subtotal,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    replaceItems,
    clearSubmittedItems,
    itemCount: items.reduce((count, item) => count + item.quantity, 0),
  };
}

const CartContext = React.createContext<ReturnType<typeof useCartState> | null>(
  null,
);
export function CartProvider({ children }: { children: React.ReactNode }) {
  return React.createElement(
    CartContext.Provider,
    { value: useCartState() },
    children,
  );
}
export function useCart() {
  const cart = React.useContext(CartContext);
  if (!cart) throw new Error("CartProvider is required");
  return cart;
}

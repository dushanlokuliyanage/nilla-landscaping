"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  key: string; // product + chosen options, so the same product in two sizes is two lines
  productId: number;
  slug: string;
  name: string;
  image: string | null;
  unitPrice: number;
  unit: string;
  quantity: number;
  options: Record<string, string>;
};

type AddInput = Omit<CartItem, "key">;

type CartContextValue = {
  items: CartItem[];
  count: number;
  total: number;
  ready: boolean;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  addItem: (item: AddInput, showDrawer?: boolean) => void;
  setQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

const STORAGE_KEY = "nilla-cart-v1";

const CartContext = createContext<CartContextValue | null>(null);

function makeKey(productId: number, options: Record<string, string>) {
  const parts = Object.keys(options)
    .sort()
    .map((k) => `${k}=${options[k]}`)
    .join("|");
  return `${productId}:${parts}`;
}

function clampQuantity(q: number) {
  return Math.max(1, Math.min(100000, Math.floor(q) || 1));
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // Load the saved cart once, in the browser
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setItems(
            parsed.filter(
              (i) =>
                i &&
                typeof i.key === "string" &&
                typeof i.productId === "number" &&
                typeof i.quantity === "number"
            )
          );
        }
      }
    } catch {
      // ignore broken saved data
    }
    setReady(true);
  }, []);

  // Save whenever the cart changes
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // storage can be blocked, the cart still works for this visit
    }
  }, [items, ready]);

  const value = useMemo<CartContextValue>(() => {
    return {
      items,
      count: items.reduce((sum, item) => sum + item.quantity, 0),
      total: items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
      ready,
      isDrawerOpen,
      openDrawer,
      closeDrawer,
      addItem: (item, showDrawer = true) => {
        const key = makeKey(item.productId, item.options);
        setItems((prev) => {
          const existing = prev.find((i) => i.key === key);
          if (existing) {
            return prev.map((i) =>
              i.key === key
                ? { ...i, unitPrice: item.unitPrice, quantity: clampQuantity(i.quantity + item.quantity) }
                : i
            );
          }
          return [...prev, { ...item, key, quantity: clampQuantity(item.quantity) }];
        });
        if (showDrawer) setDrawerOpen(true);
      },
      setQuantity: (key, quantity) =>
        setItems((prev) =>
          prev.map((i) => (i.key === key ? { ...i, quantity: clampQuantity(quantity) } : i))
        ),
      removeItem: (key) => setItems((prev) => prev.filter((i) => i.key !== key)),
      clear: () => setItems([]),
    };
  }, [items, ready, isDrawerOpen, openDrawer, closeDrawer]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

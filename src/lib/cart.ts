import { useEffect, useState } from "react";

export interface CartItem {
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  image_url?: string | null;
  business_id?: string;
}

const KEY = "tileta_cart";

function read(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}
function write(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("tileta_cart_change"));
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => {
    setItems(read());
    const h = () => setItems(read());
    window.addEventListener("tileta_cart_change", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("tileta_cart_change", h);
      window.removeEventListener("storage", h);
    };
  }, []);

  const add = (it: CartItem) => {
    const cur = read();
    const idx = cur.findIndex((c) => c.product_id === it.product_id);
    if (idx >= 0) cur[idx].quantity += it.quantity;
    else cur.push(it);
    write(cur);
  };
  const setQty = (product_id: string, qty: number) => {
    const cur = read().map((c) => (c.product_id === product_id ? { ...c, quantity: qty } : c)).filter((c) => c.quantity > 0);
    write(cur);
  };
  const remove = (product_id: string) => write(read().filter((c) => c.product_id !== product_id));
  const clear = () => write([]);
  const total = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return { items, add, setQty, remove, clear, total, count };
}

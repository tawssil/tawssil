"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type MenuItem = {
  id: number;
  name: string;
  price: number;
};

type CartItem = {
  menu_item_id: number;
  quantity: number;
  item?: MenuItem;
};

export default function CheckoutPage() {
  const params = useSearchParams();

  const restaurantId = Number(params.get("restaurant_id"));
  const itemsParam = params.get("items");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<"cash" | "online">("cash");
  const [submitting, setSubmitting] = useState(false);

  const deliveryFee = 5;

  useEffect(() => {
    async function loadItems() {
      try {
        if (!itemsParam) {
          setLoading(false);
          return;
        }

        const parsed = JSON.parse(itemsParam) as CartItem[];
        const ids = parsed.map((i) => i.menu_item_id);

        if (ids.length === 0) {
          setCart([]);
          setLoading(false);
          return;
        }

        const { data, error } = await supabaseBrowser
          .from("menu_items")
          .select("id, name, price")
          .in("id", ids);

        if (error) {
          alert(error.message);
          setLoading(false);
          return;
        }

        const merged = parsed.map((cartItem) => ({
          ...cartItem,
          item: data?.find((m) => m.id === cartItem.menu_item_id),
        }));

        setCart(merged);
      } catch (e: any) {
        alert(e?.message ?? "Checkout laden mislukt");
      } finally {
        setLoading(false);
      }
    }

    loadItems();
  }, [itemsParam]);

  function increase(id: number) {
    setCart((prev) =>
      prev.map((i) =>
        i.menu_item_id === id ? { ...i, quantity: i.quantity + 1 } : i
      )
    );
  }

  function decrease(id: number) {
    setCart((prev) =>
      prev
        .map((i) =>
          i.menu_item_id === id ? { ...i, quantity: i.quantity - 1 } : i
        )
        .filter((i) => i.quantity > 0)
    );
  }

  const subtotal = useMemo(() => {
    return cart.reduce((sum, c) => {
      if (!c.item) return sum;
      return sum + c.item.price * c.quantity;
    }, 0);
  }, [cart]);

  const total = subtotal + deliveryFee;

  async function placeOrder() {
    if (submitting) return;

    if (!Number.isFinite(restaurantId) || restaurantId <= 0) {
      alert("Ongeldig restaurant.");
      return;
    }

    if (cart.length === 0) {
      alert("Je winkelwagen is leeg.");
      return;
    }

    if (!name.trim() || !phone.trim() || !address.trim()) {
      alert("Vul alle gegevens in.");
      return;
    }

    setSubmitting(true);

    try {
      const { data: order, error: orderError } = await supabaseBrowser
        .from("orders")
        .insert({
          restaurant_id: restaurantId,
          customer_name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          total_price: total,
          payment_status: paymentMethod === "cash" ? "unpaid" : "pending",
          payment_method: paymentMethod,
          status: "new",
        })
        .select()
        .single();

      if (orderError || !order) {
        alert(orderError?.message ?? "Order opslaan mislukt");
        return;
      }

      const orderItems = cart.map((c) => ({
        order_id: order.id,
        menu_item_id: c.menu_item_id,
        quantity: c.quantity,
        price: c.item?.price ?? 0,
      }));

      const { error: orderItemsError } = await supabaseBrowser
        .from("order_items")
        .insert(orderItems);

      if (orderItemsError) {
        alert(orderItemsError.message);
        return;
      }

      if (paymentMethod === "cash") {
        window.location.href = `/order-success?id=${order.id}&payment_method=cash`;

        return;
      }

      const response = await fetch("/api/payment/mollie/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_id: order.id,
          amount: total,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.checkout_url) {
        alert(data?.error ?? "Mollie payment aanmaken mislukt");
        return;
      }

      window.location.href = data.checkout_url;
    } catch (e: any) {
      alert(e?.message ?? "Onbekende fout");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="p-10">Laden...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-3xl font-bold">Checkout</h1>

      <div className="space-y-3 rounded-xl border p-4">
        {cart.length === 0 ? (
          <div className="text-sm text-zinc-500">Je winkelwagen is leeg.</div>
        ) : (
          cart.map((c) => (
            <div
              key={c.menu_item_id}
              className="flex items-center justify-between gap-4"
            >
              <div>
                <div className="font-medium">{c.item?.name ?? "Onbekend product"}</div>
                <div className="text-sm text-zinc-500">
                  {Number(c.item?.price ?? 0).toFixed(2)} MAD
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => decrease(c.menu_item_id)}
                  className="rounded border px-3 py-1"
                  type="button"
                >
                  −
                </button>

                <div className="w-6 text-center">{c.quantity}</div>

                <button
                  onClick={() => increase(c.menu_item_id)}
                  className="rounded border px-3 py-1"
                  type="button"
                >
                  +
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="space-y-2 rounded-xl border p-4">
        <div className="flex justify-between">
          <span>Subtotaal</span>
          <span>{subtotal.toFixed(2)} MAD</span>
        </div>

        <div className="flex justify-between">
          <span>Bezorgkosten</span>
          <span>{deliveryFee.toFixed(2)} MAD</span>
        </div>

        <div className="flex justify-between text-lg font-bold">
          <span>Totaal</span>
          <span>{total.toFixed(2)} MAD</span>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border p-4">
        <input
          placeholder="Naam"
          className="w-full rounded border px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          placeholder="Telefoon"
          className="w-full rounded border px-3 py-2"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <input
          placeholder="Adres"
          className="w-full rounded border px-3 py-2"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>

      <div className="space-y-3 rounded-xl border p-4">
        <h2 className="font-semibold">Betaalmethode</h2>

        <label className="flex items-center gap-2">
          <input
            type="radio"
            value="cash"
            checked={paymentMethod === "cash"}
            onChange={() => setPaymentMethod("cash")}
          />
          Contant bij levering
        </label>

        <label className="flex items-center gap-2">
          <input
            type="radio"
            value="online"
            checked={paymentMethod === "online"}
            onChange={() => setPaymentMethod("online")}
          />
          Online betalen
        </label>
      </div>

      <button
        onClick={placeOrder}
        disabled={submitting || cart.length === 0}
        className="w-full rounded-lg bg-black py-3 text-white disabled:opacity-50"
        type="button"
      >
        {submitting ? "Bezig..." : "Bestelling plaatsen"}
      </button>
    </div>
  );
}
